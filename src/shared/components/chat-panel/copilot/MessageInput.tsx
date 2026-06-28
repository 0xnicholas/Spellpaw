/**
 * MessageInput — chat composer for the Copilot panel.
 *
 * - Plain text typing → on Send, message goes to chatStore
 * - `/` slash command → on-the-fly autocomplete popover over the
 *   textarea, filtered as the user types more chars. Arrow keys /
 *   Tab / Enter select; Escape closes. Picking a skill replaces the
 *   partial `/xxx` with `/<slashCommand> ` and re-focuses the caret
 *   right after.
 * - `spellpaw:insert-text` window event → append + focus (used by
 *   other surfaces that want to inject text into the composer).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';
import { useSkills } from '@shared/copilot/skills/useSkills';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  contextChip?: { label: string; onClear: () => void } | null;
  /** 渲染在 textarea 左侧的工具栏（如上传 / @ 提及按钮），仅在外部需要时传入 */
  leftToolbar?: ReactNode;
  /** textarea 行高，默认 2 */
  rows?: number;
  /** 覆盖外层容器的 className（用于让输入框变成独立圆角矩形卡片等） */
  inputClassName?: string;
}

interface SlashContext {
  /** Index of the `/` in the current value. */
  slashIdx: number;
  /** Text after the `/` up to the cursor (the partial command). */
  partial: string;
}

/**
 * Find the slash-command context the user is currently typing, if any.
 * Returns null when the cursor isn't directly after a `/` (e.g. inside
 * regular text, or after the `/` was followed by whitespace).
 */
function getSlashContext(value: string, cursorPos: number): SlashContext | null {
  const before = value.slice(0, cursorPos);
  const slashIdx = before.lastIndexOf('/');
  if (slashIdx === -1) return null;
  // The `/` must be at start, OR preceded by whitespace
  if (slashIdx > 0 && !/\s/.test(before[slashIdx - 1] ?? '')) return null;
  // After the `/`, only non-whitespace allowed up to cursor
  const after = before.slice(slashIdx + 1);
  if (/\s/.test(after)) return null;
  return { slashIdx, partial: after };
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = '输入消息…（Enter 发送，Shift + Enter 换行）',
  contextChip,
  leftToolbar,
  rows = 2,
  inputClassName,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { skills, isLoading } = useSkills();

  /** Locate the chat textarea by data-attribute. Same pattern the
   *  spellpaw:insert-text handler uses (Textarea is not a forwardRef). */
  function getTextarea(): HTMLTextAreaElement | null {
    return document.querySelector<HTMLTextAreaElement>('textarea[data-spellpaw-input]');
  }

  const slashContext = useMemo(
    () => getSlashContext(value, cursorPos),
    [value, cursorPos],
  );

  const suggestions = useMemo(() => {
    if (!slashContext) return [];
    const needle = slashContext.partial.toLowerCase();
    type Ranked = { skill: typeof skills[number]; rank: number };
    const ranked: Ranked[] = [];
    for (const s of skills) {
      const cmd = s.slashCommand.toLowerCase();
      const name = s.name.toLowerCase();
      if (cmd.startsWith(needle)) ranked.push({ skill: s, rank: 0 });
      else if (cmd.includes(needle) || name.includes(needle)) ranked.push({ skill: s, rank: 1 });
    }
    // Sort by (rank asc, slashCommand asc) for stable, predictable order
    ranked.sort((a, b) => a.rank - b.rank || a.skill.slashCommand.localeCompare(b.skill.slashCommand));
    return ranked.slice(0, 8).map((r) => r.skill);
  }, [skills, slashContext]);

  const dropdownOpen = slashContext !== null && suggestions.length > 0;

  // Reset selection whenever the suggestion set changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [suggestions]);

  function applySkill(slashCommand: string) {
    if (!slashContext) return;
    const before = value.slice(0, slashContext.slashIdx);
    const after = value.slice(cursorPos);
    // Replace the partial `/xxx` with the full `/<slashCommand> `
    // so the user can immediately type args (e.g. `/analyze-pacing 聚焦:开场`)
    const inserted = `/${slashCommand} `;
    const next = `${before}${inserted}${after}`;
    setValue(next);
    requestAnimationFrame(() => {
      const ta = getTextarea();
      if (!ta) return;
      const caret = before.length + inserted.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
      setCursorPos(caret);
    });
  }

  // Listen for `spellpaw:insert-text` events (dispatched by other UI
  // surfaces that want to inject text into the chat input) and append
  // the payload to the current value, then focus the textarea.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      const inserted = ce.detail;
      if (typeof inserted !== 'string') return;
      setValue((v) => {
        const next = v ? `${v} ${inserted}` : inserted;
        return next;
      });
      // Focus the textarea after React commits the new value.
      setTimeout(() => {
        getTextarea()?.focus();
      }, 0);
    };
    window.addEventListener('spellpaw:insert-text', handler);
    return () => window.removeEventListener('spellpaw:insert-text', handler);
  }, []);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    setCursorPos(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (dropdownOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const picked = suggestions[selectedIdx];
        if (picked) applySkill(picked.slashCommand);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        // Close dropdown by appending a space and moving the cursor past
        // it. The trailing space makes the partial (text between `/` and
        // cursor) contain whitespace, so getSlashContext() returns null.
        setValue((v) => {
          const next = v + ' ';
          setCursorPos(next.length);
          return next;
        });
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={inputClassName ?? 'border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3'}>
      {contextChip && (
        <div className="mb-2 flex items-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] px-2.5 py-0.5 text-[11px] text-[var(--color-accent-600)]">
            🎬 {contextChip.label}
            <button
              onClick={contextChip.onClear}
              className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-accent-100)]"
              aria-label="取消上下文"
            >
              ×
            </button>
          </span>
        </div>
      )}
      <div className="relative">
        <Textarea
          data-spellpaw-input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCursorPos(e.target.selectionStart ?? e.target.value.length);
          }}
          onSelect={(e) => {
            const ta = e.currentTarget;
            setCursorPos(ta.selectionStart ?? ta.value.length);
          }}
          onKeyDown={handleKeyDown}
          rows={rows}
          className="rounded-[var(--radius-lg)] pr-10"
        />
        {leftToolbar && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            {leftToolbar}
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <IconButton
            icon={<Send className="h-4 w-4" />}
            label="发送"
            size="sm"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
          />
        </div>

        {dropdownOpen && slashContext && (
          <ul
            role="listbox"
            data-testid="skill-autocomplete"
            className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-auto rounded-[var(--radius-md)] border py-1 shadow-lg"
            style={{
              background: 'var(--portal-bg-elevated)',
              borderColor: 'oklch(100% 0 0 / 0.12)',
            }}
          >
            {suggestions.map((s, i) => {
              const isSelected = i === selectedIdx;
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`skill-option-${s.id}`}
                  onMouseDown={(e) => {
                    // mousedown not click so the textarea blur doesn't
                    // close the dropdown before our handler fires
                    e.preventDefault();
                    applySkill(s.slashCommand);
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className="flex cursor-pointer flex-col px-3 py-1.5 text-xs"
                  style={{
                    background: isSelected
                      ? 'oklch(100% 0 0 / 0.06)'
                      : 'transparent',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--portal-accent)' }}>
                      /{s.slashCommand}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {s.name}
                    </span>
                  </span>
                  {s.description && (
                    <span
                      className="mt-0.5 truncate"
                      style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '10px',
                      }}
                      title={s.description}
                    >
                      {s.description}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {slashContext && !isLoading && suggestions.length === 0 && (
          <div
            data-testid="skill-autocomplete-empty"
            className="absolute bottom-full left-0 right-0 mb-1 rounded-[var(--radius-md)] border px-3 py-2 text-xs shadow-lg"
            style={{
              background: 'var(--portal-bg-elevated)',
              borderColor: 'oklch(100% 0 0 / 0.12)',
              color: 'var(--color-text-muted)',
            }}
          >
            没有匹配的 skill
          </div>
        )}
      </div>
    </div>
  );
}
/**
 * InlineEditableText — click-to-edit textarea for text cards.
 *
 * Used in text/script/storyline cards so the user can type directly inside
 * the card, while still being able to open the AI popover by clicking the
 * card header or any non-textarea area.
 *
 *   <InlineEditableText
 *     value={data.description}
 *     placeholder="点击编辑…"
 *     onSave={(text) => updateNodeData(id, { description: text })}
 *   />
 *
 * Behavior:
 *  - Click the placeholder / text → focuses the textarea
 *  - Enter (no Shift) → save & blur
 *  - Shift+Enter → newline (default textarea behavior)
 *  - Escape → revert & blur
 *  - Blur → auto-save
 *  - onMouseDown + onClick both stop propagation so the card-level click
 *    handler (which opens the Copilot popover) does not fire
 */

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

export interface InlineEditableTextProps {
  value: string;
  placeholder?: string;
  /** Save the trimmed value. Returning `null` cancels the edit. */
  onSave: (next: string) => void;
  /** Optional className for the textarea (e.g. min-height, padding) */
  textareaClassName?: string;
  /** Max length (default 4000) */
  maxLength?: number;
  /** Optional: render the placeholder as a different node (icon etc.) */
  renderEmpty?: () => React.ReactNode;
}

export function InlineEditableText({
  value,
  placeholder = '点击编辑…',
  onSave,
  textareaClassName,
  maxLength = 4000,
  renderEmpty,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Track whether the user has typed since opening; Escape should revert.
  const initialDraftRef = useRef(value);

  // Resize textarea to fit content on every edit
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft]);

  // External value updates (e.g. AI popover generated content) should sync
  // when the user is not actively editing. Using an effect avoids a render-phase
  // setState and the extra re-render it triggers.
  useEffect(() => {
    if (!editing && draft !== value) {
      setDraft(value);
    }
  }, [editing, draft, value]);

  const startEditing = () => {
    initialDraftRef.current = value;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next !== value) {
      onSave(next);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(initialDraftRef.current);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  // Stop canvas-level click handlers (which would open the Copilot popover)
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={stop}
        onMouseDown={stop}
        onDoubleClick={stop}
        maxLength={maxLength}
        rows={2}
        data-testid="inline-text-editor"
        className={
          'w-full resize-none rounded-md border px-2 py-1.5 text-[12px] leading-relaxed outline-none ' +
          'border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] ' +
          'text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-accent-500)] ' +
          (textareaClassName ?? '')
        }
      />
    );
  }

  const isEmpty = !value || value.trim() === '';
  return (
    <div
      role="textbox"
      tabIndex={0}
      onClick={(e) => { stop(e); startEditing(); }}
      onMouseDown={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEditing();
        }
      }}
      data-testid="inline-text-display"
      className={
        'group relative w-full cursor-text rounded-md px-2 py-1.5 text-[12px] leading-relaxed transition-colors ' +
        'hover:bg-white/5 ' +
        (isEmpty ? 'text-[var(--color-text-tertiary)] italic' : 'text-[var(--color-text-primary)]')
      }
    >
      {isEmpty ? (renderEmpty?.() ?? placeholder) : value}
      <Pencil
        className="absolute right-1.5 top-1.5 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
        style={{ color: 'var(--color-text-tertiary)' }}
      />
    </div>
  );
}

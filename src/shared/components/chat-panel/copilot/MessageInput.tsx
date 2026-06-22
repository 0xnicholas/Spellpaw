import { useEffect, useState, type ReactNode } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';

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

  // Listen for `spellpaw:insert-text` events (e.g. from SkillChips) and
  // append the payload to the current value, then focus the textarea.
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
        document
          .querySelector<HTMLTextAreaElement>('textarea[data-spellpaw-input]')
          ?.focus();
      }, 0);
    };
    window.addEventListener('spellpaw:insert-text', handler);
    return () => window.removeEventListener('spellpaw:insert-text', handler);
  }, []);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          onChange={(e) => setValue(e.target.value)}
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
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  contextChip?: { label: string; onClear: () => void } | null;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = '输入消息…（Enter 发送，Shift + Enter 换行）',
  contextChip,
}: MessageInputProps) {
  const [value, setValue] = useState('');

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
    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3">
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="pr-10"
        />
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

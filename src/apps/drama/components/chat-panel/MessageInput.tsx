import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';
import { useChatStore } from '@drama/stores/chatStore';

interface MessageInputProps {
  onSend?: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const storeSendMessage = useChatStore((s) => s.sendMessage);
  const storeLoading = useChatStore((s) => s.isLoading);

  const isLoading = disabled ?? storeLoading;

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    if (onSend) {
      onSend(value.trim());
    } else {
      storeSendMessage(value.trim());
    }
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3">
      <div className="relative">
        <Textarea
          placeholder="输入消息…（Cmd + Enter 发送）"
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
            disabled={!value.trim() || isLoading}
          />
        </div>
      </div>
    </div>
  );
}

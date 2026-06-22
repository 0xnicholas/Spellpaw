import type { ReactNode } from 'react';
import type { ChatMessage, ChatAction } from '@shared/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SkillChips } from '../SkillChips';

export interface ToolCall {
  callId: string;
  name: string;
}

export interface CopilotChatProps {
  messages: ChatMessage[];
  streamingText: string | null;
  toolCalls: ToolCall[];
  isLoading: boolean;
  onSend: (content: string) => void;
  placeholder?: string;
  emptyState?: ReactNode;
  onActionClick?: (action: ChatAction) => void;
  contextChip?: { label: string; onClear: () => void } | null;
}

export function CopilotChat({
  messages,
  streamingText,
  toolCalls,
  isLoading,
  onSend,
  placeholder = '输入消息…（Enter 发送，Shift + Enter 换行）',
  emptyState,
  onActionClick,
  contextChip,
}: CopilotChatProps) {
  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={messages}
        streamingMessage={streamingText}
        isLoading={isLoading}
        toolCalls={toolCalls}
        emptyState={emptyState}
        onActionClick={onActionClick}
      />
      <SkillChips
        onInsert={(cmd) => {
          const ev = new CustomEvent('spellpaw:insert-text', { detail: cmd });
          window.dispatchEvent(ev);
        }}
      />
      <MessageInput
        onSend={onSend}
        disabled={isLoading}
        placeholder={placeholder}
        contextChip={contextChip}
      />
    </div>
  );
}

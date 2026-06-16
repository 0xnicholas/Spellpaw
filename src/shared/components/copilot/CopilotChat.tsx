import type { ReactNode } from 'react';
import type { ChatMessage, ChatAction } from '@shared/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

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
      <MessageInput
        onSend={onSend}
        disabled={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}

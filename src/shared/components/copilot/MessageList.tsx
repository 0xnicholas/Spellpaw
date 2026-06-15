import { useRef, useEffect, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageItem } from './MessageItem';
import type { ChatMessage, ChatAction } from '@shared/types';
import type { ToolCall } from './CopilotChat';

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isLoading: boolean;
  toolCalls: ToolCall[];
  onActionClick?: (action: ChatAction) => void;
  emptyState?: ReactNode;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  toolCalls,
  onActionClick,
  emptyState,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && emptyState}

      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} onActionClick={onActionClick} />
      ))}

      {/* Streaming message */}
      {streamingMessage !== null && (
        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] font-medium text-[var(--color-text-accent)]">🤖</span>
            <div className="flex-1 text-xs text-[var(--color-text-primary)] leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>
                  ),
                }}
              >
                {streamingMessage || '▊'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Tool call indicators */}
      {toolCalls.map((tc) => (
        <div key={tc.callId} className="px-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
            🔧 {tc.name}
          </div>
        </div>
      ))}

      {/* Loading indicator (fallback when no streaming) */}
      {isLoading && streamingMessage === null && toolCalls.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-[var(--color-text-tertiary)]">
          🤖 思考中…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

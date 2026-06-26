import { useRef, useEffect, type ReactNode } from 'react';
import { RefreshCw, Square, AlertCircle, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MessageItem } from './MessageItem';
import type { ChatMessage, ChatAction } from '@shared/types';
import type { ToolCall } from './CopilotChat';
import { useChatStore } from '@drama/stores/chatStore';
import { toolDisplayName } from '../toolDisplayName';
import { ToolCallResults } from './ToolCallResults';

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isLoading: boolean;
  toolCalls: ToolCall[];
  onActionClick?: (action: ChatAction) => void;
  emptyState?: ReactNode;
  onRegenerate?: () => void;
  onStop?: () => void;
  /** Active project id — used for regenerate's chatStore call */
  projectId?: string;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  toolCalls,
  onActionClick,
  emptyState,
  onRegenerate,
  onStop,
  projectId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  // Identify the last agent message for the Regenerate action.
  // We only show it when the last user message exists AND we are not
  // currently streaming (otherwise Regenerate would race the in-flight turn).
  const lastMessage = messages[messages.length - 1];
  const hasUserMessage = messages.some((m) => m.role === 'user');
  const showRegenerate =
    Boolean(onRegenerate) &&
    hasUserMessage &&
    !isLoading &&
    streamingMessage === null &&
    lastMessage?.role === 'agent';

  const handleRegenerate = () => {
    if (!projectId) return;
    useChatStore.getState().regenerateLast(projectId);
    onRegenerate?.();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && emptyState}

      {messages.map((msg, idx) => (
        <div key={msg.id}>
          <MessageItem message={msg} onActionClick={onActionClick} />
          {idx === messages.length - 1 && msg.role === 'agent' && showRegenerate && (
            <div className="px-3 pb-2">
              <button
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                data-testid="regenerate-button"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          )}
        </div>
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
        <ToolCallResults key={tc.callId} tc={tc} />
      ))}

      {/* Loading indicator (fallback when no streaming) */}
      {isLoading && streamingMessage === null && toolCalls.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-[var(--color-text-tertiary)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
          <span>🤖 思考中…</span>
          {onStop && (
            <button
              onClick={onStop}
              data-testid="stop-button"
              className="ml-auto inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2 py-0.5 hover:bg-[var(--color-bg-secondary)]"
              aria-label="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          )}
        </div>
      )}

      {/* Stop button when streaming or tool calls in flight */}
      {isLoading && onStop && (streamingMessage !== null || toolCalls.length > 0) && (
        <div className="px-3 py-1">
          <button
            onClick={onStop}
            data-testid="stop-button"
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Stop generating"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
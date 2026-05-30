import { useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { useChatStore } from '@/stores/chatStore';
import { useProjectStore } from '@/stores/projectStore';
import { findNode } from '@/lib/treeUtils';
import ReactMarkdown from 'react-markdown';
import type { ChatAction } from '@/types';

interface MessageListProps {
  onActionClick?: (action: ChatAction) => void;
}

export function MessageList({ onActionClick }: MessageListProps) {
  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const toolCalls = useChatStore((s) => s.toolCalls);
  const filterNodeId = useChatStore((s) => s.filterNodeId);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const tree = useProjectStore((s) => s.getCurrentTree());
  const filterNode = filterNodeId && tree ? findNode(tree, filterNodeId) : null;

  const filteredMessages = filterNodeId
    ? messages.filter(
        (m) => m.context?.nodeId === filterNodeId || m.role === 'agent'
      )
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filter bar */}
      {filterNode && (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
            <Filter className="h-3 w-3" />
            <span>显示与</span>
            <span className="font-medium text-[var(--color-accent-500)]">「{filterNode.title}」</span>
          </div>
          <button
            onClick={() => setFilterNodeId(null)}
            className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {filteredMessages.map((msg) => (
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
                  strong: ({ children }) => <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>,
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

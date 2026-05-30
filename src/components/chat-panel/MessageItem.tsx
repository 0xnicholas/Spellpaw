import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { ChatMessage, ChatAction } from '@/types';
import Markdown from 'react-markdown';

interface MessageItemProps {
  message: ChatMessage;
  onActionClick?: (action: ChatAction) => void;
}

export function MessageItem({ message, onActionClick }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
          isUser
            ? 'bg-[var(--color-accent-500)] text-white'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
        )}
      >
        {isUser ? '我' : 'AI'}
      </div>

      {/* Content */}
      <div className={cn('flex max-w-[80%] flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-[var(--radius-base)] px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-[var(--color-accent-50)] text-[var(--color-text-primary)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-100)]'
              : 'bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] dark:bg-[var(--color-bg-secondary)]'
          )}
        >
          <div className="prose prose-sm max-w-none">
            <Markdown
              components={{
                code({ children, className }) {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5 text-xs">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <div className="relative my-2 min-w-0 overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3">
                      <pre className="text-xs">
                        <code>{children}</code>
                      </pre>
                      <button
                        onClick={() => handleCopy(String(children))}
                        className="absolute right-2 top-2 rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </Markdown>
          </div>

          {/* Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onActionClick?.(action)}
                  className="rounded-full border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-3 py-1 text-xs font-medium text-[var(--color-accent-700)] transition-colors hover:bg-[var(--color-accent-100)] dark:border-[var(--color-accent-800)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-300)] dark:hover:bg-[var(--color-accent-800)]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
          {formatDate(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

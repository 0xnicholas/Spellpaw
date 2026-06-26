import { useState } from 'react';
import { AlertCircle, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { parseToolResult } from '@drama/lib/toolResultFormat';
import { toolDisplayName } from '../toolDisplayName';

export interface ToolCallProps {
  callId: string;
  name: string;
  status: string;
  result?: string;
  args?: string;
  errorMessage?: string;
}

export function ToolCallResults({ tc }: { tc: ToolCallProps }) {
  const [expanded, setExpanded] = useState(false);
  const failed = tc.status === 'error';
  const resultText = tc.result || tc.errorMessage || '';
  const parsed = parseToolResult(resultText);

  const icon = failed ? (
    <AlertCircle className="h-3 w-3 text-red-500" />
  ) : (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
  );

  return (
    <div
      data-testid={`tool-call-${tc.callId}`}
      data-status={tc.status}
      className={cn('tool-call-result', expanded && 'expanded')}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 w-full px-3 py-1 text-left text-[10px]',
          failed
            ? 'text-red-500 bg-red-50/50'
            : 'text-[var(--color-text-tertiary)]',
        )}
      >
        <ChevronRight
          className={cn('h-3 w-3 opacity-40 transition-transform', expanded && 'rotate-90')}
        />
        {icon}
        <Wrench className="h-3 w-3 opacity-60" />
        <span>{toolDisplayName(tc.name)}</span>
        {parsed.parsed && (
          <span className="ml-1 truncate max-w-[120px] opacity-60">
            · {parsed.result.summary.slice(0, 40)}
          </span>
        )}
        {failed && tc.errorMessage && !parsed.parsed && (
          <span className="ml-1 truncate max-w-[200px]">{tc.errorMessage}</span>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-2">
          {/* Input args */}
          {tc.args && (
            <div className="mb-1">
              <span className="text-[9px] font-medium text-[var(--color-text-tertiary)]">参数</span>
              <pre className="mt-0.5 text-[9px] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] rounded px-1.5 py-0.5 overflow-x-auto max-h-24">
                {tc.args}
              </pre>
            </div>
          )}

          {/* Result */}
          {parsed.parsed ? (
            <div className={cn(failed && 'text-red-600')}>
              <span className="text-[9px] font-medium text-[var(--color-text-tertiary)]">
                结果 {parsed.result.success ? '✅' : '❌'}
              </span>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                {parsed.result.summary}
              </p>
              {parsed.result.affectedCardIds?.length ? (
                <p className="mt-0.5 text-[9px] text-[var(--color-text-tertiary)]">
                  受影响卡片: {parsed.result.affectedCardIds.slice(0, 5).join(', ')}
                  {parsed.result.affectedCardIds.length > 5 ? ' ...' : ''}
                </p>
              ) : null}
              {parsed.result.suggestion && (
                <p className="mt-0.5 text-[9px] text-[var(--color-text-tertiary)] italic">
                  💡 {parsed.result.suggestion}
                </p>
              )}
            </div>
          ) : resultText ? (
            <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">{resultText}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * SseTab — 时间线展示 SSE 原始事件流。
 *
 * 每条事件：时间戳（HH:MM:SS.mmm）+ event.type + 展开的 JSON payload。
 */
import { useState, useEffect, useRef } from 'react';
import { useCopilotLabStore } from '@drama/stores/copilotLabStore';
import type { SSEEvent } from '@drama/lib/llm/types';
import { cn } from '@/shared/lib/utils';

function colorFor(type: string): string {
  if (type === 'text_delta') return 'text-[var(--color-text-primary)]';
  if (type === 'tool_call_started') return 'text-amber-500';
  if (type === 'tool_call_done') return 'text-amber-600';
  if (type === 'turn_end') return 'text-emerald-500';
  if (type === 'error') return 'text-red-500';
  if (type === 'message_start') return 'text-[var(--color-accent-500)]';
  return 'text-[var(--color-text-secondary)]';
}

export function SseTab() {
  const events = useCopilotLabStore((s) => s.events);
  const clearEvents = useCopilotLabStore((s) => s.clearEvents);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (!autoScroll) return;
    if (events.length === lastCountRef.current) return;
    lastCountRef.current = events.length;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, autoScroll]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2 text-xs">
        <span className="text-[var(--color-text-tertiary)]">
          <span className="font-mono text-[var(--color-text-secondary)]">{events.length}</span> events
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3"
            />
            自动滚动
          </label>
          <button
            onClick={clearEvents}
            disabled={events.length === 0}
            className="rounded px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto font-mono text-[11px]">
        {events.length === 0 && (
          <div className="px-3 py-4 text-center text-[10px] italic text-[var(--color-text-tertiary)]">
            等待事件……
          </div>
        )}
        {events.map((evt, i) => (
          <SseRow
            key={i}
            index={i}
            evt={evt}
            isOpen={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}

function SseRow({
  index,
  evt,
  isOpen,
  onToggle,
}: {
  index: number;
  evt: SSEEvent;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // SSEEvent is `Record<string, unknown>`, so narrow `type` and `delta`
  // to concrete strings before using them as ReactNodes / arg to colorFor.
  const evtType = typeof evt.type === 'string' ? evt.type : '';
  const deltaStr =
    typeof (evt as { delta?: unknown }).delta === 'string'
      ? (evt as { delta?: string }).delta
      : '';

  return (
    <div className="border-b border-[var(--color-border-default)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-[var(--color-bg-secondary)]"
      >
        <span className="w-6 shrink-0 text-right text-[10px] text-[var(--color-text-tertiary)]">{index + 1}</span>
        <span className={cn('shrink-0', colorFor(evtType))}>{evtType}</span>
        {!isOpen && deltaStr && (
          <span className="truncate text-[var(--color-text-tertiary)]">
            {deltaStr.slice(0, 40)}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
          {isOpen ? '▾' : '▸'}
        </span>
      </button>
      {isOpen && (
        <pre className="bg-[var(--color-bg-secondary)] px-3 py-1.5 whitespace-pre-wrap break-words text-[10px] text-[var(--color-text-secondary)]">
          {JSON.stringify(evt, null, 2)}
        </pre>
      )}
    </div>
  );
}


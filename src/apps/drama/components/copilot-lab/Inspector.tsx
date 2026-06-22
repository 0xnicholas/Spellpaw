/**
 * Inspector — 右侧调试面板容器，3 个 tab。
 */
import { useState } from 'react';
import { SystemPromptTab } from './SystemPromptTab';
import { ToolsTab } from './ToolsTab';
import { SseTab } from './SseTab';
import { cn } from '@/shared/lib/utils';

const TABS = [
  { id: 'prompt', label: 'System Prompt' },
  { id: 'tools', label: 'Tools' },
  { id: 'sse', label: 'SSE' },
] as const;

type TabId = typeof TABS[number]['id'];

export function Inspector() {
  const [tab, setTab] = useState<TabId>('prompt');

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex shrink-0 border-b border-[var(--color-border-default)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-[var(--color-accent-500)] text-[var(--color-text-primary)]'
                : 'border-b-2 border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'prompt' && <SystemPromptTab />}
        {tab === 'tools' && <ToolsTab />}
        {tab === 'sse' && <SseTab />}
      </div>
    </div>
  );
}
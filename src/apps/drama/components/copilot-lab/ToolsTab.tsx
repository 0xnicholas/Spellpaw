/**
 * ToolsTab — 显示注册给 LLM 的工具列表 + JSON schema。
 *
 * Lab 模式下 tools 应始终为空数组。这里同时展示
 *  buildSystemPrompt 的 prompt 中提到的所有 spellpaw_skill_* / spellpaw_* 名字
 *  让用户知道"如果有项目，会暴露这些工具"。
 */
import { useState } from 'react';
import { useCopilotLabStore } from '@drama/stores/copilotLabStore';
import { SPELLPAW_TOOL_CONFIGS } from '@drama/lib/toolConfigs';
import { cn } from '@/shared/lib/utils';

/** Lab 实际注册的工具（meta.tools），对比"如果带项目应该暴露的全部工具" */
function expectedTools() {
  return SPELLPAW_TOOL_CONFIGS.map((t) => t.name);
}

export function ToolsTab() {
  const meta = useCopilotLabStore((s) => s.sessionMeta);
  const [expanded, setExpanded] = useState<string | null>(null);

  const actual = meta?.tools ?? [];
  const expected = expectedTools();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2 text-xs">
        <span className="text-[var(--color-text-tertiary)]">
          Lab 注册 <span className="font-mono text-[var(--color-text-secondary)]">{actual.length}</span>
          {' '} / 期望 <span className="font-mono text-[var(--color-text-secondary)]">{expected.length}</span>
        </span>
        <span className="text-[10px] text-[var(--color-text-tertiary)]">Lab 模式：始终为空</span>
      </div>

      <div className="flex-1 overflow-auto">
        {actual.length === 0 && (
          <div className="px-3 py-2 text-[10px] italic text-[var(--color-text-tertiary)]">
            ✅ 当前 session 未注册任何工具 —— LLM 不会发起 tool_call。
          </div>
        )}

        {actual.length > 0 && (
          <Section title="已注册（actual）">
            {actual.map((t) => (
              <ToolRow key={t.name} name={t.name} desc={t.description} expanded={expanded} setExpanded={setExpanded} />
            ))}
          </Section>
        )}

        <Section title="如果带项目应暴露（expected · 只读）">
          {expected.map((name) => (
            <ToolRow
              key={name}
              name={name}
              desc={findDesc(name)}
              expanded={expanded}
              setExpanded={setExpanded}
              muted
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function findDesc(name: string): string {
  return SPELLPAW_TOOL_CONFIGS.find((t) => t.name === name)?.description ?? '';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border-default)] py-1">
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{title}</div>
      {children}
    </div>
  );
}

function ToolRow({
  name,
  desc,
  expanded,
  setExpanded,
  muted,
}: {
  name: string;
  desc: string;
  expanded: string | null;
  setExpanded: (n: string | null) => void;
  muted?: boolean;
}) {
  const isOpen = expanded === name;
  return (
    <div className={cn('border-t border-[var(--color-border-default)]', muted && 'opacity-60')}>
      <button
        onClick={() => setExpanded(isOpen ? null : name)}
        className="flex w-full items-start justify-between gap-2 px-3 py-1.5 text-left hover:bg-[var(--color-bg-secondary)]"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[11px] text-[var(--color-text-primary)]">{name}</div>
          {desc && (
            <div className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-tertiary)]">{desc}</div>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && (
        <div className="bg-[var(--color-bg-secondary)] px-3 py-2">
          <div className="text-[10px] text-[var(--color-text-tertiary)]">description</div>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-[var(--color-text-secondary)]">
            {desc || '(无)'}
          </pre>
        </div>
      )}
    </div>
  );
}
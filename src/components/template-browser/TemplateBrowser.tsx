import { useState, useEffect } from 'react';
import { NarrativeTemplate } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  suspense: '悬疑',
  romance: '甜宠',
  comedy: '喜剧',
  drama: '励志',
  documentary: '纪录',
};

const PLATFORM_ICONS: Record<string, string> = {
  portrait: '📱',
  landscape: '🖥',
  square: '⬜',
};

const BUILTIN_TEMPLATE_IDS = [
  'suspense-reversal',
  'sweet-romance',
  'underdog-comeback',
  'comedy-twist',
  'mini-documentary',
];

interface TemplateBrowserProps {
  onSelect: (template: NarrativeTemplate) => void;
}

export function TemplateBrowser({ onSelect }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<NarrativeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const loaded: NarrativeTemplate[] = [];
      for (const id of BUILTIN_TEMPLATE_IDS) {
        try {
          const res = await fetch(`/templates/${id}.spellpaw-template.json`);
          if (res.ok) {
            loaded.push(await res.json());
          }
        } catch { /* skip failed loads */ }
      }
      setTemplates(loaded);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = category
    ? templates.filter((t) => t.category === category)
    : templates;

  const selectedTemplate = templates.find((t) => t.id === selected);

  if (loading) {
    return <div className="p-4 text-xs text-[var(--color-text-tertiary)]">加载模板中…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium transition-colors ${
            !category
              ? 'bg-[var(--color-bg-accent)] text-[var(--color-text-inverse)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-accent-subtle)]'
          }`}
        >
          全部
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium transition-colors ${
              category === key
                ? 'bg-[var(--color-bg-accent)] text-[var(--color-text-inverse)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-accent-subtle)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`text-left rounded-[var(--radius-base)] border p-2.5 transition-colors ${
              selected === t.id
                ? 'border-[var(--color-border-accent)] bg-[var(--color-bg-accent-subtle)]'
                : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
            }`}
          >
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">{t.name}</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
              {PLATFORM_ICONS[t.targetPlatform]} {t.targetDuration}s · {CATEGORY_LABELS[t.category]}
            </div>
            <div className="mt-1 flex gap-1">
              {t.stylePresets.colorPalette.slice(0, 3).map((c, i) => (
                <span key={i} className="inline-block w-3 h-3 rounded-full border border-[var(--color-border-subtle)]" style={{ backgroundColor: c }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Selected template preview */}
      {selectedTemplate && (
        <div className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] p-3 bg-[var(--color-bg-secondary)]">
          <div className="text-xs font-semibold text-[var(--color-text-primary)]">{selectedTemplate.name}</div>
          <div className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">{selectedTemplate.description}</div>
          <div className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
            {selectedTemplate.structure.acts.map((act, i) => (
              <div key={i} className="mb-1">
                <span className="font-medium">{act.title}</span>
                <span className="text-[var(--color-text-tertiary)]"> · {act.scenes.length} 场景</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onSelect(selectedTemplate)}
            className="mt-3 w-full rounded-[var(--radius-sm)] bg-[var(--color-bg-accent)] py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity"
          >
            使用此模板创建项目
          </button>
        </div>
      )}
    </div>
  );
}

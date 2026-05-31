import { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import type { NarrativeTemplate } from '@/apps/drama/types';
import { useCustomTemplateStore } from '@/apps/drama/stores/customTemplateStore';

const CATEGORY_LABELS: Record<string, string> = {
  suspense: '悬疑',
  romance: '甜宠',
  comedy: '喜剧',
  drama: '励志',
  documentary: '纪录',
  custom: '自定义',
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
  const [source, setSource] = useState<'builtin' | 'custom'>('builtin');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customTemplates = useCustomTemplateStore((s) => s.templates);
  const removeCustomTemplate = useCustomTemplateStore((s) => s.removeTemplate);
  const importFromFile = useCustomTemplateStore((s) => s.importFromFile);

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

  const displayTemplates = source === 'custom' ? customTemplates : templates;

  const filtered = category
    ? displayTemplates.filter((t) => t.category === category)
    : displayTemplates;

  const selectedTemplate = displayTemplates.find((t) => t.id === selected);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const template = await importFromFile(file);
      setSource('custom');
      setSelected(template.id);
    } catch (err) {
      setImportError((err as Error).message);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading && source === 'builtin') {
    return <div className="p-4 text-xs text-[var(--color-text-tertiary)]">加载模板中…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Source tabs */}
      <div className="flex gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-0.5">
        <button
          onClick={() => { setSource('builtin'); setSelected(null); setImportError(null); }}
          className={`flex-1 rounded-[var(--radius-sm)] py-1 text-[11px] font-medium transition-colors ${
            source === 'builtin' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-tertiary)]'
          }`}>内置模板</button>
        <button
          onClick={() => { setSource('custom'); setSelected(null); setImportError(null); }}
          className={`flex-1 rounded-[var(--radius-sm)] py-1 text-[11px] font-medium transition-colors ${
            source === 'custom' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-tertiary)]'
          }`}>
          我的模板{customTemplates.length > 0 ? ` (${customTemplates.length})` : ''}
        </button>
      </div>

      {/* Import button for custom tab */}
      {source === 'custom' && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-default)] py-1.5 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Upload className="h-3 w-3" />
            导入模板文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".spellpaw-template.json,application/json"
            className="hidden"
            onChange={handleImport}
          />
          {importError && (
            <div className="text-[10px] text-red-500">导入失败: {importError}</div>
          )}
        </div>
      )}

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
          <div key={t.id} className="relative group">
            <button
              onClick={() => setSelected(t.id)}
              className={`w-full text-left rounded-[var(--radius-base)] border p-2.5 transition-colors ${
                selected === t.id
                  ? 'border-[var(--color-border-accent)] bg-[var(--color-bg-accent-subtle)]'
                  : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{t.name}</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                {PLATFORM_ICONS[t.targetPlatform]} {t.targetDuration}s · {CATEGORY_LABELS[t.category] ?? t.category}
              </div>
              <div className="mt-1 flex gap-1">
                {t.stylePresets.colorPalette.slice(0, 3).map((c, i) => (
                  <span key={i} className="inline-block w-3 h-3 rounded-full border border-[var(--color-border-subtle)]" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
            {source === 'custom' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomTemplate(t.id);
                  if (selected === t.id) setSelected(null);
                }}
                className="absolute top-1 right-1 p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除模板"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 py-4 text-center text-[11px] text-[var(--color-text-tertiary)]">
            {source === 'custom' ? '暂无自定义模板，点击上方导入' : '暂无模板'}
          </div>
        )}
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

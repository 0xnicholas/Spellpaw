import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  Trash2,
  Download,
  Edit3,
  X,
  Film,
  LayoutGrid,
  Clock,
  Palette,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import type { NarrativeTemplate } from '@/types';
import { useCustomTemplateStore } from '@/stores/customTemplateStore';
import { useProjectStore } from '@/stores/projectStore';
import { downloadTemplateFile } from '@/lib/templateExportImport';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';

const CATEGORY_LABELS: Record<string, string> = {
  suspense: '悬疑',
  romance: '甜宠',
  comedy: '喜剧',
  drama: '励志',
  action: '动作',
  documentary: '纪录',
  custom: '自定义',
};

const PLATFORM_LABELS: Record<string, string> = {
  portrait: '竖屏',
  landscape: '横屏',
  square: '方形',
};

const BUILTIN_TEMPLATE_IDS = [
  'suspense-reversal',
  'sweet-romance',
  'underdog-comeback',
  'comedy-twist',
  'mini-documentary',
];

export function TemplateMarketPage() {
  const navigate = useNavigate();
  const [builtinTemplates, setBuiltinTemplates] = useState<NarrativeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<'all' | 'builtin' | 'custom'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<NarrativeTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NarrativeTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const customTemplates = useCustomTemplateStore((s) => s.templates);
  const removeCustomTemplate = useCustomTemplateStore((s) => s.removeTemplate);
  const updateCustomTemplate = useCustomTemplateStore((s) => s.updateTemplate);
  const importFromFile = useCustomTemplateStore((s) => s.importFromFile);
  const createProject = useProjectStore((s) => s.createProject);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // Load built-in templates
  useEffect(() => {
    async function load() {
      const loaded: NarrativeTemplate[] = [];
      for (const id of BUILTIN_TEMPLATE_IDS) {
        try {
          const res = await fetch(`/templates/${id}.spellpaw-template.json`);
          if (res.ok) loaded.push(await res.json());
        } catch { /* skip */ }
      }
      setBuiltinTemplates(loaded);
      setLoading(false);
    }
    load();
  }, []);

  const allTemplates = useMemo(() => {
    const list: Array<NarrativeTemplate & { source: string }> = [];
    if (source === 'all' || source === 'builtin') {
      list.push(...builtinTemplates.map((t) => ({ ...t, source: 'builtin' })));
    }
    if (source === 'all' || source === 'custom') {
      list.push(...customTemplates.map((t) => ({ ...t, source: 'custom' })));
    }
    return list;
  }, [builtinTemplates, customTemplates, source]);

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (category) {
      list = list.filter((t) => t.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allTemplates, category, searchQuery]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      await importFromFile(file);
      setSource('custom');
    } catch (err) {
      setImportError((err as Error).message);
    }
    e.target.value = '';
  };

  const handleCreateFromTemplate = async (template: NarrativeTemplate) => {
    const projectId = createProject(template.name, template.description, template.stylePresets.colorPalette[0]);
    try {
      const { toolRouter } = await import('../stores/toolRouter');
      await toolRouter.apply_template({ action: 'apply_template', templateId: template.id, parentId: undefined });
      setCurrentProject(projectId);
      navigate(`/project/${projectId}`);
    } catch (err) {
      console.error('Template application failed:', err);
    }
  };

  const handleExportTemplate = (template: NarrativeTemplate) => {
    downloadTemplateFile(template);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    updateCustomTemplate(editingTemplate.id, {
      name: editingTemplate.name,
      description: editingTemplate.description,
      tags: editingTemplate.tags,
    });
    setEditingTemplate(null);
  };

  const isCustom = (t: NarrativeTemplate) => customTemplates.some((ct) => ct.id === t.id);

  if (loading && source !== 'custom') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="text-xs text-[var(--color-text-tertiary)]">加载模板中…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-base)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Film className="h-5 w-5 text-[var(--color-accent-500)]" />
          <span className="text-base font-semibold text-[var(--color-text-primary)]">模板管理</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-500)]">
            <Upload className="h-3.5 w-3.5" />
            导入模板
            <input type="file" accept=".spellpaw-template.json,application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </header>

      {importError && (
        <div className="mx-6 mt-3 rounded-[var(--radius-sm)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-[11px] text-[var(--color-status-danger-text)]">
          导入失败: {importError}
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[1200px]">
          {/* Search + Source tabs */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="搜索模板名称、描述或标签…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-500)]"
              />
            </div>
            <div className="flex gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-0.5">
              {(['all', 'builtin', 'custom'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[11px] font-medium transition-colors ${
                    source === s
                      ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {s === 'all' ? '全部' : s === 'builtin' ? '内置' : '我的'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory(null)}
              className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
                className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  category === key
                    ? 'bg-[var(--color-bg-accent)] text-[var(--color-text-inverse)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-accent-subtle)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="mb-3 text-[11px] text-[var(--color-text-tertiary)]">
            共 {filtered.length} 个模板
            {searchQuery && ` · 搜索「${searchQuery}」`}
            {category && ` · ${CATEGORY_LABELS[category]}`}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => (
              <div
                key={template.id}
                className="group flex flex-col rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-4 transition-all hover:border-[var(--color-accent-500)] hover:shadow-sm"
              >
                {/* Color bar */}
                <div className="mb-3 flex gap-1">
                  {template.stylePresets.colorPalette.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Title & meta */}
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{template.name}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--color-text-tertiary)]">{template.description}</p>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--color-text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.targetDuration}s
                  </span>
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="h-3 w-3" />
                    {template.structure.acts.reduce((s, a) => s + a.scenes.length, 0)} 场景
                  </span>
                  <span className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    {PLATFORM_LABELS[template.targetPlatform]}
                  </span>
                </div>

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Source badge */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    {template.source === 'builtin' ? '内置' : '我的模板'}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-3 flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-accent)] py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity"
                  >
                    预览 & 使用
                  </button>
                  {isCustom(template) && (
                    <>
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="编辑"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="导出"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(template.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <LayoutGrid className="mx-auto h-8 w-8 text-[var(--color-text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">未找到匹配的模板</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">尝试更换搜索词或分类</p>
            </div>
          )}
        </div>
      </main>

      {/* Preview Drawer */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-[var(--color-bg-primary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs text-[var(--color-text-secondary)]">{previewTemplate.description}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{previewTemplate.targetDuration}s</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">时长</div>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{previewTemplate.structure.acts.length}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">幕数</div>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{PLATFORM_LABELS[previewTemplate.targetPlatform]}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">画幅</div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">结构预览</h4>
                <div className="space-y-3">
                  {previewTemplate.structure.acts.map((act, i) => (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] p-3">
                      <div className="text-xs font-medium text-[var(--color-text-primary)]">{act.title}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">{act.description}</div>
                      <div className="mt-2 space-y-1.5">
                        {act.scenes.map((scene, j) => (
                          <div key={j} className="flex items-start gap-2 rounded bg-[var(--color-bg-secondary)] px-2 py-1.5">
                            <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
                            <div>
                              <div className="text-[11px] text-[var(--color-text-primary)]">{scene.title}</div>
                              {scene.metadata?.duration && (
                                <div className="text-[10px] text-[var(--color-text-tertiary)]">{scene.metadata.duration}s</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">标签</h4>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map((tag) => (
                    <span key={tag} className="rounded px-2 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {previewTemplate.stylePresets.visualStyle && (
                <div className="mt-4">
                  <h4 className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">视觉风格</h4>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">{previewTemplate.stylePresets.visualStyle}</p>
                </div>
              )}
            </div>
            <div className="border-t border-[var(--color-border-default)] p-4">
              <button
                onClick={() => handleCreateFromTemplate(previewTemplate)}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-600)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                使用此模板创建项目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">编辑模板</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">名称</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2.5 text-xs outline-none focus:border-[var(--color-accent-500)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">描述</label>
                <textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs outline-none resize-none focus:border-[var(--color-accent-500)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={editingTemplate.tags.join(', ')}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, tags: e.target.value.split(/,\s*/).filter(Boolean) })}
                  className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2.5 text-xs outline-none focus:border-[var(--color-accent-500)]"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingTemplate(null)}
                className="rounded-[var(--radius-sm)] px-3 py-1.5 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--color-accent-600)]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="删除模板"
        description="此操作不可撤销，模板将被永久删除。"
        onConfirm={() => {
          if (deleteTarget) removeCustomTemplate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

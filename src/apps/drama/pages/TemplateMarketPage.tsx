import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  Trash2,
  Download,
  Edit3,
  X,
  LayoutGrid,
  Clock,
  Palette,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import type { NarrativeTemplate } from '@drama/types';
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { downloadTemplateFile } from '@drama/lib/templateExportImport';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { logger } from '@shared/lib/logger';

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
        } catch {
          /* skip */
        }
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
    const projectId = createProject(
      template.name,
      template.description,
      template.stylePresets.colorPalette[0]
    );
    try {
      const { toolRouter } = await import('../stores/toolRouter');
      await toolRouter.apply_template({
        action: 'apply_template',
        templateId: template.id,
        parentId: undefined,
      });
      setCurrentProject(projectId);
      navigate(`/project/${projectId}`);
    } catch (err) {
      logger.error('Template application failed:', err);
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
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--portal-bg)' }}
      >
        <div className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
          加载模板中…
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Header */}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{
          background: 'oklch(13% 0.015 270 / 0.92)',
          borderColor: 'oklch(100% 0 0 / 0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="返回项目列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <img src="/favicon.svg" alt="SpellPaw" className="h-5 w-5" />
          <span className="text-base font-semibold text-white">模板管理</span>
        </div>
        <label
          className="flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
          style={{
            background: 'oklch(100% 0 0 / 0.04)',
            border: '1px solid oklch(100% 0 0 / 0.08)',
            color: 'var(--portal-text-muted)',
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          导入模板
          <input
            type="file"
            accept=".spellpaw-template.json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </label>
      </header>

      {importError && (
        <div
          className="mx-6 mt-4 rounded-xl px-3 py-2.5 text-xs"
          style={{
            background: 'oklch(22% 0.08 25 / 0.4)',
            color: 'oklch(80% 0.12 25)',
            border: '1px solid oklch(40% 0.12 25 / 0.5)',
          }}
        >
          导入失败: {importError}
        </div>
      )}

      <main className="flex-1 overflow-auto p-6 sm:p-10">
        <div className="mx-auto max-w-[1200px]">
          {/* Page title */}
          <div className="mb-6">
            <div
              className="mb-2 inline-block text-xs font-semibold tracking-[0.18em]"
              style={{ color: 'var(--portal-accent)' }}
            >
              TEMPLATE MARKET
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
            >
              叙事模板
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--portal-text-muted)' }}>
              一键套用经典结构，快速开始你的创作
            </p>
          </div>

          {/* Search + Source tabs */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: 'var(--portal-text-dim)' }}
              />
              <input
                type="text"
                placeholder="搜索模板名称、描述或标签…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full pl-9 pr-3.5 text-sm text-white outline-none"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                  color: 'white',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                }}
              />
            </div>
            <div
              className="flex gap-1 rounded-full p-1"
              style={{
                background: 'oklch(100% 0 0 / 0.04)',
                border: '1px solid oklch(100% 0 0 / 0.06)',
              }}
            >
              {(['all', 'builtin', 'custom'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className="rounded-full px-3.5 py-1 text-[11px] font-medium transition-all"
                  style={
                    source === s
                      ? {
                          background: 'white',
                          color: 'oklch(15% 0.02 270)',
                        }
                      : {
                          color: 'var(--portal-text-muted)',
                        }
                  }
                >
                  {s === 'all' ? '全部' : s === 'builtin' ? '内置' : '我的'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            <CategoryChip active={!category} onClick={() => setCategory(null)}>
              全部
            </CategoryChip>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <CategoryChip
                key={key}
                active={category === key}
                onClick={() => setCategory(key)}
              >
                {label}
              </CategoryChip>
            ))}
          </div>

          {/* Results count */}
          <div className="mb-4 text-[11px]" style={{ color: 'var(--portal-text-dim)' }}>
            共 {filtered.length} 个模板
            {searchQuery && ` · 搜索「${searchQuery}」`}
            {category && ` · ${CATEGORY_LABELS[category]}`}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => (
              <div
                key={template.id}
                className="group flex flex-col rounded-[20px] border p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'var(--portal-bg-elevated)',
                  borderColor: 'var(--portal-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(45% 0.1 275 / 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--portal-border)';
                }}
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
                <h3
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {template.name}
                </h3>
                <p
                  className="mt-1.5 line-clamp-2 text-[11px]"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  {template.description}
                </p>

                {/* Stats */}
                <div
                  className="mt-3 flex items-center gap-3 text-[10px]"
                  style={{ color: 'var(--portal-text-dim)' }}
                >
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
                      className="rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        background: 'oklch(100% 0 0 / 0.05)',
                        color: 'var(--portal-text-muted)',
                        border: '1px solid oklch(100% 0 0 / 0.06)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Source badge */}
                <div
                  className="mt-2.5 flex items-center justify-between text-[10px]"
                  style={{ color: 'var(--portal-text-dim)' }}
                >
                  <span>{template.source === 'builtin' ? '内置' : '我的模板'}</span>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-3.5 flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 rounded-full py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      background: 'white',
                      color: 'oklch(15% 0.02 270)',
                      fontFamily: 'var(--font-family-display)',
                    }}
                  >
                    预览 & 使用
                  </button>
                  {isCustom(template) && (
                    <>
                      <SmallIconButton
                        onClick={() => setEditingTemplate(template)}
                        title="编辑"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </SmallIconButton>
                      <SmallIconButton
                        onClick={() => handleExportTemplate(template)}
                        title="导出"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </SmallIconButton>
                      <SmallIconButton
                        onClick={() => setDeleteTarget(template.id)}
                        title="删除"
                        danger
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SmallIconButton>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div
              className="rounded-[24px] border border-dashed py-20 text-center"
              style={{
                background: 'var(--portal-bg-elevated)',
                borderColor: 'oklch(100% 0 0 / 0.1)',
              }}
            >
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                }}
              >
                <LayoutGrid className="h-5 w-5" style={{ color: 'var(--portal-text-dim)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
                未找到匹配的模板
              </p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--portal-text-dim)' }}>
                尝试更换搜索词或分类
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Preview Drawer */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col"
            style={{
              background: 'var(--portal-bg-elevated)',
              borderLeft: '1px solid var(--portal-border)',
              boxShadow: '-24px 0 60px oklch(0% 0 0 / 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: 'var(--portal-border)' }}
            >
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                {previewTemplate.name}
              </h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--portal-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'oklch(100% 0 0 / 0.06)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--portal-text-muted)';
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs" style={{ color: 'var(--portal-text-muted)' }}>
                {previewTemplate.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <StatBox
                  value={`${previewTemplate.targetDuration}s`}
                  label="时长"
                />
                <StatBox
                  value={`${previewTemplate.structure.acts.length}`}
                  label="幕数"
                />
                <StatBox
                  value={PLATFORM_LABELS[previewTemplate.targetPlatform]}
                  label="画幅"
                />
              </div>

              <div className="mt-4">
                <h4
                  className="mb-2 text-xs font-semibold"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  结构预览
                </h4>
                <div className="space-y-3">
                  {previewTemplate.structure.acts.map((act, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-3"
                      style={{
                        background: 'oklch(100% 0 0 / 0.03)',
                        borderColor: 'oklch(100% 0 0 / 0.06)',
                      }}
                    >
                      <div className="text-xs font-semibold text-white">{act.title}</div>
                      <div className="mt-0.5 text-[10px]" style={{ color: 'var(--portal-text-dim)' }}>
                        {act.description}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {act.scenes.map((scene, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                            style={{ background: 'oklch(100% 0 0 / 0.04)' }}
                          >
                            <div
                              className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: 'var(--portal-accent)' }}
                            />
                            <div>
                              <div className="text-[11px] text-white">{scene.title}</div>
                              {scene.metadata?.duration && (
                                <div className="text-[10px]" style={{ color: 'var(--portal-text-dim)' }}>
                                  {scene.metadata.duration}s
                                </div>
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
                <h4
                  className="mb-1.5 text-xs font-semibold"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  标签
                </h4>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded px-2 py-0.5 text-[10px]"
                      style={{
                        background: 'oklch(100% 0 0 / 0.05)',
                        color: 'var(--portal-text-muted)',
                        border: '1px solid oklch(100% 0 0 / 0.06)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {previewTemplate.stylePresets.visualStyle && (
                <div className="mt-4">
                  <h4
                    className="mb-1.5 text-xs font-semibold"
                    style={{ fontFamily: 'var(--font-family-display)' }}
                  >
                    视觉风格
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--portal-text-muted)' }}>
                    {previewTemplate.stylePresets.visualStyle}
                  </p>
                </div>
              )}
            </div>
            <div className="border-t p-4" style={{ borderColor: 'var(--portal-border)' }}>
              <button
                onClick={() => handleCreateFromTemplate(previewTemplate)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-[oklch(15%_0.02_270)] transition-all hover:scale-[1.01]"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  boxShadow: '0 4px 16px rgba(255,255,255,0.1)',
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                使用此模板创建项目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="w-full max-w-sm rounded-[20px] border p-5"
            style={{
              background: 'var(--portal-bg-elevated)',
              borderColor: 'var(--portal-border)',
              boxShadow: '0 24px 60px oklch(0% 0 0 / 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-4 text-sm font-semibold text-white"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              编辑模板
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-medium"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  名称
                </label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="h-9 w-full rounded-xl px-3 text-xs text-white outline-none"
                  style={{
                    background: 'oklch(100% 0 0 / 0.04)',
                    border: '1px solid oklch(100% 0 0 / 0.08)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  }}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-medium"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  描述
                </label>
                <textarea
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  style={{
                    background: 'oklch(100% 0 0 / 0.04)',
                    border: '1px solid oklch(100% 0 0 / 0.08)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  }}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-medium"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  标签（逗号分隔）
                </label>
                <input
                  type="text"
                  value={editingTemplate.tags.join(', ')}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      tags: e.target.value.split(/,\s*/).filter(Boolean),
                    })
                  }
                  className="h-9 w-full rounded-xl px-3 text-xs text-white outline-none"
                  style={{
                    background: 'oklch(100% 0 0 / 0.04)',
                    border: '1px solid oklch(100% 0 0 / 0.08)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  }}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingTemplate(null)}
                className="rounded-full px-4 py-1.5 text-[11px] transition-colors"
                style={{ color: 'var(--portal-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'oklch(100% 0 0 / 0.06)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--portal-text-muted)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-[oklch(15%_0.02_270)] transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
                }}
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

interface CategoryChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function CategoryChip({ active, onClick, children }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
      style={
        active
          ? {
              background: 'white',
              color: 'oklch(15% 0.02 270)',
              fontFamily: 'var(--font-family-display)',
            }
          : {
              background: 'oklch(100% 0 0 / 0.04)',
              border: '1px solid oklch(100% 0 0 / 0.06)',
              color: 'var(--portal-text-muted)',
            }
      }
    >
      {children}
    </button>
  );
}

interface SmallIconButtonProps {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}

function SmallIconButton({ onClick, title, danger, children }: SmallIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
      style={{
        background: 'oklch(100% 0 0 / 0.04)',
        border: '1px solid oklch(100% 0 0 / 0.06)',
        color: 'var(--portal-text-muted)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'oklch(22% 0.08 25 / 0.4)'
          : 'oklch(50% 0.18 275 / 0.18)';
        e.currentTarget.style.color = danger ? 'oklch(80% 0.12 25)' : 'var(--portal-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'oklch(100% 0 0 / 0.04)';
        e.currentTarget.style.color = 'var(--portal-text-muted)';
      }}
    >
      {children}
    </button>
  );
}

interface StatBoxProps {
  value: string;
  label: string;
}

function StatBox({ value, label }: StatBoxProps) {
  return (
    <div
      className="rounded-xl p-2.5"
      style={{
        background: 'oklch(100% 0 0 / 0.04)',
        border: '1px solid oklch(100% 0 0 / 0.06)',
      }}
    >
      <div
        className="text-base font-bold text-white"
        style={{ fontFamily: 'var(--font-family-display)' }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px]" style={{ color: 'var(--portal-text-dim)' }}>
        {label}
      </div>
    </div>
  );
}

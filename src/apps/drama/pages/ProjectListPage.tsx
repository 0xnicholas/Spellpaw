import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  LayoutGrid,
  Trash2,
  Download,
  Upload,
  FileCode,
  LayoutTemplate,
  Printer,
  FileText,
  Camera,
  Film,
} from 'lucide-react';
import { NewProjectModal } from '@drama/components/modals/NewProjectModal';
import { SnapshotModal } from '@drama/components/modals/SnapshotModal';
import type { NarrativeTemplate } from '@drama/types';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { exportProjectToJSON, importProjectFromJSON } from '@drama/lib/exportImport';
import { logger } from '@shared/lib/logger';
import { treeToTemplate, downloadTemplateFile } from '@drama/lib/templateExportImport';
import { pushAll, pullAll } from '@drama/lib/projectSync';
import { exportStoryboardPDF, exportDialogueScript } from '@drama/lib/exportPrint';

export function ProjectListPage() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deduplicateProjects = useProjectStore((s) => s.deduplicateProjects);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    deduplicateProjects();
  }, [deduplicateProjects]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [snapshotProjectId, setSnapshotProjectId] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    setCurrentProject(id);
    navigate(`/project/${id}`);
  };

  const handleCreate = (title: string, description: string, coverColor: string) => {
    const projectId = createProject(title, description, coverColor);
    navigate(`/project/${projectId}`);
  };

  const handleCreateFromTemplate = async (template: NarrativeTemplate) => {
    const projectId = createProject(template.name, template.description, template.stylePresets.colorPalette[0]);
    try {
      const { toolRouter } = await import('../stores/toolRouter');
      await toolRouter.apply_template({ action: 'apply_template', templateId: template.id, parentId: undefined });
      setCurrentProject(projectId);
      navigate(`/project/${projectId}`);
    } catch (err) {
      logger.error('Template application failed:', err);
    }
  };

  const handleExport = (projectId: string) => {
    const state = useProjectStore.getState();
    const canvasState = useCanvasStore.getState();
    const project = state.projects.find((p) => p.id === projectId);
    const tree = state.trees[projectId];
    if (!project || !tree) return;
    const canvasEntry = canvasState.canvases[projectId];
    exportProjectToJSON(project, tree, canvasEntry?.nodes, canvasEntry?.edges);
  };

  const handleExportAsTemplate = (projectId: string) => {
    const state = useProjectStore.getState();
    const project = state.projects.find((p) => p.id === projectId);
    const tree = state.trees[projectId];
    if (!project || !tree) return;
    const template = treeToTemplate(tree, project);
    downloadTemplateFile(template);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = importProjectFromJSON(text);
        const projectId = createProject(data.title, data.description, '#6366f1');
        const currentTrees = useProjectStore.getState().trees;
        useProjectStore.setState({ trees: { ...currentTrees, [projectId]: data.tree } });
        if (data.canvas?.nodes?.length) {
          useCanvasStore.setState((s) => ({
            canvases: {
              ...s.canvases,
              [projectId]: {
                nodes: data.canvas!.nodes,
                edges: data.canvas?.edges ?? [],
                viewport: { x: 0, y: 0, zoom: 1 },
              },
            },
          }));
        }
        navigate(`/project/${projectId}`);
      } catch (err) {
        alert('文件格式无效：' + (err as Error).message);
      }
    };
    input.click();
  };

  return (
    <div
      className="flex h-full min-h-screen flex-col"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Header — buzzy.now-style */}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{
          background: 'oklch(13% 0.015 270 / 0.72)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderColor: 'oklch(100% 0 0 / 0.06)',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="SpellPaw" className="h-6 w-6" />
          <span
            className="text-[17px] font-bold tracking-[-0.02em] text-white"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--portal-text-muted)' }}>
            {user?.name}
          </span>
          <Link
            to="/console"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
            style={{
              background:
                'linear-gradient(135deg, oklch(55% 0.2 275) 0%, oklch(45% 0.18 290) 100%)',
              boxShadow: '0 0 16px oklch(55% 0.2 275 / 0.3)',
            }}
            title="个人中心"
          >
            {user?.name?.[0] ?? 'U'}
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 sm:p-12">
        <div className="mx-auto max-w-[1100px]">
          {/* Page header */}
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div
                className="mb-2 inline-block text-xs font-semibold tracking-[0.18em]"
                style={{ color: 'var(--portal-accent)' }}
              >
                YOUR PROJECTS
              </div>
              <h1
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
              >
                项目
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--portal-text-muted)' }}>
                继续编辑你的创作，或开始一个新项目
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate('/templates')}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                  color: 'var(--portal-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.5)';
                  e.currentTarget.style.color = 'var(--portal-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  e.currentTarget.style.color = 'var(--portal-text-muted)';
                }}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                模板市场
              </button>

              {user && (
                <>
                  <button
                    onClick={() =>
                      pushAll().then((r) =>
                        alert(
                          `已同步 ${r.synced}${r.errors.length ? `，错误：${r.errors.join('；')}` : ''}`
                        )
                      )
                    }
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all"
                    style={{
                      background: 'oklch(100% 0 0 / 0.04)',
                      border: '1px solid oklch(100% 0 0 / 0.08)',
                      color: 'var(--portal-text-muted)',
                    }}
                    title="推送项目到云端"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    推送
                  </button>
                  <button
                    onClick={() => pullAll().then((r) => alert(`已导入 ${r.imported} 个项目`))}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all"
                    style={{
                      background: 'oklch(100% 0 0 / 0.04)',
                      border: '1px solid oklch(100% 0 0 / 0.08)',
                      color: 'var(--portal-text-muted)',
                    }}
                    title="从云端拉取项目"
                  >
                    <Download className="h-3.5 w-3.5" />
                    拉取
                  </button>
                </>
              )}

              <button
                onClick={handleImport}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                  color: 'var(--portal-text-muted)',
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                导入
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[oklch(15%_0.02_270)] transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  boxShadow: '0 4px 16px rgba(255,255,255,0.12), 0 0 24px oklch(60% 0.2 275 / 0.18)',
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                新建项目
              </button>
            </div>
          </div>

          {/* Project grid */}
          {projects.length === 0 ? (
            <div
              className="rounded-[24px] border py-20 text-center"
              style={{
                background: 'var(--portal-bg-elevated)',
                borderColor: 'var(--portal-border)',
                borderStyle: 'dashed',
              }}
            >
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'oklch(50% 0.18 275 / 0.15)',
                  border: '1px solid oklch(60% 0.16 275 / 0.25)',
                }}
              >
                <Film className="h-6 w-6" style={{ color: 'var(--portal-accent)' }} />
              </div>
              <h3
                className="mb-1.5 text-lg font-semibold text-white"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                还没有项目
              </h3>
              <p className="mb-5 text-sm" style={{ color: 'var(--portal-text-muted)' }}>
                创建你的第一个短剧项目开始创作
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[oklch(15%_0.02_270)] transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  boxShadow: '0 4px 16px rgba(255,255,255,0.12)',
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                新建项目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="group relative">
                  <button
                    onClick={() => handleOpen(project.id)}
                    className="relative w-full overflow-hidden rounded-[20px] border p-5 text-left transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'var(--portal-bg-elevated)',
                      borderColor: 'var(--portal-border)',
                      boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'oklch(45% 0.1 275 / 0.5)';
                      e.currentTarget.style.boxShadow =
                        '0 0 0 1px oklch(60% 0.18 275 / 0.18), 0 16px 40px oklch(0% 0 0 / 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--portal-border)';
                      e.currentTarget.style.boxShadow = '0 1px 0 oklch(100% 0 0 / 0.04) inset';
                    }}
                  >
                    {/* Cover color bar */}
                    <div className="mb-4 flex h-1.5 gap-1">
                      <div
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: project.coverColor, opacity: 0.8 }}
                      />
                      <div
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: project.coverColor, opacity: 0.5 }}
                      />
                      <div
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: project.coverColor, opacity: 0.3 }}
                      />
                    </div>

                    <h3
                      className="mb-1.5 text-base font-semibold text-white"
                      style={{ fontFamily: 'var(--font-family-display)' }}
                    >
                      {project.title}
                    </h3>
                    <p
                      className="mb-4 line-clamp-2 text-xs"
                      style={{ color: 'var(--portal-text-muted)' }}
                    >
                      {project.description}
                    </p>
                    <div
                      className="flex items-center gap-4 text-xs"
                      style={{ color: 'var(--portal-text-dim)' }}
                    >
                      <span className="flex items-center gap-1">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {project.sceneCount} 场景
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {Math.floor(project.duration / 60)}:{String(project.duration % 60).padStart(2, '0')}
                      </span>
                    </div>
                  </button>

                  {/* Quick actions on hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentProject(project.id);
                        setSnapshotProjectId(project.id);
                      }}
                      title="快照"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStoryboardPDF(project.id);
                      }}
                      title="打印分镜表"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDialogueScript(project.id, 'txt');
                      }}
                      title="导出对白脚本"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportAsTemplate(project.id);
                      }}
                      title="导出为模板"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(project.id);
                      }}
                      title="导出 JSON"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(project.id);
                      }}
                      title="删除"
                      danger
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionIconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        onCreateFromTemplate={handleCreateFromTemplate}
      />

      <SnapshotModal
        isOpen={!!snapshotProjectId}
        onClose={() => setSnapshotProjectId(null)}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="删除项目"
        description="这将永久删除项目及其所有数据。"
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface ActionIconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}

function ActionIconButton({ onClick, title, danger, children }: ActionIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md p-1.5 transition-colors"
      style={{
        background: 'oklch(100% 0 0 / 0.05)',
        color: 'var(--portal-text-muted)',
        border: '1px solid oklch(100% 0 0 / 0.06)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'oklch(22% 0.08 25 / 0.4)'
          : 'oklch(50% 0.18 275 / 0.18)';
        e.currentTarget.style.color = danger
          ? 'oklch(80% 0.12 25)'
          : 'var(--portal-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'oklch(100% 0 0 / 0.05)';
        e.currentTarget.style.color = 'var(--portal-text-muted)';
      }}
    >
      {children}
    </button>
  );
}

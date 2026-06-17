import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, LayoutGrid, Trash2, Download, Upload, FileCode, LayoutTemplate, Printer, FileText, Camera } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { NewProjectModal } from '@drama/components/modals/NewProjectModal';
import { SnapshotModal } from '@drama/components/modals/SnapshotModal';
import type { NarrativeTemplate } from '@drama/types';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { exportProjectToJSON, importProjectFromJSON } from '@drama/lib/exportImport';
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
      console.error('Template application failed:', err);
    }
  };

  const handleExport = (projectId: string) => {
    const state = useProjectStore.getState();
    const canvasState = useCanvasStore.getState();
    const project = state.projects.find((p) => p.id === projectId);
    const tree = state.trees[projectId];
    if (!project || !tree) return;
    const canvasEntry = canvasState.canvases[projectId];
    exportProjectToJSON(
      project,
      tree,
      canvasEntry?.nodes,
      canvasEntry?.edges,
    );
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
    <div className="flex h-full min-h-screen flex-col bg-[var(--color-bg-secondary)]">
      <header className="flex h-12 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="SpellPaw" className="h-5 w-5" />
          <span
            className="text-[15px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-tertiary)]">{user?.name}</span>
          <Link
            to="/console"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-xs font-medium text-[var(--color-accent-500)] transition-colors hover:bg-[var(--color-accent-100)]"
            title="个人中心"
          >
            {user?.name?.[0] ?? 'U'}
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                项目
              </h1>
              <button
                onClick={() => navigate('/templates')}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-500)]"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                模板市场
              </button>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <Button variant="outline" size="sm" onClick={() => pushAll().then(r => alert(`已同步 ${r.synced}${r.errors.length ? `，错误：${r.errors.join('；')}` : ''}`))}>
                    <Upload className="mr-1 h-4 w-4" />
                    推送
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => pullAll().then(r => alert(`已导入 ${r.imported} 个项目`))}>
                    <Download className="mr-1 h-4 w-4" />
                    拉取
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="mr-1 h-4 w-4" />
                导入
              </Button>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                新建项目
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="group relative">
                <button
                  onClick={() => handleOpen(project.id)}
                  className="w-full flex flex-col rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 text-left transition-all hover:border-[var(--color-accent-500)] hover:shadow-sm"
                >
                  <div
                    className="mb-4 h-24 w-full rounded-[var(--radius-sm)]"
                    style={{ backgroundColor: project.coverColor, opacity: 0.15 }}
                  />
                  <h3 className="mb-1 text-base font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-500)]">
                    {project.title}
                  </h3>
                  <p className="mb-3 text-xs text-[var(--color-text-tertiary)] line-clamp-2">
                    {project.description}
                  </p>
                  <div className="mt-auto flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentProject(project.id); setSnapshotProjectId(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="快照"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportStoryboardPDF(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="打印分镜表"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportDialogueScript(project.id, 'txt'); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="导出对白脚本"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExportAsTemplate(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="导出为模板"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="导出 JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-status-danger-bg)] hover:text-[var(--color-status-danger-text)]"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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

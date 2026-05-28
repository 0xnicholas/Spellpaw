import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus, Clock, LayoutGrid, Trash2, Download, Upload, Globe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import type { NarrativeTemplate } from '@/types';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/stores/authStore';
import { exportProjectToJSON, importProjectFromJSON } from '@/lib/exportImport';
import { pushAll, pullAll } from '@/lib/projectSync';

export function ProjectListPage() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const user = useAuthStore((s) => s.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);

  const handleOpen = (id: string) => {
    setCurrentProject(id);
    navigate(`/project/${id}`);
  };

  const handleCreate = (title: string, description: string, coverColor: string) => {
    const projectId = createProject(title, description, coverColor);
    navigate(`/project/${projectId}`);
  };

  const handleCreateFromTemplate = (template: NarrativeTemplate) => {
    const projectId = createProject(template.name, template.description, template.stylePresets.colorPalette[0]);
    // Apply template structure via toolRouter
    import('../stores/toolRouter').then(({ toolRouter }) => {
      toolRouter.apply_template({ action: 'apply_template', templateId: template.id, parentId: undefined });
    });
    navigate(`/project/${projectId}`);
  };

  // Gallery
  useEffect(() => {
    authApi.apiCall('/api/gallery').then(res => res.json()).then(setGalleryItems).catch(() => {});
  }, []);

  const handlePublish = async (projectId: string) => {
    try {
      await authApi.apiCall('/api/gallery', { method: 'POST', body: JSON.stringify({ projectId }) });
      const res = await authApi.apiCall('/api/gallery');
      if (res.ok) setGalleryItems(await res.json());
    } catch { /* server not available */ }
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
        alert('Invalid file format: ' + (err as Error).message);
      }
    };
    input.click();
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--color-bg-secondary)]">
      <header className="flex h-12 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-6">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[var(--color-accent-500)]" />
          <span className="text-base font-semibold text-[var(--color-text-primary)]">Spellpaw</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-tertiary)]">{user?.name}</span>
          <div className="h-7 w-7 rounded-full bg-[var(--color-accent-50)] flex items-center justify-center text-xs font-medium text-[var(--color-accent-500)]">
            {user?.name?.[0] ?? 'U'}
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Projects
            </h1>
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <Button variant="outline" size="sm" onClick={() => pushAll().then(r => alert(`Synced ${r.synced}${r.errors.length ? `, errors: ${r.errors.join('; ')}` : ''}`))}>
                    <Upload className="mr-1 h-4 w-4" />
                    Push
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => pullAll().then(r => alert(`Imported ${r.imported} projects`))}>
                    <Download className="mr-1 h-4 w-4" />
                    Pull
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="mr-1 h-4 w-4" />
                Import
              </Button>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New Project
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
                      {project.sceneCount} scenes
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
                    onClick={(e) => { e.stopPropagation(); handleExport(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    title="Export"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(project.id); }}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Gallery toggle */}
      {galleryItems.length > 0 && (
        <div className="border-t border-[var(--color-border-default)] px-6 py-3">
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Globe className="h-3.5 w-3.5" />
            Community Gallery ({galleryItems.length})
          </button>
          {showGallery && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryItems.map((item: any) => (
                <div key={item.id} className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] p-2.5">
                  <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">{item.project?.title}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)]">
                    <span>{item.user?.name}</span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3" /> {item.likes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        onCreateFromTemplate={handleCreateFromTemplate}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Project"
        description="This will permanently delete the project and all its data."
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

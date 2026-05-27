import { useNavigate } from 'react-router-dom';
import { Film, Plus, Clock, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';

export function ProjectListPage() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const user = useAuthStore((s) => s.user);

  const handleOpen = (id: string) => {
    setCurrentProject(id);
    navigate(`/project/${id}`);
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--color-bg-secondary)]">
      {/* Header */}
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

      {/* Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Projects
            </h1>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpen(project.id)}
                className="group relative flex flex-col rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 text-left transition-all hover:border-[var(--color-accent-500)] hover:shadow-sm"
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
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

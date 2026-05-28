import { useMemo, useState } from 'react';
import { Film, Bell, Command, ChevronRight, PanelLeft, Pencil, Download, Settings } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { ProjectSettingsModal } from '@/components/modals/ProjectSettingsModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';

function findNodePath(node: any, targetId: string, path: string[] = []): string[] | null {
  if (!node) return null;
  if (node.id === targetId) return [...path, node.title];
  if (node.children) {
    for (const child of node.children) {
      const result = findNodePath(child, targetId, [...path, node.title]);
      if (result) return result;
    }
  }
  return null;
}

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  );
  const treeData = useProjectStore((s) => s.getCurrentTree());
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const updateProject = useProjectStore((s) => s.updateProject);
  const user = useAuthStore((s) => s.user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);

  const handleExportPDF = () => {
    if (!project || !treeData) return;
    exportStoryboardPDF(project, treeData);
  };

  const path = useMemo(() => {
    if (!treeData || !selectedNodeId) return [];
    return findNodePath(treeData, selectedNodeId) ?? [];
  }, [treeData, selectedNodeId]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-base)] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[var(--color-accent-500)]" />
          <span className="text-base font-semibold text-[var(--color-text-primary)]">Spellpaw</span>
        </div>
        <div className="h-4 w-px bg-[var(--color-border-default)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">{project?.title ?? ''}</span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="Edit project"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={handleExportPDF}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="Export storyboard PDF"
        >
          <Download className="h-3 w-3" />
        </button>
        {path.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
            {path.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {segment}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton icon={<Command className="h-4 w-4" />} label="Command palette" size="sm" />
        <IconButton icon={<Bell className="h-4 w-4" />} label="Notifications" size="sm" />
        <button
          onClick={() => setGlobalSettingsOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-base)] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-xs font-medium text-[var(--color-accent-500)]">
          {user?.name?.[0] ?? 'U'}
        </div>
      </div>

      <ProjectSettingsModal
        isOpen={settingsOpen}
        project={project ?? null}
        onClose={() => setSettingsOpen(false)}
        onSave={(id, updates) => updateProject(id, updates)}
      />
      <SettingsModal isOpen={globalSettingsOpen} onClose={() => setGlobalSettingsOpen(false)} />
    </header>
  );
}

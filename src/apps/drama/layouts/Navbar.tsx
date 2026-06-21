import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Command, ChevronRight, Pencil, Download } from 'lucide-react';
import { IconButton } from '@/shared/components/ui/IconButton';
import { ProjectSettingsModal } from '@drama/components/modals/ProjectSettingsModal';
import { useProjectStore } from '@drama/stores/projectStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { exportStoryboardPDF } from '@drama/lib/exportPDF';
import { useTranslation } from 'react-i18next';
import type { TreeNode } from '@drama/types';

function findNodePath(node: TreeNode | null, targetId: string, path: string[] = []): string[] | null {
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

export function Navbar() {
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  );
  const treeData = useProjectStore((s) => s.getCurrentTree());
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const updateProject = useProjectStore((s) => s.updateProject);
  const user = useAuthStore((s) => s.user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { i18n } = useTranslation();

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
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="SpellPaw" className="h-5 w-5" />
          <span
            className="text-[15px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </Link>
        <div className="h-4 w-px bg-[var(--color-border-default)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">{project?.title ?? ''}</span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="编辑项目"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={handleExportPDF}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="导出分镜 PDF"
        >
          <Download className="h-3 w-3" />
        </button>
        {path.length > 1 && (
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
        <IconButton icon={<Command className="h-4 w-4" />} label="命令面板" size="sm" />
        <IconButton icon={<Bell className="h-4 w-4" />} label="通知" size="sm" />
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'zh-CN' ? 'en' : 'zh-CN')}
          className="flex h-7 items-center rounded-[var(--radius-base)] px-1.5 text-[10px] font-medium text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          title="切换语言"
        >
          {i18n.language === 'zh-CN' ? 'EN' : '中'}
        </button>
        <Link
          to="/console"
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-xs font-medium text-[var(--color-accent-500)] transition-colors hover:bg-[var(--color-accent-100)]"
          title="个人中心"
        >
          {user?.name?.[0] ?? 'U'}
        </Link>
      </div>

      <ProjectSettingsModal
        isOpen={settingsOpen}
        project={project ?? null}
        onClose={() => setSettingsOpen(false)}
        onSave={(id, updates) => updateProject(id, updates)}
      />
    </header>
  );
}

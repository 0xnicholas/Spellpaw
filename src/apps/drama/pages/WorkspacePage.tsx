import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, Group } from 'react-resizable-panels';
import { Navbar } from '@drama/layouts/Navbar';
import { ChatPanel } from '@chat/ChatPanel';
import { CanvasPanel } from '@canvas/CanvasPanel';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';

import { BuilderPanel } from '@shared/components/builder';
import { useHotkeys } from '@/shared/hooks/useHotkeys';
import { useChatStore } from '@drama/stores/chatStore';
import { useToolBridge } from '@drama/hooks/useToolBridge';
import { useProjectStore } from '@drama/stores/projectStore';

function MobileGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-secondary)] p-6 text-center">
        <div>
          <h1 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
            请使用桌面浏览器
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            SpellPaw 是桌面端创作工具，暂不支持移动设备。
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Phase 2: connect to Tool Server WebSocket for Copilot tool calls
  useToolBridge();

  const selectNode = useProjectStore((s) => s.selectNode);
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);

  // Sync current project with URL route parameter
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

  useHotkeys({
    Escape: () => {
      if (deleteTarget) {
        setDeleteTarget(null);
      } else {
        selectNode(null);
      }
    },
  });

  return (
    <MobileGuard>
      <div className="flex h-screen flex-col">
        <Navbar />
        <div className="flex-1 overflow-hidden relative">
          <Group orientation="horizontal" className="h-full">
            <Panel id="center" defaultSize="35%" minSize="25%" maxSize="45%" style={{ minWidth: 280 }}>
              <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                <ChatPanel />
              </div>
            </Panel>
            <Panel id="right" defaultSize="65%" minSize="30%">
              <div className="h-full overflow-hidden">
                <CanvasPanel
                  onAIAction={(prompt) => {
                    if (currentProjectId) {
                      useChatStore.getState().sendMessage(prompt, currentProjectId);
                    }
                  }}
                />
              </div>
            </Panel>
          </Group>
          <BuilderPanel />
        </div>
      </div>
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="删除节点"
        description={
          deleteTarget && deleteTarget.childCount > 0
            ? `该节点包含 ${deleteTarget.childCount} 个子节点，确认全部删除？`
            : '确认删除该节点？'
        }
        onConfirm={() => {
          if (deleteTarget) {
            deleteTreeNode(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

    </MobileGuard>
  );
}

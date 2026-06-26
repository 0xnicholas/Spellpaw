import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
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
        <div className="flex-1 overflow-hidden relative">
          {/* Canvas 占据全部背景 */}
          <div className="absolute inset-0">
            {/* ReactFlowProvider 必须作为 CanvasPanel 的祖先组件提供，
                否则 CanvasPanel 内部的 useViewport() / useReactFlow() 会报错
                "Seems like you have not used zustand provider as an ancestor"。 */}
            <ReactFlowProvider>
              <CanvasPanel
                onAIAction={(prompt) => {
                  if (currentProjectId) {
                    useChatStore.getState().sendMessage(prompt, currentProjectId);
                  }
                }}
              />
            </ReactFlowProvider>
          </div>
          {/* Copilot 浮在左侧 */}
          <div className="absolute left-3 top-3 bottom-3 w-[400px] z-10">
            <ChatPanel />
          </div>
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

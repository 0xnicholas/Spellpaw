import { useState, useEffect } from 'react';
import { Panel, Group, Separator, useGroupRef } from 'react-resizable-panels';
import { Navbar } from '@drama/layouts/Navbar';
import { TaskListPanel } from '@drama/components/task-list/TaskListPanel';
import { TaskChatPanel } from '@drama/components/task-chat/TaskChatPanel';
import { FlowCanvasPanel } from '@drama/components/flow-canvas/FlowCanvasPanel';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { ConflictResolverModal } from '@drama/components/modals/ConflictResolverModal';
import { BuilderPanel } from '@/shared/components/builder';
import { useHotkeys } from '@/shared/hooks/useHotkeys';
import { useToolBridge } from '@drama/hooks/useToolBridge';
import { useProjectStore } from '@drama/stores/projectStore';
import { useTaskSSE } from '@drama/hooks/useTaskSSE';
import { subscribeSync, type SyncEngineState } from '@drama/lib/syncEngine';


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
  // Phase 2: connect to Tool Server WebSocket for Pandaria tool calls
  useToolBridge();
  useTaskSSE();

  const selectNode = useProjectStore((s) => s.selectNode);
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const groupRef = useGroupRef();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);
  const [syncState, setSyncState] = useState<SyncEngineState | null>(null);

  useEffect(() => {
    return subscribeSync(setSyncState);
  }, []);

  const toggleSidebar = () => {
    const layout = groupRef.current?.getLayout();
    if (!layout) return;
    const leftSize = (layout as Record<string, number>).left ?? 0;
    if (leftSize > 5) {
      groupRef.current?.setLayout({ left: 0, center: 30, right: 70 });
    } else {
      groupRef.current?.setLayout({ left: 18, center: 30, right: 52 });
    }
  };

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
        <Navbar onToggleSidebar={toggleSidebar} />
        <div className="flex-1 overflow-hidden relative">
          <Group orientation="horizontal" className="h-full" groupRef={groupRef}>
            <Panel id="left" defaultSize="18%" minSize="18%" maxSize="28%" collapsible collapsedSize="0%" style={{ minWidth: 240 }}>
              <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                <TaskListPanel />
              </div>
            </Panel>
            <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />
            <Panel id="center" defaultSize="30%" minSize="22%" maxSize="40%" style={{ minWidth: 280 }}>
              <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                <TaskChatPanel />
              </div>
            </Panel>
            <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />
            <Panel id="right" defaultSize="54%" minSize="30%">
              <div className="h-full overflow-hidden">
                <FlowCanvasPanel />
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
      <ConflictResolverModal
        conflicts={syncState?.conflicts ?? []}
        onResolved={() => setSyncState((s) => (s ? { ...s, conflicts: [] } : s))}
      />
    </MobileGuard>
  );
}

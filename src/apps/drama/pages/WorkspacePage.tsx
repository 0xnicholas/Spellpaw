import { useState, useEffect } from 'react';
import { Panel, Group, Separator, useGroupRef } from 'react-resizable-panels';
import { Navbar } from '@drama/layouts/Navbar';
import { TreeViewPanel } from '@drama/components/tree-view/TreeViewPanel';
import { AssetManagerPanel } from '@drama/components/asset-manager/AssetManagerPanel';
import { ChatPanel } from '@drama/components/chat-panel/ChatPanel';
import { FlowCanvasPanel } from '@drama/components/flow-canvas/FlowCanvasPanel';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { ConflictResolverModal } from '@drama/components/modals/ConflictResolverModal';
import { useHotkeys } from '@/shared/hooks/useHotkeys';
import { useToolBridge } from '@drama/hooks/useToolBridge';
import { useProjectStore } from '@drama/stores/projectStore';
import { useDetailStore } from '@drama/stores/detailStore';
import { findNode } from '@drama/lib/treeUtils';
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

  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const getCurrentTree = useProjectStore((s) => s.getCurrentTree);
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const groupRef = useGroupRef();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);
  const [syncState, setSyncState] = useState<SyncEngineState | null>(null);

  useEffect(() => {
    return subscribeSync(setSyncState);
  }, []);

  const toggleSidebar = () => {
    const layout = groupRef.current?.getLayout();
    if (!layout) return;
    const leftSize = layout.left ?? 0;
    if (leftSize > 5) {
      groupRef.current?.setLayout({ left: 0, center: 25, right: 75 });
    } else {
      groupRef.current?.setLayout({ left: 18, center: 25, right: 57 });
    }
  };

  useHotkeys({
    'Cmd+Enter': () => {},
    Delete: () => {
      if (selectedNodeId && !deleteTarget) {
        const tree = getCurrentTree();
        if (tree) {
          const node = findNode(tree, selectedNodeId);
          if (node) {
            setDeleteTarget({ id: selectedNodeId, childCount: node.children?.length ?? 0 });
          }
        }
      }
    },
    Escape: () => {
      if (deleteTarget) {
        setDeleteTarget(null);
      } else if (activeTab === 'details') {
        setActiveTab('chat');
      } else {
        selectNode(null);
      }
    },
  });

  return (
    <MobileGuard>
      <div className="flex h-screen flex-col">
        <Navbar onToggleSidebar={toggleSidebar} />
        <div className="flex-1 overflow-hidden">
          <Group orientation="horizontal" className="h-full" groupRef={groupRef}>
            <Panel id="left" defaultSize="18%" minSize="18%" maxSize="28%" collapsible collapsedSize="0%" style={{ minWidth: 240 }}>
              <Group orientation="vertical" style={{ height: '100%' }}>
                <Panel defaultSize="55%" minSize="20%" style={{ minHeight: 120 }}>
                  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                    <TreeViewPanel />
                  </div>
                </Panel>
                <Separator className="h-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />
                <Panel defaultSize="45%" minSize="20%" style={{ minHeight: 120 }}>
                  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                    <AssetManagerPanel />
                  </div>
                </Panel>
              </Group>
            </Panel>
            <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />
            <Panel id="center" defaultSize="25%" minSize="22%" maxSize="40%" style={{ minWidth: 280 }}>
              <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
                <ChatPanel />
              </div>
            </Panel>
            <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />
            <Panel id="right" defaultSize="54%" minSize="30%">
              <div className="h-full overflow-hidden">
                <FlowCanvasPanel />
              </div>
            </Panel>
          </Group>
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

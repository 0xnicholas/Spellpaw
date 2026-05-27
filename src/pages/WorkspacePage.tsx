import { useState, useEffect } from 'react';
import { Panel, Group, Separator, useGroupRef } from 'react-resizable-panels';
import { Navbar } from '@/layouts/Navbar';
import { TreeViewPanel } from '@/components/tree-view/TreeViewPanel';
import { AssetManagerPanel } from '@/components/asset-manager/AssetManagerPanel';
import { ChatPanel } from '@/components/chat-panel/ChatPanel';
import { FlowCanvasPanel } from '@/components/flow-canvas/FlowCanvasPanel';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useProjectStore } from '@/stores/projectStore';
import { useDetailStore } from '@/stores/detailStore';
import { findNode } from '@/lib/treeUtils';


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
            Please use a desktop browser
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Spellpaw is a desktop productivity tool and does not currently support mobile devices.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function WorkspacePage() {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const getCurrentTree = useProjectStore((s) => s.getCurrentTree);
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const groupRef = useGroupRef();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);

  const toggleSidebar = () => {
    const layout = groupRef.current?.getLayout();
    if (!layout) return;
    const leftSize = layout.left ?? 0;
    if (leftSize > 5) {
      groupRef.current?.setLayout({ left: 0, center: 28, right: 72 });
    } else {
      groupRef.current?.setLayout({ left: 18, center: 28, right: 54 });
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
            <Panel id="center" defaultSize="28%" minSize="22%" maxSize="45%" style={{ minWidth: 320 }}>
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
        title="Delete Node"
        description={
          deleteTarget && deleteTarget.childCount > 0
            ? `This node has ${deleteTarget.childCount} children. Delete all?`
            : 'Are you sure you want to delete this node?'
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

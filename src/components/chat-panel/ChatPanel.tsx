import { useCallback } from 'react';
import { TabBar } from '@/components/ui/TabBar';
import { TabPanel } from '@/components/ui/TabPanel';
import { DetailPanel } from '@/components/detail-panel/DetailPanel';
import { ContextBar } from './ContextBar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { QuickActions } from './QuickActions';
import { useChatStore } from '@/stores/chatStore';
import { useDetailStore } from '@/stores/detailStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePandariaSSE } from '@/hooks/usePandariaSSE';
import { findNode, findParent } from '@/lib/treeUtils';
import { generateId } from '@/lib/utils';
import { toolRouter } from '@/stores/toolRouter';
import type { ChatAction } from '@/types';

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const addTreeNode = useProjectStore((s) => s.addTreeNode);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);

  // Phase 2: connect to Pandaria for real-time AI collaboration
  usePandariaSSE();

  const handleActionClick = useCallback(
    (action: ChatAction) => {
      const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

      switch (action.type) {
        case 'generate_storyboard': {
          if (!selectedNodeId) {
            sendMessage('请帮我为当前场景生成分镜图');
            return;
          }
          void toolRouter.generate_storyboard({
            action: 'generate_storyboard',
            nodeId: selectedNodeId,
          });
          break;
        }
        case 'insert_scene': {
          const parentId = node?.type === 'act' ? selectedNodeId : findParent(tree, selectedNodeId ?? '')?.id;
          if (parentId) {
            addTreeNode(parentId, {
              id: generateId('tree_scene_'),
              type: 'scene',
              title: action.label || 'New Scene',
              status: 'draft',
            });
          }
          break;
        }
        case 'modify_script': {
          if (selectedNodeId) {
            setActiveTab('details');
          }
          break;
        }
        case 'custom': {
          if (action.payload?.followUp) {
            sendMessage(action.payload.followUp as string);
          } else {
            sendMessage(action.label);
          }
          break;
        }
      }
    },
    [selectedNodeId, tree, sendMessage, addTreeNode, setActiveTab]
  );

  const showDetailsTab = !!selectedNodeId;
  const tabs = showDetailsTab
    ? [
        { id: 'chat', label: 'Chat' },
        { id: 'details', label: 'Details' },
      ]
    : [{ id: 'chat', label: 'Chat' }];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <TabBar tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as 'chat' | 'details')} />
      <div className="flex-1 overflow-hidden">
        <TabPanel isActive={activeTab === 'chat' || !showDetailsTab}>
          <ContextBar onClick={() => selectedNodeId && setFilterNodeId(selectedNodeId)} />
          <QuickActions onAction={(label) => sendMessage(label)} />
          <MessageList onActionClick={handleActionClick} />
          <MessageInput />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details' && showDetailsTab}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}

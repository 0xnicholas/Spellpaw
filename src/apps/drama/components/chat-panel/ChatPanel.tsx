import { useCallback } from 'react';
import { TabBar } from '@/shared/components/ui/TabBar';
import { TabPanel } from '@/shared/components/ui/TabPanel';
import { DetailPanel } from '@drama/components/detail-panel/DetailPanel';
import { CopilotChat } from '@/shared/components/copilot';
import { ContextBar } from './ContextBar';
import { QuickActions } from './QuickActions';
import { useChatStore } from '@drama/stores/chatStore';
import { useDetailStore } from '@drama/stores/detailStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { usePandariaSSE } from '@drama/hooks/usePandariaSSE';
import { findNode, findParent } from '@drama/lib/treeUtils';
import { generateId } from '@/shared/lib/utils';
import { toolRouter } from '@drama/stores/toolRouter';
import type { ChatAction } from '@shared/types';

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const toolCalls = useChatStore((s) => s.toolCalls);
  const isLoading = useChatStore((s) => s.isLoading);
  const filterNodeId = useChatStore((s) => s.filterNodeId);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);

  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const addTreeNode = useProjectStore((s) => s.addTreeNode);

  // Phase 2: connect to Pandaria for real-time AI collaboration
  usePandariaSSE();

  const filteredMessages = filterNodeId
    ? messages.filter((m) => m.context?.nodeId === filterNodeId || m.role === 'agent')
    : messages;

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
          const parentId =
            node?.type === 'act'
              ? selectedNodeId
              : findParent(tree, selectedNodeId ?? '')?.id;
          if (parentId) {
            addTreeNode(parentId, {
              id: generateId('tree_scene_'),
              type: 'scene',
              title: action.label || '新场景',
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
        { id: 'chat', label: '对话' },
        { id: 'details', label: '详情' },
      ]
    : [{ id: 'chat', label: '对话' }];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'chat' | 'details')}
      />
      <div className="flex-1 overflow-hidden">
        <TabPanel
          isActive={activeTab === 'chat' || !showDetailsTab}
          className="flex flex-col overflow-hidden"
        >
          <ContextBar
            onClick={() => selectedNodeId && setFilterNodeId(selectedNodeId)}
          />
          <QuickActions onAction={(label) => sendMessage(label)} />
          <CopilotChat
            messages={filteredMessages}
            streamingText={streamingMessage}
            toolCalls={toolCalls}
            isLoading={isLoading}
            onSend={sendMessage}
            onActionClick={handleActionClick}
            placeholder="输入创作想法…"
          />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details' && showDetailsTab}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}

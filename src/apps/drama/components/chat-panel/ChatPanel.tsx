import { useCallback, useEffect } from 'react';
import { TabBar } from '@/shared/components/ui/TabBar';
import { TabPanel } from '@/shared/components/ui/TabPanel';
import { DetailPanel } from '@drama/components/detail-panel/DetailPanel';
import { CopilotChat } from '@/shared/components/copilot';
import { ContextBar } from './ContextBar';
import { QuickActions } from './QuickActions';
import { WorkflowGuide } from './WorkflowGuide';
import { useChatStore } from '@drama/stores/chatStore';
import { useDetailStore } from '@drama/stores/detailStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCopilotSSE } from '@drama/hooks/useCopilotSSE';
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
  const loadChat = useChatStore((s) => s.loadChat);
  const pushProactiveInsights = useChatStore((s) => s.pushProactiveInsights);

  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const addTreeNode = useProjectStore((s) => s.addTreeNode);

  // Phase 2: connect to LLM provider for real-time AI collaboration
  useCopilotSSE();

  // Load project-scoped chat history when the active project changes.
  useEffect(() => {
    if (currentProjectId) {
      void loadChat(currentProjectId);
    } else {
      useChatStore.setState({ messages: [] });
    }
  }, [currentProjectId, loadChat]);

  // Proactive insights: when a project is loaded with no prior chat history,
  // scan the tree and post a "💡 Agent Suggestion" message if anything needs
  // attention. Throttled to once per project per session.
  useEffect(() => {
    if (!currentProjectId) return;
    const sessionKey = `proactive:${currentProjectId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    // Wait a tick for loadChat to settle so we can check if messages are empty.
    const timer = setTimeout(() => {
      const state = useChatStore.getState();
      if (state.messages.length === 0 && state.streamingMessage == null) {
        const insights = state.pushProactiveInsights(currentProjectId);
        if (insights.length > 0) {
          sessionStorage.setItem(sessionKey, String(Date.now()));
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [currentProjectId, pushProactiveInsights]);

  const filteredMessages = filterNodeId
    ? messages.filter((m) => m.context?.nodeId === filterNodeId || m.role === 'agent')
    : messages;

  const handleSendMessage = useCallback(
    (content: string) => {
      if (currentProjectId) {
        sendMessage(content, currentProjectId);
      }
    },
    [currentProjectId, sendMessage]
  );

  const handleActionClick = useCallback(
    (action: ChatAction) => {
      const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

      switch (action.type) {
        case 'generate_storyboard': {
          if (!selectedNodeId) {
            handleSendMessage('请帮我为当前场景生成分镜图');
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
            handleSendMessage(action.payload.followUp as string);
          } else {
            handleSendMessage(action.label);
          }
          break;
        }
      }
    },
    [selectedNodeId, tree, handleSendMessage, addTreeNode, setActiveTab]
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
          <QuickActions onAction={handleSendMessage} />
          <CopilotChat
            messages={filteredMessages}
            streamingText={streamingMessage}
            toolCalls={toolCalls}
            isLoading={isLoading}
            onSend={handleSendMessage}
            onActionClick={handleActionClick}
            placeholder="输入创作想法…"
            emptyState={<WorkflowGuide />}
          />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details' && showDetailsTab}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}

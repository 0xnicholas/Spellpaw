import { useEffect } from 'react';
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

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);

  // Phase 2: connect to Pandaria for real-time AI collaboration
  usePandariaSSE();

  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('details');
    }
  }, [selectedNodeId, setActiveTab]);

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
          <ContextBar />
          <QuickActions onAction={(label) => sendMessage(label)} />
          <MessageList />
          <MessageInput />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details' && showDetailsTab}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}

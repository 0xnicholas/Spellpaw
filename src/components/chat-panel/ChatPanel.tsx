import { ContextBar } from './ContextBar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { QuickActions } from './QuickActions';
import { useChatStore } from '@/stores/chatStore';

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">

      <ContextBar />
      <QuickActions onAction={(label) => sendMessage(label)} />
      <MessageList />
      <MessageInput />
    </div>
  );
}

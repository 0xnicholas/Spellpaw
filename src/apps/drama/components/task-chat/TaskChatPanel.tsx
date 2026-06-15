import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageList } from '@/shared/components/copilot/MessageList';
import { MessageInput } from '@/shared/components/copilot/MessageInput';
import { TaskChatHeader } from './TaskChatHeader';
import { useTaskStore } from '@drama/stores/taskStore';
import { useProjectStore } from '@drama/stores/projectStore';

export function TaskChatPanel() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const streamingMessage = useTaskStore((s) => s.streamingMessage);
  const streamingTaskId = useTaskStore((s) => s.streamingTaskId);
  const toolCalls = useTaskStore((s) => s.toolCalls);
  const createTask = useTaskStore((s) => s.createTask);
  const sendMessage = useTaskStore((s) => s.sendMessage);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const markCompleted = useTaskStore((s) => s.markCompleted);
  const markInProgress = useTaskStore((s) => s.markInProgress);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const isStreaming = streamingTaskId === activeTaskId && streamingMessage !== null;

  const handleSend = useCallback((content: string) => {
    if (activeTaskId) {
      sendMessage(activeTaskId, content);
    } else if (currentProjectId) {
      const newId = createTask(currentProjectId);
      // sendMessage is intercepted by useTaskSSE which calls Pandaria
      sendMessage(newId, content);
    }
  }, [activeTaskId, sendMessage, createTask, currentProjectId]);

  // Empty state: no active task selected
  if (!activeTask) {
    return (
      <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <Sparkles className="h-10 w-10 text-[var(--color-text-tertiary)] mb-3" />
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1">
            新对话
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-6">
            描述你想做的事，Agent 将为你创建任务
          </p>
        </div>
        <MessageInput onSend={handleSend} disabled={false} />
      </div>
    );
  }

  // Active task chat view
  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <TaskChatHeader
        task={activeTask}
        onDelete={() => deleteTask(activeTask.id)}
        onMarkCompleted={() => markCompleted(activeTask.id)}
        onContinueEdit={() => markInProgress(activeTask.id)}
      />
      <MessageList
        messages={activeTask.messages}
        streamingMessage={isStreaming ? streamingMessage : null}
        isLoading={isStreaming}
        toolCalls={isStreaming ? toolCalls : []}
      />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}

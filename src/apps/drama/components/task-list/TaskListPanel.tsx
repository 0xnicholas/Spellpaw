import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { PanelHeader } from '@/shared/components/ui/PanelHeader';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '@drama/stores/taskStore';
import { useProjectStore } from '@drama/stores/projectStore';

export function TaskListPanel() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const setActiveTask = useTaskStore((s) => s.setActiveTask);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const [showCompleted, setShowCompleted] = useState(false);

  // Filter tasks by current project
  const projectTasks = tasks.filter((t) => t.projectId === currentProjectId);
  const inProgress = projectTasks.filter((t) => t.status === 'in_progress');
  const pendingReview = projectTasks.filter((t) => t.status === 'pending_review');
  const completed = projectTasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <PanelHeader title="任务" icon={<ListTodo className="h-4 w-4" />} />

      <div className="flex-1 overflow-y-auto">
        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              🔄 进行中 ({inProgress.length})
            </div>
            {inProgress.map((task) => (
              <TaskCard key={task.id} task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)} />
            ))}
          </div>
        )}

        {/* Pending Review */}
        {pendingReview.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              👁 待审查 ({pendingReview.length})
            </div>
            {pendingReview.map((task) => (
              <TaskCard key={task.id} task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)} />
            ))}
          </div>
        )}

        {/* Completed (collapsible) */}
        {completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors flex items-center gap-1"
            >
              <span className="inline-block transition-transform" style={{ transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              ✅ 已完成 ({completed.length})
            </button>
            {showCompleted && completed.map((task) => (
              <TaskCard key={task.id} task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {projectTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ListTodo className="h-8 w-8 text-[var(--color-text-tertiary)] mb-2" />
            <p className="text-xs text-[var(--color-text-tertiary)]">暂无任务</p>
            <p className="text-[10px] text-[var(--color-text-quaternary)] mt-1">在右侧对话中输入开始</p>
          </div>
        )}
      </div>
    </div>
  );
}

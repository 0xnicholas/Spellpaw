import { Trash2 } from 'lucide-react';
import type { AgentTask } from '@drama/types';

interface TaskChatHeaderProps {
  task: AgentTask;
  onDelete: () => void;
  onMarkCompleted: () => void;
  onContinueEdit: () => void;
}

export function TaskChatHeader({ task, onDelete, onMarkCompleted, onContinueEdit }: TaskChatHeaderProps) {
  const badgeStyle = task.status === 'pending_review'
    ? { background: 'var(--color-bg-accent-subtle)', color: 'var(--color-accent-500)' }
    : task.status === 'completed'
      ? { background: 'var(--color-status-success-bg)', color: 'var(--color-status-success-text)' }
      : { background: 'var(--color-status-warning-bg)', color: 'var(--color-status-warning-text)' };

  const badgeLabel = task.status === 'pending_review' ? '待审查'
    : task.status === 'completed' ? '已完成' : '进行中';

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-2">
      <span className="font-semibold text-[13px] text-[var(--color-text-primary)] truncate flex-1">
        {task.title || '新任务'}
      </span>

      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
        style={badgeStyle}>
        {badgeLabel}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status === 'pending_review' && (
          <>
            <button
              onClick={onMarkCompleted}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium
                bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]
                hover:opacity-80 transition-opacity"
            >
              ✓ 完成
            </button>
            <button
              onClick={onContinueEdit}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium
                bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]
                hover:bg-[var(--color-border-default)] transition-colors"
            >
              继续修改
            </button>
          </>
        )}
        {task.status === 'completed' && (
          <button
            onClick={onContinueEdit}
            className="text-[10px] px-1.5 py-0.5 rounded font-medium
              bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]
              hover:bg-[var(--color-border-default)] transition-colors"
          >
            继续对话
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-0.5 rounded text-[var(--color-text-tertiary)]
            hover:bg-[var(--color-status-danger-bg)] hover:text-[var(--color-status-danger-text)]
            transition-colors ml-1"
          title="删除任务"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

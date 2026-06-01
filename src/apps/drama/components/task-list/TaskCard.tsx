// src/apps/drama/components/task-list/TaskCard.tsx

import type { AgentTask } from '@drama/types';

interface TaskCardProps {
  task: AgentTask;
  isActive: boolean;
  onClick: () => void;
}

const statusIcons: Record<AgentTask['status'], string> = {
  in_progress: '🔄',
  pending_review: '👁',
  completed: '✅',
};

function getTimeAgo(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function TaskCard({ task, isActive, onClick }: TaskCardProps) {
  const icon = statusIcons[task.status];
  const messageCount = task.messages.length;
  const timeAgo = getTimeAgo(task.updatedAt);

  const leftBorderColor = task.status === 'pending_review' && !isActive
    ? 'var(--color-accent-500)'
    : isActive ? 'var(--color-bg-accent)' : 'transparent';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2.5 border-b border-[var(--color-border-default)]
        transition-colors duration-75 group
        ${isActive
          ? 'bg-[var(--color-bg-secondary)]'
          : 'bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)]'
        }
        ${task.status === 'completed' ? 'opacity-50' : ''}
      `}
      style={{ borderLeft: `3px solid ${leftBorderColor}` }}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm leading-none mt-0.5 flex-shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[13px] text-[var(--color-text-primary)] truncate">
            {task.title || '新任务'}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
            {messageCount > 0 && <span>{messageCount} 条消息</span>}
            <span>·</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

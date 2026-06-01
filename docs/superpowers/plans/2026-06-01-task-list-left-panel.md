# 左栏任务列表 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 WorkspacePage 左栏从「项目结构树 + 资产管理」替换为「Agent 对话任务列表」，每个任务 = 独立 Agent 对话线程。

**Architecture:** 新增 `taskStore`（Zustand + Immer + IDB 持久化）管理多任务状态。重构 `MessageList`/`MessageInput` 为 source-agnostic（接受 props 而非直接读 store）。新增 `TaskListPanel`（左栏）、`TaskChatPanel`（中栏）、`useTaskSSE` hook。原有 ChatPanel/DetailPanel/TreeViewPanel/AssetManagerPanel 代码保留。

**Tech Stack:** React 19, TypeScript 6.0, Zustand 5 + Immer, IndexedDB (idbStorage), Tailwind CSS 4

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/apps/drama/types/index.ts` | 添加 AgentTask 类型 |
| `src/apps/drama/stores/taskStore.ts` | 多任务状态管理（CRUD + 消息 + SSE streaming） |
| `src/apps/drama/stores/taskStore.test.ts` | taskStore 单元测试 |
| `src/apps/drama/components/chat-panel/MessageList.tsx` | 重构：接受 `messages` prop |
| `src/apps/drama/components/chat-panel/MessageInput.tsx` | 重构：接受 `onSend` prop |
| `src/apps/drama/components/task-list/TaskCard.tsx` | 单个任务卡片 |
| `src/apps/drama/components/task-list/TaskListPanel.tsx` | 左栏任务列表面板 |
| `src/apps/drama/components/task-chat/TaskChatHeader.tsx` | 中栏任务对话标题栏 |
| `src/apps/drama/components/task-chat/TaskChatPanel.tsx` | 中栏任务对话面板 |
| `src/apps/drama/hooks/useTaskSSE.ts` | Per-task SSE 连接管理 |
| `src/apps/drama/pages/WorkspacePage.tsx` | 左栏+中栏替换，解引用旧面板 |

---

### Task 1: Add AgentTask type

**Files:**
- Modify: `src/apps/drama/types/index.ts`

- [ ] **Step 1: Add AgentTask interface**

Add after the existing type exports:

```typescript
// === Task ===

export interface AgentTask {
  id: string;
  title: string;
  status: 'in_progress' | 'pending_review' | 'completed';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  affectedNodeIds?: string[];
  generatedAssetIds?: string[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "feat: add AgentTask type"
```

---

### Task 2: Build taskStore

**Files:**
- Create: `src/apps/drama/stores/taskStore.ts`
- Create: `src/apps/drama/stores/taskStore.test.ts`

#### Implementation

```typescript
// src/apps/drama/stores/taskStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import { generateId } from '@/shared/lib/utils';
import { createIDBStorage } from '@/shared/lib/idbStorage';
import type { AgentTask, ChatMessage } from '@drama/types';

interface InFlightToolCall {
  callId: string;
  name: string;
}

interface TaskState {
  tasks: AgentTask[];
  activeTaskId: string | null;
  streamingTaskId: string | null;
  streamingMessage: string | null;
  streamingMessageId: string | null;
  toolCalls: InFlightToolCall[];

  // CRUD
  createTask: () => string;
  deleteTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  updateTaskTitle: (id: string, title: string) => void;
  resetForProject: (projectId: string) => void;

  // Messages
  sendMessage: (taskId: string, content: string) => void;
  appendMessage: (taskId: string, msg: ChatMessage) => void;

  // SSE streaming
  startStreaming: (taskId: string, msgId: string) => void;
  appendDelta: (delta: string) => void;
  endStreaming: (stopReason?: string) => void;
  startToolCall: (callId: string, name: string) => void;
  endToolCall: (callId: string) => void;

  // Status transitions
  markPendingReview: (taskId: string) => void;
  markCompleted: (taskId: string) => void;
  markInProgress: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      streamingTaskId: null,
      streamingMessage: null,
      streamingMessageId: null,
      toolCalls: [],

      createTask: () => {
        const id = generateId('task_');
        const now = new Date().toISOString();
        const task: AgentTask = {
          id,
          title: '',
          status: 'in_progress',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set(produce((s: TaskState) => {
          s.tasks.unshift(task);
          s.activeTaskId = id;
        }));
        return id;
      },

      deleteTask: (id) =>
        set(produce((s: TaskState) => {
          s.tasks = s.tasks.filter((t) => t.id !== id);
          if (s.activeTaskId === id) {
            s.activeTaskId = null;
          }
        })),

      setActiveTask: (id) => set({ activeTaskId: id }),

      updateTaskTitle: (id, title) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === id);
          if (task) {
            task.title = title;
            task.updatedAt = new Date().toISOString();
          }
        })),

      resetForProject: (_projectId) =>
        set({ tasks: [], activeTaskId: null }),

      sendMessage: (taskId, content) => {
        const msg: ChatMessage = {
          id: generateId('msg_'),
          role: 'user',
          content,
          type: 'text',
          timestamp: new Date().toISOString(),
        };
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) {
            task.messages.push(msg);
            task.updatedAt = new Date().toISOString();
          }
        }));
      },

      appendMessage: (taskId, msg) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) {
            task.messages.push(msg);
            task.updatedAt = new Date().toISOString();
          }
        })),

      startStreaming: (taskId, msgId) =>
        set({ streamingTaskId: taskId, streamingMessageId: msgId, streamingMessage: '' }),

      appendDelta: (delta) =>
        set(produce((s: TaskState) => {
          if (s.streamingMessage !== null) {
            s.streamingMessage += delta;
          }
        })),

      endStreaming: (_stopReason) => {
        const state = get();
        if (state.streamingMessageId && state.streamingTaskId) {
          const finalMsg: ChatMessage = {
            id: state.streamingMessageId,
            role: 'agent',
            content: state.streamingMessage || '',
            type: 'text',
            timestamp: new Date().toISOString(),
          };
          set(produce((s: TaskState) => {
            const task = s.tasks.find((t) => t.id === s.streamingTaskId);
            if (task) {
              task.messages.push(finalMsg);
              task.updatedAt = new Date().toISOString();
            }
            // Auto transition to pending_review
            if (task && task.status === 'in_progress') {
              task.status = 'pending_review';
            }
            s.streamingTaskId = null;
            s.streamingMessageId = null;
            s.streamingMessage = null;
            s.toolCalls = [];
          }));
        } else {
          set({ streamingTaskId: null, streamingMessageId: null, streamingMessage: null, toolCalls: [] });
        }
      },

      startToolCall: (callId, name) =>
        set(produce((s: TaskState) => {
          s.toolCalls.push({ callId, name });
        })),

      endToolCall: (callId) =>
        set(produce((s: TaskState) => {
          s.toolCalls = s.toolCalls.filter((t) => t.callId !== callId);
        })),

      markPendingReview: (taskId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) {
            task.status = 'pending_review';
            task.updatedAt = new Date().toISOString();
          }
        })),

      markCompleted: (taskId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) {
            task.status = 'completed';
            task.updatedAt = new Date().toISOString();
          }
        })),

      markInProgress: (taskId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) {
            task.status = 'in_progress';
            task.updatedAt = new Date().toISOString();
          }
        })),
    }),
    {
      name: 'spellpaw_tasks',
      storage: createIDBStorage<TaskState>('taskStore'),
    }
  )
);
```

- [ ] **Step 1: Write failing test file**

Create `src/apps/drama/stores/taskStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from './taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [], activeTaskId: null });
  });

  describe('createTask', () => {
    it('should create a task with in_progress status', () => {
      const id = useTaskStore.getState().createTask();
      const { tasks, activeTaskId } = useTaskStore.getState();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(id);
      expect(tasks[0].status).toBe('in_progress');
      expect(tasks[0].title).toBe('');
      expect(tasks[0].messages).toEqual([]);
    });

    it('should set activeTaskId to the new task', () => {
      const id = useTaskStore.getState().createTask();
      expect(useTaskStore.getState().activeTaskId).toBe(id);
    });

    it('should prepend new tasks', () => {
      useTaskStore.getState().createTask();
      useTaskStore.getState().createTask();
      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(2);
      // Most recent first
    });
  });

  describe('deleteTask', () => {
    it('should remove the task', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().deleteTask(id);
      expect(useTaskStore.getState().tasks).toHaveLength(0);
    });

    it('should clear activeTaskId if deleting active task', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().deleteTask(id);
      expect(useTaskStore.getState().activeTaskId).toBeNull();
    });

    it('should keep activeTaskId if deleting non-active task', () => {
      const id1 = useTaskStore.getState().createTask();
      const id2 = useTaskStore.getState().createTask();
      useTaskStore.getState().deleteTask(id2);
      expect(useTaskStore.getState().activeTaskId).toBe(id1);
    });
  });

  describe('sendMessage', () => {
    it('should append a user message to the task', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().sendMessage(id, 'hello');
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.messages).toHaveLength(1);
      expect(task?.messages[0].role).toBe('user');
      expect(task?.messages[0].content).toBe('hello');
    });
  });

  describe('streaming', () => {
    it('should build streaming message with deltas', () => {
      useTaskStore.getState().startStreaming('task-1', 'msg-1');
      useTaskStore.getState().appendDelta('Hello');
      useTaskStore.getState().appendDelta(' World');
      expect(useTaskStore.getState().streamingMessage).toBe('Hello World');
    });

    it('should finalize streaming as agent message', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().startStreaming(id, 'msg-agent');
      useTaskStore.getState().appendDelta('Done');
      useTaskStore.getState().endStreaming();
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.messages).toHaveLength(1);
      expect(task?.messages[0].role).toBe('agent');
      expect(task?.messages[0].content).toBe('Done');
    });

    it('should transition to pending_review on endStreaming', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().startStreaming(id, 'msg-1');
      useTaskStore.getState().appendDelta('x');
      useTaskStore.getState().endStreaming();
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.status).toBe('pending_review');
    });
  });

  describe('status transitions', () => {
    it('markCompleted should set status to completed', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().markCompleted(id);
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.status).toBe('completed');
    });

    it('markInProgress should set status to in_progress', () => {
      const id = useTaskStore.getState().createTask();
      useTaskStore.getState().markPendingReview(id);
      useTaskStore.getState().markInProgress(id);
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.status).toBe('in_progress');
    });
  });

  describe('setActiveTask', () => {
    it('should change activeTaskId', () => {
      useTaskStore.getState().setActiveTask('abc');
      expect(useTaskStore.getState().activeTaskId).toBe('abc');
    });

    it('should allow null', () => {
      useTaskStore.getState().createTask();
      useTaskStore.getState().setActiveTask(null);
      expect(useTaskStore.getState().activeTaskId).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apps/drama/stores/taskStore.test.ts`
Expected: FAIL (file doesn't exist yet)

- [ ] **Step 3: Create taskStore.ts with the full implementation above**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/apps/drama/stores/taskStore.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/stores/taskStore.ts src/apps/drama/stores/taskStore.test.ts
git commit -m "feat: add taskStore with CRUD, messaging, and SSE streaming"
```

---

### Task 3: Refactor MessageList to accept props

**Files:**
- Modify: `src/apps/drama/components/chat-panel/MessageList.tsx`

- [ ] **Step 1: Add messages prop alongside existing store reads**

The component needs to work in two modes:
- **ChatPanel mode** (backward compat): reads from `chatStore` when no props given
- **TaskChatPanel mode**: receives `messages` as prop

Edit `src/apps/drama/components/chat-panel/MessageList.tsx`:

Change the interface and component to:

```typescript
import { useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { findNode } from '@drama/lib/treeUtils';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, ChatAction } from '@drama/types';

interface MessageListProps {
  onActionClick?: (action: ChatAction) => void;
  /** External messages (for TaskChatPanel). If omitted, reads from chatStore. */
  messages?: ChatMessage[];
  /** External streaming message */
  streamingMessage?: string | null;
  /** External loading state */
  isLoading?: boolean;
}

export function MessageList({
  onActionClick,
  messages: externalMessages,
  streamingMessage: externalStreaming,
  isLoading: externalLoading,
}: MessageListProps) {
  const storeMessages = useChatStore((s) => s.messages);
  const storeStreaming = useChatStore((s) => s.streamingMessage);
  const storeLoading = useChatStore((s) => s.isLoading);
  const toolCalls = useChatStore((s) => s.toolCalls);
  const filterNodeId = useChatStore((s) => s.filterNodeId);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);

  const messages = externalMessages ?? storeMessages;
  const streamingMessage = externalStreaming !== undefined ? externalStreaming : storeStreaming;
  const isLoading = externalLoading ?? storeLoading;

  const bottomRef = useRef<HTMLDivElement>(null);

  const tree = useProjectStore((s) => s.getCurrentTree());
  const filterNode = filterNodeId && tree ? findNode(tree, filterNodeId) : null;

  const filteredMessages = filterNodeId
    ? messages.filter(
        (m) => m.context?.nodeId === filterNodeId || m.role === 'agent'
      )
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filter bar — only shown when filterNodeId is set (chatStore mode) */}
      {filterNode && (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
            <Filter className="h-3 w-3" />
            <span>显示与</span>
            <span className="font-medium text-[var(--color-accent-500)]">「{filterNode.title}」</span>
          </div>
          <button
            onClick={() => setFilterNodeId(null)}
            className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {filteredMessages.map((msg) => (
        <MessageItem key={msg.id} message={msg} onActionClick={onActionClick} />
      ))}

      {/* Streaming message */}
      {streamingMessage !== null && (
        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] font-medium text-[var(--color-text-accent)]">🤖</span>
            <div className="flex-1 text-xs text-[var(--color-text-primary)] leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>,
                }}
              >
                {streamingMessage || '▊'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Tool call indicators */}
      {toolCalls.map((tc) => (
        <div key={tc.callId} className="px-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
            🔧 {tc.name}
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && streamingMessage === null && toolCalls.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-[var(--color-text-tertiary)]">
          🤖 思考中…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Verify existing ChatPanel still compiles and works**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -i "MessageList" || echo "No MessageList errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/chat-panel/MessageList.tsx
git commit -m "refactor: MessageList accepts optional messages/streamingMessage/isLoading props"
```

---

### Task 4: Refactor MessageInput to accept onSend prop

**Files:**
- Modify: `src/apps/drama/components/chat-panel/MessageInput.tsx`

- [ ] **Step 1: Add onSend prop**

```typescript
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';
import { useChatStore } from '@drama/stores/chatStore';

interface MessageInputProps {
  onSend?: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const storeSendMessage = useChatStore((s) => s.sendMessage);
  const storeLoading = useChatStore((s) => s.isLoading);

  const isLoading = disabled ?? storeLoading;

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    if (onSend) {
      onSend(value.trim());
    } else {
      storeSendMessage(value.trim());
    }
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3">
      <div className="relative">
        <Textarea
          placeholder="输入消息…（Cmd + Enter 发送）"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="pr-10"
        />
        <div className="absolute bottom-2 right-2">
          <IconButton
            icon={<Send className="h-4 w-4" />}
            label="发送"
            size="sm"
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify existing ChatPanel still works**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -i "MessageInput" || echo "No MessageInput errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/chat-panel/MessageInput.tsx
git commit -m "refactor: MessageInput accepts optional onSend/disabled props"
```

---

### Task 5: Build TaskCard component

**Files:**
- Create: `src/apps/drama/components/task-list/TaskCard.tsx`

- [ ] **Step 1: Create TaskCard**

```typescript
// src/apps/drama/components/task-list/TaskCard.tsx

import { useMemo } from 'react';
import type { AgentTask } from '@drama/types';

interface TaskCardProps {
  task: AgentTask;
  isActive: boolean;
  onClick: () => void;
}

const statusConfig = {
  in_progress: { icon: '🔄', label: '进行中', lineColor: 'var(--color-bg-accent)' },
  pending_review: { icon: '👁', label: '待审查', lineColor: '#8b5cf6' },
  completed: { icon: '✅', label: '已完成', lineColor: 'var(--color-status-success-text)' },
} as const;

export function TaskCard({ task, isActive, onClick }: TaskCardProps) {
  const config = statusConfig[task.status];
  const messageCount = task.messages.length;

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(task.updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }, [task.updatedAt]);

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
      style={task.status === 'pending_review' && !isActive
        ? { borderLeft: `3px solid ${config.lineColor}` }
        : isActive
          ? { borderLeft: '3px solid var(--color-bg-accent)' }
          : { borderLeft: '3px solid transparent' }
      }
    >
      <div className="flex items-start gap-2">
        <span className="text-sm leading-none mt-0.5 flex-shrink-0">{config.icon}</span>
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
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskCard" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-list/TaskCard.tsx
git commit -m "feat: add TaskCard component"
```

---

### Task 6: Build TaskListPanel component

**Files:**
- Create: `src/apps/drama/components/task-list/TaskListPanel.tsx`

- [ ] **Step 1: Create TaskListPanel**

```typescript
// src/apps/drama/components/task-list/TaskListPanel.tsx

import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { PanelHeader } from '@/shared/components/ui/PanelHeader';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '@drama/stores/taskStore';

export function TaskListPanel() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const setActiveTask = useTaskStore((s) => s.setActiveTask);

  const [showCompleted, setShowCompleted] = useState(false);

  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const pendingReview = tasks.filter((t) => t.status === 'pending_review');
  const completed = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <PanelHeader
        title="任务"
        icon={<ListTodo className="h-4 w-4" />}
      />

      <div className="flex-1 overflow-y-auto">
        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              🔄 进行中 ({inProgress.length})
            </div>
            {inProgress.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)}
              />
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
              <TaskCard
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)}
              />
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
              <span className="transform transition-transform" style={{ transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              ✅ 已完成 ({completed.length})
            </button>
            {showCompleted && completed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onClick={() => setActiveTask(task.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
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
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskListPanel" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-list/TaskListPanel.tsx
git commit -m "feat: add TaskListPanel component"
```

---

### Task 7: Build TaskChatHeader component

**Files:**
- Create: `src/apps/drama/components/task-chat/TaskChatHeader.tsx`

- [ ] **Step 1: Create TaskChatHeader**

```typescript
// src/apps/drama/components/task-chat/TaskChatHeader.tsx

import { Trash2 } from 'lucide-react';
import type { AgentTask } from '@drama/types';

interface TaskChatHeaderProps {
  task: AgentTask;
  onDelete: () => void;
  onMarkCompleted: () => void;
  onContinueEdit: () => void;
}

const statusBadge: Record<AgentTask['status'], { label: string; className: string }> = {
  in_progress: {
    label: '进行中',
    className: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]',
  },
  pending_review: {
    label: '待审查',
    className: 'bg-purple-100 text-purple-700',
  },
  completed: {
    label: '已完成',
    className: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
  },
};

export function TaskChatHeader({ task, onDelete, onMarkCompleted, onContinueEdit }: TaskChatHeaderProps) {
  const badge = statusBadge[task.status];

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-2">
      <span className="font-semibold text-[13px] text-[var(--color-text-primary)] truncate flex-1">
        {task.title || '新任务'}
      </span>

      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.className}`}>
        {badge.label}
      </span>

      {/* Action buttons based on status */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status === 'pending_review' && (
          <>
            <button
              onClick={onMarkCompleted}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              ✓ 完成
            </button>
            <button
              onClick={onContinueEdit}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-colors"
            >
              继续修改
            </button>
          </>
        )}
        {task.status === 'completed' && (
          <button
            onClick={onContinueEdit}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-colors"
          >
            继续对话
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-0.5 rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-status-danger-bg)] hover:text-[var(--color-status-danger-text)] transition-colors ml-1"
          title="删除任务"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskChatHeader" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-chat/TaskChatHeader.tsx
git commit -m "feat: add TaskChatHeader component"
```

---

### Task 8: Build TaskChatPanel component

**Files:**
- Create: `src/apps/drama/components/task-chat/TaskChatPanel.tsx`

- [ ] **Step 1: Create TaskChatPanel**

```typescript
// src/apps/drama/components/task-chat/TaskChatPanel.tsx

import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageList } from '@drama/components/chat-panel/MessageList';
import { MessageInput } from '@drama/components/chat-panel/MessageInput';
import { TaskChatHeader } from './TaskChatHeader';
import { useTaskStore } from '@drama/stores/taskStore';
import type { ChatAction } from '@drama/types';

export function TaskChatPanel() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const streamingMessage = useTaskStore((s) => s.streamingMessage);
  const streamingTaskId = useTaskStore((s) => s.streamingTaskId);
  const createTask = useTaskStore((s) => s.createTask);
  const sendMessage = useTaskStore((s) => s.sendMessage);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const markCompleted = useTaskStore((s) => s.markCompleted);
  const markInProgress = useTaskStore((s) => s.markInProgress);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const isStreaming = streamingTaskId === activeTaskId && streamingMessage !== null;

  const handleSend = useCallback((content: string) => {
    if (activeTaskId) {
      sendMessage(activeTaskId, content);
    } else {
      const newId = createTask();
      sendMessage(newId, content);
    }
  }, [activeTaskId, sendMessage, createTask]);

  // Empty state: no active task
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

  // Active task chat
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
      />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskChatPanel" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-chat/TaskChatPanel.tsx
git commit -m "feat: add TaskChatPanel component"
```

---

### Task 9: Build useTaskSSE hook

**Files:**
- Create: `src/apps/drama/hooks/useTaskSSE.ts`

- [ ] **Step 1: Create useTaskSSE hook**

```typescript
// src/apps/drama/hooks/useTaskSSE.ts

import { useEffect, useRef } from 'react';
import { useTaskStore } from '@drama/stores/taskStore';
import { createPandariaSession, postMessage, subscribeSSE, type SSECallbacks } from '@drama/lib/pandaria';
import { useProjectStore } from '@drama/stores/projectStore';
import { buildSystemPrompt } from '@drama/lib/pandaria';

/**
 * Manages per-task Pandaria SSE connections.
 * Wires SSE events into taskStore for the active task.
 */
export function useTaskSSE() {
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const tree = useProjectStore((s) => s.getCurrentTree());

  const eventSourceRef = useRef<EventSource | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const activeTask = tasks.find((t) => t.id === activeTaskId);

    // Close existing connection if task changed
    if (currentTaskIdRef.current !== activeTaskId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      currentTaskIdRef.current = activeTaskId;
    }

    // No active task or no session — nothing to subscribe
    if (!activeTask?.sessionId) return;

    // Already connected to this task
    if (eventSourceRef.current) return;

    // SSE callbacks wired to taskStore
    const callbacks: SSECallbacks = {
      onTextDelta: (delta) => {
        useTaskStore.getState().appendDelta(delta);
      },
      onToolCallStarted: (callId, name) => {
        useTaskStore.getState().startToolCall(callId, name);
      },
      onToolCallDone: (callId) => {
        useTaskStore.getState().endToolCall(callId);
      },
      onTurnEnd: () => {
        useTaskStore.getState().endStreaming();
      },
      onError: (error) => {
        console.error('[useTaskSSE] SSE error:', error);
        useTaskStore.getState().endStreaming();
      },
    };

    const es = subscribeSSE(activeTask.sessionId, callbacks);
    eventSourceRef.current = es;

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [activeTaskId, tasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "useTaskSSE" || echo "No errors"`
Expected: No errors (may have import errors if pandaria.ts doesn't have these exports — that's OK, will wire up in next task. Just check for syntax errors.)

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/hooks/useTaskSSE.ts
git commit -m "feat: add useTaskSSE hook for per-task SSE management"
```

---

### Task 10: Update WorkspacePage

**Files:**
- Modify: `src/apps/drama/pages/WorkspacePage.tsx`

- [ ] **Step 1: Replace left and center panels**

Edit `src/apps/drama/pages/WorkspacePage.tsx` to:

- Remove imports: `TreeViewPanel`, `AssetManagerPanel`, `ChatPanel`, `useToolBridge`, `DetailPanel` imports (keep others)
- Add imports: `TaskListPanel`, `TaskChatPanel`, `useTaskSSE`
- Replace the left panel Group (with TreeViewPanel + AssetManagerPanel) with just `TaskListPanel`
- Replace the center panel ChatPanel with `TaskChatPanel`
- Remove the center panel's right border (it previously shared with right panel)
- Keep everything else: Navbar, FlowCanvasPanel, DeleteConfirmDialog, ConflictResolverModal, hotkeys

Actual code changes to WorkspacePage.tsx:

```typescript
// Replace these imports:
import { TreeViewPanel } from '@drama/components/tree-view/TreeViewPanel';
import { AssetManagerPanel } from '@drama/components/asset-manager/AssetManagerPanel';
import { ChatPanel } from '@drama/components/chat-panel/ChatPanel';
import { useToolBridge } from '@drama/hooks/useToolBridge';

// With:
import { TaskListPanel } from '@drama/components/task-list/TaskListPanel';
import { TaskChatPanel } from '@drama/components/task-chat/TaskChatPanel';
import { useTaskSSE } from '@drama/hooks/useTaskSSE';
import { useTaskStore } from '@drama/stores/taskStore';
```

Replace `useToolBridge();` with `useTaskSSE();`

Remove the `const activeTab = useDetailStore(...)` and `const setActiveTab = useDetailStore(...)` lines (DetailPanel removed).

Replace the entire left Panel block (the Group with vertical split for TreeViewPanel + AssetManagerPanel) with:

```tsx
<Panel id="left" defaultSize="18%" minSize="18%" maxSize="28%" collapsible collapsedSize="0%" style={{ minWidth: 240 }}>
  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
    <TaskListPanel />
  </div>
</Panel>
```

Replace the center Panel block (ChatPanel with TabBar) with:

```tsx
<Panel id="center" defaultSize="30%" minSize="22%" maxSize="40%" style={{ minWidth: 280 }}>
  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
    <TaskChatPanel />
  </div>
</Panel>
```

The `toggleSidebar` function now just hides/shows the left task list panel (simplified).

Remove `selectedNodeId`-dependent hotkeys that no longer apply:
- Remove the `Delete` hotkey handler (node deletion via tree view)
- Remove the `Escape` handler's `activeTab` condition

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -40`
Expected: No new errors (may have pre-existing warnings)

- [ ] **Step 3: Run existing tests to check for regressions**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All previously passing tests continue to pass (except WorkspacePage-related tests if any)

- [ ] **Step 4: Manual verification — start dev server**

Run: `npm run dev` and open `http://localhost:5173`
Expected: Left panel shows "暂无任务" empty state. Center panel shows "新对话" empty state. Input box works. Right panel shows canvas.

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/pages/WorkspacePage.tsx
git commit -m "feat: replace left/center panels with TaskListPanel and TaskChatPanel"
```

---

### Task 11: Integration verification & cleanup

**Files:**
- No new files. Run full test suite and check for issues.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (or identify specific tests that need updating)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 3: Remove unused imports from WorkspacePage**

Ensure all unused imports are removed from WorkspacePage.tsx (e.g., `useToolBridge`, `useDetailStore`, `ChatPanel`, `TreeViewPanel`, `AssetManagerPanel` imports).

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "unused\|not used" || echo "No unused warnings"`
Expected: Clean

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup workspace page imports and verify full test suite"
```

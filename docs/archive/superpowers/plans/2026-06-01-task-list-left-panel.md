# 左栏任务列表 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 WorkspacePage 左栏从「项目结构树 + 资产管理」替换为「Agent 对话任务列表」，每个任务 = 独立 Agent 对话线程。

**Architecture:** 新增 `taskStore`（Zustand + Immer + IDB）管理多任务，`useTaskSSE` hook 管理 per-task Spellpaw Server session 和 SSE（模仿 useCopilotSSE 模式：覆盖 sendMessage → 创建 session → 订阅 SSE → 路由事件到 taskStore）。重构 `MessageList`/`MessageInput` 接受 props。原有代码全部保留。

**Tech Stack:** React 19, TypeScript 6.0, Zustand 5 + Immer, IndexedDB (idbStorage), Tailwind CSS 4 + OKLCH

**References:**
- Spec: `docs/superpowers/specs/2026-06-01-task-list-left-panel-design.md`
- Spellpaw Server API: `src/apps/drama/lib/copilot.ts` (exports: `createSession`, `sendMessage`, `subscribeSSE`, `buildSystemPrompt`)
- SSE pattern: `src/apps/drama/hooks/useCopilotSSE.ts`
- IDB: `src/shared/lib/idbStorage.ts`
- Tool configs: copy from `useCopilotSSE.ts` TOOL_CONFIGS

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/apps/drama/types/index.ts` | 添加 AgentTask 类型 |
| `src/apps/drama/stores/taskStore.ts` | 多任务状态管理（CRUD + 消息 + SSE streaming 状态） |
| `src/apps/drama/stores/taskStore.test.ts` | taskStore 单元测试 |
| `src/apps/drama/components/chat-panel/MessageList.tsx` | 重构：接受 `messages`, `streamingMessage?`, `isLoading?`, `toolCalls?` props |
| `src/apps/drama/components/chat-panel/MessageInput.tsx` | 重构：接受 `onSend?`, `disabled?` props |
| `src/apps/drama/components/task-list/TaskCard.tsx` | 单个任务卡片 |
| `src/apps/drama/components/task-list/TaskListPanel.tsx` | 左栏任务列表面板 |
| `src/apps/drama/components/task-chat/TaskChatHeader.tsx` | 中栏任务对话标题栏 |
| `src/apps/drama/components/task-chat/TaskChatPanel.tsx` | 中栏任务对话面板（调用 useTaskSSE） |
| `src/apps/drama/hooks/useTaskSSE.ts` | Per-task Spellpaw Server session + SSE 管理 |
| `src/shared/lib/idbStorage.ts` | IDB migration: 添加 taskStore object store |
| `src/apps/drama/pages/WorkspacePage.tsx` | 左栏+中栏替换 |

---

### Task 1: IDB migration — add 'taskStore' object store

**Files:**
- Modify: `src/shared/lib/idbStorage.ts`

- [ ] **Step 1: Bump DB_VERSION and add store**

Change:
```typescript
export const DB_VERSION = 2;
```

To:
```typescript
export const DB_VERSION = 3;
```

Change the stores array in the upgrade callback:
```typescript
const stores = ['projectStore', 'canvasStore', 'chatStore', 'snapshots', 'taskStore'];
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/idbStorage.ts
git commit -m "chore: bump IDB version to 3, add taskStore object store"
```

---

### Task 2: Add AgentTask type

**Files:**
- Modify: `src/apps/drama/types/index.ts`

- [ ] **Step 1: Add AgentTask interface**

Add after existing type exports:

```typescript
// === Task ===

export interface AgentTask {
  id: string;
  title: string;
  status: 'in_progress' | 'pending_review' | 'completed';
  messages: ChatMessage[];
  projectId: string | null;         // 所属项目（用于跨项目过滤）
  createdAt: string;
  updatedAt: string;
  sessionId?: string;               // Spellpaw Server session ID
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "feat: add AgentTask type"
```

---

### Task 3: Build taskStore

**Files:**
- Create: `src/apps/drama/stores/taskStore.ts`
- Create: `src/apps/drama/stores/taskStore.test.ts`

- [ ] **Step 1: Create taskStore.ts**

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
  createTask: (projectId: string) => string;
  deleteTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  updateTaskTitle: (id: string, title: string) => void;
  setTaskSessionId: (taskId: string, sessionId: string) => void;

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

  // Project isolation
  getTasksForProject: (projectId: string) => AgentTask[];
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

      createTask: (projectId) => {
        const id = generateId('task_');
        const now = new Date().toISOString();
        const task: AgentTask = {
          id,
          title: '',
          status: 'in_progress',
          messages: [],
          projectId,
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

      setTaskSessionId: (taskId, sessionId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) task.sessionId = sessionId;
        })),

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

      endStreaming: (stopReason) => {
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
              // Only transition to pending_review on clean completion (not error)
              if (task.status === 'in_progress' && stopReason !== 'error') {
                task.status = 'pending_review';
              }
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
          if (task) { task.status = 'pending_review'; task.updatedAt = new Date().toISOString(); }
        })),

      markCompleted: (taskId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) { task.status = 'completed'; task.updatedAt = new Date().toISOString(); }
        })),

      markInProgress: (taskId) =>
        set(produce((s: TaskState) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (task) { task.status = 'in_progress'; task.updatedAt = new Date().toISOString(); }
        })),

      getTasksForProject: (projectId) => {
        return get().tasks.filter((t) => t.projectId === projectId);
      },
    }),
    {
      name: 'spellpaw_tasks',
      storage: createIDBStorage<TaskState>('taskStore'),
      partialize: (state) => ({
        tasks: state.tasks,
      }) as TaskState,
    }
  )
);
```

- [ ] **Step 2: Write test file**

Create `src/apps/drama/stores/taskStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from './taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [], activeTaskId: null, streamingTaskId: null,
      streamingMessage: null, streamingMessageId: null, toolCalls: [],
    });
  });

  describe('createTask', () => {
    it('should create a task with in_progress status and projectId', () => {
      const id = useTaskStore.getState().createTask('proj-1');
      const { tasks, activeTaskId } = useTaskStore.getState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(id);
      expect(tasks[0].status).toBe('in_progress');
      expect(tasks[0].projectId).toBe('proj-1');
      expect(tasks[0].title).toBe('');
      expect(tasks[0].messages).toEqual([]);
      expect(activeTaskId).toBe(id);
    });

    it('should prepend new tasks (newest first)', () => {
      const id1 = useTaskStore.getState().createTask('p1');
      const id2 = useTaskStore.getState().createTask('p1');
      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe(id2);
      expect(tasks[1].id).toBe(id1);
    });
  });

  describe('deleteTask', () => {
    it('should remove task and clear activeTaskId if active', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().deleteTask(id);
      expect(useTaskStore.getState().tasks).toHaveLength(0);
      expect(useTaskStore.getState().activeTaskId).toBeNull();
    });

    it('should keep activeTaskId when deleting non-active task', () => {
      useTaskStore.getState().createTask('p1');
      const id2 = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().deleteTask(id2);
      expect(useTaskStore.getState().activeTaskId).not.toBe(id2);
    });
  });

  describe('sendMessage', () => {
    it('should append user message to task', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().sendMessage(id, 'hello');
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.messages).toHaveLength(1);
      expect(task?.messages[0].role).toBe('user');
      expect(task?.messages[0].content).toBe('hello');
    });
  });

  describe('streaming', () => {
    it('should build streaming message from deltas', () => {
      useTaskStore.getState().startStreaming('t1', 'm1');
      useTaskStore.getState().appendDelta('Hi');
      useTaskStore.getState().appendDelta(' there');
      expect(useTaskStore.getState().streamingMessage).toBe('Hi there');
    });

    it('should finalize stream as agent message and transition to pending_review', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().startStreaming(id, 'm1');
      useTaskStore.getState().appendDelta('Done');
      useTaskStore.getState().endStreaming('stop');
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.messages).toHaveLength(1);
      expect(task?.messages[0].role).toBe('agent');
      expect(task?.status).toBe('pending_review');
    });

    it('should NOT transition to pending_review on error stop', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().startStreaming(id, 'm1');
      useTaskStore.getState().appendDelta('oops');
      useTaskStore.getState().endStreaming('error');
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.status).toBe('in_progress');
    });
  });

  describe('status transitions', () => {
    it('markCompleted', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().markCompleted(id);
      expect(useTaskStore.getState().tasks.find((t) => t.id === id)?.status).toBe('completed');
    });

    it('markInProgress after pending_review', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().markPendingReview(id);
      useTaskStore.getState().markInProgress(id);
      expect(useTaskStore.getState().tasks.find((t) => t.id === id)?.status).toBe('in_progress');
    });
  });

  describe('project isolation', () => {
    it('getTasksForProject should filter by projectId', () => {
      useTaskStore.getState().createTask('proj-A');
      useTaskStore.getState().createTask('proj-A');
      useTaskStore.getState().createTask('proj-B');
      expect(useTaskStore.getState().getTasksForProject('proj-A')).toHaveLength(2);
      expect(useTaskStore.getState().getTasksForProject('proj-B')).toHaveLength(1);
    });
  });

  describe('setTaskSessionId', () => {
    it('should set sessionId on task', () => {
      const id = useTaskStore.getState().createTask('p1');
      useTaskStore.getState().setTaskSessionId(id, 'sess-123');
      const task = useTaskStore.getState().tasks.find((t) => t.id === id);
      expect(task?.sessionId).toBe('sess-123');
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/apps/drama/stores/taskStore.test.ts`
Expected: FAIL (file doesn't exist)

- [ ] **Step 4: Create taskStore.ts**

Write the file with the implementation from Step 1.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/apps/drama/stores/taskStore.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/apps/drama/stores/taskStore.ts src/apps/drama/stores/taskStore.test.ts
git commit -m "feat: add taskStore with CRUD, streaming, and project isolation"
```

---

### Task 4: Refactor MessageList to accept props

**Files:**
- Modify: `src/apps/drama/components/chat-panel/MessageList.tsx`

- [ ] **Step 1: Add optional props for task-mode use**

The component currently reads everything from `chatStore`. Add optional props that override store reads:

```typescript
import { useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { findNode } from '@drama/lib/treeUtils';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, ChatAction } from '@drama/types';

interface InFlightToolCall { callId: string; name: string; }

interface MessageListProps {
  onActionClick?: (action: ChatAction) => void;
  messages?: ChatMessage[];
  streamingMessage?: string | null;
  isLoading?: boolean;
  toolCalls?: InFlightToolCall[];
}

export function MessageList({
  onActionClick,
  messages: externalMessages,
  streamingMessage: externalStreaming,
  isLoading: externalLoading,
  toolCalls: externalToolCalls,
}: MessageListProps) {
  const storeMessages = useChatStore((s) => s.messages);
  const storeStreaming = useChatStore((s) => s.streamingMessage);
  const storeLoading = useChatStore((s) => s.isLoading);
  const storeToolCalls = useChatStore((s) => s.toolCalls);
  const filterNodeId = useChatStore((s) => s.filterNodeId);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);

  const messages = externalMessages ?? storeMessages;
  const streamingMessage = externalStreaming !== undefined ? externalStreaming : storeStreaming;
  const isLoading = externalLoading ?? storeLoading;
  const toolCalls = externalToolCalls ?? storeToolCalls;

  const bottomRef = useRef<HTMLDivElement>(null);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const filterNode = filterNodeId && tree ? findNode(tree, filterNodeId) : null;
  const filteredMessages = filterNodeId
    ? messages.filter((m) => m.context?.nodeId === filterNodeId || m.role === 'agent')
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  return (
    <div className="flex-1 overflow-y-auto">
      {filterNode && (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
            <Filter className="h-3 w-3" />
            <span>显示与</span>
            <span className="font-medium text-[var(--color-accent-500)]">「{filterNode.title}」</span>
          </div>
          <button onClick={() => setFilterNodeId(null)}
            className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {filteredMessages.map((msg) => (
        <MessageItem key={msg.id} message={msg} onActionClick={onActionClick} />
      ))}

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

      {toolCalls.map((tc) => (
        <div key={tc.callId} className="px-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
            🔧 {tc.name}
          </div>
        </div>
      ))}

      {isLoading && streamingMessage === null && toolCalls.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-[var(--color-text-tertiary)]">🤖 思考中…</div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Verify existing ChatPanel still compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -i "MessageList" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/chat-panel/MessageList.tsx
git commit -m "refactor: MessageList accepts messages/streamingMessage/isLoading/toolCalls props"
```

---

### Task 5: Refactor MessageInput to accept onSend prop

**Files:**
- Modify: `src/apps/drama/components/chat-panel/MessageInput.tsx`

- [ ] **Step 1: Add onSend and disabled props**

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

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "MessageInput" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/chat-panel/MessageInput.tsx
git commit -m "refactor: MessageInput accepts onSend/disabled props"
```

---

### Task 6: Build TaskCard component

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

const statusIcons: Record<AgentTask['status'], string> = {
  in_progress: '🔄',
  pending_review: '👁',
  completed: '✅',
};

export function TaskCard({ task, isActive, onClick }: TaskCardProps) {
  const icon = statusIcons[task.status];
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

### Task 7: Build TaskListPanel component

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
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskListPanel" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-list/TaskListPanel.tsx
git commit -m "feat: add TaskListPanel component with project filtering"
```

---

### Task 8: Build TaskChatHeader component

**Files:**
- Create: `src/apps/drama/components/task-chat/TaskChatHeader.tsx`

- [ ] **Step 1: Create TaskChatHeader** (using CSS custom properties only)

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

### Task 9: Build useTaskSSE hook

**Files:**
- Create: `src/apps/drama/hooks/useTaskSSE.ts`

- [ ] **Step 1: Study useCopilotSSE.ts pattern**

The hook overrides `chatStore.sendMessage` in a useEffect. On first call it creates a Spellpaw Server session, subscribes SSE, and routes events (text_delta, tool_call_started, tool_call_done, turn_end, error) to chatStore. We replicate this pattern for taskStore.

- [ ] **Step 2: Create useTaskSSE.ts**

```typescript
// src/apps/drama/hooks/useTaskSSE.ts

import { useEffect } from 'react';
import { useTaskStore } from '@drama/stores/taskStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { createSession, sendMessage, subscribeSSE, buildSystemPrompt } from '@drama/lib/copilot';
import { findNode } from '@drama/lib/treeUtils';
import { config } from '@/shared/config';

const TOOL_ENDPOINT = config.toolServerEndpoint;

// Reuse the same tool configs as useCopilotSSE
const TOOL_CONFIGS = [
  {
    name: 'spellpaw_add_node',
    description: 'Add a node (act/scene/shot) to the project tree.',
    parameters: {
      type: 'object',
      properties: {
        parentId: { type: 'string' },
        type: { type: 'string', enum: ['act', 'scene', 'shot'] },
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'number' },
      },
      required: ['parentId', 'type', 'title'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_update_node',
    description: "Update a node's title or metadata.",
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, changes: { type: 'object' } },
      required: ['nodeId', 'changes'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_delete_node',
    description: 'Delete a node. CAREFUL: irreversible. Ask user first.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_tree',
    description: 'Get the full project tree structure.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_subtree',
    description: 'Get a subtree starting from a specific node.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_apply_template',
    description: 'Apply a narrative template to the current project.',
    parameters: {
      type: 'object',
      properties: { templateId: { type: 'string' }, parentId: { type: 'string' } },
      required: ['templateId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_generate_storyboard',
    description: 'Generate a storyboard reference image for a scene or shot.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, prompt: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_analyze_structure',
    description: 'Analyze project structure health.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_pacing_report',
    description: 'Get detailed pacing report with duration statistics.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_match_template',
    description: 'Match project against built-in narrative templates.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_optimize_pacing',
    description: 'Auto-adjust scene durations based on pacing analysis.',
    parameters: {
      type: 'object',
      properties: { dryRun: { type: 'boolean' } },
    },
    endpoint: TOOL_ENDPOINT,
  },
];

/**
 * Manages per-task Spellpaw Server sessions and SSE.
 * Overrides taskStore.sendMessage to create sessions on first use,
 * send messages to Spellpaw Server, and route SSE events to taskStore.
 *
 * Follows the same pattern as useCopilotSSE.
 */
export function useTaskSSE() {
  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming,
    sendMessage: storeSendMessage, setTaskSessionId, updateTaskTitle,
  } = useTaskStore();

  useEffect(() => {
    const taskSessions = new Map<string, string>(); // taskId → sessionId
    const taskSSE = new Map<string, { close: () => void }>(); // taskId → SSE closer

    // Override sendMessage to intercept and route to Spellpaw Server
    const originalSend = useTaskStore.getState().sendMessage;

    useTaskStore.setState({
      sendMessage: async (taskId: string, content: string) => {
        // 1. Append user message locally
        storeSendMessage(taskId, content);

        try {
          // 2. Create Spellpaw Server session if first message for this task
          if (!taskSessions.has(taskId)) {
            const projectStore = useProjectStore.getState();
            const tree = projectStore.getCurrentTree();
            const currentProjectId = projectStore.currentProjectId;
            const projectTitle = projectStore.projects.find(
              (p) => p.id === currentProjectId
            )?.title ?? 'Untitled';

            const treeText = tree ? treeToPromptText(tree, 0) : '(空项目)';
            const systemPrompt = buildSystemPrompt(projectTitle, treeText);
            const session = await createSession(projectTitle, systemPrompt, TOOL_CONFIGS);

            taskSessions.set(taskId, session.id);
            setTaskSessionId(taskId, session.id);

            // 3. Subscribe to SSE
            const sse = subscribeSSE(session.id, (event) => {
              const currentState = useTaskStore.getState();
              // Ignore events if streaming task doesn't match
              if (currentState.streamingTaskId !== taskId && event.type !== 'error') return;

              switch (event.type) {
                case 'message_start':
                  startStreaming(taskId, crypto.randomUUID());
                  break;
                case 'text_delta':
                  appendDelta(event.delta as string);
                  break;
                case 'tool_call_started':
                  startToolCall(event.call_id as string, event.name as string);
                  break;
                case 'tool_call_done':
                  endToolCall(event.call_id as string);
                  break;
                case 'turn_end': {
                  const stopReason = event.stop_reason as string;
                  endStreaming(stopReason);
                  // Auto-generate title from first turn
                  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
                  if (task && !task.title && task.messages.length > 1) {
                    const agentMsg = [...task.messages].reverse().find((m) => m.role === 'agent');
                    if (agentMsg?.content) {
                      updateTaskTitle(taskId, agentMsg.content.slice(0, 30));
                    }
                  }
                  break;
                }
                case 'error':
                  appendDelta(`\n\n❌ ${event.message}`);
                  endStreaming('error');
                  break;
              }
            });
            taskSSE.set(taskId, sse);
          }

          // 4. Send message to Spellpaw Server
          const sessionId = taskSessions.get(taskId);
          if (sessionId) {
            const projectStore = useProjectStore.getState();
            const tree = projectStore.getCurrentTree();
            const selectedNodeId = projectStore.selectedNodeId;
            let enrichedContent = content;

            if (selectedNodeId && tree) {
              const node = findNode(tree, selectedNodeId);
              if (node) {
                const path = projectStore.getSelectedNodePath();
                enrichedContent = `[当前节点：${path.join(' > ')}]\n\n${content}`;
              }
            }

            await sendMessage(sessionId, enrichedContent);
          }
        } catch (err) {
          appendDelta(`\n\n❌ 连接失败: ${(err as Error).message}`);
          endStreaming('error');
        }
      },
    });

    // Close non-active SSE connections on task switch
    const unsub = useTaskStore.subscribe((state, prevState) => {
      if (state.activeTaskId !== prevState.activeTaskId) {
        for (const [tid, sse] of taskSSE) {
          if (tid !== state.activeTaskId) {
            sse.close();
            taskSSE.delete(tid);
          }
        }
      }
    });

    return () => {
      unsub();
      // Restore original sendMessage
      useTaskStore.setState({ sendMessage: originalSend });
      // Close all SSE connections
      for (const sse of taskSSE.values()) {
        sse.close();
      }
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function treeToPromptText(
  node: { title: string; type: string; children?: Array<Record<string, unknown>> },
  depth: number
): string {
  const indent = '  '.repeat(depth);
  let text = `${indent}${node.type}「${node.title}」`;
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + treeToPromptText(
        child as { title: string; type: string; children?: Array<Record<string, unknown>> },
        depth + 1
      );
    }
  }
  return text;
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -20`
Expected: May have warnings about unused `initError` (remove if so). No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/hooks/useTaskSSE.ts
git commit -m "feat: add useTaskSSE hook for per-task Spellpaw Server SSE management"
```

---

### Task 10: Build TaskChatPanel component

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
      // sendMessage is now intercepted by useTaskSSE which calls Spellpaw Server
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
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "TaskChatPanel" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/task-chat/TaskChatPanel.tsx
git commit -m "feat: add TaskChatPanel component with empty state and task chat view"
```

---

### Task 11: Update WorkspacePage

**Files:**
- Modify: `src/apps/drama/pages/WorkspacePage.tsx`

- [ ] **Step 1: Replace imports and panels**

Edit `src/apps/drama/pages/WorkspacePage.tsx`:

**Remove these imports:**
```typescript
import { TreeViewPanel } from '@drama/components/tree-view/TreeViewPanel';
import { AssetManagerPanel } from '@drama/components/asset-manager/AssetManagerPanel';
import { ChatPanel } from '@drama/components/chat-panel/ChatPanel';
import { useToolBridge } from '@drama/hooks/useToolBridge';
import { useDetailStore } from '@drama/stores/detailStore';
```

**Add these imports:**
```typescript
import { TaskListPanel } from '@drama/components/task-list/TaskListPanel';
import { TaskChatPanel } from '@drama/components/task-chat/TaskChatPanel';
import { useTaskSSE } from '@drama/hooks/useTaskSSE';
```

**Replace:**
```typescript
useToolBridge();
```
With:
```typescript
useToolBridge();  // Keep: still needed for tool calls from ANY source (tasks or chat)
useTaskSSE();     // Add: manage per-task Spellpaw Server SSE
```

**Remove:**
```typescript
const activeTab = useDetailStore((s) => s.activeTab);
const setActiveTab = useDetailStore((s) => s.setActiveTab);
```

**Replace the entire left Panel block** (the Group with vertical split) with:

```tsx
<Panel id="left" defaultSize="18%" minSize="18%" maxSize="28%" collapsible collapsedSize="0%" style={{ minWidth: 240 }}>
  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
    <TaskListPanel />
  </div>
</Panel>
```

**Replace the center Panel block** (ChatPanel with TabBar) with:

```tsx
<Panel id="center" defaultSize="30%" minSize="22%" maxSize="40%" style={{ minWidth: 280 }}>
  <div className="h-full overflow-hidden border-r border-[var(--color-border-default)]">
    <TaskChatPanel />
  </div>
</Panel>
```

**Fix toggleSidebar ratios** for new layout:
```typescript
const toggleSidebar = () => {
  const layout = groupRef.current?.getLayout();
  if (!layout) return;
  const leftSize = (layout as Record<string, number>).left ?? 0;
  if (leftSize > 5) {
    groupRef.current?.setLayout({ left: 0, center: 30, right: 70 });
  } else {
    groupRef.current?.setLayout({ left: 18, center: 30, right: 52 });
  }
};
```

**Remove hotkey handlers that reference removed features:**
- Remove the `Delete` hotkey handler (tree node deletion)
- Simplify `Escape` handler — remove `activeTab` condition:
```typescript
Escape: () => {
  if (deleteTarget) {
    setDeleteTarget(null);
  } else {
    selectNode(null);
  }
},
```

**Remove the `Cmd+Enter` no-op:**
```typescript
'Cmd+Enter': () => {},
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | head -30`
Expected: No new type errors (may have pre-existing warnings)

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/pages/WorkspacePage.tsx
git commit -m "feat: replace left/center panels with TaskListPanel and TaskChatPanel"
```

---

### Task 12: Integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -20
```
Expected: All previously-passing tests continue to pass

- [ ] **Step 2: Fix any test failures**

Update WorkspacePage-related tests that reference old panel layout.

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | tail -10
```
Expected: No new lint errors introduced

- [ ] **Step 4: Remove unused imports from WorkspacePage**

```bash
npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -i "unused\|is declared but"
```
Expected: Clean (or only pre-existing warnings)

- [ ] **Step 5: Manual smoke test**

Start dev server, navigate to project workspace, verify:
1. Left panel shows "暂无任务" empty state
2. Center panel shows "新对话" empty state with input
3. Input box visible and accepts text
4. Right panel shows canvas
5. No console errors

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: integration verification, cleanup unused imports"
```

---

## Known Limitations (Deferred)

These are spec requirements intentionally deferred for follow-up:

| Item | Reason |
|------|--------|
| SSE 自动重连（spec §8.3） | 需要修改 `copilot.ts` 的 `subscribeSSE`，现有 `useCopilotSSE` 也没有重连。Phase 1 可用手动重试（重新发消息） |
| Mock SSE for tasks（spec §8.3） | `useMockSSE.ts` 仅支持 chatStore。Task mock 可在后续添加；开发时可本地运行 Spellpaw Server |
| 组件集成测试 | 当前计划仅覆盖 taskStore 单元测试。TaskCard/TaskListPanel/TaskChatPanel 渲染测试可在稳定后补充 |
| DetailPanel 移除（spec §11） | 代码保留，WorkspacePage 中不再渲染。节点元数据编辑和节奏分析通过 Agent 对话完成 |

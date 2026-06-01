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

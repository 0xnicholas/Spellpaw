import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIDBStorage } from '@/shared/lib/idbStorage';

export interface PendingTask {
  taskId: string;
  providerId: string;
  cardId: string;
  createdAt: string;
}

interface TaskStoreState {
  tasks: PendingTask[];
  addTask(task: PendingTask): void;
  removeTask(taskId: string): void;
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      removeTask: (taskId) => set((s) => ({ tasks: s.tasks.filter((t) => t.taskId !== taskId) })),
    }),
    {
      name: 'spellpaw_canvas_tasks',
      version: 1,
      storage: createIDBStorage<TaskStoreState>('taskStore'),
    }
  )
);

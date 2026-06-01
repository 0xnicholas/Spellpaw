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

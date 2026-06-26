/**
 * Tests for the chatStore's slash-command flow (sync parts only).
 *
 * The async part (running the skill, updating the pending message) is
 * covered by the unit tests in @drama/skills/. This file focuses on
 * the synchronous contract: a slash command should be recognized and
 * the user/invocation/pending messages should be appended in the right
 * order. Detailed async timing is intentionally not tested here.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useChatStore } from '@drama/stores/chatStore';
import { isSlashCommand } from '@drama/skills/chat';

describe('chatStore — slash command detection', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProjectId: 'proj_slash',
      projects: [{ id: 'proj_slash', title: 'Slash', description: '', coverColor: '#000', updatedAt: '', sceneCount: 0, duration: 0, version: 1 }],
    });
    useCanvasStore.setState({ canvases: { proj_slash: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } }, selectedCardId: null });
    useChatStore.setState({ messages: [], isLoading: false, inputValue: '', streamingMessage: null, streamingMessageId: null, toolCalls: [], filterNodeId: null });
  });

  it('isSlashCommand recognizes slash commands', () => {
    expect(isSlashCommand('/analyze-pacing')).toBe(true);
    expect(isSlashCommand('/character-profile 姓名:张三')).toBe(true);
    expect(isSlashCommand('  /analyze-pacing  ')).toBe(true);
  });

  it('isSlashCommand rejects non-slash input', () => {
    expect(isSlashCommand('analyze pacing')).toBe(false);
    expect(isSlashCommand('hello world')).toBe(false);
    expect(isSlashCommand('')).toBe(false);
    // Note: any string that starts with '/' (even ' / foo') is a slash
    // command per the simple check. The downstream parser then validates
    // whether the command name is known.
    expect(isSlashCommand('analyze-pacing')).toBe(false);
    expect(isSlashCommand('  no slash here')).toBe(false);
  });

  it('appends user + invocation + pending synchronously on known slash command', () => {
    const store = useChatStore.getState();
    store.sendMessage('/analyze-pacing', 'proj_slash');
    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('/analyze-pacing');
    expect(messages[1].role).toBe('agent');
    expect(messages[1].content).toMatch(/调用 Skill/);
    expect(messages[2].role).toBe('agent');
    expect(messages[2].status).toBe('pending');
  });

  it('non-slash messages also append user message', () => {
    const store = useChatStore.getState();
    store.sendMessage('hello', 'proj_slash');
    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('hello');
  });
});

describe('chatStore — updateMessage', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], isLoading: false, inputValue: '', streamingMessage: null, streamingMessageId: null, toolCalls: [], filterNodeId: null });
  });

  it('updates an existing message by id', () => {
    useChatStore.setState({
      messages: [
        { id: 'm1', role: 'agent', content: 'old', type: 'action', timestamp: '2026-01-01T00:00:00Z', status: 'pending' },
      ],
    });
    useChatStore.getState().updateMessage('m1', { content: 'new content', status: 'done' });
    const m = useChatStore.getState().messages[0];
    expect(m.content).toBe('new content');
    expect(m.status).toBe('done');
    // Other fields are preserved
    expect(m.id).toBe('m1');
    expect(m.role).toBe('agent');
  });

  it('no-op when id not found', () => {
    useChatStore.setState({
      messages: [
        { id: 'm1', role: 'agent', content: 'a', type: 'action', timestamp: '2026-01-01T00:00:00Z' },
      ],
    });
    useChatStore.getState().updateMessage('m999', { content: 'x' });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('a');
  });
});

describe('chatStore — abortTurn', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProjectId: 'proj_abort',
      projects: [{ id: 'proj_abort', title: 'Abort', description: '', coverColor: '#000', updatedAt: '', sceneCount: 0, duration: 0, version: 1 }],
    });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useChatStore.setState({ messages: [], isLoading: false, inputValue: '', streamingMessage: null, streamingMessageId: null, toolCalls: [], filterNodeId: null });
  });

  it('clears streaming + tool state immediately', () => {
    useChatStore.setState({
      isLoading: true,
      streamingMessage: 'partial text',
      streamingMessageId: 'mid-id',
      toolCalls: [{ callId: 'c1', name: 'spellpaw_add_card', status: 'running' }],
    });
    useChatStore.getState().abortTurn();
    const state = useChatStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.streamingMessage).toBe(null);
    expect(state.streamingMessageId).toBe(null);
    expect(state.toolCalls).toEqual([]);
  });

  it('dispatches a spellpaw:abort-turn window event', () => {
    const handler = vi.fn();
    window.addEventListener('spellpaw:abort-turn', handler);
    useChatStore.getState().abortTurn();
    window.removeEventListener('spellpaw:abort-turn', handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('chatStore — regenerateLast', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProjectId: 'proj_regen',
      projects: [{ id: 'proj_regen', title: 'Regen', description: '', coverColor: '#000', updatedAt: '', sceneCount: 0, duration: 0, version: 1 }],
    });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useChatStore.setState({ messages: [], isLoading: false, inputValue: '', streamingMessage: null, streamingMessageId: null, toolCalls: [], filterNodeId: null });
  });

  it('drops the agent reply to the last user message and re-sends it', async () => {
    useChatStore.setState({
      messages: [
        { id: 'u1', role: 'user', content: 'first', type: 'text', timestamp: 't1' },
        { id: 'a1', role: 'agent', content: 'reply1', type: 'text', timestamp: 't2' },
        { id: 'u2', role: 'user', content: 'second', type: 'text', timestamp: 't3' },
        { id: 'a2', role: 'agent', content: 'reply2', type: 'text', timestamp: 't4' },
      ],
    });
    useChatStore.getState().regenerateLast('proj_regen');
    await new Promise((r) => setTimeout(r, 0));
    const state = useChatStore.getState();
    // a1 (history of u1) stays; a2 (reply to u2 being regenerated) is dropped
    expect(state.messages.find((m) => m.id === 'a1')).toBeDefined();
    expect(state.messages.find((m) => m.id === 'a2')).toBeUndefined();
    // 'second' appears at least once (the re-send)
    expect(state.messages.filter((m) => m.content === 'second').length).toBeGreaterThanOrEqual(1);
  });

  it('no-op when there are no user messages', () => {
    useChatStore.setState({
      messages: [
        { id: 'a1', role: 'agent', content: 'hi', type: 'text', timestamp: 't1' },
      ],
    });
    useChatStore.getState().regenerateLast('proj_regen');
    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
  });

  it('no-op when projectId is empty', () => {
    useChatStore.setState({
      messages: [{ id: 'u1', role: 'user', content: 'x', type: 'text', timestamp: 't' }],
    });
    useChatStore.getState().regenerateLast('');
    expect(useChatStore.getState().messages).toHaveLength(1);
  });
});

describe('chatStore — tool call status', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProjectId: 'proj_tool',
      projects: [{ id: 'proj_tool', title: 'Tool', description: '', coverColor: '#000', updatedAt: '', sceneCount: 0, duration: 0, version: 1 }],
    });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useChatStore.setState({ messages: [], isLoading: false, inputValue: '', streamingMessage: null, streamingMessageId: null, toolCalls: [], filterNodeId: null });
  });

  it('startToolCall sets status=running', () => {
    useChatStore.getState().startToolCall('c1', 'spellpaw_add_card');
    expect(useChatStore.getState().toolCalls[0]).toEqual({
      callId: 'c1',
      name: 'spellpaw_add_card',
      status: 'running',
    });
  });

  it('endToolCall defaults to success', () => {
    useChatStore.getState().startToolCall('c1', 'spellpaw_add_card');
    useChatStore.getState().endToolCall('c1');
    expect(useChatStore.getState().toolCalls[0].status).toBe('success');
  });

  it('endToolCall with error captures errorMessage', () => {
    useChatStore.getState().startToolCall('c1', 'spellpaw_add_card');
    useChatStore.getState().endToolCall('c1', 'error', 'card validation failed');
    expect(useChatStore.getState().toolCalls[0]).toEqual({
      callId: 'c1',
      name: 'spellpaw_add_card',
      status: 'error',
      errorMessage: 'card validation failed',
    });
  });

  it('endToolCall preserves existing fields when updating status', () => {
    useChatStore.getState().startToolCall('c1', 'spellpaw_add_card');
    useChatStore.getState().endToolCall('c1', 'success');
    const final = useChatStore.getState().toolCalls[0];
    expect(final.callId).toBe('c1');
    expect(final.name).toBe('spellpaw_add_card');
    expect(final.status).toBe('success');
    expect(final.errorMessage).toBeUndefined();
  });
});

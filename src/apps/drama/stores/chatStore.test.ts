/**
 * Tests for the chatStore's slash-command flow (sync parts only).
 *
 * The async part (running the skill, updating the pending message) is
 * covered by the unit tests in @drama/lib/skills/. This file focuses on
 * the synchronous contract: a slash command should be recognized and
 * the user/invocation/pending messages should be appended in the right
 * order. Detailed async timing is intentionally not tested here.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useChatStore } from '@drama/stores/chatStore';
import { isSlashCommand } from '@drama/lib/skills/chat';

describe('chatStore — slash command detection', () => {
  beforeEach(() => {
    useProjectStore.setState({
      trees: {},
      currentProjectId: 'proj_slash',
      selectedNodeId: null,
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

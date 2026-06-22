/**
 * Copilot Lab store — 关键行为单测：
 *  1. pushEvent 超出上限时裁掉最旧
 *  2. clearEvents / reset 行为
 *  3. setSessionMeta 会替换之前的元信息
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCopilotLabStore, appendEventCapped, LAB_PROJECT_ID } from './copilotLabStore';
import type { SSEEvent } from '@drama/lib/llm/types';

function mkEvent(type: string, payload: Record<string, unknown> = {}): SSEEvent {
  return { type, ...payload } as unknown as SSEEvent;
}

describe('copilotLabStore', () => {
  beforeEach(() => {
    useCopilotLabStore.getState().reset();
  });

  it('LAB_PROJECT_ID 是稳定的内部标识', () => {
    expect(LAB_PROJECT_ID).toBe('__copilot_lab__');
  });

  it('初始状态为空', () => {
    const s = useCopilotLabStore.getState();
    expect(s.sessionMeta).toBeNull();
    expect(s.events).toEqual([]);
  });

  it('pushEvent 追加事件', () => {
    const { pushEvent } = useCopilotLabStore.getState();
    pushEvent(mkEvent('message_start'));
    pushEvent(mkEvent('text_delta', { delta: 'hi' }));
    expect(useCopilotLabStore.getState().events).toHaveLength(2);
    expect(useCopilotLabStore.getState().events[1].type).toBe('text_delta');
  });

  it('pushEvent 超过 200 条时裁掉最旧的', () => {
    const { pushEvent } = useCopilotLabStore.getState();
    for (let i = 0; i < 210; i++) {
      pushEvent(mkEvent('text_delta', { delta: String(i) }));
    }
    const events = useCopilotLabStore.getState().events;
    expect(events).toHaveLength(200);
    // 最旧的应该是 i=10（丢了 i=0..9），最新的应该是 i=209
    expect((events[0] as unknown as { delta: string }).delta).toBe('10');
    expect((events[199] as unknown as { delta: string }).delta).toBe('209');
  });

  it('clearEvents 只清事件，保留 sessionMeta', () => {
    const { pushEvent, setSessionMeta, clearEvents } = useCopilotLabStore.getState();
    setSessionMeta({
      systemPrompt: 'p',
      tools: [],
      sessionId: 's',
      createdAt: 'now',
    });
    pushEvent(mkEvent('message_start'));
    clearEvents();
    const s = useCopilotLabStore.getState();
    expect(s.events).toEqual([]);
    expect(s.sessionMeta).not.toBeNull();
  });

  it('reset 同时清 sessionMeta 和 events', () => {
    const { pushEvent, setSessionMeta, reset } = useCopilotLabStore.getState();
    setSessionMeta({ systemPrompt: 'p', tools: [], sessionId: 's', createdAt: 'now' });
    pushEvent(mkEvent('message_start'));
    reset();
    const s = useCopilotLabStore.getState();
    expect(s.sessionMeta).toBeNull();
    expect(s.events).toEqual([]);
  });

  it('setSessionMeta 会替换之前的元信息', () => {
    const { setSessionMeta } = useCopilotLabStore.getState();
    setSessionMeta({ systemPrompt: 'a', tools: [], sessionId: 's1', createdAt: 't1' });
    setSessionMeta({ systemPrompt: 'b', tools: [], sessionId: 's2', createdAt: 't2' });
    expect(useCopilotLabStore.getState().sessionMeta?.sessionId).toBe('s2');
  });

  it('pendingPromptOverride 独立于 sessionMeta', () => {
    const { setPendingPromptOverride, setSessionMeta } = useCopilotLabStore.getState();
    setSessionMeta({ systemPrompt: 'current', tools: [], sessionId: 's', createdAt: 't' });
    setPendingPromptOverride('next');
    const s = useCopilotLabStore.getState();
    expect(s.pendingPromptOverride).toBe('next');
    expect(s.sessionMeta?.systemPrompt).toBe('current');
  });

  it('reset 同时清 pendingPromptOverride', () => {
    const { setPendingPromptOverride, reset } = useCopilotLabStore.getState();
    setPendingPromptOverride('pending');
    reset();
    expect(useCopilotLabStore.getState().pendingPromptOverride).toBeNull();
  });
});

describe('appendEventCapped (纯函数)', () => {
  it('未超上限时直接追加', () => {
    const events: SSEEvent[] = [];
    const next = appendEventCapped(events, mkEvent('a'));
    expect(next).toHaveLength(1);
  });

  it('刚好等于上限时裁掉最旧的', () => {
    const events: SSEEvent[] = Array.from({ length: 200 }, (_, i) => mkEvent('e', { delta: String(i) }));
    const next = appendEventCapped(events, mkEvent('new'), 200);
    expect(next).toHaveLength(200);
    expect((next[0] as unknown as { delta: string }).delta).toBe('1');
    expect(next[199].type).toBe('new');
  });
});
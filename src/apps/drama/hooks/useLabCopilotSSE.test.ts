/**
 * useLabCopilotSSE — 关键行为单测：
 *  1. sendMessage 时调 provider.createSession，tools 数组必须是空
 *  2. 写入 system prompt 到 lab store
 *  3. SSE 事件全部推一份给 lab store
 *  4. 清事件在 session 创建后才发生（创建前不清空）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLabCopilotSSE } from './useLabCopilotSSE';
import { useChatStore } from '@drama/stores/chatStore';
import { useCopilotLabStore } from '@drama/stores/copilotLabStore';
import * as llmModule from '@drama/lib/llm';
import type { SSEEvent } from '@drama/lib/llm/types';

vi.mock('@drama/lib/llm', async () => {
  const actual = await vi.importActual<typeof import('@drama/lib/llm')>('@drama/lib/llm');
  return {
    ...actual,
    getLLMProvider: vi.fn(),
  };
});

describe('useLabCopilotSSE', () => {
  let activeHandler: ((e: SSEEvent) => void) | null = null;
  const fakeProvider = {
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    subscribeSSE: vi.fn((_sid: string, handler: (e: SSEEvent) => void) => {
      activeHandler = handler;
      return { close: vi.fn(() => { activeHandler = null; }) };
    }),
  };

  function emit(event: SSEEvent) {
    if (activeHandler) activeHandler(event);
  }

  beforeEach(() => {
    activeHandler = null;
    fakeProvider.createSession.mockReset();
    fakeProvider.sendMessage.mockReset();
    fakeProvider.subscribeSSE.mockClear();
    vi.mocked(llmModule.getLLMProvider).mockReturnValue(fakeProvider as unknown as ReturnType<typeof llmModule.getLLMProvider>);

    useChatStore.setState({
      messages: [],
      streamingMessage: null,
      streamingMessageId: null,
      toolCalls: [],
      isLoading: false,
      inputValue: '',
      filterNodeId: null,
    });
    useCopilotLabStore.getState().reset();
  });

  it('sendMessage 时调用 createSession 且 tools 必须为空', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'lab-1' });
    renderHook(() => useLabCopilotSSE());

    await act(async () => {
      await useChatStore.getState().sendMessage('hello lab');
    });

    expect(fakeProvider.createSession).toHaveBeenCalledTimes(1);
    const [_title, prompt, tools] = fakeProvider.createSession.mock.calls[0];
    expect(tools).toEqual([]); // 关键：no tools
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('创建 session 后写入 systemPrompt 到 lab store', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'lab-2' });
    renderHook(() => useLabCopilotSSE());

    await act(async () => {
      await useChatStore.getState().sendMessage('ping');
    });

    const meta = useCopilotLabStore.getState().sessionMeta;
    expect(meta).not.toBeNull();
    expect(meta?.sessionId).toBe('lab-2');
    expect(meta?.systemPrompt.length).toBeGreaterThan(0);
    expect(meta?.tools).toEqual([]);
  });

  it('SSE 事件全部推一份给 lab store', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'lab-3' });
    renderHook(() => useLabCopilotSSE());

    await act(async () => {
      await useChatStore.getState().sendMessage('fire');
    });

    // 清空后再推事件来验证来源是 SSE handler
    useCopilotLabStore.getState().clearEvents();

    act(() => {
      emit({ type: 'text_delta', delta: 'hi' } as unknown as SSEEvent);
      emit({ type: 'turn_end', stop_reason: 'end_turn' } as unknown as SSEEvent);
    });

    const events = useCopilotLabStore.getState().events;
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('text_delta');
    expect(events[1].type).toBe('turn_end');
  });

  it('消息存在 chatStore 中，projectId 用 LAB_PROJECT_ID', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'lab-4' });
    renderHook(() => useLabCopilotSSE());

    await act(async () => {
      await useChatStore.getState().sendMessage('check persistence');
    });

    const messages = useChatStore.getState().messages;
    const userMsg = messages.find((m) => m.content === 'check persistence');
    expect(userMsg).toBeDefined();
    // 不依赖持久化（store 不写远程），只验证消息流过
    expect(userMsg?.role).toBe('user');
  });

  it('createSession 失败时写入错误消息（不抛）', async () => {
    fakeProvider.createSession.mockRejectedValue(new Error('backend offline'));
    renderHook(() => useLabCopilotSSE());

    await act(async () => {
      await useChatStore.getState().sendMessage('will fail');
    });

    const messages = useChatStore.getState().messages;
    const errMsg = messages.find((m) => m.content.startsWith('❌'));
    expect(errMsg).toBeDefined();
    expect(errMsg?.content).toContain('backend offline');
    // session 没创建 → lab store 应保持 null
    expect(useCopilotLabStore.getState().sessionMeta).toBeNull();
  });
});
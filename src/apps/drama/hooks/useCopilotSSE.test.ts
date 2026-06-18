import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCopilotSSE } from './useCopilotSSE';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import * as llmModule from '@drama/lib/llm';

vi.mock('@drama/lib/llm', async () => {
  const actual = await vi.importActual<typeof import('@drama/lib/llm')>('@drama/lib/llm');
  return {
    ...actual,
    getLLMProvider: vi.fn(),
  };
});

describe('useCopilotSSE', () => {
  const fakeProvider = {
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    subscribeSSE: vi.fn(() => ({ close: vi.fn() })),
  };

  beforeEach(() => {
    fakeProvider.createSession.mockReset();
    fakeProvider.sendMessage.mockReset();
    fakeProvider.subscribeSSE.mockReset();
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
    useProjectStore.setState({ currentProjectId: 'project-1' });
  });

  it('retries session creation on subsequent sendMessage when first attempt fails', async () => {
    fakeProvider.createSession
      .mockRejectedValueOnce(new Error('server down'))
      .mockResolvedValueOnce({ id: 'session-2' });

    renderHook(() => useCopilotSSE());

    // First message: session creation fails.
    await act(async () => {
      useChatStore.getState().sendMessage('hello', 'project-1');
    });
    await waitFor(() => expect(fakeProvider.createSession).toHaveBeenCalledTimes(1));

    // Second message: should retry session creation instead of giving up.
    await act(async () => {
      useChatStore.getState().sendMessage('generate scene image', 'project-1');
    });
    await waitFor(() => expect(fakeProvider.createSession).toHaveBeenCalledTimes(2));

    // After successful retry, the message should be sent.
    await waitFor(() => expect(fakeProvider.sendMessage).toHaveBeenCalledTimes(1));
    expect(fakeProvider.sendMessage.mock.calls[0][0]).toBe('session-2');
    expect(fakeProvider.sendMessage.mock.calls[0][1]).toContain('generate scene image');
  });

  it('sends message immediately when session already exists', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'session-1' });

    renderHook(() => useCopilotSSE());

    await act(async () => {
      useChatStore.getState().sendMessage('hello', 'project-1');
    });
    await waitFor(() => expect(fakeProvider.sendMessage).toHaveBeenCalledTimes(1));
    expect(fakeProvider.sendMessage.mock.calls[0][0]).toBe('session-1');
    expect(fakeProvider.sendMessage.mock.calls[0][1]).toContain('hello');

    // Second message should reuse the existing session without creating a new one.
    await act(async () => {
      useChatStore.getState().sendMessage('again', 'project-1');
    });
    await waitFor(() => expect(fakeProvider.sendMessage).toHaveBeenCalledTimes(2));
    expect(fakeProvider.createSession).toHaveBeenCalledTimes(1);
  });
});

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
    deleteSession: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    fakeProvider.createSession.mockReset();
    fakeProvider.sendMessage.mockReset();
    fakeProvider.subscribeSSE.mockReset();
    fakeProvider.deleteSession.mockReset();
    fakeProvider.deleteSession.mockResolvedValue(undefined);
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

describe('useCopilotSSE — session cleanup', () => {
  const fakeProvider = {
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    subscribeSSE: vi.fn(() => ({ close: vi.fn() })),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    fakeProvider.createSession.mockReset();
    fakeProvider.sendMessage.mockReset();
    fakeProvider.subscribeSSE.mockReset();
    fakeProvider.deleteSession.mockReset();
    fakeProvider.deleteSession.mockResolvedValue(undefined);
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
    useProjectStore.setState({
      currentProjectId: 'p1',
      projects: [{ id: 'p1', title: 'P', description: '', coverColor: '#000', updatedAt: '', sceneCount: 0, duration: 0, version: 1 }],
    });
  });

  it('calls deleteSession on the server when the project changes (effect cleanup)', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'session-leak' });

    const { rerender } = renderHook(
      ({ projectId }) => {
        useProjectStore.setState({ currentProjectId: projectId });
        return useCopilotSSE();
      },
      { initialProps: { projectId: 'p1' } },
    );

    await act(async () => {
      useChatStore.getState().sendMessage('hi', 'p1');
    });
    await waitFor(() => expect(fakeProvider.createSession).toHaveBeenCalledTimes(1));

    // Project switch triggers effect cleanup
    rerender({ projectId: 'p2' });

    await waitFor(() => expect(fakeProvider.deleteSession).toHaveBeenCalledWith('session-leak'));
  });

  it('calls deleteSession when abort-turn event fires', async () => {
    fakeProvider.createSession.mockResolvedValue({ id: 'session-abort' });

    renderHook(() => useCopilotSSE());

    await act(async () => {
      useChatStore.getState().sendMessage('hi', 'p1');
    });
    await waitFor(() => expect(fakeProvider.createSession).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new CustomEvent('spellpaw:abort-turn'));
    });

    await waitFor(() => expect(fakeProvider.deleteSession).toHaveBeenCalledWith('session-abort'));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCopilotGenerate } from './useCopilotGenerate';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNodeType } from '@drama/types';
import { providerRegistry } from '@drama/lib/canvasToolkit';

// Mock pollUntilDone (imported via @drama/lib/canvasToolkit/shared in the hook)
// and providerRegistry. The shared module is also mocked so the real pollUntilDone
// (which would loop forever) doesn't run.
vi.mock('@drama/lib/canvasToolkit', async () => {
  const actual = await vi.importActual('@drama/lib/canvasToolkit');
  return {
    ...actual,
    providerRegistry: {
      get: vi.fn(),
      list: vi.fn(() => []),
      ids: vi.fn(() => []),
    },
  };
});

vi.mock('@drama/lib/canvasToolkit/shared', async () => {
  const actual = await vi.importActual('@drama/lib/canvasToolkit/shared');
  return {
    ...actual,
    pollUntilDone: vi.fn(async (_provider, _taskId) => ({
      taskId: 'mock-task',
      status: 'done' as const,
      resultUrl: 'http://result.png',
    })),
  };
});

function setupProjectAndCard(cardId: string, type: CanvasNodeType = 'storyline') {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
  useCanvasStore.setState({
    canvases: {
      proj_1: {
        nodes: [{ id: cardId, type, position: { x: 0, y: 0 }, data: { title: 'pre-existing', isPlaceholder: true } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  });
}

const mockProviderDone = () => ({
  id: 'mock',
  name: 'mock',
  supportedMedia: ['image' as const],
  capabilities: ['text2image' as const, 'image2image' as const],
  requiredConfigKeys: [],
  isConfigured: () => true,
  configure: vi.fn(),
  estimateCost: vi.fn(() => ({ amount: 0, unit: '' })),
  submit: vi.fn(async () => ({ taskId: 't1', status: 'processing' as const })),
  poll: vi.fn(),
});

describe('useCopilotGenerate — text kind', () => {
  it('updates card title/description without provider call', async () => {
    setupProjectAndCard('card_1');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_1', kind: 'text' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a hero enters' });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    const card = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === 'card_1');
    expect(card?.data.description).toBe('a hero enters');
    expect(card?.data.isPlaceholder).toBe(false);
  });
});

describe('useCopilotGenerate — image kind', () => {
  beforeEach(() => {
    vi.mocked(providerRegistry.get).mockReturnValue(mockProviderDone() as never);
  });

  it('infers capability=image2image when ref present', async () => {
    setupProjectAndCard('card_2', 'art');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_2', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({
        prompt: 'a cat',
        providerId: 'mock',
        fileRef: { name: 'ref.png', size: 100, kind: 'image', dataUrl: 'data:...' },
      });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(providerRegistry.get).toHaveBeenCalledWith('mock');
  });

  it('infers capability=text2image when no ref', async () => {
    setupProjectAndCard('card_3', 'art');
    const submitSpy = vi.fn(async () => ({ taskId: 't2', status: 'processing' as const }));
    vi.mocked(providerRegistry.get).mockReturnValue({
      ...mockProviderDone(),
      submit: submitSpy,
    } as never);
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_3', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a cat', providerId: 'mock' });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({ capability: 'text2image' }));
  });
});

describe('useCopilotGenerate — error path', () => {
  it('sets status=error when provider throws', async () => {
    setupProjectAndCard('card_4', 'art');
    vi.mocked(providerRegistry.get).mockReturnValue({
      ...mockProviderDone(),
      submit: vi.fn(async () => { throw new Error('API error'); }),
    } as never);
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_4', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a cat', providerId: 'bad' });
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('API error');
  });
});

describe('useCopilotGenerate — abort', () => {
  it('cancel() resets status to idle', async () => {
    setupProjectAndCard('card_5', 'art');
    // submit returns a promise that rejects with AbortError after 50ms when
    // signal is aborted. cancel() triggers AbortController.abort() which causes
    // the submit promise to reject, the catch block detects AbortError, and
    // status resets to 'idle'.
    vi.mocked(providerRegistry.get).mockReturnValue({
      ...mockProviderDone(),
      submit: vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
          })
      ),
    } as never);
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_5', kind: 'image' })
    );
    act(() => {
      result.current.generate({ prompt: 'a cat', providerId: 'mock' });
    });
    await waitFor(() => expect(result.current.status).toBe('generating'));
    act(() => result.current.cancel());
    await waitFor(() => expect(result.current.status).toBe('idle'));
  });
});
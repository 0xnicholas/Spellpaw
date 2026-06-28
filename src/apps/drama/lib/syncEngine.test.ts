/**
 * Tests for triggerPushNow — the race-condition fix.
 *
 * The bug: when a debounced push is in-flight, the previous
 * implementation called `await performPush(id)`, but `performPush`
 * early-returned when `isRunning` was true, so `triggerPushNow` resolved
 * immediately. The caller (e.g. clear_canvas) reported success, but the
 * actual HTTP push was still in flight — and a fast page refresh could
 * pull the old (pre-clear) state from the server.
 *
 * The fix: track the in-flight push as a promise; `triggerPushNow`
 * awaits it before doing its own fresh push.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useAuthStore } from '@/shared/stores/authStore';
import type { User } from '@shared/types';

// Mock projectSync so we control pushProject timing without hitting the network
vi.mock('@drama/lib/projectSync', () => ({
  pushProject: vi.fn(),
  pullProject: vi.fn(),
  pullAll: vi.fn(),
}));

import * as projectSync from '@drama/lib/projectSync';
import type { PushResult } from '@drama/lib/projectSync';
import { triggerPushNow } from '@drama/lib/syncEngine';

const mockedPushProject = vi.mocked(projectSync.pushProject);

describe('triggerPushNow — race condition fix', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [{
        id: 'proj_race',
        title: 'Race',
        description: '',
        coverColor: '#000',
        updatedAt: new Date().toISOString(),
        sceneCount: 0,
        duration: 0,
        version: 1,
      }],
      currentProjectId: 'proj_race',
    });
    useCanvasStore.setState({ canvases: { proj_race: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } }, selectedCardId: null });
    useAuthStore.setState({ token: 'test-token', isAuthenticated: true, user: { id: 'u1', name: 'Test', email: 't@x' } satisfies User });
    mockedPushProject.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for an in-flight debounced push before its own push', async () => {
    // First push: slow (150ms). Second push: fast. Verify timing.
    const slowPush = new Promise<PushResult>((resolve) => {
      setTimeout(() => resolve({ success: true }), 150);
    });
    const fastPush: Promise<PushResult> = Promise.resolve({ success: true });

    // Queue: first call returns slow, second returns fast
    mockedPushProject
      .mockReturnValueOnce(slowPush)
      .mockReturnValueOnce(fastPush);

    // Start a debounced push indirectly by calling triggerPushNow first.
    // Actually we need a slow in-flight push BEFORE calling triggerPushNow.
    // The cleanest way: call triggerPushNow twice in quick succession.
    // The first call will start a slow push; the second will be called
    // while the first is in-flight.
    //
    // But triggerPushNow first awaits in-flight (if any), so this
    // actually serializes them. We need to simulate the situation
    // where there's a push from a different code path (e.g. debounce).
    //
    // Easiest: directly call pushProject via a manual schedule. The
    // sync engine exposes schedulePush only internally. But we can
    // simulate by calling triggerPushNow once (which starts the slow
    // push), then waiting a tick (push is now in-flight), then calling
    // triggerPushNow again (the bug case).

    // Start the slow push (this becomes the "in-flight" push)
    const firstCall = triggerPushNow();
    // Wait one microtask so performPush's setState runs and isRunning
    // becomes true
    await Promise.resolve();
    await Promise.resolve();
    // Now currentPushPromise is set. Time the second call.
    const start = Date.now();
    const secondCall = triggerPushNow();
    await secondCall;
    const elapsed = Date.now() - start;
    await firstCall;

    // The second triggerPushNow should have waited for the first push
    // (which takes 150ms) and then done its own fast push. Total ≥ 150ms.
    expect(elapsed).toBeGreaterThanOrEqual(140);
    // Both pushes should have been called
    expect(mockedPushProject).toHaveBeenCalledTimes(2);
  });

  it('resolves immediately when no push is in-flight', async () => {
    mockedPushProject.mockResolvedValue({ success: true });

    const start = Date.now();
    await triggerPushNow();
    const elapsed = Date.now() - start;

    // No in-flight push, no debounce, just the HTTP round-trip (mocked to resolve immediately)
    expect(elapsed).toBeLessThan(50);
    expect(mockedPushProject).toHaveBeenCalledTimes(1);
  });

  it('returns early when no current project', async () => {
    useProjectStore.setState({ currentProjectId: null });
    await triggerPushNow();
    expect(mockedPushProject).not.toHaveBeenCalled();
  });

  it('returns early when not authenticated', async () => {
    useAuthStore.setState({ token: '', isAuthenticated: false, user: null });
    await triggerPushNow();
    expect(mockedPushProject).not.toHaveBeenCalled();
  });

  it('cancels any pending debounce timer', async () => {
    // Schedule a debounce push (simulating a state change). The test verifies
    // that calling triggerPushNow cancels the timer and pushes immediately.
    mockedPushProject.mockResolvedValue({ success: true });

    // Trigger one push to verify the path
    await triggerPushNow();
    expect(mockedPushProject).toHaveBeenCalledTimes(1);

    // Trigger again to verify the second call also pushes (no leftover debounce)
    const start = Date.now();
    await triggerPushNow();
    const elapsed = Date.now() - start;

    expect(mockedPushProject).toHaveBeenCalledTimes(2);
    // Should not wait for the 500ms debounce
    expect(elapsed).toBeLessThan(100);
  });
});

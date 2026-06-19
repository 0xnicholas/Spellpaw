/**
 * Sync Engine — automatic push/pull with debounce, offline queue,
 * and conflict-aware state tracking.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useChatStore } from '@drama/stores/chatStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { pushAll, pullAll, type PushAllResult } from './projectSync';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline';

export interface SyncEngineState {
  state: SyncState;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
}

let engineState: SyncEngineState = {
  state: 'synced',
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
};

const listeners = new Set<(state: SyncEngineState) => void>();

function emit() {
  const snapshot = { ...engineState };
  for (const cb of listeners) cb(snapshot);
}

function setState(patch: Partial<SyncEngineState>) {
  engineState = { ...engineState, ...patch };
  emit();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isRunning = false;

function schedulePush() {
  if (!useAuthStore.getState().isAuthenticated) return;
  if (debounceTimer) clearTimeout(debounceTimer);

  if (!isOnline) {
    setState({ state: 'offline', pendingCount: engineState.pendingCount + 1 });
    return;
  }

  setState({ state: 'pending', pendingCount: engineState.pendingCount + 1 });

  debounceTimer = setTimeout(() => {
    void performPush();
  }, 3000);
}

async function performPush() {
  if (isRunning) return;
  if (!useAuthStore.getState().isAuthenticated) return;
  if (!isOnline) return;

  isRunning = true;
  setState({ state: 'syncing' });

  try {
    const result: PushAllResult = await pushAll();

    if (result.errors.length > 0) {
      setState({
        state: 'offline',
        pendingCount: 0,
        lastSyncAt: Date.now(),
        error: result.errors.join('; '),
      });
    } else {
      setState({
        state: 'synced',
        pendingCount: 0,
        lastSyncAt: Date.now(),
        error: null,
      });
    }
  } catch (err) {
    setState({
      state: 'offline',
      pendingCount: 0,
      error: (err as Error).message,
    });
  } finally {
    isRunning = false;
  }
}

async function performPull() {
  if (isRunning) return;
  if (!useAuthStore.getState().isAuthenticated) return;
  if (!isOnline) return;

  isRunning = true;
  setState({ state: 'syncing' });

  try {
    await pullAll();
    const currentProjectId = useProjectStore.getState().currentProjectId;
    if (currentProjectId) {
      await useChatStore.getState().loadChat(currentProjectId);
    }
    setState({
      state: 'synced',
      pendingCount: 0,
      lastSyncAt: Date.now(),
      error: null,
    });
  } catch (err) {
    setState({
      state: 'offline',
      error: (err as Error).message,
    });
  } finally {
    isRunning = false;
  }
}

/** Subscribe to sync engine state changes. Returns unsubscribe function. */
export function subscribeSync(cb: (state: SyncEngineState) => void): () => void {
  listeners.add(cb);
  cb({ ...engineState });
  return () => listeners.delete(cb);
}

/** Read current sync state without subscribing. */
export function getSyncState(): SyncEngineState {
  return { ...engineState };
}

/** Manually trigger a push. */
export function triggerPush(): void {
  schedulePush();
}

/** Manually trigger a pull. */
export function triggerPull(): void {
  void performPull();
}

/** Initialise subscriptions. Call once at app startup. */
export function initSyncEngine(): void {
  // Watch project data changes (ignore selection changes)
  useProjectStore.subscribe((state, prevState) => {
    if (
      state.projects !== prevState.projects ||
      state.trees !== prevState.trees
    ) {
      schedulePush();
    }
  });

  // Watch canvas data changes
  useCanvasStore.subscribe((state, prevState) => {
    if (state.canvases !== prevState.canvases) {
      schedulePush();
    }
  });

  // Network status
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline = true;
      if (engineState.state === 'offline' && engineState.pendingCount > 0) {
        schedulePush();
      }
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      setState({ state: 'offline' });
    });
  }

  // Auto-pull on startup if authenticated
  if (useAuthStore.getState().isAuthenticated) {
    void performPull();
  }

  // Watch auth state: start syncing after login, stop after logout
  useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated && !prevState.isAuthenticated) {
      void performPull();
    } else if (!state.isAuthenticated && prevState.isAuthenticated) {
      setState({ state: 'synced', pendingCount: 0, error: null });
    }
  });
}

/**
 * Sync Engine — cloud-first: every mutation pushes immediately to server.
 * Server is the authoritative source. On 409 conflict, server wins.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { pushProject, pullProject } from './projectSync';

export type SyncState = 'synced' | 'syncing' | 'error';

export interface SyncEngineState {
  state: SyncState;
  lastSyncAt: number | null;
  error: string | null;
}

let engineState: SyncEngineState = {
  state: 'synced',
  lastSyncAt: null,
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

let isRunning = false;
let pendingPush = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Push current project to server immediately.
 * On 409 conflict: auto-pull server version (server wins).
 * On network error: show toast, keep local edit (retried on next change).
 */
async function performPush(projectId: string) {
  if (isRunning) {
    // Already pushing — mark pending so we retry after
    pendingPush = true;
    return;
  }
  if (!useAuthStore.getState().isAuthenticated) return;

  isRunning = true;
  setState({ state: 'syncing' });

  try {
    const result = await pushProject(projectId);

    if (result.conflict) {
      // Server is newer: pull and overwrite local
      const pullResult = await pullProject(projectId);
      if (pullResult.success) {
        setState({ state: 'synced', lastSyncAt: Date.now(), error: null });
        // Toast: server version was applied
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spellpaw:toast', {
            detail: { message: '已同步至云端最新版本', type: 'info' },
          }));
        }
      } else {
        setState({ state: 'error', error: pullResult.error ?? '拉取失败' });
      }
    } else if (result.success) {
      setState({ state: 'synced', lastSyncAt: Date.now(), error: null });
    } else if (result.error) {
      setState({ state: 'error', error: result.error });
      // Toast non-critical errors
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spellpaw:toast', {
          detail: { message: `同步失败: ${result.error}`, type: 'error' },
        }));
      }
    }
  } catch (err) {
    setState({ state: 'error', error: (err as Error).message });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spellpaw:toast', {
        detail: { message: '网络异常，修改将稍后同步', type: 'warning' },
      }));
    }
  } finally {
    isRunning = false;
    // If another change came in while we were pushing, push again
    if (pendingPush) {
      pendingPush = false;
      const id = useProjectStore.getState().currentProjectId;
      if (id) schedulePush(id);
    }
  }
}

/** Debounced push — collapses rapid edits into single push */
function schedulePush(projectId: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void performPush(projectId);
  }, 500); // 500ms debounce to batch rapid edits (e.g. typing in detail panel)
}

/** Manual trigger for pull */
async function performPull() {
  if (isRunning) return;
  if (!useAuthStore.getState().isAuthenticated) return;

  isRunning = true;
  setState({ state: 'syncing' });

  try {
    const { pullAll } = await import('./projectSync');
    await pullAll();
    setState({ state: 'synced', lastSyncAt: Date.now(), error: null });
  } catch (err) {
    setState({ state: 'error', error: (err as Error).message });
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

/** Manually trigger a push (for explicit save actions). */
export function triggerPush(): void {
  const id = useProjectStore.getState().currentProjectId;
  if (id) schedulePush(id);
}

/**
 * Force an immediate push, bypassing the 500ms debounce. Resolves when the
 * push completes (success or failure). Use after destructive operations
 * (e.g. clear_canvas) where a refresh during the debounce window would
 * otherwise restore stale state from the server.
 */
export async function triggerPushNow(): Promise<void> {
  const id = useProjectStore.getState().currentProjectId;
  if (!id) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await performPush(id);
}

/** Manually trigger a pull. */
export function triggerPull(): void {
  void performPull();
}

/**
 * Initialise sync engine. Call once at app startup.
 *
 * Cloud-first model:
 * - Every project/canvas mutation triggers an immediate (500ms debounced) server push.
 * - On 409 conflict: server version overwrites local (server is always authoritative).
 * - Network errors: keep local edit, retry on next change.
 * - On login: auto-pull all projects from server.
 */
export function initSyncEngine(): void {
  let prevProjectsJson = '';
  let prevCanvasesJson = '';

  // Watch project data changes (ignore selection changes)
  useProjectStore.subscribe((state) => {
    const id = state.currentProjectId;
    if (!id) return;
    const tree = state.trees[id];
    const projectsJson = JSON.stringify(state.projects);
    const treesJson = JSON.stringify(tree);

    const currentJson = projectsJson + treesJson;
    if (currentJson !== prevProjectsJson) {
      prevProjectsJson = currentJson;
      schedulePush(id);
    }
  });

  // Watch canvas data changes
  useCanvasStore.subscribe((state) => {
    const id = useProjectStore.getState().currentProjectId;
    if (!id) return;
    const canvas = state.canvases[id];
    const currentJson = JSON.stringify(canvas);

    if (currentJson !== prevCanvasesJson) {
      prevCanvasesJson = currentJson;
      schedulePush(id);
    }
  });

  // Auto-pull on startup if authenticated
  if (useAuthStore.getState().isAuthenticated) {
    void performPull();
  }

  // Watch auth state: pull on login
  useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated && !prevState.isAuthenticated) {
      void performPull();
    }
  });
}

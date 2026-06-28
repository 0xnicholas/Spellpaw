/**
 * Sync Engine — cloud-first: every mutation pushes immediately to server.
 * Server is the authoritative source. On 409 conflict, merge server state
 * with local pending edits instead of silently overwriting local changes.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { config } from '@/shared/config';
import { pushProject, pullProject, buildProjectPayload } from './projectSync';
import type { CanvasEntry, CanvasNode, CanvasEdge } from '@drama/types';

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
// Promise of the in-flight push, so callers like triggerPushNow can
// await it instead of racing with the debounce timer.
let currentPushPromise: Promise<void> | null = null;

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function toast(message: string, type: 'info' | 'warning' | 'error' = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('spellpaw:toast', { detail: { message, type } }));
}

/** Merge server canvas with local canvas: union by id, local wins on conflicts. */
function mergeCanvases(local: CanvasEntry, remote: CanvasEntry): CanvasEntry {
  const nodeMap = new Map<string, CanvasNode>();
  for (const n of remote.nodes) nodeMap.set(n.id, n);
  for (const n of local.nodes) nodeMap.set(n.id, n); // local overwrites remote for same id

  const edgeMap = new Map<string, CanvasEdge>();
  for (const e of remote.edges) edgeMap.set(e.id, e);
  for (const e of local.edges) edgeMap.set(e.id, e);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    viewport: local.viewport,
  };
}

/**
 * Push current project to server immediately.
 * On 409 conflict: pull server version, merge with local pending edits,
 * write merged state back to local store, and re-push.
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

  // Wrap the actual push so we can expose the in-flight promise to
  // triggerPushNow (and any other future caller that needs to wait).
  currentPushPromise = (async () => {
    try {
      const result = await pushProject(projectId);

      if (result.conflict) {
        // Server is newer: merge instead of blindly overwriting local.
        const pullResult = await pullProject(projectId);
        if (!pullResult.success || !pullResult.serverData) {
          setState({ state: 'error', error: pullResult.error ?? '拉取失败' });
          return;
        }

        const localCanvas = useCanvasStore.getState().canvases[projectId] ?? {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        };
        const merged = mergeCanvases(localCanvas, pullResult.serverData);

        useCanvasStore.setState((s) => ({
          canvases: {
            ...s.canvases,
            [projectId]: merged,
          },
        }));
        // Bump updatedAt so the next push wins the timestamp check.
        useProjectStore.getState().updateProject(projectId, { updatedAt: new Date().toISOString() });

        toast('检测到云端有更新，已自动合并，请检查画布', 'info');

        // Re-push the merged state. If this also conflicts (extremely rare
        // concurrent edit), stop to avoid an infinite loop.
        const retry = await pushProject(projectId);
        if (retry.conflict) {
          setState({ state: 'error', error: '合并后仍冲突，请手动刷新或重试' });
          toast('合并后仍冲突，请手动刷新或重试', 'error');
          return;
        }
        if (retry.success) {
          setState({ state: 'synced', lastSyncAt: Date.now(), error: null });
        } else if (retry.error) {
          setState({ state: 'error', error: retry.error });
        }
      } else if (result.success) {
        setState({ state: 'synced', lastSyncAt: Date.now(), error: null });
      } else if (result.error) {
        setState({ state: 'error', error: result.error });
        // Toast non-critical errors
        toast(`同步失败: ${result.error}`, 'error');
      }
    } catch (err) {
      setState({ state: 'error', error: (err as Error).message });
      toast('网络异常，修改将稍后同步', 'warning');
    }
  })();

  try {
    await currentPushPromise;
  } finally {
    isRunning = false;
    currentPushPromise = null;
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
 * Force an immediate push, bypassing the 500ms debounce. Resolves ONLY
 * when the push (and any follow-up push needed to capture state changes
 * that happened during it) has actually completed on the server.
 */
export async function triggerPushNow(): Promise<void> {
  const id = useProjectStore.getState().currentProjectId;
  if (!id) return;
  if (!useAuthStore.getState().isAuthenticated) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }

  // If a debounced push is already in-flight, wait for it to land before
  // we do our own.
  if (currentPushPromise) {
    await currentPushPromise;
  }

  // Do a fresh push with the current local state.
  await performPush(id);
}

/** Manually trigger a pull. */
export function triggerPull(): void {
  void performPull();
}

/**
 * Flush pending edits before the tab closes. The debounce timer may still
 * be running, so we cancel it and fire a keepalive PUT to give the browser
 * a chance to deliver the latest state.
 */
function flushBeforeUnload() {
  if (!pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;

  const id = useProjectStore.getState().currentProjectId;
  if (!id) return;
  if (!useAuthStore.getState().isAuthenticated) return;

  const project = useProjectStore.getState().projects.find((p) => p.id === id);
  if (!project) return;

  const body = JSON.stringify({
    title: project.title,
    description: project.description,
    coverColor: project.coverColor,
    data: buildProjectPayload(id),
    version: project.version ?? 1,
    updatedAt: project.updatedAt,
  });

  void fetch(`${config.serverBase}/api/projects/${id}`, {
    method: 'PUT',
    keepalive: true,
    headers: getAuthHeaders(),
    body,
  });
}

/**
 * Initialise sync engine. Call once at app startup.
 *
 * Cloud-first model:
 * - Every project/canvas mutation triggers an immediate (500ms debounced) server push.
 * - On 409 conflict: merge server version with local pending edits, then re-push.
 * - Network errors: keep local edit, retry on next change.
 * - On login: auto-pull all projects from server.
 * - On beforeunload: flush any pending debounced push with keepalive.
 */
export function initSyncEngine(): void {
  let prevProjectsJson = '';
  let prevCanvasesJson = '';

  // Watch project data changes (ignore selection changes)
  useProjectStore.subscribe((state) => {
    const id = state.currentProjectId;
    if (!id) return;
    const projectsJson = JSON.stringify(state.projects);

    if (projectsJson !== prevProjectsJson) {
      prevProjectsJson = projectsJson;
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

  // Flush pending edits before the tab closes.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushBeforeUnload);
  }

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

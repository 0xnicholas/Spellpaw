/**
 * Drama app bootstrap — runs once when the first Drama route mounts.
 *
 * Previously these calls lived in `main.tsx`, which meant every page
 * (including Portal) blocked on Drama's IndexedDB migration and task
 * rehydration before its first frame could paint. By moving init
 * here we keep Portal fast and let Drama own its own startup cost.
 *
 * Idempotent: the module-level flag means re-entering any Drama
 * route (e.g. switching between /projects and /templates) will not
 * re-run the bootstrap.
 */
import { migrateToIDB } from '@drama/lib/migrateToIDB';
import { initSyncEngine } from '@drama/lib/syncEngine';
import {
  providerRegistry,
  startPolling,
  useTaskStore,
} from '@drama/lib/canvasToolkit';

let bootstrapped = false;

export async function bootstrapDrama(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  await migrateToIDB();
  initSyncEngine();

  await useTaskStore.persist.rehydrate();
  useTaskStore.getState().tasks.forEach((t) => {
    const provider = providerRegistry.get(t.providerId);
    if (provider?.poll) startPolling(t.taskId, provider, t.cardId);
  });
}
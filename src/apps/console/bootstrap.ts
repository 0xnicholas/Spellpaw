/**
 * Console app bootstrap — runs once when the first Console route mounts.
 *
 * Pulls server-side user settings (API keys, LLM config) into local
 * stores. Previously lived in `main.tsx`, blocking every page including
 * Portal on the network round-trip.
 *
 * Idempotent via module-level flag.
 */
import { syncUserSettings } from '@console/lib/syncSettings';
import { useAuthStore } from '@/shared/stores/authStore';

let bootstrapped = false;

export async function bootstrapConsole(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  if (useAuthStore.getState().isAuthenticated) {
    await syncUserSettings().catch(() => {
      /* network errors are non-fatal — local values remain in effect */
    });
  }
}
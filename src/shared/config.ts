/**
 * Central config — all environment-dependent values
 * Override with VITE_* env vars or import.meta.env in production.
 */
export const config = {
  pandariaBase: import.meta.env.VITE_PANDARIA_BASE || 'http://localhost:8080',
  serverBase: import.meta.env.VITE_SERVER_BASE || 'http://localhost:3001',
  toolServerEndpoint: import.meta.env.VITE_TOOL_SERVER || 'http://127.0.0.1.nip.io:5173/tool',
  authSecret: import.meta.env.VITE_AUTH_SECRET || 'test-secret-32-chars-long!!!',
  pandariaAuthSecret: import.meta.env.VITE_PANDARIA_AUTH_SECRET || 'spellpaw-dev-key-32chars!!',
} as const;

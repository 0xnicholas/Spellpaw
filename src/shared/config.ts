/**
 * Central config — all environment-dependent values
 * Override with VITE_* env vars or import.meta.env in production.
 */
export const config = {
  serverBase: import.meta.env.VITE_SERVER_BASE || 'http://localhost:3002',
  toolServerEndpoint: import.meta.env.VITE_TOOL_SERVER || 'http://127.0.0.1.nip.io:5173/tool',
  authSecret: import.meta.env.VITE_AUTH_SECRET || 'test-secret-32-chars-long!!!',
  llmProvider: import.meta.env.VITE_LLM_PROVIDER || 'spellpaw',
  llmBase: import.meta.env.VITE_LLM_BASE || '',
} as const;

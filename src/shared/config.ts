/**
 * Central config — all environment-dependent values
 * Override with VITE_* env vars or import.meta.env in production.
 */
export const config = {
  serverBase: import.meta.env.VITE_SERVER_BASE || 'http://localhost:3002',
  toolServerEndpoint: import.meta.env.VITE_TOOL_SERVER || 'http://127.0.0.1.nip.io:5173/tool',
  authSecret: import.meta.env.VITE_AUTH_SECRET || 'test-secret-32-chars-long!!!',
  // This selects the front-end LLM adapter. Currently only `spellpaw` (Spellpaw Server proxy)
  // is implemented; the actual model (doubao/minimax/deepseek/openai) is chosen in Settings.
  llmProvider: import.meta.env.VITE_LLM_PROVIDER || 'deepseek',
  llmBase: import.meta.env.VITE_LLM_BASE || '',
  /**
   * Show the demo-account hint on the login page. The demo user always exists in
   * the database (created by the server's startup seed), so this is purely a UI
   * convenience — toggling it off does not affect whether the demo account is
   * reachable via the real login API. Set `VITE_SHOW_DEMO_HINT=false` to hide
   * the hint card in production.
   */
  showDemoHint: import.meta.env.VITE_SHOW_DEMO_HINT !== 'false',
} as const;

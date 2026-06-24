/**
 * Shared types for the tool router.
 *
 * The router maps tool names (called by the LLM) to handler functions that
 * mutate Zustand stores and return a localized confirmation string.
 */

export type ToolParams = Record<string, unknown>;

export type ToolHandler<P extends ToolParams = ToolParams> =
  (params: P) => Promise<string>;

export interface ToolRouter {
  [action: string]: ToolHandler;
}
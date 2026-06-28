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

export interface ToolResult {
  success: boolean;
  affectedCardIds?: string[];
  summary: string;
  error?: 'card_not_found' | 'validation_failed' | 'unknown_card_type' | 'no_project_selected';
  cardId?: string;
  errors?: Array<{ cardId: string; error: string }>;
  suggestion?: string;
  /** Phase 2: structured side-effects for canvas real-time updates. */
  sideEffects?: ToolSideEffects;
}

/**
 * Side-effects a tool call had on the canvas. Populated by card/generation
 * handlers so the frontend can animate card appearances / updates / removals
 * immediately (before the next full canvas poll).
 */
export interface ToolSideEffects {
  canvas?: {
    cardsAdded?: Array<{ id: string; type: string; title: string }>;
    cardsUpdated?: Array<{ id: string; thumbnail?: string; status?: string }>;
    cardsDeleted?: string[];
  };
}
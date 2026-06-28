/**
 * Tool router — single source of truth for LLM tool handlers.
 *
 * Split into 4 domain files (tree / cards / generation / analysis) plus a
 * types module. Each domain exports a `ToolRouter`-shaped map of handlers;
 * this index aggregates them.
 *
 * Phase 1 of skills-refactor: skill tools (spellpaw_skill_*) are no longer
 * registered here. Skills are now LLM-driven: chat prepends skill
 * instructions to the user message and the LLM uses atomic tools. See
 * docs/plans/skills-refactor-to-guide.md.
 */
import { cardHandlers } from './cards';
import { generationHandlers } from './generation';
import { analysisHandlers } from './analysis';
import type { ToolRouter } from './types';

export const toolRouter: ToolRouter = {
  ...cardHandlers,
  ...generationHandlers,
  ...analysisHandlers,
};

export type { ToolRouter, ToolHandler, ToolParams } from './types';
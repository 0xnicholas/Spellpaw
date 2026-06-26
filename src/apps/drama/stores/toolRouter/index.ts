/**
 * Tool router — single source of truth for LLM tool handlers.
 *
 * Split into 4 domain files (tree / cards / generation / analysis) plus a
 * types module. Each domain exports a `ToolRouter`-shaped map of handlers;
 * this index aggregates them and registers skill tools.
 *
 * Public API unchanged: `import { toolRouter } from '@drama/stores/toolRouter'`
 */
import { cardHandlers } from './cards';
import { generationHandlers } from './generation';
import { analysisHandlers } from './analysis';
import { registerSkillTools } from '@drama/lib/skills/registry';
import type { ToolRouter } from './types';

export const toolRouter: ToolRouter = {
  ...cardHandlers,
  ...generationHandlers,
  ...analysisHandlers,
};

// Skill tools (spellpaw_skill_*) — registered last so they can override
// any atomic tool with the same name (none should conflict today).
registerSkillTools(toolRouter);

export type { ToolRouter, ToolHandler, ToolParams } from './types';
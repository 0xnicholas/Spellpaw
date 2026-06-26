/**
 * Skill system — composable, user-invokable AI workflows for the Copilot.
 *
 * A skill is a higher-level workflow that composes one or more atomic
 * tool calls. Skills can be invoked three ways:
 *   1. Slash command from the user (e.g. `/storyboard-batch`).
 *   2. Click on a skill suggestion in the chat panel.
 *   3. By the LLM itself via tool_call (skills are registered as
 *      LLM-callable tools with the `spellpaw_skill_*` prefix).
 *
 * The Skill abstraction is intentionally narrower than a free-form agent
 * loop — each skill has a defined purpose, parameters, and a bounded
 * execution that returns a summary. This makes skills predictable,
 * testable, and cheap to run (no LLM roundtrip when invoked directly).
 */
import type { Project } from '@drama/types';
import type { CanvasNode } from '@drama/types';

export interface SkillContext {
  /** Current project id (for the store mutations) */
  projectId: string;
  /** Read access to current canvas cards (read-only inside skills) */
  getCurrentCanvasNodes: () => CanvasNode[];
  /** Read access to current project metadata (read-only inside skills) */
  getCurrentProject: () => Project | null;
  /** Read access to current canvas card count */
  getCanvasCardCount: () => number;
}

export interface SkillResult {
  /** Human-readable summary posted to the chat as an assistant message */
  summary: string;
  /** Tally of side effects (for the action chip in the chat) */
  cardsCreated?: number;
  cardsUpdated?: number;
  cardsDeleted?: number;
  /** True if the skill did work that warrants a follow-up LLM call */
  needsLlmFollowup?: boolean;
}

export interface Skill {
  /** Stable id used in tool configs (with `spellpaw_skill_` prefix) and slash command parsing */
  id: string;
  /** Display name shown in the chat UI */
  name: string;
  /** What the skill does — used in the LLM tool description AND shown in the suggestion chip */
  description: string;
  /** Slash command without the leading slash, e.g. `storyboard-batch` */
  slashCommand: string;
  /** One-line example invocations shown in the chip tooltip */
  examples: string[];
  /** JSON schema for LLM tool calling. Skills take a single `input` object. */
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  /** The skill's actual work. Receives user-provided args plus the live project context. */
  invoke: (args: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>;
}

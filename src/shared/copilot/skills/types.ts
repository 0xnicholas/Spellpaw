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
 *
 * This module is app-agnostic. App-specific context bindings (TreeNode,
 * Project, etc.) are provided by each app's SkillContext subtype.
 */

export interface SkillContext {
  /** Current project id (for store mutations) */
  projectId: string;
  /** Read access to current project tree (app-specific type — cast in invokes) */
  getProjectTree: () => unknown | null;
  /** Read access to current project metadata (app-specific type — cast in invokes) */
  getCurrentProject: () => unknown | null;
  /** Read access to current canvas cards (read-only inside skills) */
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
  /** The skill's actual work. Args are parsed user input; ctx is app-provided. */
  invoke: (args: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>;
}

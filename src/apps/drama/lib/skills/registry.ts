/**
 * Skill registry — single source of truth for built-in and custom skills.
 *
 * Look up by id, by slash command, or list all. Also generates LLM tool
 * configs (`spellpaw_skill_*` prefix) so the model can call skills
 * just like atomic tools.
 */
import { BUILT_IN_SKILLS } from './builtIn';
import type { Skill } from './types';

// Custom-skill support placeholder. Future: persist user-defined skills
// to a Zustand store (mirror the customTemplateStore pattern) and merge
// them here at lookup time. For now we ship built-ins only.
const ALL_SKILLS: readonly Skill[] = BUILT_IN_SKILLS;

export function getAllSkills(): readonly Skill[] {
  return ALL_SKILLS;
}

export function getSkillById(id: string): Skill | undefined {
  return ALL_SKILLS.find((s) => s.id === id);
}

export function getSkillBySlashCommand(cmd: string): Skill | undefined {
  // cmd is the slash command with the leading slash already stripped
  // (e.g. "analyze-pacing" not "/analyze-pacing")
  const normalized = cmd.startsWith('/') ? cmd.slice(1) : cmd;
  return ALL_SKILLS.find((s) => s.slashCommand === normalized);
}

export function parseSlashCommand(text: string): { skill: Skill; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  // Match "/<cmd>" or "/<cmd> rest of args"
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)\s*(.*)$/);
  if (!match) return null;
  const skill = getSkillBySlashCommand(match[1]);
  if (!skill) return null;
  return { skill, args: match[2].trim() };
}

/**
 * Parse a `key:value` arguments string into a record. Used for the
 * `/duplicate-project 新标题:foo 风格:bar` syntax.
 *
 *   "新标题:foo  风格:bar"  →  { "新标题": "foo", "风格": "bar" }
 *
 * Splits on whitespace between key:value pairs. Values with whitespace
 * are NOT supported (use a different skill parameter style for those).
 */
export function parseArgTokens(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tokens = text.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const idx = token.indexOf(':');
    if (idx <= 0) continue; // no colon, or starts with colon — skip
    const key = token.slice(0, idx);
    const value = token.slice(idx + 1);
    if (key && value) result[key] = value;
  }
  return result;
}

/**
 * Convert a skill into the LLM tool-call config format used by
 * toolConfigs.ts. Each skill becomes one tool with name
 * `spellpaw_skill_<id>` and a single `input` object argument.
 */
export function skillToToolConfig(skill: Skill): {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
} {
  return {
    name: `spellpaw_skill_${skill.id}`,
    description: `${skill.description}。Examples: ${skill.examples.join(' | ')}`,
    parameters: {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          description: `Parameters for ${skill.name} (${skill.slashCommand}). Schema: ${JSON.stringify(skill.parameters.properties)}`,
        },
      },
      required: ['input'],
    },
  };
}

export function getAllSkillToolConfigs() {
  return ALL_SKILLS.map(skillToToolConfig);
}

/**
 * Pure registry functions for the skill system.
 *
 * Every function that needs the full skill list takes `skills: readonly Skill[]`
 * as its first parameter — no global state, no app-specific imports.
 *
 * App-specific wrappers (e.g. `getAllSkills()` → `BUILT_IN_SKILLS`) live
 * in each app's own `skills/registry.ts`.
 */
import type { Skill } from './types';

/** Find a skill by its stable id. */
export function getSkillById(skills: readonly Skill[], id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}

/** Find a skill by its slash command (with or without leading `/`). */
export function getSkillBySlashCommand(skills: readonly Skill[], cmd: string): Skill | undefined {
  const normalized = cmd.startsWith('/') ? cmd.slice(1) : cmd;
  return skills.find((s) => s.slashCommand === normalized);
}

/**
 * Parse a slash command from raw user text.
 * Returns `{ skill, args }` or `null` if the text doesn't start with
 * a recognised slash command.
 */
export function parseSlashCommand(
  skills: readonly Skill[],
  text: string,
): { skill: Skill; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)\s*(.*)$/);
  if (!match) return null;
  const skill = getSkillBySlashCommand(skills, match[1]);
  if (!skill) return null;
  return { skill, args: match[2].trim() };
}

/**
 * Split a string into whitespace-separated tokens, keeping matched
 * `"..."` or `'...'` quotes as one token. Unmatched quotes treated as literal.
 */
function tokenizeRespectingQuotes(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/** Strip a single layer of matched `"` or `'` quotes from both ends. */
function stripOuterQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0]!;
    const last = s[s.length - 1]!;
    if ((first === '"' || first === "'") && first === last) {
      return s.slice(1, -1);
    }
  }
  return s;
}

/**
 * Parse `key:value` arguments string into a record.
 *
 *   '新标题:foo  风格:bar'           →  { 新标题: 'foo', 风格: 'bar' }
 *   '描述:"复杂的故事" 姓名:林'      →  { 描述: '复杂的故事', 姓名: '林' }
 */
export function parseArgTokens(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tokens = tokenizeRespectingQuotes(text);
  for (const token of tokens) {
    const idx = token.indexOf(':');
    if (idx <= 0) continue;
    const key = token.slice(0, idx);
    const value = stripOuterQuotes(token.slice(idx + 1));
    if (key && value) result[key] = value;
  }
  return result;
}

/** Render parameter schema as a human-readable bullet list for the LLM tool description. */
function formatParametersForLlm(
  properties: Record<string, { type: string; description: string }>,
  required: string[],
): string {
  const requiredSet = new Set(required);
  const entries = Object.entries(properties);
  if (entries.length === 0) return 'No parameters.';
  return entries
    .map(([key, spec]) => {
      const marker = requiredSet.has(key) ? '*' : '';
      const desc = spec.description?.trim() ?? '';
      return desc ? `  - ${key}${marker} (${spec.type}): ${desc}` : `  - ${key}${marker} (${spec.type})`;
    })
    .join('\n');
}

/** Convert a skill into the LLM tool-call config format. */
export function skillToToolConfig(skill: Skill): {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
} {
  const paramLines = formatParametersForLlm(skill.parameters.properties, skill.parameters.required);
  return {
    name: `spellpaw_skill_${skill.id}`,
    description: `${skill.description}\nSlash command: /${skill.slashCommand}\nExamples: ${skill.examples.join(' | ')}\nParameters:\n${paramLines}`,
    parameters: {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          description: `Parameters for ${skill.name} (${skill.slashCommand})`,
        },
      },
      required: ['input'],
    },
  };
}

/** Generate tool configs for all given skills. */
export function getAllSkillToolConfigs(skills: readonly Skill[]) {
  return skills.map(skillToToolConfig);
}

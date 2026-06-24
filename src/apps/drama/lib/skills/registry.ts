/**
 * Skill registry — single source of truth for built-in and custom skills.
 *
 * Look up by id, by slash command, or list all. Also generates LLM tool
 * configs (`spellpaw_skill_*` prefix) so the model can call skills
 * just like atomic tools.
 */
import { BUILT_IN_SKILLS } from './builtIn';
import type { Skill } from './types';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { ToolRouter } from '@drama/stores/toolRouter/types';

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

/**
 * Register each built-in skill as a `spellpaw_skill_<id>` tool on the
 * given router. The skill's `invoke` does the real work; this wrapper
 * just adapts the tool-call payload and surfaces the skill's summary.
 *
 * Previously inlined at the bottom of toolRouter.ts. Lifted out so the
 * router no longer needs to know about the skills module.
 *
 * Type-only import of ToolRouter breaks the static cycle that would
 * otherwise form (registry → router → registry).
 */
export function registerSkillTools(router: ToolRouter): void {
  for (const cfg of getAllSkillToolConfigs()) {
    if (router[cfg.name]) continue;
    router[cfg.name] = async (params) => {
      const skillId = cfg.name.replace(/^spellpaw_skill_/, '');
      const skill = getSkillById(skillId);
      if (!skill) return `Unknown skill: ${skillId}`;
      const input = (params as { input?: Record<string, unknown> })?.input ?? {};
      const projectId = useProjectStore.getState().currentProjectId ?? '';
      if (!projectId) {
        return `Skill「${skill.name}」失败：当前没有打开的项目。`;
      }
      const ctx = {
        projectId,
        getProjectTree: () => useProjectStore.getState().getCurrentTree(),
        getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
      };
      const result = await skill.invoke(input, ctx);
      return result.summary;
    };
  }
}

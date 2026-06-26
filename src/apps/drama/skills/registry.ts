/**
 * Drama-specific skill registry.
 *
 * Imports the shared skill framework functions and wraps them with
 * drama's concrete skill list (BUILT_IN_SKILLS from loader.ts).
 * Also registers skills as LLM-callable tools on the tool router.
 */
import { BUILT_IN_SKILLS } from './loader';
import * as shared from '@shared/copilot/skills/registry';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { ToolRouter } from '@drama/stores/toolRouter/types';
import type { Skill } from './types';

const ALL_SKILLS: readonly Skill[] = BUILT_IN_SKILLS;

export function getAllSkills(): readonly Skill[] {
  return ALL_SKILLS;
}

export function getSkillById(id: string): Skill | undefined {
  return shared.getSkillById(ALL_SKILLS, id);
}

export function getSkillBySlashCommand(cmd: string): Skill | undefined {
  return shared.getSkillBySlashCommand(ALL_SKILLS, cmd);
}

export function parseSlashCommand(text: string): { skill: Skill; args: string } | null {
  return shared.parseSlashCommand(ALL_SKILLS, text);
}

export const parseArgTokens = shared.parseArgTokens;
export const skillToToolConfig = shared.skillToToolConfig;

export function getAllSkillToolConfigs() {
  return shared.getAllSkillToolConfigs(ALL_SKILLS);
}

/**
 * Register each built-in skill as a `spellpaw_skill_<id>` tool on the
 * given router. Uses drama's project store + canvas store to build the
 * SkillContext at invocation time.
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
        getCurrentProject: () => {
          const { projects, currentProjectId } = useProjectStore.getState();
          return projects.find((p) => p.id === currentProjectId) ?? null;
        },
        getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
      };
      const result = await skill.invoke(input, ctx);
      return result.summary;
    };
  }
}

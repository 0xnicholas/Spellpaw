/**
 * Re-export from the canonical skills module.
 * @see src/apps/drama/skills/registry.ts
 */
import { ensureSkillsLoaded, getSkills, _resetSkillsLoader } from '@shared/copilot/skills/loader';
import * as shared from '@shared/copilot/skills/registry';
import type { Skill } from '@shared/copilot/skills/types';

export { _resetSkillsLoader };

export async function initSkills(): Promise<void> {
  return ensureSkillsLoaded();
}

export function getAllSkills(): readonly Skill[] {
  return getSkills();
}

export function getSkillById(id: string): Skill | undefined {
  return shared.getSkillById(getSkills(), id);
}

export function getSkillBySlashCommand(cmd: string): Skill | undefined {
  return shared.getSkillBySlashCommand(getSkills(), cmd);
}

export function parseSlashCommand(text: string): { skill: Skill; args: string } | null {
  return shared.parseSlashCommand(getSkills(), text);
}

export const parseArgTokens = shared.parseArgTokens;
export const skillToToolConfig = shared.skillToToolConfig;

export function getAllSkillToolConfigs() {
  return shared.getAllSkillToolConfigs(getSkills());
}

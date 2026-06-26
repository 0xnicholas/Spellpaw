/**
 * Drama-specific skill chat integration.
 *
 * Provides `tryRunSkill`, `executeSkill`, and `formatSkillInvocation`
 * that use drama's project + canvas stores to build the SkillContext.
 *
 * Pure helpers (isSlashCommand, buildSkillResultMessage, etc.) are
 * re-exported from the shared framework for convenience.
 */
import { parseSlashCommand, parseArgTokens, getSkillBySlashCommand } from './registry';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { SkillContext } from './types';
import type { ChatMessage } from '@drama/types';
import {
  isSlashCommand,
  buildSkillResultMessage,
  buildSkillPendingMessage,
} from '@shared/copilot/skills/chat';

export { isSlashCommand, buildSkillResultMessage, buildSkillPendingMessage };

interface RunSkillResult {
  pendingMessage: ChatMessage;
  skillId: string;
}

/**
 * Parse the slash command and return the pending assistant message.
 * Returns null if input is not a slash command or command is unknown.
 */
export function tryRunSkill(
  text: string,
  _projectId: string,
): RunSkillResult | null {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;

  const pendingMessage = buildSkillPendingMessage(
    parsed.skill.id,
    `🎯 正在执行 ${parsed.skill.name}…`,
  );

  return { pendingMessage, skillId: parsed.skill.id };
}

/**
 * Short user-facing "invoked" message shown in the chat log.
 */
export function formatSkillInvocation(skillId: string): string {
  const skill = getSkillBySlashCommand(skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}

/**
 * Build the SkillContext from drama's project + canvas stores.
 */
function buildSkillContext(projectId: string): SkillContext {
  return {
    projectId,
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCurrentProject: () => {
      const { projects, currentProjectId } = useProjectStore.getState();
      return projects.find((p) => p.id === currentProjectId) ?? null;
    },
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };
}

/**
 * Parse the slash command, run the skill, return the final message.
 * Returns null if input is not a slash command or command is unknown.
 */
export async function executeSkill(
  text: string,
  projectId: string,
): Promise<{ finalMessage: ChatMessage; skillId: string } | null> {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;
  const args = parseArgTokens(parsed.args);
  const ctx = buildSkillContext(projectId);
  let summary: string;
  let status: 'done' | 'error';
  try {
    const result = await parsed.skill.invoke(args, ctx);
    summary = result.summary;
    status = 'done';
  } catch (err) {
    summary = `❌ Skill「${parsed.skill.name}」执行失败：${(err as Error).message}`;
    status = 'error';
  }
  return {
    finalMessage: buildSkillResultMessage(summary, status),
    skillId: parsed.skill.id,
  };
}

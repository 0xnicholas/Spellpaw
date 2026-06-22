/**
 * Skill integration for the Copilot chat.
 *
 * Provides a single helper, `tryRunSkill`, that both the default
 * `chatStore.sendMessage` (mock/offline) and the `useCopilotSSE`
 * override (real LLM mode) can call as the first step of message
 * processing. If the user input starts with a slash command matching
 * a built-in skill, the skill runs locally and the result is posted
 * as an assistant message — no LLM roundtrip required.
 *
 * Returns the assistant message on a skill match (caller should
 * short-circuit normal message handling), or null if no skill matched.
 */
import { generateId } from '@/shared/lib/utils';
import { parseSlashCommand, parseArgTokens, getSkillBySlashCommand } from './registry';
import type { ChatMessage } from '@drama/types';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { SkillContext } from './types';

interface RunSkillResult {
  assistantMessage: ChatMessage;
  skillId: string;
}

/** Returns true if the input starts with a slash command (regardless of whether the command is known). */
export function isSlashCommand(text: string): boolean {
  return text.trim().startsWith('/');
}

/** Look up the skill that would handle this input, or null. */
export function matchSkillByInput(text: string) {
  return parseSlashCommand(text);
}

/**
 * Run a slash command and return the assistant message to post. Caller
 * is responsible for appending the user message first; this only
 * produces the response.
 */
export async function tryRunSkill(
  text: string,
  projectId: string,
): Promise<RunSkillResult | null> {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;

  // Parse args from the trailing portion of the slash command.
  // Format: "/<cmd> key1:val1 key2:val2"
  const args = parseArgTokens(parsed.args);

  const ctx: SkillContext = {
    projectId,
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };

  let result;
  try {
    result = await parsed.skill.invoke(args, ctx);
  } catch (err) {
    result = {
      summary: `❌ Skill「${parsed.skill.name}」执行失败：${(err as Error).message}`,
    };
  }

  const assistantMessage: ChatMessage = {
    id: generateId('msg_'),
    role: 'agent',
    content: result.summary,
    type: 'action',
    timestamp: new Date().toISOString(),
  };

  return { assistantMessage, skillId: parsed.skill.id };
}

/**
 * Generate a short user-facing "invoked" message that names the skill
 * being used. Used by the chat UI to show in the message log.
 */
export function formatSkillInvocation(skillId: string): string {
  const skill = getSkillBySlashCommand(skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}

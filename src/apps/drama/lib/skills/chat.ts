/**
 * Skill integration for the Copilot chat.
 *
 * Provides two helpers used by `chatStore.sendMessage` (mock/offline) and
 * `useCopilotSSE` (real LLM mode) as the first step of message processing:
 *
 *   - `tryRunSkill(text)` — parse the slash command and return a pending
 *     assistant message (spinner). The caller appends it to the chat,
 *     runs the skill via `executeSkill`, then updates the pending message
 *     in place with the final result.
 *   - `executeSkill(text, projectId)` — actually invoke the skill and
 *     return the final assistant message (or null if the input wasn't a
 *     known slash command).
 *
 * If the user input starts with a slash command matching a built-in
 * skill, the skill runs locally and the result is posted as an assistant
 * message — no LLM roundtrip required.
 */
import { generateId } from '@/shared/lib/utils';
import { parseSlashCommand, parseArgTokens, getSkillBySlashCommand } from './registry';
import type { ChatMessage } from '@drama/types';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { SkillContext } from './types';

interface RunSkillResult {
  pendingMessage: ChatMessage;
  skillId: string;
}

/** Returns true if the input starts with a slash command (regardless of whether the command is known). */
export function isSlashCommand(text: string): boolean {
  return text.trim().startsWith('/');
}

/** Returns the final assistant message for a completed skill run. */
export function buildSkillResultMessage(
  text: string,
  status: 'done' | 'error' = 'done',
  timestamp?: string,
): ChatMessage {
  return {
    id: generateId('msg_'),
    role: 'agent',
    content: text,
    type: 'action',
    timestamp: timestamp ?? new Date().toISOString(),
    status,
  };
}

/** Returns the pending (running) assistant message shown while a skill runs. */
export function buildSkillPendingMessage(
  _skillId: string,
  text: string,
): ChatMessage {
  return {
    id: generateId('msg_'),
    role: 'agent',
    content: text,
    type: 'action',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Parse the slash command and return the pending assistant message.
 * Returns null if the input is not a slash command or the command is
 * unknown. The caller is responsible for running the skill via
 * `executeSkill` and updating the pending message with the final result.
 */
export function tryRunSkill(
  text: string,
  _projectId: string,
): RunSkillResult | null {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;

  const pendingMessage = buildSkillPendingMessage(
    parsed.skill.id,
    `🎯 正在执行 ${parsed.skill.name}…`
  );

  return { pendingMessage, skillId: parsed.skill.id };
}

/**
 * Generate a short user-facing "invoked" message that names the skill
 * being used. Shown in the message log next to the pending spinner.
 */
export function formatSkillInvocation(skillId: string): string {
  const skill = getSkillBySlashCommand(skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}

/**
 * Build the SkillContext that skills receive at invocation time.
 * Reads live state from the project + canvas stores.
 */
function buildSkillContext(projectId: string): SkillContext {
  return {
    projectId,
    getCurrentCanvasNodes: () => useCanvasStore.getState().getCurrentNodes(),
    getCurrentProject: () => {
      const { projects, currentProjectId } = useProjectStore.getState();
      return projects.find((p) => p.id === currentProjectId) ?? null;
    },
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };
}

/**
 * Parse the slash command, run the skill, and return the final result
 * message. Returns null if the input is not a slash command or the
 * command is unknown.
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

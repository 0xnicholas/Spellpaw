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
  pendingMessage: ChatMessage;
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
 * Returns the final assistant message for a completed skill run.
 * Call this after tryRunSkill() resolves to update the pending message
 * in the chat to its final content.
 */
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

/**
 * Build the pending (running) message for a skill. Posted immediately
 * when the skill starts; the chat UI shows a spinner until the skill
 * completes and the message is updated via updateMessage().
 */
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
 * Run a slash command and return the *pending* assistant message
 * (with a spinner). The caller is responsible for:
 *
 *   1. Appending this pending message to the chat
 *   2. Calling await parsed.skill.invoke(...) and then building
 *      a final message via buildSkillResultMessage()
 *   3. Updating the pending message's content + status via
 *      useChatStore.getState().updateMessage(id, {...})
 *
 * Returns null if the input is not a slash command or the command
 * is unknown. Use `tryRunSkillFull()` for the simpler one-call API.
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
 * One-call API: parse the slash command, run the skill, and return
 * the final result message. The caller is still responsible for
 * updating the chat UI (appending the pending message, then updating
 * it with the final). Provided for tests and code that doesn't care
 * about progress UI.
 */
export async function tryRunSkillFull(
  text: string,
  projectId: string,
): Promise<{ pendingMessage: ChatMessage; finalMessage: ChatMessage; skillId: string } | null> {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;

  const pendingMessage = buildSkillPendingMessage(
    parsed.skill.id,
    `🎯 正在执行 ${parsed.skill.name}…`
  );

  const args = parseArgTokens(parsed.args);
  const ctx: SkillContext = {
    projectId,
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };

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

  const finalMessage = buildSkillResultMessage(summary, status, pendingMessage.timestamp);
  return { pendingMessage, finalMessage, skillId: parsed.skill.id };
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

/**
 * Parse the slash command at the start of `text` and return the skill
 * to invoke plus the parsed args. Returns null if no slash command.
 */
export function parseSkillInvocation(text: string): { skill: import('./types').Skill; args: Record<string, string> } | null {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;
  return { skill: parsed.skill, args: parseArgTokens(parsed.args) };
}

/**
 * Run a skill and return the final result message. Convenience wrapper
 * for code that doesn't need to manage the pending/final two-step UI.
 */
export async function executeSkill(
  text: string,
  projectId: string,
): Promise<{ finalMessage: ChatMessage; skillId: string } | null> {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;
  const args = parseArgTokens(parsed.args);
  const ctx: SkillContext = {
    projectId,
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };
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

/**
 * Drama-specific skill chat integration.
 *
 * Phase 1 of skills-refactor plan: skills are now LLM-driven. The skill MD
 * body is appended to the user's message and the LLM does the work via
 * tool calls. This file provides:
 *   - `augmentUserMessage(text, projectId)`: builds the augmented user text
 *     (LLM instructions prepended to the original slash command).
 *   - `isSlashCommand`: re-exported from shared.
 *   - `tryRunSkill`/`executeSkill`: kept as thin wrappers around the stub
 *     invoke for backward compat. Real execution goes through the LLM
 *     pipeline (chatStore.sendMessage → useCopilotSSE).
 */
import { parseSlashCommand, parseArgTokens, getSkillBySlashCommand } from './registry';
import { isSlashCommand, buildSkillResultMessage, buildSkillPendingMessage } from '@shared/copilot/skills/chat';

export { isSlashCommand, buildSkillResultMessage, buildSkillPendingMessage };

/**
 * If `text` starts with a recognized slash command, return a new string
 * that prepends the skill's LLM instructions so the agent can drive the
 * tool calls. Otherwise return `text` unchanged.
 *
 * The original slash command remains in the text so the UI can still show
 * "user typed /batch-storyboard ..." in the message log.
 */
export function augmentUserMessage(text: string, projectId: string): string {
  const parsed = parseSlashCommand(text);
  if (!parsed) return text;
  const args = parseArgTokens(parsed.args);
  const argsLine = Object.keys(args).length > 0
    ? `\n\n用户提供的参数：\n${Object.entries(args).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';
  return [
    `用户使用 /${parsed.skill.slashCommand} 触发了 skill「${parsed.skill.name}」。`,
    `当前项目：${projectId || '（无）'}`,
    '',
    '## Skill 指导',
    parsed.skill.description,
    parsed.skill.instructions || '',
    argsLine,
    '',
    '请按上述 skill 名称和描述的意图，使用可用的画布工具（get_canvas / add_card / generate_storyboard / etc.）完成用户请求。完成后用 chat 总结结果。',
    '',
    '---',
    `原始用户输入：${text}`,
  ].join('\n');
}

interface RunSkillResult {
  pendingMessage: import('@drama/types').ChatMessage;
  skillId: string;
}

/**
 * Parse the slash command and return the pending assistant message.
 * Returns null if input is not a slash command or command is unknown.
 *
 * Kept for backward compat with components that still call this. The actual
 * execution now goes through `augmentUserMessage` + `sendMessage`.
 */
export function tryRunSkill(text: string, _projectId: string): RunSkillResult | null {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;
  return {
    pendingMessage: buildSkillResultMessage(
      `🎯 正在执行 ${parsed.skill.name}…`,
      'done',
    ),
    skillId: parsed.skill.id,
  };
}

/**
 * Build a stub SkillContext (kept for callers that still import the
 * old shape; not used by augmentUserMessage).
 */
function _buildLegacyContext(): never {
  throw new Error('SkillContext (with invoke) was removed in skills-refactor Phase 1. Use augmentUserMessage + LLM-driven execution.');
}
void _buildLegacyContext;
/**
 * Generate a short user-facing "invoked" message.
 */
export function formatSkillInvocation(skillId: string): string {
  const skill = getSkillBySlashCommand(skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}

/**
 * Stub executeSkill — Phase 1/2 redirects execution to the LLM pipeline.
 * Returns a guidance message for callers that still await this.
 */
export async function executeSkill(
  _text: string,
  _projectId: string,
): Promise<{ finalMessage: import('@drama/types').ChatMessage; skillId: string } | null> {
  return null;
}

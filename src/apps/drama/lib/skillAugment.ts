/**
 * Drama-side skill chat helpers. Wraps the shared skill system with
 * drama-specific context (project id + canvas-tool hint) so the LLM
 * knows what it's working on.
 *
 * The actual prompt-template construction lives in
 * `@shared/copilot/skills/augment` — this file only adds the context.
 */
import { buildSkillPrompt } from '@shared/copilot/skills/augment';
import { isSlashCommand } from '@shared/copilot/skills/chat';
import { buildSkillResultMessage } from '@shared/copilot/skills/chat';
import { getSkills } from '@shared/copilot/skills/loader';
import { parseSlashCommand } from '@shared/copilot/skills/registry';
import type { ChatMessage } from '@drama/types';

export { isSlashCommand };

const CANVAS_TOOL_HINT =
  '请按上述 skill 名称和描述的意图，使用可用的画布工具（get_canvas / add_card / generate_storyboard / etc.）完成用户请求。完成后用 chat 总结结果。';

/**
 * Drama-side wrapper around `buildSkillPrompt` — injects projectId as
 * contextLine and the canvas-tool hint.
 */
export function augmentUserMessage(text: string, projectId: string): string {
  return buildSkillPrompt(text, {
    contextLine: `当前项目：${projectId || '（无）'}`,
    toolHint: CANVAS_TOOL_HINT,
  });
}

interface RunSkillResult {
  pendingMessage: ChatMessage;
  skillId: string;
}

/**
 * Parse the slash command and return the pending assistant message
 * + the resolved skill id. Returns null if input is not a slash
 * command or the command is unknown.
 */
export function tryRunSkill(text: string, _projectId: string): RunSkillResult | null {
  const parsed = parseSlashCommand(getSkills(), text);
  if (!parsed) return null;
  return {
    pendingMessage: buildSkillResultMessage(`🎯 正在执行 ${parsed.skill.name}…`),
    skillId: parsed.skill.id,
  };
}

/** Short user-facing "invoked" message used by the SSE pipeline. */
export function formatSkillInvocation(skillId: string): string {
  const skill = getSkills().find((s) => s.id === skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}
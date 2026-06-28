/**
 * Drama-side skill chat helpers — the only drama-specific piece of the
 * skill system. The rest of the system (loader, types, registry,
 * frontmatter parser) lives in `@shared/copilot/skills/`.
 *
 * `augmentUserMessage` is the one function that ties skills into the
 * drama chat flow: when the user types `/skill-name args…`, the
 * outgoing LLM message is rewritten to include the skill's instructions
 * as context. The LLM then uses atomic canvas tools (`get_canvas`,
 * `analyze_structure`, etc.) to do the work.
 *
 * `tryRunSkill` / `formatSkillInvocation` are thin wrappers around the
 * shared chat builders — kept for the SSE pipeline's invocation notice.
 */
import {
  isSlashCommand,
  parseSlashCommand,
  parseArgTokens,
} from '@shared/copilot/skills/registry';
import { buildSkillResultMessage } from '@shared/copilot/skills/chat';
import { getSkills } from '@shared/copilot/skills/loader';
import type { Skill } from '@shared/copilot/skills/types';
import type { ChatMessage } from '@drama/types';

export { isSlashCommand };

const ALL_SKILLS = (): readonly Skill[] => getSkills();

/**
 * If `text` starts with a recognized slash command, return a new string
 * that prepends the skill's LLM instructions so the agent can drive the
 * tool calls. Otherwise return `text` unchanged.
 *
 * The original slash command remains in the text so the UI can still
 * show "user typed /batch-storyboard ..." in the message log.
 */
export function augmentUserMessage(text: string, projectId: string): string {
  const skills = ALL_SKILLS();
  const parsed = parseSlashCommand(skills, text);
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
  pendingMessage: ChatMessage;
  skillId: string;
}

/**
 * Parse the slash command and return the pending assistant message
 * + the resolved skill id. Returns null if input is not a slash
 * command or the command is unknown.
 */
export function tryRunSkill(text: string, _projectId: string): RunSkillResult | null {
  const skills = ALL_SKILLS();
  const parsed = parseSlashCommand(skills, text);
  if (!parsed) return null;
  return {
    pendingMessage: buildSkillResultMessage(`🎯 正在执行 ${parsed.skill.name}…`),
    skillId: parsed.skill.id,
  };
}

/**
 * Short user-facing "invoked" message used by the SSE pipeline.
 */
export function formatSkillInvocation(skillId: string): string {
  const skill = ALL_SKILLS().find((s) => s.id === skillId);
  if (!skill) return `🎯 ${skillId}`;
  return `🎯 调用 Skill：${skill.name}（/${skill.slashCommand}）`;
}
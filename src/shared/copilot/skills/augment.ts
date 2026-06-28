/**
 * Build the augmented prompt that the LLM sees when the user invokes a
 * skill via slash command. Pure, app-agnostic — the only "context"
 * piece is a single string line the caller provides (e.g.
 * "当前项目：proj_1" or "User: alice").
 *
 * Apps wrap this with their own context. See:
 *   - drama/lib/skillAugment.ts (adds projectId as contextLine)
 */
import { parseSlashCommand, parseArgTokens } from './registry';
import { getSkills } from './loader';
import type { Skill } from './types';

export interface BuildSkillPromptOptions {
  /** A single descriptive line that names the active context for the LLM.
   *  Drama passes "当前项目：proj_1"; a portal might pass "User: alice". */
  contextLine: string;
  /** Tooling advice given to the LLM after the skill instructions.
   *  Defaults to a generic "use the available tools" hint. */
  toolHint?: string;
}

/**
 * If `text` starts with a recognized slash command, return a new string
 * that prepends the skill's LLM instructions so the agent can drive the
 * tool calls. Otherwise return `text` unchanged.
 *
 * The original slash command remains in the text so the UI can still
 * show "user typed /batch-storyboard ..." in the message log.
 */
export function buildSkillPrompt(
  text: string,
  options: BuildSkillPromptOptions,
): string {
  const skills = getSkills();
  const parsed = parseSlashCommand(skills, text);
  if (!parsed) return text;

  const args = parseArgTokens(parsed.args);
  const argsLine = Object.keys(args).length > 0
    ? `\n\n用户提供的参数：\n${Object.entries(args).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : '';

  const toolHint =
    options.toolHint ??
    '请按上述 skill 名称和描述的意图，使用可用的画布工具完成用户请求。完成后用 chat 总结结果。';

  return [
    `用户使用 /${parsed.skill.slashCommand} 触发了 skill「${parsed.skill.name}」。`,
    options.contextLine,
    '',
    '## Skill 指导',
    parsed.skill.description,
    parsed.skill.instructions || '',
    argsLine,
    '',
    toolHint,
    '',
    '---',
    `原始用户输入：${text}`,
  ].join('\n');
}

/** Helper for callers that don't need a custom toolHint. */
export function isSkillInvocation(text: string): boolean {
  const skills: readonly Skill[] = getSkills();
  return parseSlashCommand(skills, text) !== null;
}
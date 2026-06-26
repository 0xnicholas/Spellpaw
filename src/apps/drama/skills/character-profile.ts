/**
 * Invoke for `character-profile`.
 * Pair file: ./character-profile.md (YAML frontmatter is the source of truth).
 */
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (args, _ctx): Promise<SkillResult> => {
  const name = (args['姓名'] as string)?.trim();
  if (!name) {
    return { summary: '请提供角色姓名，例如 /character-profile 姓名:林小夏' };
  }
  const age = (args['年龄'] as string | undefined)?.trim() || '未知';
  const occupation = (args['职业'] as string | undefined)?.trim() || '未知';
  const personality = (args['性格'] as string | undefined)?.trim() || '待补充';
  // The character card schema only supports title/description/tags,
  // so we encode the structured fields (age/occupation/personality) into
  // the description text. Richer per-field editing is on the detail
  // panel after creation.
  const meta = `年龄：${age}\n职业：${occupation}\n性格：${personality}`;
  const userDesc = (args['描述'] as string | undefined)?.trim();
  const description = userDesc
    ? `${meta}\n\n${userDesc}`
    : `${meta}\n\n关于「${name}」的背景故事待你补充。`;
  await addEnrichedCard('character', {
    title: name,
    description,
    tags: ['角色', occupation, personality].filter(Boolean),
  });
  return {
    summary: `已创建角色卡「${name}」：${occupation}，${age} 岁，性格：${personality}。`,
    cardsCreated: 1,
  };
};

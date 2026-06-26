/**
 * Invoke for `brainstorm-variants`.
 * Pair file: ./brainstorm-variants.md (YAML frontmatter is the source of truth).
 */
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import type { Skill, SkillResult } from './types';

interface VariantAngle {
  angle: string;
  emoji: string;
  premise: (theme: string) => string;
  tags: (theme: string) => string[];
}

const VARIANT_ANGLES: VariantAngle[] = [
  {
    angle: '喜剧反差',
    emoji: '😄',
    premise: (theme) => `一位普通人意外卷入了关于「${theme}」的离谱事件，用荒诞和反差制造笑点。`,
    tags: (theme) => ['喜剧', theme, '反差萌'],
  },
  {
    angle: '悬疑反转',
    emoji: '🔍',
    premise: (theme) => `主角发现「${theme}」背后隐藏着一个惊天秘密，调查过程中不断反转。`,
    tags: (theme) => ['悬疑', theme, '反转'],
  },
  {
    angle: '温情治愈',
    emoji: '💝',
    premise: (theme) => `围绕「${theme}」展开的细腻情感故事，温暖日常中见真挚。`,
    tags: (theme) => ['温情', theme, '治愈'],
  },
];

export const invoke: Skill['invoke'] = async (args, _ctx): Promise<SkillResult> => {
  const theme = (args['主题'] as string)?.trim();
  if (!theme) {
    return { summary: '请提供主题，例如 /brainstorm-variants 主题:时间旅行' };
  }
  const created: string[] = [];
  for (const variant of VARIANT_ANGLES) {
    await addEnrichedCard('storyline', {
      title: `${variant.emoji} ${theme}（${variant.angle}）`,
      description: variant.premise(theme),
      tags: variant.tags(theme),
    });
    created.push(variant.angle);
  }
  return {
    summary: `已为「${theme}」生成 3 个变体：${created.join('、')}。`,
    cardsCreated: 3,
  };
};

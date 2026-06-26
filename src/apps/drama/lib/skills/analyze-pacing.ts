/**
 * Invoke for `analyze-pacing`.
 * Pair file: ./analyze-pacing.md (YAML frontmatter is the source of truth).
 */
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (args, ctx): Promise<SkillResult> => {
  const { toolRouter } = await import('@drama/stores/toolRouter');
  const focus = (args.focusArea as string) || 'overall';
  const cards = ctx.getCurrentCanvasNodes();
  if (cards.length === 0) {
    return { summary: '当前项目无内容，无法分析节奏。' };
  }

  // Compose the two atomic analyses
  const [structureReport, pacingReport] = await Promise.all([
    toolRouter.analyze_structure({ action: 'analyze_structure' }),
    toolRouter.get_pacing_report({ action: 'get_pacing_report' }),
  ]);

  // Add a per-scene canvas check: scenes that have no art yet are
  // visual gaps that affect pacing on screen
  const sceneCards = cards.filter((c) => c.type === 'sceneCard');
  const missingArt = sceneCards.filter((c) => !(c.data as { thumbnail?: string }).thumbnail).length;

  const focusNote = focus === 'overall' ? '' : `\n（聚焦：${focus}）`;
  const visualGap = missingArt > 0
    ? `\n\n🎨 视觉缺口：${missingArt} 个场景卡还没分镜图，${missingArt / Math.max(sceneCards.length, 1) * 100 | 0}% 的视觉节奏未定义。`
    : '';

  return {
    summary: `${structureReport}\n\n${pacingReport}${focusNote}${visualGap}`,
    needsLlmFollowup: true,
  };
};

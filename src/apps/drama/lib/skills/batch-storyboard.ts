/**
 * Invoke for `batch-storyboard`.
 * Pair file: ./batch-storyboard.md (YAML frontmatter is the source of truth).
 */
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (args): Promise<SkillResult> => {
  const { toolRouter } = await import('@drama/stores/toolRouter');
  const onlyEmpty = (args.onlyEmpty as string) !== 'false'; // default true
  const stylePrompt = args.stylePrompt as string | undefined;

  const cards = useCanvasStore.getState().getCurrentNodes();
  const sceneCards = cards.filter((c) => c.type === 'sceneCard');
  const targets = sceneCards.filter((c) => {
    if (!onlyEmpty) return true;
    return !(c.data as { thumbnail?: string }).thumbnail;
  });

  if (targets.length === 0) {
    if (sceneCards.length === 0) {
      return {
        summary: '画布上没有任何场景卡，无法生成分镜。',
      };
    }
    return {
      summary: '所有场景卡都已有分镜图，无需生成。',
    };
  }

  let succeeded = 0;
  let failed = 0;
  for (const card of targets) {
    try {
      const result = await toolRouter.generate_storyboard({
        action: 'generate_storyboard',
        nodeId: card.id,
        ...(stylePrompt ? { prompt: stylePrompt } : {}),
      });
      if (result.includes('失败') || result.includes('未配置')) {
        failed++;
      } else {
        succeeded++;
      }
    } catch {
      failed++;
    }
  }

  const failedNote = failed > 0 ? `，${failed} 张失败（可能未配置 AI provider）` : '';
  return {
    summary: `批量分镜完成：${succeeded}/${targets.length} 张成功${failedNote}。`,
    needsLlmFollowup: false,
  };
};

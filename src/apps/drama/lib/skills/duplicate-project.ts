/**
 * Invoke for `duplicate-project`.
 * Pair file: ./duplicate-project.md (YAML frontmatter is the source of truth).
 */
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (args, ctx): Promise<SkillResult> => {
  const newTitle = (args.newTitle as string)?.trim();
  if (!newTitle) {
    return { summary: '请提供新项目标题，例如 /duplicate-project 新标题:都市奇缘 v2' };
  }

  const srcCards = ctx.getCurrentCanvasNodes();
  if (srcCards.length === 0) {
    return { summary: '当前项目无内容可复制。' };
  }

  const { useProjectStore } = await import('@drama/stores/projectStore');
  const projectStore = useProjectStore.getState();
  const newProjId = projectStore.createProject(newTitle, '', '#6366f1');
  // Switch to new project so addEnrichedCard writes to the right canvas
  projectStore.setCurrentProject(newProjId);

  const { addEnrichedCard } = await import('@drama/stores/toolRouter/cards');

  let cardsCreated = 0;
  for (const card of srcCards) {
    const data = { ...card.data };
    // Strip any linkedCardIds that reference cards in the old project
    if (Array.isArray(data.linkedCardIds)) delete (data as Record<string, unknown>).linkedCardIds;
    try {
      await addEnrichedCard(card.type, data as Record<string, unknown>, card.position);
      cardsCreated++;
    } catch {
      // Skip cards that fail validation (stale data)
    }
  }

  return {
    summary: `已复制项目为「${newTitle}」：${cardsCreated} 张画布卡。`,
    cardsCreated,
    needsLlmFollowup: true,
  };
};

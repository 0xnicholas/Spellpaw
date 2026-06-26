/**
 * Invoke for `duplicate-project`.
 * Pair file: ./duplicate-project.md (YAML frontmatter is the source of truth).
 */
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (args, ctx): Promise<SkillResult> => {
  const { toolRouter } = await import('@drama/stores/toolRouter');
  const newTitle = (args.newTitle as string)?.trim();
  if (!newTitle) {
    return { summary: '请提供新项目标题，例如 /duplicate-project 新标题:都市奇缘 v2' };
  }

  const tree = ctx.getProjectTree();
  if (!tree) {
    return { summary: '当前项目无内容可复制。' };
  }

  const sourceActCount = (tree.children ?? []).filter((c) => c.type === 'act').length;

  const { useProjectStore } = await import('@drama/stores/projectStore');
  const projectStore = useProjectStore.getState();
  const newProjId = projectStore.createProject(newTitle, '', '#6366f1');

  let actCount = 0;
  let sceneCount = 0;
  for (const act of tree.children ?? []) {
    if (act.type !== 'act') continue;
    const newActResult = await toolRouter.add_node({
      action: 'add_node',
      parentId: newProjId,
      type: 'act',
      title: act.title,
    });
    const match = newActResult.match(/\(id: ([^)]+)\)/);
    const newActId = match?.[1];
    if (!newActId) continue;
    actCount++;

    for (const scene of act.children ?? []) {
      if (scene.type !== 'scene') continue;
      await toolRouter.add_node({
        action: 'add_node',
        parentId: newActId,
        type: 'scene',
        title: scene.title,
        ...(scene.metadata?.description ? { description: String(scene.metadata.description) } : {}),
        ...(typeof scene.metadata?.duration === 'number' ? { duration: scene.metadata.duration } : {}),
      });
      sceneCount++;
    }
  }

  if (sourceActCount === 0) {
    return {
      summary: `已创建空项目「${newTitle}」：原项目无幕/场景可复制。注：shot 级别未复制。`,
      needsLlmFollowup: true,
    };
  }

  return {
    summary: `已复制项目为「${newTitle}」：${actCount} 幕、${sceneCount} 场景。注：shot 级别未复制。`,
    needsLlmFollowup: true,
  };
};

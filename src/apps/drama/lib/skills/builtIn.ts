/**
 * Built-in skills — composable Copilot workflows that the user can invoke
 * via slash commands or that the LLM can call as higher-level tools.
 *
 * Each skill wraps one or more atomic toolRouter calls into a single
 * named, testable operation with a clear return value.
 *
 * NOTE: toolRouter is imported lazily inside each `invoke` to break the
 * toolRouter ↔ builtIn circular dependency. Dynamic imports are cached
 * by Node, so subsequent calls are effectively synchronous.
 */
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { Skill, SkillResult } from './types';

// ─── analyze-pacing ──────────────────────────────────────────────
//
// Deep pacing analysis that wraps analyze_structure + get_pacing_report
// and surfaces the top fix recommendations. The atomic tools return raw
// text; this skill distills that into a single actionable summary.

export const analyzePacingSkill: Skill = {
  id: 'analyze-pacing',
  name: '节奏分析',
  description: '深入分析当前项目的节奏，输出最关键的 3 条修改建议',
  slashCommand: 'analyze-pacing',
  examples: ['/analyze-pacing', '/analyze-pacing 开场段'],
  parameters: {
    type: 'object',
    properties: {
      focusArea: {
        type: 'string',
        description: '可选，聚焦某段：overall（默认）/ first_act / climax / ending',
      },
    },
    required: [],
  },
  async invoke(args, ctx): Promise<SkillResult> {
    const { toolRouter } = await import('@drama/stores/toolRouter');
    const focus = (args.focusArea as string) || 'overall';
    const tree = ctx.getProjectTree();
    if (!tree) {
      return { summary: '当前项目无内容，无法分析节奏。' };
    }

    // Compose the two atomic analyses
    const [structureReport, pacingReport] = await Promise.all([
      toolRouter.analyze_structure({ action: 'analyze_structure' }),
      toolRouter.get_pacing_report({ action: 'get_pacing_report' }),
    ]);

    // Add a per-scene canvas check: scenes that have no art yet are
    // visual gaps that affect pacing on screen
    const cards = useCanvasStore.getState().getCurrentNodes();
    const sceneCards = cards.filter((c) => c.type === 'sceneCard');
    const missingArt = sceneCards.filter((c) => !(c.data as { thumbnail?: string }).thumbnail).length;

    const focusNote = focus === 'overall' ? '' : `\n（聚焦：${focus}）`;
    const visualGap = missingArt > 0
      ? `\n\n🎨 视觉缺口：${missingArt} 个场景卡还没分镜图，${missingArt / Math.max(sceneCards.length, 1) * 100 | 0}% 的视觉节奏未定义。`
      : '';

    return {
      summary: `${structureReport}\n\n${pacingReport}${focusNote}${visualGap}`,
      needsLlmFollowup: true, // let the LLM elaborate on the top fix
    };
  },
};

// ─── duplicate-project ───────────────────────────────────────────
//
// Clone the current project's tree into a new project. Useful for
// creating "variations" — same structure, different story.

export const duplicateProjectSkill: Skill = {
  id: 'duplicate-project',
  name: '复制项目',
  description: '把当前项目结构复制为新项目，标题可改',
  slashCommand: 'duplicate-project',
  examples: ['/duplicate-project 新标题:都市奇缘 v2'],
  parameters: {
    type: 'object',
    properties: {
      newTitle: {
        type: 'string',
        description: '新项目标题',
      },
    },
    required: ['newTitle'],
  },
  async invoke(args, ctx): Promise<SkillResult> {
    const { toolRouter } = await import('@drama/stores/toolRouter');
    const newTitle = (args.newTitle as string)?.trim();
    if (!newTitle) {
      return { summary: '请提供新项目标题，例如 /duplicate-project 新标题:都市奇缘 v2' };
    }

    const tree = ctx.getProjectTree();
    if (!tree) {
      return { summary: '当前项目无内容可复制。' };
    }

    // Capture the source project's act count up-front so we can give
    // honest feedback when the tree is empty (new project created, but
    // 0 acts/scenes were copied).
    const sourceActCount = (tree.children ?? []).filter((c) => c.type === 'act').length;

    // Use apply_template with the current tree as a "template" — but
    // apply_template loads from disk. Instead, just create a new project
    // and copy the structure node by node.
    //
    // For now, the simpler implementation: create project, then for each
    // top-level act in the current tree, copy it. (Full sub-tree copy
    // would need a recursive variant of add_node, which is out of scope.)
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
      // Extract the new act id from the result message "已添加 act「X」(id: Y)"
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
  },
};

// ─── batch-storyboard ───────────────────────────────────────────
//
// Generate storyboards for multiple scene cards in one go. Without this
// skill, the user has to click each card and ask for a storyboard one
// at a time. This skill loops through canvas cards and queues
// generate_storyboard for each eligible card.

export const batchStoryboardSkill: Skill = {
  id: 'batch-storyboard',
  name: '批量生成分镜',
  description: '为画布上所有/空白的场景卡批量生成分镜参考图',
  slashCommand: 'batch-storyboard',
  examples: ['/batch-storyboard', '/batch-storyboard 风格:电影感 暖色调'],
  parameters: {
    type: 'object',
    properties: {
      stylePrompt: {
        type: 'string',
        description: '可选，统一风格描述，会附加到每张分镜的 prompt',
      },
      onlyEmpty: {
        type: 'string',
        description: 'true/false。默认 true：只生成还没分镜图的场景卡',
      },
    },
    required: [],
  },
  async invoke(args): Promise<SkillResult> {
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
  },
};

// ─── Registry ────────────────────────────────────────────────────

export const BUILT_IN_SKILLS: readonly Skill[] = [
  analyzePacingSkill,
  duplicateProjectSkill,
  batchStoryboardSkill,
] as const;

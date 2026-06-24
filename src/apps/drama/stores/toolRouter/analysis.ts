/**
 * Analysis domain — read-only diagnostics plus the kickstart_project workflow.
 *
 * Most handlers are tree queries that return formatted reports. kickstart_project
 * is the cross-domain exception: it applies a narrative template AND creates
 * canvas cards. It uses shared helpers from tree.ts and cards.ts directly to
 * avoid going through the router.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { findNode } from '@drama/lib/treeUtils';
import { analyzePacing, suggestCompletions, generatePacingReport } from '@drama/lib/projectAnalysis';
import type { TreeNode, CanvasNodeType } from '@drama/types';
import type { ToolRouter } from './types';
import { applyTemplateCore } from './tree';
import { addEnrichedCard } from './cards';

interface PacingPlanItem {
  nodeId: string;
  title: string;
  oldDuration: number;
  newDuration: number;
  reason: string;
}

// ── Template scoring (used by match_template + kickstart_project) ──

const BUILTIN_TEMPLATES = [
  { id: 'suspense-reversal', name: '悬疑反转', category: 'suspense', keywords: ['悬疑','密室','反转','侦探','凶杀','失踪','谜','真相','阴谋','惊悚','犯罪','追凶','暗','恐怖'] },
  { id: 'sweet-romance', name: '甜宠短剧', category: 'romance', keywords: ['甜宠','恋爱','爱情','霸道','总裁','心动','初恋','约会','浪漫','甜蜜','表白','吻','宠','嫁','娶'] },
  { id: 'comedy-twist', name: '喜剧反转', category: 'comedy', keywords: ['喜剧','搞笑','幽默','段子','笑','荒诞','讽刺','无厘头','欢乐','逗','趣'] },
  { id: 'underdog-comeback', name: '励志逆袭', category: 'drama', keywords: ['励志','逆袭','奋斗','成长','追梦','突破','翻身','成功','努力','拼搏','创业','穷'] },
  { id: 'mini-documentary', name: '短纪录片', category: 'documentary', keywords: ['纪录','纪实','访谈','真实','纪录片','人文','社会','探索','历史','见证'] },
  { id: 'psychological-horror', name: '心理恐怖', category: 'horror', keywords: ['恐怖','惊悚','诡异','阴森','吓人','悬疑','神秘','不安','噩梦','灵异','鬼','邪'] },
  { id: 'action-chase', name: '动作追逐', category: 'action', keywords: ['动作','追逐','打斗','枪战','爆破','跑酷','特工','警匪','武侠','高能','燃','快节奏'] },
  { id: 'period-romance', name: '年代爱情', category: 'romance', keywords: ['年代','怀旧','民国','复古','老上海','战乱','家族','分离','重逢','错过','遗憾'] },
  { id: 'coming-of-age', name: '青春成长', category: 'drama', keywords: ['青春','校园','高中','大学','毕业','迷茫','成长','蜕变','找到自我','试错','选择'] },
  { id: 'fantasy-awakening', name: '玄幻觉醒', category: 'fantasy', keywords: ['玄幻','仙侠','异能','觉醒','超能力','异世界','奇幻','特效','修仙','古风魔幻'] },
];

function scoreTemplates(corpus: string) {
  const corpusLower = corpus.toLowerCase();
  return BUILTIN_TEMPLATES
    .map((t) => {
      const hits = t.keywords.filter((k) => corpusLower.includes(k)).length;
      return { ...t, score: hits / Math.max(1, t.keywords.length * 0.6), hits };
    })
    .sort((a, b) => b.score - a.score);
}

function findBestTemplate(theme: string, genre?: string) {
  if (genre) {
    const matched = BUILTIN_TEMPLATES.find((t) => t.category.toLowerCase() === genre.toLowerCase());
    if (matched) return matched;
  }
  const scores = scoreTemplates(theme);
  return scores[0];
}

function collectScenes(node: TreeNode): TreeNode[] {
  const scenes: TreeNode[] = [];
  if (node.type === 'scene') {
    scenes.push(node);
  }
  for (const child of node.children ?? []) {
    scenes.push(...collectScenes(child));
  }
  return scenes;
}

function buildScenePrompt(title: string, meta: Record<string, unknown>): string {
  const parts: string[] = [title];
  if (meta.location) parts.push(`Location: ${meta.location}`);
  if (meta.timeOfDay) parts.push(`Time: ${meta.timeOfDay}`);
  if (meta.shotType) parts.push(`Shot: ${meta.shotType}`);
  if (meta.description) parts.push(String(meta.description));
  return parts.join('. ');
}

function recalcProjectDuration(tree: TreeNode): number {
  return (tree.children ?? []).reduce(
    (s, act) => s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0),
    0,
  );
}

// ── analysisHandlers: 5 tool handlers ──

export const analysisHandlers: ToolRouter = {
  analyze_structure: async (_params) => {
    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(当前无项目)';

    const project = store.projects.find((p) => p.id === store.currentProjectId);
    const title = project?.title ?? tree.title;
    const acts = tree.children ?? [];
    const scenes = acts.flatMap((a) => a.children ?? []);
    const totalDuration = acts.reduce(
      (s, act) =>
        s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0),
      0,
    );

    const lines: string[] = [`📊 结构诊断：《${title}》`, ''];
    lines.push(`概览: ${acts.length} 幕 / ${scenes.length} 场景 / 总时长 ${totalDuration}s`);
    if (acts.length > 0) {
      lines.push(`平均每幕: ${Math.round(totalDuration / acts.length)}s`);
    }
    lines.push('');

    const suggestions = suggestCompletions(tree);
    if (suggestions.length > 0) {
      lines.push('💡 补全建议:');
      for (const s of suggestions) {
        lines.push(`  ${s.severity === 'warning' ? '⚠️' : '•'} ${s.message}`);
      }
      lines.push('');
    }

    const pacingIssues = analyzePacing(tree);
    const warnings = pacingIssues.filter((i) => i.severity === 'warning');
    if (warnings.length > 0) {
      lines.push('⚠️ 节奏问题:');
      for (const issue of warnings) {
        lines.push(`  • ${issue.message}`);
      }
      lines.push('');
    }

    if (suggestions.length === 0 && warnings.length === 0) {
      lines.push('✅ 结构健康，暂无问题。');
    }

    return lines.join('\n');
  },

  get_pacing_report: async (_params) => {
    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(当前无项目)';

    const project = store.projects.find((p) => p.id === store.currentProjectId);
    const title = project?.title ?? tree.title;
    const report = generatePacingReport(tree);

    const lines: string[] = [`📊 节奏分析：《${title}》`, ''];
    lines.push(
      `统计: ${report.sceneCount} 场景 · 总时长 ${report.totalDuration}s · 平均 ${Math.round(report.avgSceneDuration)}s`,
    );
    if (report.maxSceneDuration > 0) {
      lines.push(`最长场景: ${report.maxSceneDuration}s · 最短: ${report.minSceneDuration}s`);
    }
    if (report.durationStdDev > 0) {
      const cv = report.avgSceneDuration > 0 ? report.durationStdDev / report.avgSceneDuration : 0;
      lines.push(
        `离散系数: ${(cv * 100).toFixed(0)}% · 状态: ${
          report.overallStatus === 'good' ? '良好' : report.overallStatus === 'warning' ? '一般' : '需优化'
        }`,
      );
    }
    lines.push('');

    if (report.issues.length > 0) {
      lines.push('⚠️ 问题:');
      for (const issue of report.issues) {
        lines.push(`  ${issue.severity === 'warning' ? '⚠️' : '•'} ${issue.message}`);
      }
      lines.push('');
    }

    if (report.suggestions.length > 0) {
      lines.push('💡 结构建议:');
      for (const s of report.suggestions) {
        lines.push(`  • ${s.message}`);
      }
    }

    if (report.issues.length === 0 && report.suggestions.length === 0) {
      lines.push('✅ 节奏良好，暂无问题。');
    }

    return lines.join('\n');
  },

  match_template: async (_params) => {
    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(当前无项目)';

    const project = store.projects.find((p) => p.id === store.currentProjectId);
    const title = project?.title ?? tree.title;
    const description = project?.description ?? '';

    // Collect all text signals
    const texts = [title, description];
    for (const act of tree.children ?? []) {
      texts.push(act.title);
      for (const scene of act.children ?? []) {
        texts.push(scene.title);
        if (scene.metadata?.description) texts.push(scene.metadata.description);
      }
    }
    const corpus = texts.join(' ');

    const scores = scoreTemplates(corpus);

    const best = scores[0];
    const lines: string[] = [`📋 模板匹配结果：《${title}》`, ''];

    if (best.hits === 0) {
      lines.push('暂无明确匹配。关键词信号不足，建议从以下类型选择：');
      for (const s of scores) {
        lines.push(`  • 「${s.name}」— ${s.keywords.slice(0, 5).join('、')}`);
      }
    } else {
      lines.push(`最佳匹配: 「${best.name}」 相似度 ${Math.min(100, Math.round(best.score * 100))}%`);
      lines.push(`命中关键词: ${best.keywords.filter((k) => corpus.includes(k)).join('、') || '—'}`);
      lines.push('');
      lines.push('其他候选:');
      for (const s of scores.slice(1)) {
        const pct = Math.min(100, Math.round(s.score * 100));
        lines.push(
          `  • 「${s.name}」 ${pct}%${
            s.hits > 0 ? ' — ' + s.keywords.filter((k) => corpus.includes(k)).slice(0, 3).join('、') : ''
          }`,
        );
      }
      lines.push('');
      lines.push(`如需套用: apply_template({ templateId: "${best.id}" })`);
    }

    return lines.join('\n');
  },

  optimize_pacing: async (params) => {
    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(当前无项目)';

    const dryRun = (params.dryRun as boolean | undefined) !== false;
    const report = generatePacingReport(tree);

    if (report.sceneCount === 0) {
      return '(项目中暂无场景，无法优化)';
    }

    // Build optimization plan
    const plan: PacingPlanItem[] = [];

    // Strategy 1: Compress scenes that are >2x average down to 1.5x
    const targetMax = Math.round(report.avgSceneDuration * 1.5);
    for (const issue of report.issues) {
      if (issue.type === 'too_long') {
        const node = findNode(tree, issue.nodeId);
        if (node?.metadata?.duration && node.metadata.duration > targetMax && targetMax >= 5) {
          plan.push({
            nodeId: issue.nodeId,
            title: issue.title,
            oldDuration: node.metadata.duration,
            newDuration: targetMax,
            reason: `过长场景压缩到平均值1.5倍(${targetMax}s)`,
          });
        }
      }
    }

    // Strategy 2: Balance act durations (front-heavy / back-heavy)
    const acts = tree.children ?? [];
    const actDurations = acts.map((act) => ({
      id: act.id,
      title: act.title,
      duration: (act.children ?? []).reduce(
        (s, sc) => s + (sc.metadata?.duration ?? 0),
        0,
      ),
      scenes: act.children ?? [],
    }));
    const totalActDur = actDurations.reduce((s, a) => s + a.duration, 0);
    if (totalActDur > 0 && acts.length >= 2) {
      const idealPerAct = totalActDur / acts.length;
      for (const act of actDurations) {
        if (act.duration > idealPerAct * 1.4 && act.scenes.length > 1) {
          // Find longest scene in this act to compress
          const longest = act.scenes.reduce((a, b) =>
            ((a.metadata?.duration ?? 0) > (b.metadata?.duration ?? 0) ? a : b),
          );
          const oldDur = longest.metadata?.duration ?? 0;
          const newDur = Math.max(10, Math.round(oldDur * 0.85));
          if (newDur < oldDur && !plan.some((p) => p.nodeId === longest.id)) {
            plan.push({
              nodeId: longest.id,
              title: longest.title,
              oldDuration: oldDur,
              newDuration: newDur,
              reason: `${act.title}偏长，压缩最长场景`,
            });
          }
        }
      }
    }

    if (plan.length === 0) {
      return '✅ 节奏无需调整。当前结构已较为均衡。';
    }

    if (dryRun) {
      const lines: string[] = ['📋 节奏优化方案（预览）', ''];
      let totalDelta = 0;
      for (const p of plan) {
        const delta = p.newDuration - p.oldDuration;
        totalDelta += delta;
        lines.push(
          `  ${p.title}: ${p.oldDuration}s → ${p.newDuration}s (${delta > 0 ? '+' : ''}${delta}s) — ${p.reason}`,
        );
      }
      lines.push('');
      lines.push(`预计总时长变化: ${totalDelta > 0 ? '+' : ''}${totalDelta}s`);
      lines.push('');
      lines.push('执行命令: optimize_pacing({ dryRun: false })');
      return lines.join('\n');
    }

    // Execute
    for (const p of plan) {
      const node = findNode(tree, p.nodeId);
      if (node) {
        store.updateTreeNode(p.nodeId, {
          metadata: {
            ...(node.metadata ?? {}),
            duration: p.newDuration,
            updatedAt: new Date().toISOString(),
          } as TreeNode['metadata'],
        });
      }
    }

    // Sync project duration (re-fetch tree since store updated it via Immer)
    const freshTree = store.getCurrentTree();
    const newDuration = freshTree ? recalcProjectDuration(freshTree) : 0;
    const currentProjectId = store.currentProjectId;
    if (currentProjectId) {
      store.updateProject(currentProjectId, { duration: newDuration });
    }

    return `✅ 已优化 ${plan.length} 个场景时长，总时长变化 ${plan.reduce((s, p) => s + (p.newDuration - p.oldDuration), 0)}s`;
  },

  /**
   * Cross-domain workflow:
   *   1. Pick best narrative template for the given theme
   *   2. Apply template via applyTemplateCore (creates tree nodes)
   *   3. Create one canvas card per new scene via addEnrichedCard
   *
   * Uses shared helpers from tree.ts and cards.ts to avoid router cross-calls.
   */
  kickstart_project: async (params) => {
    const theme = params.theme as string;
    const genre = params.genre as string | undefined;
    const cardType = ((params.cardType as 'sceneCard' | 'script' | undefined) ?? 'sceneCard') as
      | 'sceneCard'
      | 'script';

    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) throw new Error('当前没有打开的项目');

    // 1. Pick the best template
    const best = findBestTemplate(theme, genre);
    if (!best) throw new Error('未找到合适的叙事模板');

    // 2. Snapshot existing scene IDs so we only create cards for the
    //    scenes that were just added by this kickstart (avoids creating
    //    duplicate cards for scenes added by previous kickstarts).
    const existingSceneIds = new Set(collectScenes(tree).map((s) => s.id));

    // 3. Apply the template under the current project root
    await applyTemplateCore(store, best.id, tree.id);

    // 4. Refresh tree and collect only the newly added scenes
    const freshTree = store.getCurrentTree();
    if (!freshTree) throw new Error('套用模板后无法获取项目树');
    const scenes = collectScenes(freshTree).filter((s) => !existingSceneIds.has(s.id));

    // 5. Create a canvas card for each new scene via shared helper
    let cardCount = 0;
    for (const scene of scenes) {
      const meta = (scene.metadata ?? {}) as NonNullable<TreeNode['metadata']>;
      const description = (meta.description as string | undefined) ?? '';
      const duration = typeof meta.duration === 'number' ? meta.duration : undefined;
      const location = (meta.location as string | undefined) ?? '';
      const timeOfDay = (meta.timeOfDay as string | undefined) ?? '';
      const shotType = (meta.shotType as string | undefined) ?? '';
      const cameraMovement = (meta.cameraMovement as string | undefined) ?? '';
      const dialogue = (meta.dialogue as string | undefined) ?? '';
      const notes = (meta.notes as string | undefined) ?? '';

      const tags = [location, timeOfDay, shotType].filter(Boolean);
      const generatedPrompt = buildScenePrompt(scene.title, meta);

      const baseData: Record<string, unknown> = {
        title: scene.title,
        description,
        linkedTreeNodeId: scene.id,
      };

      if (cardType === 'script') {
        baseData.duration = duration;
        if (location) baseData.location = location;
        if (timeOfDay) baseData.timeOfDay = timeOfDay;
        if (shotType) baseData.shotType = shotType;
        if (cameraMovement) baseData.cameraMovement = cameraMovement;
        if (dialogue) baseData.dialogue = dialogue;
        if (notes) baseData.notes = notes;
      } else {
        // sceneCard / art / character / deliverable all benefit from visual metadata
        if (tags.length > 0) baseData.tags = tags;
        baseData.generatedPrompt = generatedPrompt;
      }

      await addEnrichedCard(cardType as CanvasNodeType, baseData);
      cardCount++;
    }

    return `已基于「${best.name}」模板创建项目结构：共 ${scenes.length} 个场景，并生成 ${cardCount} 张${cardType === 'script' ? '剧本卡' : '场景卡'}。`;
  },
};
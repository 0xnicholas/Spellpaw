import { useProjectStore } from './projectStore';
import { useCanvasStore } from './canvasStore';
import { useCustomTemplateStore } from './customTemplateStore';
import type { ToolRouter, TreeNode, NarrativeTemplate, TemplateAct, TemplateScene } from '@drama/types';
import { analyzePacing, suggestCompletions, generatePacingReport } from '@drama/lib/projectAnalysis';
import { createNodeHandler, updateNodeHandler, deleteNodeHandler, addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { validateCanvasCardPayload, normalizeCardData, validateCanvasCardUpdateData, normalizeCardUpdateData } from '@drama/lib/canvasCardSchema';
import {
  generateAsset, generateVariants, editAsset, applyStyle, batchApplyStyle,
  providerRegistry, useTaskStore, startPolling, buildDefaultPrompt,
} from '@drama/lib/canvasToolkit';

function nodeToLine(node: TreeNode, depth: number): string {
  const indent = '│   '.repeat(Math.max(0, depth - 1)) + (depth > 0 ? '├── ' : '');
  const statusIcon = { draft: '📝', in_progress: '🔄', review: '👀', done: '✅' }[node.status] ?? '';
  const duration = node.metadata?.duration ? ` · ${node.metadata.duration}s` : '';
  return `${indent}${statusIcon} ${node.type}「${node.title}」${duration}`;
}

function treeToText(node: TreeNode, depth = 0): string {
  let text = nodeToLine(node, depth);
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + treeToText(child, depth + 1);
    }
  }
  return text;
}

function findNode(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

function recalcProjectDuration(tree: TreeNode): number {
  return (tree.children ?? []).reduce(
    (s, act) => s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0),
    0
  );
}

interface PacingPlanItem {
  nodeId: string;
  title: string;
  oldDuration: number;
  newDuration: number;
  reason: string;
}

const BUILTIN_TEMPLATES = [
  { id: 'suspense-reversal', name: '悬疑反转', category: 'suspense', keywords: ['悬疑','密室','反转','侦探','凶杀','失踪','谜','真相','阴谋','惊悚','犯罪','追凶','暗','恐怖'] },
  { id: 'sweet-romance', name: '甜宠短剧', category: 'romance', keywords: ['甜宠','恋爱','爱情','霸道','总裁','心动','初恋','约会','浪漫','甜蜜','表白','吻','宠','嫁','娶'] },
  { id: 'comedy-twist', name: '喜剧反转', category: 'comedy', keywords: ['喜剧','搞笑','幽默','段子','笑','荒诞','讽刺','无厘头','欢乐','逗','趣'] },
  { id: 'underdog-comeback', name: '励志逆袭', category: 'drama', keywords: ['励志','逆袭','奋斗','成长','追梦','突破','翻身','成功','努力','拼搏','创业','穷'] },
  { id: 'mini-documentary', name: '短纪录片', category: 'documentary', keywords: ['纪录','纪实','访谈','真实','纪录片','人文','社会','探索','历史','见证'] },
];

function scoreTemplates(corpus: string) {
  const corpusLower = corpus.toLowerCase();
  return BUILTIN_TEMPLATES.map((t) => {
    const hits = t.keywords.filter((k) => corpusLower.includes(k)).length;
    return { ...t, score: hits / Math.max(1, t.keywords.length * 0.6), hits };
  }).sort((a, b) => b.score - a.score);
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

function enrichCardDataFromTreeNode(
  cardType: import('@drama/types').CanvasNodeType,
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const linkedId = rawData.linkedTreeNodeId;
  if (typeof linkedId !== 'string') return rawData;

  const tree = useProjectStore.getState().getCurrentTree();
  if (!tree) return rawData;

  const node = findNode(tree, linkedId);
  if (!node) return rawData;

  const meta = (node.metadata ?? {}) as NonNullable<TreeNode['metadata']>;
  const enriched: Record<string, unknown> = { ...rawData };

  if (cardType === 'script') {
    if (enriched.duration === undefined && typeof meta.duration === 'number') {
      enriched.duration = meta.duration;
    }
    if (enriched.location === undefined && typeof meta.location === 'string') {
      enriched.location = meta.location;
    }
    if (enriched.timeOfDay === undefined && typeof meta.timeOfDay === 'string') {
      enriched.timeOfDay = meta.timeOfDay;
    }
    if (enriched.shotType === undefined && typeof meta.shotType === 'string') {
      enriched.shotType = meta.shotType;
    }
    if (enriched.cameraMovement === undefined && typeof meta.cameraMovement === 'string') {
      enriched.cameraMovement = meta.cameraMovement;
    }
    if (enriched.dialogue === undefined && typeof meta.dialogue === 'string') {
      enriched.dialogue = meta.dialogue;
    }
    if (enriched.notes === undefined && typeof meta.notes === 'string') {
      enriched.notes = meta.notes;
    }
  } else if (cardType === 'sceneCard' || cardType === 'art') {
    const tags: string[] = Array.isArray(enriched.tags)
      ? enriched.tags.filter((t): t is string => typeof t === 'string')
      : [];
    if (meta.location && typeof meta.location === 'string' && !tags.includes(meta.location)) {
      tags.push(meta.location);
    }
    if (meta.timeOfDay && typeof meta.timeOfDay === 'string' && !tags.includes(meta.timeOfDay)) {
      tags.push(meta.timeOfDay);
    }
    if (meta.shotType && typeof meta.shotType === 'string' && !tags.includes(meta.shotType)) {
      tags.push(meta.shotType);
    }
    if (tags.length > 0) enriched.tags = tags;

    if (enriched.generatedPrompt === undefined && enriched.prompt === undefined) {
      enriched.generatedPrompt = buildScenePrompt(node.title, meta);
    }
  }

  return enriched;
}

export const toolRouter: ToolRouter = {
  get_tree: async (_params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    return treeToText(tree);
  },

  get_subtree: async (params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    const node = findNode(tree, params.nodeId as string);
    if (!node) return `(未找到节点 ${params.nodeId})`;
    return treeToText(node);
  },

  add_node: async (params) => {
    const parentId = params.parentId as string;
    const type = params.type as TreeNode['type'];
    const title = params.title as string;
    const metadata: Record<string, unknown> = {};
    if (params.duration != null) metadata.duration = params.duration as number;
    if (params.description != null) metadata.description = params.description as string;
    if (params.location != null) metadata.location = params.location as string;
    if (params.timeOfDay != null) metadata.timeOfDay = params.timeOfDay;
    if (params.shotType != null) metadata.shotType = params.shotType;
    if (params.cameraMovement != null) metadata.cameraMovement = params.cameraMovement;
    if (params.dialogue != null) metadata.dialogue = params.dialogue;
    if (params.notes != null) metadata.notes = params.notes;
    const newNode = createNodeHandler(parentId, type, title, metadata);
    return `已添加 ${type}「${title}」(id: ${newNode.id})`;
  },

  update_node: async (params) => {
    const nodeId = params.nodeId as string;
    const changes = params.changes as Partial<TreeNode>;
    updateNodeHandler(nodeId, changes);
    return `已更新 ${nodeId}`;
  },

  delete_node: async (params) => {
    const nodeId = params.nodeId as string;
    const label = deleteNodeHandler(nodeId);
    return `已删除 ${label}`;
  },

  move_node: async (params) => {
    const store = useProjectStore.getState();
    const nodeId = params.nodeId as string;
    const newIndex = params.newIndex as number;
    store.moveTreeNode(nodeId, newIndex);
    return `已移动 ${nodeId}`;
  },

  apply_template: async (params) => {
    const templateId = params.templateId as string;
    let template: NarrativeTemplate | null = null;

    // 1. 先查找自定义模板
    const customTemplate = useCustomTemplateStore.getState().getTemplateById(templateId);
    if (customTemplate) {
      template = customTemplate;
    } else {
      // 2. 回退到内置模板
      try {
        const response = await fetch(`/templates/${templateId}.spellpaw-template.json`);
        if (response.ok) {
          template = await response.json();
        }
      } catch { /* ignore fetch error */ }
    }

    if (!template) {
      throw new Error(`模板未找到: ${templateId}`);
    }

    try {
      const store = useProjectStore.getState();
      let nodeCount = 0;

      function templateSceneToNode(scene: TemplateScene, isShot = false): Record<string, unknown> {
        const metadata: Record<string, unknown> = {
          description: scene.description,
          ...(scene.metadata ?? {}),
        };
        if (scene.suggestedShotTypes?.length) {
          metadata.shotType = scene.suggestedShotTypes[0];
        }
        if (scene.suggestedCameraMovement) {
          metadata.cameraMovement = scene.suggestedCameraMovement;
        }
        const node: Record<string, unknown> = {
          type: isShot ? 'shot' : 'scene',
          title: scene.title,
          metadata,
        };
        if (scene.children && scene.children.length > 0) {
          node.children = scene.children.map((c) => templateSceneToNode(c, true));
        }
        return node;
      }

      function createNodes(parentId: string, nodes: Array<Record<string, unknown>>) {
        for (const tn of nodes) {
          const node: TreeNode = {
            id: crypto.randomUUID(),
            type: tn.type as TreeNode['type'],
            title: tn.title as string,
            status: 'draft',
            metadata: {
              ...(tn.metadata as Record<string, unknown>),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          store.addTreeNode(parentId, node);
          nodeCount++;
          if (tn.children) createNodes(node.id, tn.children as Array<Record<string, unknown>>);
        }
      }

      const rootId = store.getCurrentTree()?.id;
      const parentId = (params.parentId as string) || rootId;
      if (!parentId) throw new Error('无法确定父节点：当前无项目打开');

      const acts = template.structure.acts as TemplateAct[];
      const treeNodes = acts.map((act) => ({
        type: 'act',
        title: act.title,
        metadata: { description: act.description },
        children: act.scenes.map((scene) => templateSceneToNode(scene)),
      }));
      createNodes(parentId, treeNodes);

      return `已套用模板「${template.name}」: 创建 ${nodeCount} 个节点`;
    } catch (err) {
      throw new Error(`套用模板失败: ${(err as Error).message}`, { cause: err });
    }
  },

  generate_storyboard: async (params) => {
    const nodeId = params.nodeId as string;
    const customPrompt = params.prompt as string | undefined;
    const stylePrompt = params.stylePrompt as string | undefined;

    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(无法生成：当前无项目)';

    const node = findNode(tree, nodeId);
    if (!node) return `(未找到节点 ${nodeId})`;

    let prompt: string;
    if (stylePrompt) {
      prompt = `${stylePrompt}\n\nScene: "${node.title}".`
        + (node.metadata?.location ? ` Location: ${node.metadata.location}.` : '')
        + (node.metadata?.timeOfDay ? ` Time: ${node.metadata.timeOfDay}.` : '')
        + (node.metadata?.shotType ? ` Shot: ${node.metadata.shotType}.` : '')
        + (node.metadata?.description ? ` ${node.metadata.description}` : '');
    } else {
      prompt = customPrompt || buildDefaultPrompt(node);
    }

    const input = {
      type: 'image' as const,
      capability: 'text2image' as const,
      prompt,
    };

    function selectProvider() {
      const domestic = [
        providerRegistry.select(input, 'doubao'),
        providerRegistry.select(input, 'siliconflow'),
      ];
      for (const selection of domestic) {
        if (!('error' in selection)) return selection.provider;
      }
      const openai = providerRegistry.select(input, 'openai');
      if (!('error' in openai)) return openai.provider;
      const fallback = providerRegistry.select(input);
      if ('error' in fallback) throw new Error(fallback.error);
      return fallback.provider;
    }

    const provider = selectProvider();
    const task = await provider.submit(input);

    if (task.status === 'failed') {
      throw new Error(task.error ?? '分镜生成失败');
    }

    const card = await addCanvasCardHandler('art' as import('@drama/types').CanvasNodeType, {
      title: node.title,
      description: prompt,
      generatedPrompt: prompt,
      linkedTreeNodeId: nodeId,
      status: 'draft',
      sourceProvider: provider.id,
      ...(stylePrompt ? { tags: [stylePrompt] } : {}),
    });

    if (task.status === 'done' && task.resultUrl) {
      useCanvasStore.getState().updateNodeData(card.id, { thumbnail: task.resultUrl });
      return `已使用 ${provider.name} 为「${node.title}」生成参考图: ${task.resultUrl}`;
    }

    useTaskStore.getState().addTask({
      taskId: task.taskId,
      providerId: provider.id,
      cardId: card.id,
      createdAt: new Date().toISOString(),
    });
    startPolling(task.taskId, provider, card.id);

    return `已使用 ${provider.name} 为「${node.title}」提交分镜生成任务，任务 ID: ${task.taskId}`;
  },

  generate_asset: async (params) => {
    const result = await generateAsset(params as unknown as Parameters<typeof generateAsset>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  generate_variants: async (params) => {
    const result = await generateVariants(params as unknown as Parameters<typeof generateVariants>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  edit_asset: async (params) => {
    const result = await editAsset(params as unknown as Parameters<typeof editAsset>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  apply_style: async (params) => {
    const result = await applyStyle(params as unknown as Parameters<typeof applyStyle>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  batch_apply_style: async (params) => {
    const result = await batchApplyStyle(params as unknown as Parameters<typeof batchApplyStyle>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  analyze_structure: async (_params) => {
    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(当前无项目)';

    const project = store.projects.find((p) => p.id === store.currentProjectId);
    const title = project?.title ?? tree.title;
    const acts = tree.children ?? [];
    const scenes = acts.flatMap((a) => a.children ?? []);
    const totalDuration = acts.reduce(
      (s, act) => s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0),
      0
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
    lines.push(`统计: ${report.sceneCount} 场景 · 总时长 ${report.totalDuration}s · 平均 ${Math.round(report.avgSceneDuration)}s`);
    if (report.maxSceneDuration > 0) {
      lines.push(`最长场景: ${report.maxSceneDuration}s · 最短: ${report.minSceneDuration}s`);
    }
    if (report.durationStdDev > 0) {
      const cv = report.avgSceneDuration > 0 ? (report.durationStdDev / report.avgSceneDuration) : 0;
      lines.push(`离散系数: ${(cv * 100).toFixed(0)}% · 状态: ${report.overallStatus === 'good' ? '良好' : report.overallStatus === 'warning' ? '一般' : '需优化'}`);
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
        lines.push(`  • 「${s.name}」 ${pct}%${s.hits > 0 ? ' — ' + s.keywords.filter((k) => corpus.includes(k)).slice(0, 3).join('、') : ''}`);
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
      duration: (act.children ?? []).reduce((s, sc) => s + (sc.metadata?.duration ?? 0), 0),
      scenes: act.children ?? [],
    }));
    const totalActDur = actDurations.reduce((s, a) => s + a.duration, 0);
    if (totalActDur > 0 && acts.length >= 2) {
      const idealPerAct = totalActDur / acts.length;
      for (const act of actDurations) {
        if (act.duration > idealPerAct * 1.4 && act.scenes.length > 1) {
          // Find longest scene in this act to compress
          const longest = act.scenes.reduce((a, b) => ((a.metadata?.duration ?? 0) > (b.metadata?.duration ?? 0) ? a : b));
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
        lines.push(`  ${p.title}: ${p.oldDuration}s → ${p.newDuration}s (${delta > 0 ? '+' : ''}${delta}s) — ${p.reason}`);
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
          metadata: { ...(node.metadata ?? {}), duration: p.newDuration, updatedAt: new Date().toISOString() } as TreeNode['metadata'],
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

  add_canvas_card: async (params) => {
    const validation = validateCanvasCardPayload(params);
    if (!validation.valid) {
      throw new Error(`画布卡片参数错误: ${validation.error}`);
    }

    const cardType = params.cardType as import('@drama/types').CanvasNodeType;
    const rawData = (params.data as Record<string, unknown>) ?? {};
    const position = params.position as { x: number; y: number } | undefined;

    const enrichedData = enrichCardDataFromTreeNode(cardType, rawData);
    const normalizedData = normalizeCardData(cardType, enrichedData);
    await addCanvasCardHandler(cardType, normalizedData as Record<string, unknown>, {
      position,
    });

    const linkedInfo = normalizedData.linkedTreeNodeId
      ? ` (关联节点: ${normalizedData.linkedTreeNodeId})`
      : '';
    return `已创建 ${cardType} 卡片「${normalizedData.title}」${linkedInfo}`;
  },

  update_canvas_card: async (params) => {
    const cardId = params.cardId as string;
    const rawData = (params.data as Record<string, unknown>) ?? {};

    if (!cardId) {
      throw new Error('cardId 必填');
    }

    const canvasStore = useCanvasStore.getState();
    const existing = canvasStore.getCurrentNodes().find((n) => n.id === cardId);
    if (!existing) {
      throw new Error(`未找到画布卡片: ${cardId}`);
    }

    const validation = validateCanvasCardUpdateData(existing.type, rawData);
    if (!validation.valid) {
      throw new Error(`画布卡片更新参数错误: ${validation.error}`);
    }

    const updates = normalizeCardUpdateData(existing.type, rawData);
    canvasStore.updateNodeData(cardId, updates);

    const newTitle = updates.title ?? existing.data.title;
    return `已更新画布卡片「${newTitle}」(${cardId})`;
  },

  delete_canvas_card: async (params) => {
    const cardId = params.cardId as string;

    if (!cardId) {
      throw new Error('cardId 必填');
    }

    const canvasStore = useCanvasStore.getState();
    const existing = canvasStore.getCurrentNodes().find((n) => n.id === cardId);
    if (!existing) {
      throw new Error(`未找到画布卡片: ${cardId}`);
    }

    canvasStore.removeNode(cardId);
    return `已删除画布卡片「${existing.data.title}」(${cardId})`;
  },

  kickstart_project: async (params) => {
    const theme = params.theme as string;
    const genre = params.genre as string | undefined;
    const cardType = (params.cardType as 'sceneCard' | 'script' | undefined) ?? 'sceneCard';

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
    await toolRouter.apply_template({ action: 'apply_template', templateId: best.id, parentId: tree.id });

    // 4. Refresh tree and collect only the newly added scenes
    const freshTree = store.getCurrentTree();
    if (!freshTree) throw new Error('套用模板后无法获取项目树');
    const scenes = collectScenes(freshTree).filter((s) => !existingSceneIds.has(s.id));

    // 5. Create a canvas card for each new scene
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

      await toolRouter.add_canvas_card({
        action: 'add_canvas_card',
        cardType,
        data: baseData,
      });
      cardCount++;
    }

    return `已基于「${best.name}」模板创建项目结构：共 ${scenes.length} 个场景，并生成 ${cardCount} 张${cardType === 'sceneCard' ? '场景卡' : '剧本卡'}。`;
  },

  // ── Card-based tools (no-tree architecture) ──

  /** Enumerate all canvas cards as indented text for Copilot context */
  get_canvas: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    if (cards.length === 0) return '(画布为空)';
    const lines: string[] = [`画布共 ${cards.length} 张卡片：`];
    for (const c of cards) {
      const typeIcon = { storyline: '📖', moodboard: '🎨', videoClip: '🎬', asset: '📦', task: '📋', art: '🖼️', character: '👤', script: '📝', deliverable: '📦', sceneCard: '🎬' }[c.type] ?? '📄';
      const statusMark = c.data.status === 'done' ? '✅' : c.data.status === 'in_progress' ? '🔄' : '';
      lines.push(`  ${typeIcon} ${c.type}「${c.data.title}」${statusMark} (${c.id})`);
      if (c.data.description) lines.push(`    描述：${c.data.description.slice(0, 80)}`);
      if (c.data.children?.length) {
        for (const ch of c.data.children) {
          lines.push(`    └─ ${ch.type}「${ch.title}」`);
        }
      }
      if (c.data.linkedCardIds?.length) {
        lines.push(`    关联：${c.data.linkedCardIds.join(', ')}`);
      }
    }
    return lines.join('\n');
  },

  /** Add a new card to the canvas */
  add_card: async (params) => {
    const type = (params.type as string) || 'storyline';
    const title = (params.title as string) || '新卡片';
    const description = params.description as string | undefined;
    const cardType = (['storyline', 'moodboard', 'videoClip', 'asset', 'task', 'art', 'character'] as const).includes(type as never) ? type as import('@drama/types').CanvasNodeType : 'storyline';

    // Auto-position: stack below existing cards with some offset
    const existing = useCanvasStore.getState().getCurrentNodes();
    const lastY = existing.length > 0
      ? Math.max(...existing.map((n) => n.position.y)) + 220
      : 50;

    const card = await addCanvasCardHandler(cardType, {
      title,
      description,
      status: 'draft',
    });

    // Override position (addCanvasCardHandler places at origin)
    useCanvasStore.getState().updateNodeData(card.id, {} as never);
    // Directly reposition via store internals
    useCanvasStore.setState((state) => {
      const pid = useProjectStore.getState().currentProjectId;
      if (!pid) return state;
      const entry = state.canvases[pid];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [pid]: {
            ...entry,
            nodes: entry.nodes.map((n) =>
              n.id === card.id ? { ...n, position: { x: 50 + (existing.length % 3) * 400, y: lastY } } : n
            ),
          },
        },
      };
    });

    return `已添加 ${cardType}「${title}」(id: ${card.id})`;
  },

  /** Update a card's data or children */
  update_card: async (params) => {
    const cardId = params.cardId as string;
    const updates = (params.updates || params.data || {}) as Record<string, unknown>;
    useCanvasStore.getState().updateNodeData(cardId, updates as Partial<import('@drama/types').CanvasNodeData>);
    return `已更新卡片 ${cardId}`;
  },

  /** Delete a card from canvas */
  delete_card: async (params) => {
    const cardId = params.cardId as string;
    const nodes = useCanvasStore.getState().getCurrentNodes();
    const card = nodes.find((n) => n.id === cardId);
    useCanvasStore.getState().removeNode(cardId);
    return `已删除卡片「${card?.data.title ?? cardId}」`;
  },

  /**
   * Atomically clear canvas cards for the current project. Use this for
   * "delete all" / "清空画布" requests — it bypasses the iteration-deletion
   * race (refresh during debounced push can revert state from server) by
   * removing nodes in a single store update and triggering an immediate
   * force push.
   *
   * Optional `filter`: { type?, status?, titleContains? } to remove only
   * matching cards. Omit filter to remove everything.
   */
  clear_canvas: async (params) => {
    const filter = (params.filter as Record<string, unknown> | undefined) ?? {};
    const cardType = filter.type as import('@drama/types').CanvasNodeType | undefined;
    const status = filter.status as string | undefined;
    const titleContains = filter.titleContains as string | undefined;

    const allNodes = useCanvasStore.getState().getCurrentNodes();
    const matched = allNodes.filter((n) => {
      if (cardType && n.type !== cardType) return false;
      if (status && (n.data as { status?: string }).status !== status) return false;
      if (titleContains && !((n.data as { title?: string }).title ?? '').includes(titleContains)) return false;
      return true;
    });

    if (matched.length === 0) {
      return '画布已为空，无需清理。';
    }

    // Remove in a single store update so subscribers see one atomic change.
    const idsToRemove = new Set(matched.map((n) => n.id));
    useCanvasStore.setState((state) => {
      const projectId = useProjectStore.getState().currentProjectId;
      if (!projectId) return state;
      const entry = state.canvases[projectId];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [projectId]: {
            ...entry,
            nodes: entry.nodes.filter((n) => !idsToRemove.has(n.id)),
            edges: entry.edges.filter((e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target)),
          },
        },
        ...(state.selectedCardId && idsToRemove.has(state.selectedCardId) ? { selectedCardId: null } : {}),
      };
    });

    // Force-push to server immediately so a subsequent refresh doesn't
    // restore the cards from the previous server state.
    try {
      const { triggerPushNow } = await import('@drama/lib/syncEngine');
      await triggerPushNow();
    } catch (err) {
      // Even if the push fails, the local state is already cleared.
      console.warn('[clear_canvas] force push failed:', err);
    }

    const scope = cardType ?? status ?? titleContains ? '（按条件）' : '';
    return `已清空画布${scope}：共删除 ${matched.length} 张卡片。`;
  },
};

import { useProjectStore } from './projectStore';
import { useCustomTemplateStore } from './customTemplateStore';
import type { ToolRouter, TreeNode, NarrativeTemplate, TemplateAct, TemplateScene } from '../types';
import { analyzePacing, suggestCompletions, generatePacingReport } from '../lib/projectAnalysis';

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
    const store = useProjectStore.getState();
    const parentId = params.parentId as string;
    const type = params.type as TreeNode['type'];
    const title = params.title as string;

    const newNode: TreeNode = {
      id: crypto.randomUUID(),
      type,
      title,
      status: 'draft',
      metadata: {
        duration: (params.duration as number) ?? 0,
        description: params.description as string | undefined,
        location: params.location as string | undefined,
        timeOfDay: params.timeOfDay as 'morning' | 'day' | 'evening' | 'night' | undefined,
        shotType: params.shotType as 'wide' | 'medium' | 'close-up' | 'insert' | 'pov' | undefined,
        cameraMovement: params.cameraMovement as 'static' | 'pan' | 'tilt' | 'dolly' | 'handheld' | undefined,
        dialogue: params.dialogue as string | undefined,
        notes: params.notes as string | undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    store.addTreeNode(parentId, newNode);
    return `已添加 ${type}「${title}」(id: ${newNode.id})`;
  },

  update_node: async (params) => {
    const store = useProjectStore.getState();
    const nodeId = params.nodeId as string;
    const changes = params.changes as Partial<TreeNode>;
    store.updateTreeNode(nodeId, changes);
    return `已更新 ${nodeId}`;
  },

  delete_node: async (params) => {
    const store = useProjectStore.getState();
    const nodeId = params.nodeId as string;
    const tree = store.getCurrentTree();
    const node = tree ? findNode(tree, nodeId) : null;
    const label = node ? `${node.type}「${node.title}」` : nodeId;
    store.deleteTreeNode(nodeId);
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

      function templateSceneToNode(scene: TemplateScene): Record<string, unknown> {
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
          type: scene.children && scene.children.length > 0 ? 'scene' : 'shot',
          title: scene.title,
          metadata,
        };
        if (scene.children && scene.children.length > 0) {
          node.children = scene.children.map((c) => templateSceneToNode(c));
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

    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(无法生成：当前无项目)';

    const node = findNode(tree, nodeId);
    if (!node) return `(未找到节点 ${nodeId})`;

    try {
      const { generateImage, buildImagePrompt } = await import('../lib/imageGen');
      const prompt = customPrompt || buildImagePrompt(node);
      const imageUrl = await generateImage({ prompt, size: '1024x1792' });

      const { useCanvasStore } = await import('./canvasStore');
      const canvasState = useCanvasStore.getState();
      const canvasNodes = canvasState.getCurrentNodes();
      const linkedCard = canvasNodes.find((n: { data: { linkedTreeNodeId?: string } }) => n.data.linkedTreeNodeId === nodeId);
      if (linkedCard) {
        canvasState.updateNodeData(linkedCard.id, { thumbnail: imageUrl });
      }

      return `已为「${node.title}」生成参考图: ${imageUrl}`;
    } catch (err) {
      throw new Error(`分镜生成失败: ${(err as Error).message}`, { cause: err });
    }
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
    const corpus = texts.join(' ').toLowerCase();

    const BUILTIN_TEMPLATES = [
      { id: 'suspense-reversal', name: '悬疑反转', category: 'suspense', keywords: ['悬疑','密室','反转','侦探','凶杀','失踪','谜','真相','阴谋','惊悚','犯罪','追凶','暗','恐怖'] },
      { id: 'sweet-romance', name: '甜宠短剧', category: 'romance', keywords: ['甜宠','恋爱','爱情','霸道','总裁','心动','初恋','约会','浪漫','甜蜜','表白','吻','宠','嫁','娶'] },
      { id: 'comedy-twist', name: '喜剧反转', category: 'comedy', keywords: ['喜剧','搞笑','幽默','段子','笑','荒诞','讽刺','无厘头','欢乐','逗','趣'] },
      { id: 'underdog-comeback', name: '励志逆袭', category: 'drama', keywords: ['励志','逆袭','奋斗','成长','追梦','突破','翻身','成功','努力','拼搏','创业','穷'] },
      { id: 'mini-documentary', name: '短纪录片', category: 'documentary', keywords: ['纪录','纪实','访谈','真实','纪录片','人文','社会','探索','历史','见证'] },
    ];

    const scores = BUILTIN_TEMPLATES.map((t) => {
      const hits = t.keywords.filter((k) => corpus.includes(k)).length;
      return { ...t, score: hits / Math.max(1, t.keywords.length * 0.6), hits };
    }).sort((a, b) => b.score - a.score);

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
    interface PlanItem {
      nodeId: string;
      title: string;
      oldDuration: number;
      newDuration: number;
      reason: string;
    }
    const plan: PlanItem[] = [];

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
          metadata: { ...(node.metadata ?? {}), duration: p.newDuration, updatedAt: new Date().toISOString() },
        });
      }
    }

    return `✅ 已优化 ${plan.length} 个场景时长，总时长变化 ${plan.reduce((s, p) => s + (p.newDuration - p.oldDuration), 0)}s`;
  },
};

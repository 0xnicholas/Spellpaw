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
};

/**
 * Tree domain — tools that operate on the project tree (act/scene/shot).
 *
 * Exports:
 *   - treeHandlers: ToolRouter map for the 7 tree tools
 *   - applyTemplateCore: shared helper used by apply_template AND by
 *     analysis.kickstart_project. Pure function — takes a store reference,
 *     mutates it, returns metadata. No router/tool-layer dependency.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { createNodeHandler, updateNodeHandler, deleteNodeHandler } from '@drama/lib/builderHandlers';
import type { TreeNode, NarrativeTemplate, TemplateAct, TemplateScene } from '@drama/types';
import { findNode } from '@drama/lib/treeUtils';
import type { ToolRouter } from './types';

// ── Internal helpers (tree-text rendering used by get_tree / get_subtree) ──

function nodeToLine(node: TreeNode, depth: number): string {
  const indent = '│   '.repeat(Math.max(0, depth - 1)) + (depth > 0 ? '├── ' : '');
  const statusIcon = { draft: '📝', in_progress: '🔄', review: '👀', done: '✅' }[node.status] ?? '';
  const duration = node.metadata?.duration ? ` · ${node.metadata.duration}s` : '';
  return `${indent}${statusIcon} ${node.type}「${node.title}」${duration}`;
}

function renderTreeText(node: TreeNode, depth = 0): string {
  let text = nodeToLine(node, depth);
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + renderTreeText(child, depth + 1);
    }
  }
  return text;
}

// ── Shared helper: applyTemplateCore ──
//
// Lifted from the original apply_template handler so both tree.ts::apply_template
// and analysis.ts::kickstart_project can call it without going through the
// router (avoids cross-domain router calls + keeps logic in one place).
//
// Returns the resolved template and the number of nodes created.

export interface ApplyTemplateResult {
  template: NarrativeTemplate;
  nodeCount: number;
}

export type ProjectStoreForTemplate = ReturnType<typeof useProjectStore.getState>;

export async function applyTemplateCore(
  store: ProjectStoreForTemplate,
  templateId: string,
  parentId?: string,
): Promise<ApplyTemplateResult> {
  // 1. Look up custom template, then fall back to built-in fetch
  let template: NarrativeTemplate | null = null;

  const customTemplate = useCustomTemplateStore.getState().getTemplateById(templateId);
  if (customTemplate) {
    template = customTemplate;
  } else {
    try {
      const response = await fetch(`/templates/${templateId}.spellpaw-template.json`);
      if (response.ok) {
        template = await response.json();
      }
    } catch {
      /* ignore fetch error — will be handled below */
    }
  }

  if (!template) {
    throw new Error(`模板未找到: ${templateId}`);
  }

  // 2. Build tree node specs from the template structure
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
  const targetParent = parentId ?? rootId;
  if (!targetParent) throw new Error('无法确定父节点：当前无项目打开');

  const acts = template.structure.acts as TemplateAct[];
  const treeNodes = acts.map((act) => ({
    type: 'act',
    title: act.title,
    metadata: { description: act.description },
    children: act.scenes.map((scene) => templateSceneToNode(scene)),
  }));
  createNodes(targetParent, treeNodes);

  return { template, nodeCount };
}

// ── treeHandlers: the 7 tree tool handlers ──

export const treeHandlers: ToolRouter = {
  get_tree: async (_params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    return renderTreeText(tree);
  },

  get_subtree: async (params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    const node = findNode(tree, params.nodeId as string);
    if (!node) return `(未找到节点 ${params.nodeId})`;
    return renderTreeText(node);
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
    const store = useProjectStore.getState();
    const templateId = params.templateId as string;
    try {
      const { template, nodeCount } = await applyTemplateCore(
        store,
        templateId,
        params.parentId as string | undefined,
      );
      return `已套用模板「${template.name}」: 创建 ${nodeCount} 个节点`;
    } catch (err) {
      throw new Error(`套用模板失败: ${(err as Error).message}`, { cause: err });
    }
  },
};
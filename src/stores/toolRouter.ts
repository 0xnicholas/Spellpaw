import { useProjectStore } from './projectStore';
import type { ToolRouter, TreeNode } from '../types';

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
        timeOfDay: params.timeOfDay as TreeNode['metadata']['timeOfDay'],
        shotType: params.shotType as TreeNode['metadata']['shotType'],
        cameraMovement: params.cameraMovement as TreeNode['metadata']['cameraMovement'],
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
  apply_template: async () => '(not implemented)',
  generate_storyboard: async () => '(not implemented)',
};

import { useProjectStore } from '@drama/stores/projectStore';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { providerRegistry } from '../registry';
import { useTaskStore } from '../taskStore';
import type { ToolkitResult, GenerationInput, Capability, MediaType, GenerationProvider } from '../types';
import type { CanvasNodeType, TreeNode } from '@drama/types';

export interface GenerateAssetParams {
  action: 'generate_asset';
  nodeId: string;
  mediaType: MediaType;
  prompt?: string;
  provider?: string;
  count?: number;
  cardType?: CanvasNodeType;
}

function buildDefaultPrompt(node: TreeNode): string {
  const m = (node.metadata ?? {}) as NonNullable<TreeNode['metadata']>;
  const parts: string[] = [`Cinematic storyboard frame for "${node.title}".`];
  if (m.description) parts.push(m.description);
  if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
  if (m.location) parts.push(`Location: ${m.location}.`);
  if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
  parts.push('Vertical 9:16, cinematic lighting, photorealistic.');
  return parts.join(' ');
}

function findNode(node: TreeNode | null, nodeId: string): TreeNode | null {
  if (!node) return null;
  if (node.id === nodeId) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

function updateCardThumbnail(cardId: string, url: string) {
  import('@drama/stores/canvasStore').then(({ useCanvasStore }) => {
    useCanvasStore.getState().updateNodeData(cardId, { thumbnail: url });
  });
}

export function startPolling(taskId: string, provider: GenerationProvider, cardId: string) {
  if (!provider.poll) return;
  const interval = setInterval(async () => {
    const task = await provider.poll!(taskId);
    if (task.status === 'done' && task.resultUrl) {
      updateCardThumbnail(cardId, task.resultUrl);
      useTaskStore.getState().removeTask(taskId);
      clearInterval(interval);
    } else if (task.status === 'failed') {
      useTaskStore.getState().removeTask(taskId);
      clearInterval(interval);
    }
  }, 4000);
}

export async function generateAsset(params: GenerateAssetParams): Promise<ToolkitResult> {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  if (!tree) {
    return { success: false, message: '当前没有打开的项目', retryable: false };
  }

  const node = findNode(tree, params.nodeId);
  if (!node) {
    return { success: false, message: `未找到节点: ${params.nodeId}`, retryable: false };
  }

  const capability: Capability = params.mediaType === 'video' ? 'text2video' : 'text2image';
  const batchCount = params.count ?? 1;
  const input: GenerationInput = {
    type: params.mediaType,
    capability,
    prompt: params.prompt ?? buildDefaultPrompt(node),
    batchCount,
  };

  const selection = providerRegistry.select(input, params.provider);
  if ('error' in selection) {
    return { success: false, message: selection.error, retryable: false };
  }

  const provider = selection.provider;
  const cardType = params.cardType ?? (params.mediaType === 'video' ? 'deliverable' : 'art');
  const cardIds: string[] = [];

  for (let i = 0; i < batchCount; i++) {
    const titleSuffix = batchCount > 1 ? ` 变体 ${i + 1}` : '';
    const card = await addCanvasCardHandler(cardType, {
      title: `${node.title}${titleSuffix}`,
      description: input.prompt,
      generatedPrompt: input.prompt,
      linkedTreeNodeId: node.id,
      status: 'draft',
      sourceProvider: provider.id,
    });
    cardIds.push(card.id);

    const task = await provider.submit(input);
    if (task.status === 'done' && task.resultUrl) {
      updateCardThumbnail(card.id, task.resultUrl);
    } else if (task.status === 'pending' || task.status === 'processing') {
      useTaskStore.getState().addTask({
        taskId: task.taskId,
        providerId: provider.id,
        cardId: card.id,
        createdAt: new Date().toISOString(),
      });
      startPolling(task.taskId, provider, card.id);
    } else {
      return { success: false, message: task.error ?? '生成失败', retryable: true };
    }
  }

  return {
    success: true,
    message: `已使用 ${provider.name} 生成 ${cardIds.length} 张${cardType === 'deliverable' ? '视频' : '图片'}卡片`,
    cardIds,
  };
}

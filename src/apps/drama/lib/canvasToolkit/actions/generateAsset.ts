import { useProjectStore } from '@drama/stores/projectStore';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { findNode } from '@drama/lib/treeUtils';
import { providerRegistry } from '../registry';
import { useTaskStore } from '../taskStore';
import { buildDefaultPrompt, updateCardThumbnail, startPolling } from '../shared';
import type { ToolkitResult, GenerationInput, Capability, MediaType } from '../types';
import type { CanvasNodeType } from '@drama/types';

export interface GenerateAssetParams {
  action: 'generate_asset';
  nodeId?: string;
  mediaType: MediaType;
  prompt?: string;
  provider?: string;
  count?: number;
  cardType?: CanvasNodeType;
}

export async function generateAsset(params: GenerateAssetParams): Promise<ToolkitResult> {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  if (!tree) {
    return { success: false, message: '当前没有打开的项目', retryable: false };
  }

  const node = params.nodeId ? findNode(tree, params.nodeId) : null;
  if (params.nodeId && !node) {
    return { success: false, message: `未找到节点: ${params.nodeId}`, retryable: false };
  }

  if (params.mediaType !== 'image' && params.mediaType !== 'video') {
    return { success: false, message: `不支持的 mediaType: ${params.mediaType}`, retryable: false };
  }

  if (!node && !params.prompt) {
    return { success: false, message: '未选择节点时，请提供生成提示词', retryable: false };
  }

  const capability: Capability = params.mediaType === 'video' ? 'text2video' : 'text2image';
  const batchCount = Math.max(1, Math.floor(params.count ?? 1));
  const input: GenerationInput = {
    type: params.mediaType,
    capability,
    prompt: params.prompt ?? buildDefaultPrompt(node!),
    batchCount,
  };

  const selection = providerRegistry.select(input, params.provider);
  if ('error' in selection) {
    return { success: false, message: selection.error, retryable: false };
  }

  const provider = selection.provider;
  const cardType = params.cardType ?? (params.mediaType === 'video' ? 'deliverable' : 'art');
  const cardIds: string[] = [];
  const pendingTaskIds: string[] = [];

  for (let i = 0; i < batchCount; i++) {
    const task = await provider.submit(input);
    if (task.status === 'failed') {
      return { success: false, message: task.error ?? '生成失败', retryable: true };
    }

    const titleSuffix = batchCount > 1 ? ` 变体 ${i + 1}` : '';
    const baseTitle = node?.title ?? input.prompt.slice(0, 20);
    const cardData: Record<string, unknown> = {
      title: `${baseTitle}${titleSuffix}`,
      description: input.prompt,
      generatedPrompt: input.prompt,
      linkedTreeNodeId: node?.id,
      status: 'draft',
      sourceProvider: provider.id,
    };
    if (cardType === 'deliverable') {
      cardData.deliverableType = 'video';
    }

    const card = await addCanvasCardHandler(cardType, cardData);
    cardIds.push(card.id);

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
      pendingTaskIds.push(task.taskId);
    }
  }

  const pendingSuffix = pendingTaskIds.length > 0 ? `（${pendingTaskIds.length} 个任务正在后台生成）` : '';
  return {
    success: true,
    message: `已使用 ${provider.name} 创建 ${cardIds.length} 张${cardType === 'deliverable' ? '视频' : '图片'}卡片${pendingSuffix}`,
    cardIds,
    ...(pendingTaskIds.length > 0 ? { taskId: pendingTaskIds[0] } : {}),
  };
}

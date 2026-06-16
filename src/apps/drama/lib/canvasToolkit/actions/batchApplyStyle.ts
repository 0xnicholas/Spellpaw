import { useProjectStore } from '@drama/stores/projectStore';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { findNode } from '@drama/lib/treeUtils';
import { providerRegistry } from '../registry';
import { useTaskStore } from '../taskStore';
import { buildDefaultPrompt, updateCardThumbnail, startPolling } from '../shared';
import type { ToolkitResult, GenerationInput } from '../types';

export interface BatchApplyStyleParams {
  action: 'batch_apply_style';
  nodeIds: string[];
  stylePrompt: string;
  provider?: string;
}

export async function batchApplyStyle(params: BatchApplyStyleParams): Promise<ToolkitResult> {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  if (!tree) {
    return { success: false, message: '当前没有打开的项目', retryable: false };
  }

  if (!params.stylePrompt || params.stylePrompt.trim().length === 0) {
    return { success: false, message: '请提供风格描述', retryable: false };
  }

  if (params.nodeIds.length === 0) {
    return { success: false, message: '请至少选择一个节点', retryable: false };
  }

  const input: GenerationInput = {
    type: 'image',
    capability: 'text2image',
    prompt: params.stylePrompt,
  };

  const selection = providerRegistry.select(input, params.provider);
  if ('error' in selection) {
    return { success: false, message: selection.error, retryable: false };
  }

  const provider = selection.provider;
  const cardIds: string[] = [];
  const pendingTaskIds: string[] = [];
  const errors: string[] = [];

  for (const nodeId of params.nodeIds) {
    const node = findNode(tree, nodeId);
    if (!node) {
      errors.push(`未找到节点: ${nodeId}`);
      continue;
    }

    const basePrompt = buildDefaultPrompt(node);
    const styledPrompt = `Style: ${params.stylePrompt}.\n\n${basePrompt}`;

    const task = await provider.submit({ ...input, prompt: styledPrompt });
    if (task.status === 'failed') {
      errors.push(task.error ?? `「${node.title}」生成失败`);
      continue;
    }

    const card = await addCanvasCardHandler('art', {
      title: `${node.title}（${params.stylePrompt.slice(0, 12)}）`,
      description: styledPrompt,
      generatedPrompt: styledPrompt,
      linkedTreeNodeId: node.id,
      status: 'draft',
      sourceProvider: provider.id,
    });
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

  if (cardIds.length === 0) {
    return { success: false, message: `批量风格迁移失败: ${errors.join('; ')}`, retryable: errors.length > 0 };
  }

  const pendingSuffix = pendingTaskIds.length > 0 ? `（${pendingTaskIds.length} 个任务正在后台生成）` : '';
  const errorSuffix = errors.length > 0 ? `；${errors.length} 个节点失败` : '';
  return {
    success: true,
    message: `已为 ${cardIds.length} 个节点创建「${params.stylePrompt}」风格卡片${pendingSuffix}${errorSuffix}`,
    cardIds,
    ...(pendingTaskIds.length > 0 ? { taskId: pendingTaskIds[0] } : {}),
  };
}

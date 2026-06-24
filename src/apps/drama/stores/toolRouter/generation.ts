/**
 * Generation domain — tools that generate or modify AI content (images / video).
 *
 * Most handlers are thin pass-throughs to canvasToolkit; generate_storyboard
 * has its own provider-selection + async-task plumbing.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { findNode } from '@drama/lib/treeUtils';
import {
  generateAsset,
  generateVariants,
  editAsset,
  applyStyle,
  batchApplyStyle,
  providerRegistry,
  useTaskStore,
  startPolling,
  buildDefaultPrompt,
} from '@drama/lib/canvasToolkit';
import type { CanvasNodeType } from '@drama/types';
import type { ToolRouter } from './types';

export const generationHandlers: ToolRouter = {
  /** Generate image/video, attach to a tree scene as an art card. */
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
      prompt =
        `${stylePrompt}\n\nScene: "${node.title}".` +
        (node.metadata?.location ? ` Location: ${node.metadata.location}.` : '') +
        (node.metadata?.timeOfDay ? ` Time: ${node.metadata.timeOfDay}.` : '') +
        (node.metadata?.shotType ? ` Shot: ${node.metadata.shotType}.` : '') +
        (node.metadata?.description ? ` ${node.metadata.description}` : '');
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

    const card = await addCanvasCardHandler('art' as CanvasNodeType, {
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

  /** Pass-through to canvasToolkit — generates an asset card. */
  generate_asset: async (params) => {
    const result = await generateAsset(params as unknown as Parameters<typeof generateAsset>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  /** Pass-through to canvasToolkit — generates variants of an existing asset. */
  generate_variants: async (params) => {
    const result = await generateVariants(params as unknown as Parameters<typeof generateVariants>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  /** Pass-through to canvasToolkit — edits an existing asset via prompt. */
  edit_asset: async (params) => {
    const result = await editAsset(params as unknown as Parameters<typeof editAsset>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  /** Pass-through to canvasToolkit — applies a style to one card. */
  apply_style: async (params) => {
    const result = await applyStyle(params as unknown as Parameters<typeof applyStyle>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },

  /** Pass-through to canvasToolkit — applies a style to many cards. */
  batch_apply_style: async (params) => {
    const result = await batchApplyStyle(params as unknown as Parameters<typeof batchApplyStyle>[0]);
    if (!result.success) throw new Error(result.message);
    return result.message;
  },
};
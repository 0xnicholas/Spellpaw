/**
 * Generation domain — tools that generate or modify AI content (images / video).
 *
 * Most handlers are thin pass-throughs to canvasToolkit; generate_storyboard
 * has its own provider-selection + async-task plumbing.
 */
import {
  generateAsset,
  generateVariants,
  editAsset,
  applyStyle,
  batchApplyStyle,
} from '@drama/lib/canvasToolkit';
import type { ToolRouter } from './types';

export const generationHandlers: ToolRouter = {
  /**
   * Generate a storyboard reference image for a canvas card.
   *
   * Canvas-first (Phase 4): the source binding is a `cardId` on the canvas.
   * Legacy `nodeId` is accepted as an alias and mapped to `cardId` for
   * backward compatibility with tree-era prompts.
   */
  generate_storyboard: async (params) => {
    const cardId = (params.cardId ?? params.nodeId) as string | undefined;
    if (!cardId) {
      return JSON.stringify({
        success: false,
        error: 'validation_failed',
        suggestion: 'provide cardId (or legacy nodeId)',
        summary: 'generate_storyboard requires cardId',
      });
    }
    const result = await generateAsset({
      action: 'generate_asset',
      cardId,
      mediaType: 'image',
      ...(params.prompt ? { prompt: params.prompt as string } : {}),
      ...(params.provider ? { provider: params.provider as string } : {}),
    });
    if (!result.success) {
      return JSON.stringify({
        success: false,
        error: 'generation_failed',
        summary: result.message,
      });
    }
    return JSON.stringify({
      success: true,
      summary: result.message,
      cardIds: result.cardIds,
      ...(result.taskId ? { taskId: result.taskId } : {}),
    });
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
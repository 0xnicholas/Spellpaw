import type { Capability } from '@drama/lib/canvasToolkit';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';

/**
 * 根据 kind 和是否上传参考图推断 GenerationInput.capability。
 *
 * 重要：doubaoProvider 在 text2image 分支会静默丢弃 referenceUrl
 * （见 providers/doubaoProvider.ts:167-189）。所以必须正确选择 capability，
 * 否则用户上传的参考图会没效果。
 */
export function inferCapability(kind: CopilotKind, hasRef: boolean): Capability {
  if (kind === 'image') return hasRef ? 'image2image' : 'text2image';
  if (kind === 'video') return hasRef ? 'image2video' : 'text2video';
  throw new Error(`unsupported kind for capability: ${kind}`);
}

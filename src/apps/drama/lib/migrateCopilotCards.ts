import type { CanvasNode } from '@drama/types';
import { kindToCardType, defaultTitle } from '@shared/components/canvas/helpers/kindInference';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';

/**
 * 迁移老的 copilotCard 节点到对应正式类型。
 * - status='done' + result.url → 写入 thumbnail/sourceProvider/generatedPrompt
 * - 其他状态 → isPlaceholder=true（用户可点击重新生成）
 *
 * 幂等：非 copilotCard 节点原样返回。
 *
 * Note: 'copilotCard' 已从 CanvasNodeType union 中移除（v2 重构），但老版本
 * 持久化数据中仍有此类型。函数接受任意节点对象（接口 shape），运行时通过
 * type === 'copilotCard' 字符串比较识别。
 */

export interface LegacyNodeLike {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown> & { title?: string };
}

export function migrateCopilotCards(nodes: LegacyNodeLike[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.type !== 'copilotCard') return node as unknown as CanvasNode;
    const data = node.data;
    const kind = (data.kind as CopilotKind | undefined) ?? 'text';
    const newType = kindToCardType(kind);
    const result = data.result as Record<string, unknown> | undefined;
    const hasResult = data.status === 'done' && !!result?.url;
    const data_out: Record<string, unknown> = {
      title: defaultTitle(kind),
      isPlaceholder: !hasResult,
      status: 'draft',
    };
    if (hasResult && result?.url) {
      data_out.thumbnail = result.url;
      data_out.generatedPrompt = data.prompt as string | undefined;
      data_out.sourceProvider = data.providerId as string | undefined;
    }
    return {
      id: node.id,
      type: newType,
      position: node.position,
      data: data_out as CanvasNode['data'],
    };
  });
}

export function countCopilotCards(nodes: LegacyNodeLike[]): number {
  return nodes.filter((n) => n.type === 'copilotCard').length;
}
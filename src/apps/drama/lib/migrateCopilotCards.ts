import type { CanvasNode, CanvasNodeType } from '@drama/types';

const KIND_TO_CARD_TYPE: Record<string, CanvasNodeType> = {
  image: 'art',
  video: 'videoClip',
  text: 'storyline',
  upload: 'asset',
};

const DEFAULT_TITLES: Record<string, string> = {
  image: '新美术',
  video: '新视频',
  text: '新故事线',
  upload: '新素材',
};

/**
 * 迁移老的 copilotCard 节点到对应正式类型。
 * - status='done' + result.url → 写入 thumbnail/sourceProvider/generatedPrompt
 * - 其他状态 → isPlaceholder=true（用户可点击重新生成）
 *
 * 幂等：非 copilotCard 节点原样返回。
 */
export function migrateCopilotCards(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.type !== 'copilotCard') return node;
    const data = node.data as Record<string, unknown>;
    const kind = (data.kind as string) ?? 'text';
    const newType = KIND_TO_CARD_TYPE[kind] ?? 'storyline';
    const result = data.result as Record<string, unknown> | undefined;
    const hasResult = data.status === 'done' && result?.url;
    return {
      ...node,
      type: newType,
      data: {
        title: DEFAULT_TITLES[kind] ?? '未命名卡片',
        isPlaceholder: !hasResult,
        ...(hasResult && {
          thumbnail: result!.url as string,
          generatedPrompt: data.prompt as string | undefined,
          sourceProvider: data.providerId as string | undefined,
        }),
        status: 'draft',
      },
    };
  });
}

export function countCopilotCards(nodes: CanvasNode[]): number {
  return nodes.filter((n) => n.type === 'copilotCard').length;
}

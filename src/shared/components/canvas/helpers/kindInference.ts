import type { CanvasNode, CanvasNodeType } from '@drama/types';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';

const KIND_TO_CARD_TYPE: Record<CopilotKind, CanvasNodeType> = {
  text: 'storyline',
  image: 'art',
  video: 'videoClip',
  upload: 'asset',
};

const DEFAULT_TITLES: Record<CopilotKind, string> = {
  text: '新文本',
  image: '新美术',
  video: '新视频',
  upload: '新素材',
};

export function kindToCardType(kind: CopilotKind): CanvasNodeType {
  return KIND_TO_CARD_TYPE[kind];
}

export function defaultTitle(kind: CopilotKind): string {
  return DEFAULT_TITLES[kind];
}

/** 根据已有卡片类型推断点击时应该用哪种 kind */
export function inferKindFromCard(node: CanvasNode): CopilotKind {
  switch (node.type) {
    case 'storyline':
    case 'script':
    case 'sceneCard':
    case 'character':
    case 'task':
      return 'text';
    case 'art':
      return 'image';
    case 'videoClip':
    case 'deliverable':
      return 'video';
    case 'asset':
    case 'moodboard':
      return 'upload';
    default:
      return 'text';
  }
}

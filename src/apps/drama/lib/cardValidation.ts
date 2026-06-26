import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNode } from '@drama/types';
import type { ToolResult } from '@drama/stores/toolRouter/types';

export function findCardOrError(
  cardId: string,
): { ok: true; card: CanvasNode } | { ok: false; error: ToolResult } {
  const cards = useCanvasStore.getState().getCurrentNodes();
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    return {
      ok: false,
      error: {
        success: false,
        error: 'card_not_found',
        cardId,
        suggestion: 'call spellpaw_get_canvas first to get valid card ids',
        summary: `未找到卡片 ${cardId}`,
      },
    };
  }
  return { ok: true, card };
}

import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNode, CanvasNodeType } from '@drama/types';
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

/**
 * Validate a card payload before insertion.
 *
 * Canvas era (Phase 4): card data is loose Record<string, unknown> with
 * an index signature on CanvasNodeData, so heavy validation is no longer
 * needed. This stub returns `valid: true` and preserves the call site used
 * by addEnrichedCard. Stricter per-card-type checks can be layered in here
 * when needed without changing callers.
 */
export function validateCanvasCardPayload(payload: {
  cardType: CanvasNodeType;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}): { valid: true } | { valid: false; error: string } {
  if (!payload.cardType) {
    return { valid: false, error: 'cardType is required' };
  }
  if (!payload.data || typeof payload.data !== 'object') {
    return { valid: false, error: 'data must be an object' };
  }
  const VALID_TYPES: readonly CanvasNodeType[] = [
    'storyline',
    'moodboard',
    'videoClip',
    'asset',
    'task',
    'art',
    'character',
    // Legacy types still accepted during migration:
    'script',
    'deliverable',
    'sceneCard',
  ];
  if (!VALID_TYPES.includes(payload.cardType)) {
    return { valid: false, error: `unsupported cardType: ${payload.cardType}` };
  }
  return { valid: true };
}

/**
 * Normalize a card payload for storage.
 *
 * Canvas era: pass-through with type coercion. Card data is loose
 * Record<string, unknown> and typed per CanvasNodeType downstream, so
 * we don't strip/transform fields here. Reserved for future migrations.
 */
export function normalizeCardData(
  _cardType: CanvasNodeType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  return { ...data };
}

/**
 * Cards domain — tools that operate on canvas cards.
 *
 * Exports:
 *   - cardHandlers: ToolRouter map for canvas card tools (7 typed add + 3 batch + CRUD)
 *   - addEnrichedCard: shared helper used by analysis.kickstart_project
 */
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { logger } from '@shared/lib/logger';
import { generateId } from '@/shared/lib/utils';
import { normalizeCardData, validateCanvasCardPayload, validateCanvasCardUpdateData } from '@drama/lib/canvasCardSchema';
import { findCardOrError } from '@drama/lib/cardValidation';
import { formatResult } from '@drama/lib/toolResultFormat';
import type { CanvasNodeType, CanvasNode } from '@drama/types';
import type { ToolRouter, ToolResult } from './types';

// ── Internal: add a raw canvas card ──

async function addRawCard(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
): Promise<CanvasNode> {
  const id = generateId('canvas_');
  const card: CanvasNode = {
    id,
    type: cardType,
    position: { x: 0, y: 0 },
    data: {
      title: (data.title as string) || '新卡片',
      description: (data.description as string) || '',
      status: ((data.status as string) || 'draft') as CanvasNode['data']['status'],
      tags: [],
      colors: [],
      ...data,
    } as CanvasNode['data'],
  };
  useCanvasStore.getState().addNode(card);
  return card;
}

// ── Internal: typed add factory with validation ──

async function addTypedCard(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
  position?: { x: number; y: number },
): Promise<ToolResult> {
  const validation = validateCanvasCardPayload({ cardType, data, position });
  if (!validation.valid) {
    return {
      success: false,
      error: 'validation_failed',
      suggestion: validation.error ?? '',
      summary: `参数错误: ${validation.error}`,
    };
  }
  const normalized = normalizeCardData(cardType, data) as Record<string, unknown>;
  const card = await addRawCard(cardType, normalized);

  // Apply explicit position if given
  if (position) {
    useCanvasStore.setState((state) => {
      const pid = useProjectStore.getState().currentProjectId;
      if (!pid) return state;
      const entry = state.canvases[pid];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [pid]: {
            ...entry,
            nodes: entry.nodes.map((n) =>
              n.id === card.id ? { ...n, position } : n,
            ),
          },
        },
      };
    });
  }

  return {
    success: true,
    affectedCardIds: [card.id],
    summary: `已添加 ${cardType} 卡片「${card.data.title}」`,
  };
}

// ── Shared helper: add enriched card (used by applyTemplateToCanvas + skills) ──

export async function addEnrichedCard(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
  position?: { x: number; y: number },
): Promise<CanvasNode> {
  const validation = validateCanvasCardPayload({ cardType, data, position });
  if (!validation.valid) {
    throw new Error(`卡片参数错误: ${validation.error}`);
  }
  const normalized = normalizeCardData(cardType, data) as Record<string, unknown>;
  const card = await addRawCard(cardType, normalized);
  if (position) {
    useCanvasStore.setState((state) => {
      const pid = useProjectStore.getState().currentProjectId;
      if (!pid) return state;
      const entry = state.canvases[pid];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [pid]: {
            ...entry,
            nodes: entry.nodes.map((n) =>
              n.id === card.id ? { ...n, position } : n,
            ),
          },
        },
      };
    });
  }
  return card;
}

// ── cardHandlers ──

const CARD_TYPE_ICONS: Record<string, string> = {
  storyline: '📖', moodboard: '🎨', videoClip: '🎬',
  asset: '📦', task: '📋', art: '🖼️', character: '👤',
  script: '📝', deliverable: '📦', sceneCard: '🎬',
};

export const cardHandlers: ToolRouter = {
  /** Enumerate all canvas cards as indented text for Copilot context */
  get_canvas: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    if (cards.length === 0) return formatResult({ success: true, affectedCardIds: [], summary: '(画布为空)' });
    const lines: string[] = [`画布共 ${cards.length} 张卡片：`];
    for (const c of cards) {
      const typeIcon = CARD_TYPE_ICONS[c.type] ?? '📄';
      const statusMark = c.data.status === 'done' ? '✅' : c.data.status === 'in_progress' ? '🔄' : '';
      lines.push(`  ${typeIcon} ${c.type}「${c.data.title}」${statusMark} (${c.id})`);
      if (c.data.description) lines.push(`    描述：${c.data.description.slice(0, 80)}`);
      if (c.data.children?.length) {
        for (const ch of c.data.children) {
          lines.push(`    └─ ${ch.type}「${ch.title}」`);
        }
      }
      if (c.data.linkedCardIds?.length) {
        lines.push(`    关联：${c.data.linkedCardIds.join(', ')}`);
      }
    }
    return lines.join('\n');
  },

  // ── 7 typed add handlers ──

  add_storyline_card: async (params) => formatResult(await addTypedCard('storyline', params)),
  add_moodboard_card: async (params) => formatResult(await addTypedCard('moodboard', params)),
  add_video_clip_card: async (params) => formatResult(await addTypedCard('videoClip', params)),
  add_asset_card: async (params) => formatResult(await addTypedCard('asset', params)),
  add_task_card: async (params) => formatResult(await addTypedCard('task', params)),
  add_art_card: async (params) => formatResult(await addTypedCard('art', params)),
  add_character_card: async (params) => formatResult(await addTypedCard('character', params)),

  // ── Alias: legacy add_card routes to typed handlers ──

  add_card: async (params) => {
    const type = (params.type as string) || 'storyline';
    const cardType = (
      ['storyline', 'moodboard', 'videoClip', 'asset', 'task', 'art', 'character'] as const
    ).includes(type as never)
      ? (type as CanvasNodeType)
      : 'storyline';

    // Auto-position: stack below existing cards
    const existing = useCanvasStore.getState().getCurrentNodes();
    const lastY = existing.length > 0
      ? Math.max(...existing.map((n) => n.position.y)) + 220
      : 50;
    const pos = { x: 50 + (existing.length % 3) * 400, y: lastY };

    return formatResult(await addTypedCard(cardType, { ...params, type: cardType }, pos));
  },

  /** Update a card's data — validated with cardId check */
  update_card: async (params) => {
    const cardId = params.cardId as string;
    const check = findCardOrError(cardId);
    if (!check.ok) return formatResult(check.error);

    const updates = (params.updates || params.data || {}) as Record<string, unknown>;
    useCanvasStore.getState().updateNodeData(
      cardId,
      updates as Partial<import('@drama/types').CanvasNodeData>,
    );
    return formatResult({ success: true, affectedCardIds: [cardId], summary: `已更新卡片 ${cardId}` });
  },

  /** Delete a card — validated with cardId check */
  delete_card: async (params) => {
    const cardId = params.cardId as string;
    const check = findCardOrError(cardId);
    if (!check.ok) return formatResult(check.error);

    useCanvasStore.getState().removeNode(cardId);
    return formatResult({ success: true, affectedCardIds: [cardId], summary: `已删除卡片「${check.card.data.title ?? cardId}」` });
  },

  // ── 3 batch handlers ──

  batch_update_cards: async (params) => {
    const updates = (params.updates ?? []) as Array<{ cardId: string; data: Record<string, unknown> }>;
    const affected: string[] = [];
    const errors: Array<{ cardId: string; error: string }> = [];
    for (const u of updates) {
      const check = findCardOrError(u.cardId);
      if (!check.ok) {
        errors.push({ cardId: u.cardId, error: check.error.error || 'card_not_found' });
        continue;
      }
      useCanvasStore.getState().updateNodeData(
        u.cardId,
        u.data as Partial<import('@drama/types').CanvasNodeData>,
      );
      affected.push(u.cardId);
    }
    return formatResult({
      success: errors.length === 0,
      affectedCardIds: affected,
      errors: errors.length > 0 ? errors : undefined,
      summary: `更新 ${affected.length} 张${errors.length > 0 ? `，${errors.length} 张失败` : ''}`,
    });
  },

  batch_delete_cards: async (params) => {
    const cardIds = (params.cardIds ?? []) as string[];
    const allCards = useCanvasStore.getState().getCurrentNodes();
    const missing = cardIds.filter((id) => !allCards.find((c) => c.id === id));
    if (missing.length > 0) {
      return formatResult({
        success: false,
        error: 'card_not_found',
        suggestion: `missing cards: ${missing.join(', ')}`,
        summary: `以下卡片不存在: ${missing.join(', ')}`,
      });
    }
    // Atomic: single setState remove all
    const idSet = new Set(cardIds);
    useCanvasStore.setState((state) => {
      const pid = useProjectStore.getState().currentProjectId;
      if (!pid) return state;
      const entry = state.canvases[pid];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [pid]: {
            ...entry,
            nodes: entry.nodes.filter((n) => !idSet.has(n.id)),
            edges: entry.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
          },
        },
        ...(state.selectedCardId && idSet.has(state.selectedCardId) ? { selectedCardId: null } : {}),
      };
    });
    try {
      const { triggerPushNow } = await import('@drama/lib/syncEngine');
      await triggerPushNow();
    } catch (err) {
      logger.warn('[batch_delete_cards] force push failed:', err);
    }
    return formatResult({ success: true, affectedCardIds: cardIds, summary: `已批量删除 ${cardIds.length} 张卡片` });
  },

  batch_add_cards: async (params) => {
    const cards = (params.cards ?? []) as Array<{ cardType: CanvasNodeType; data: Record<string, unknown> }>;
    const affected: string[] = [];
    for (let i = 0; i < cards.length; i++) {
      const pos = { x: 50 + (i % 3) * 400, y: 100 + Math.floor(i / 3) * 280 };
      const result = await addTypedCard(cards[i].cardType, cards[i].data, pos);
      if (result.affectedCardIds) affected.push(...result.affectedCardIds);
    }
    return formatResult({ success: true, affectedCardIds: affected, summary: `已批量添加 ${cards.length} 张卡片` });
  },

  /**
   * Atomically clear canvas cards for the current project. Use this for
   * "delete all" / "清空画布" requests — it bypasses the iteration-deletion
   * race (refresh during debounced push can revert state from server) by
   * removing nodes in a single store update and triggering an immediate
   * force push.
   */
  clear_canvas: async (params) => {
    const filter = (params.filter as Record<string, unknown> | undefined) ?? {};
    const cardType = filter.type as CanvasNodeType | undefined;
    const status = filter.status as string | undefined;
    const titleContains = filter.titleContains as string | undefined;

    const allNodes = useCanvasStore.getState().getCurrentNodes();
    const matched = allNodes.filter((n) => {
      if (cardType && n.type !== cardType) return false;
      if (status && (n.data as { status?: string }).status !== status) return false;
      if (titleContains && !((n.data as { title?: string }).title ?? '').includes(titleContains)) return false;
      return true;
    });

    if (matched.length === 0) {
      return formatResult({ success: true, affectedCardIds: [], summary: '画布已为空，无需清理。' });
    }

    const idsToRemove = new Set(matched.map((n) => n.id));
    useCanvasStore.setState((state) => {
      const projectId = useProjectStore.getState().currentProjectId;
      if (!projectId) return state;
      const entry = state.canvases[projectId];
      if (!entry) return state;
      return {
        canvases: {
          ...state.canvases,
          [projectId]: {
            ...entry,
            nodes: entry.nodes.filter((n) => !idsToRemove.has(n.id)),
            edges: entry.edges.filter(
              (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
            ),
          },
        },
        ...(state.selectedCardId && idsToRemove.has(state.selectedCardId)
          ? { selectedCardId: null }
          : {}),
      };
    });

    try {
      const { triggerPushNow } = await import('@drama/lib/syncEngine');
      await triggerPushNow();
    } catch (err) {
      logger.warn('[clear_canvas] force push failed:', err);
    }

    const scope = cardType ?? status ?? titleContains ? '（按条件）' : '';
    return formatResult({ success: true, affectedCardIds: matched.map((m) => m.id), summary: `已清空画布${scope}：共删除 ${matched.length} 张卡片。` });
  },
};

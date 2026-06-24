/**
 * Cards domain — tools that operate on canvas cards.
 *
 * Exports:
 *   - cardHandlers: ToolRouter map for the 5 canvas card tools
 *   - addEnrichedCard: shared helper used by analysis.kickstart_project AND
 *     built-in skills (skills/builtIn.ts). NOT exposed as a tool handler —
 *     it lives here as an internal API.
 */
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { logger } from '@shared/lib/logger';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { findNode } from '@drama/lib/treeUtils';
import { normalizeCardData, validateCanvasCardPayload, validateCanvasCardUpdateData } from '@drama/lib/canvasCardSchema';
import type { CanvasNodeType, CanvasNode, TreeNode } from '@drama/types';
import type { ToolRouter } from './types';

// ── Internal: enrich raw card data with metadata from linked tree node ──

function buildScenePrompt(title: string, meta: Record<string, unknown>): string {
  const parts: string[] = [title];
  if (meta.location) parts.push(`Location: ${meta.location}`);
  if (meta.timeOfDay) parts.push(`Time: ${meta.timeOfDay}`);
  if (meta.shotType) parts.push(`Shot: ${meta.shotType}`);
  if (meta.description) parts.push(String(meta.description));
  return parts.join('. ');
}

function enrichCardDataFromTreeNode(
  cardType: CanvasNodeType,
  rawData: Record<string, unknown>,
): Record<string, unknown> {
  const linkedId = rawData.linkedTreeNodeId;
  if (typeof linkedId !== 'string') return rawData;

  const tree = useProjectStore.getState().getCurrentTree();
  if (!tree) return rawData;

  const node = findNode(tree, linkedId);
  if (!node) return rawData;

  const meta = (node.metadata ?? {}) as NonNullable<TreeNode['metadata']>;
  const enriched: Record<string, unknown> = { ...rawData };

  if (cardType === 'script') {
    if (enriched.duration === undefined && typeof meta.duration === 'number') {
      enriched.duration = meta.duration;
    }
    if (enriched.location === undefined && typeof meta.location === 'string') {
      enriched.location = meta.location;
    }
    if (enriched.timeOfDay === undefined && typeof meta.timeOfDay === 'string') {
      enriched.timeOfDay = meta.timeOfDay;
    }
    if (enriched.shotType === undefined && typeof meta.shotType === 'string') {
      enriched.shotType = meta.shotType;
    }
    if (enriched.cameraMovement === undefined && typeof meta.cameraMovement === 'string') {
      enriched.cameraMovement = meta.cameraMovement;
    }
    if (enriched.dialogue === undefined && typeof meta.dialogue === 'string') {
      enriched.dialogue = meta.dialogue;
    }
    if (enriched.notes === undefined && typeof meta.notes === 'string') {
      enriched.notes = meta.notes;
    }
  } else if (cardType === 'sceneCard' || cardType === 'art') {
    const tags: string[] = Array.isArray(enriched.tags)
      ? enriched.tags.filter((t): t is string => typeof t === 'string')
      : [];
    if (meta.location && typeof meta.location === 'string' && !tags.includes(meta.location)) {
      tags.push(meta.location);
    }
    if (meta.timeOfDay && typeof meta.timeOfDay === 'string' && !tags.includes(meta.timeOfDay)) {
      tags.push(meta.timeOfDay);
    }
    if (meta.shotType && typeof meta.shotType === 'string' && !tags.includes(meta.shotType)) {
      tags.push(meta.shotType);
    }
    if (tags.length > 0) enriched.tags = tags;

    if (enriched.generatedPrompt === undefined && enriched.prompt === undefined) {
      enriched.generatedPrompt = buildScenePrompt(node.title, meta);
    }
  }

  return enriched;
}

// ── Shared helpers: programmatic card CRUD with validation ──
//
// The programmatic counterpart to add_card / update_card / delete_card.
// All three validate their input (matching the previous
// add_canvas_card / update_canvas_card / delete_canvas_card alias behavior)
// so callers like kickstart_project and built-in skills can't silently
// produce bad data.
//
// NOT tool handlers — callers import these directly. The LLM-facing surface
// stays simpler (no validation) because the LLM only sees schema-validated
// tool configs.

export async function addEnrichedCard(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
  position?: { x: number; y: number },
): Promise<CanvasNode> {
  const validation = validateCanvasCardPayload({ cardType, data, position });
  if (!validation.valid) {
    throw new Error(`画布卡片参数错误: ${validation.error}`);
  }
  const enrichedData = enrichCardDataFromTreeNode(cardType, data);
  const normalizedData = normalizeCardData(cardType, enrichedData);
  const card = await addCanvasCardHandler(
    cardType,
    normalizedData as Record<string, unknown>,
    { position },
  );
  return card;
}

export async function updateEnrichedCard(
  cardId: string,
  data: Record<string, unknown>,
): Promise<CanvasNode> {
  const canvasStore = useCanvasStore.getState();
  const existing = canvasStore.getCurrentNodes().find((n) => n.id === cardId);
  if (!existing) {
    throw new Error(`未找到画布卡片: ${cardId}`);
  }
  const validation = validateCanvasCardUpdateData(existing.type, data);
  if (!validation.valid) {
    throw new Error(`画布卡片更新参数错误: ${validation.error}`);
  }
  // normalizeCardUpdateData only merges known fields; fallback to data as-is
  canvasStore.updateNodeData(cardId, data as Partial<CanvasNode['data']>);
  return existing;
}

export async function removeEnrichedCard(cardId: string): Promise<string> {
  const canvasStore = useCanvasStore.getState();
  const existing = canvasStore.getCurrentNodes().find((n) => n.id === cardId);
  if (!existing) {
    throw new Error(`未找到画布卡片: ${cardId}`);
  }
  canvasStore.removeNode(cardId);
  return existing.data.title ?? cardId;
}

// ── cardHandlers: the 5 canvas card tool handlers ──

const CARD_TYPE_ICONS: Record<string, string> = {
  storyline: '📖',
  moodboard: '🎨',
  videoClip: '🎬',
  asset: '📦',
  task: '📋',
  art: '🖼️',
  character: '👤',
  script: '📝',
  deliverable: '📦',
  sceneCard: '🎬',
  copilotCard: '🤖',
};

export const cardHandlers: ToolRouter = {
  /** Enumerate all canvas cards as indented text for Copilot context */
  get_canvas: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    if (cards.length === 0) return '(画布为空)';
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

  /** Add a new card to the canvas */
  add_card: async (params) => {
    const type = (params.type as string) || 'storyline';
    const title = (params.title as string) || '新卡片';
    const description = params.description as string | undefined;
    const cardType = (['storyline', 'moodboard', 'videoClip', 'asset', 'task', 'art', 'character'] as const).includes(type as never)
      ? (type as CanvasNodeType)
      : 'storyline';

    // Auto-position: stack below existing cards with some offset
    const existing = useCanvasStore.getState().getCurrentNodes();
    const lastY = existing.length > 0
      ? Math.max(...existing.map((n) => n.position.y)) + 220
      : 50;

    const card = await addCanvasCardHandler(cardType, {
      title,
      description,
      status: 'draft',
    });

    // Override position (addCanvasCardHandler places at origin)
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
              n.id === card.id
                ? { ...n, position: { x: 50 + (existing.length % 3) * 400, y: lastY } }
                : n
            ),
          },
        },
      };
    });

    return `已添加 ${cardType}「${title}」(id: ${card.id})`;
  },

  /** Update a card's data or children */
  update_card: async (params) => {
    const cardId = params.cardId as string;
    const updates = (params.updates || params.data || {}) as Record<string, unknown>;
    useCanvasStore.getState().updateNodeData(
      cardId,
      updates as Partial<import('@drama/types').CanvasNodeData>,
    );
    return `已更新卡片 ${cardId}`;
  },

  /** Delete a card from canvas */
  delete_card: async (params) => {
    const cardId = params.cardId as string;
    const nodes = useCanvasStore.getState().getCurrentNodes();
    const card = nodes.find((n) => n.id === cardId);
    useCanvasStore.getState().removeNode(cardId);
    return `已删除卡片「${card?.data.title ?? cardId}」`;
  },

  /**
   * Atomically clear canvas cards for the current project. Use this for
   * "delete all" / "清空画布" requests — it bypasses the iteration-deletion
   * race (refresh during debounced push can revert state from server) by
   * removing nodes in a single store update and triggering an immediate
   * force push.
   *
   * Optional `filter`: { type?, status?, titleContains? } to remove only
   * matching cards. Omit filter to remove everything.
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
      return '画布已为空，无需清理。';
    }

    // Remove in a single store update so subscribers see one atomic change.
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

    // Force-push to server immediately so a subsequent refresh doesn't
    // restore the cards from the previous server state.
    try {
      const { triggerPushNow } = await import('@drama/lib/syncEngine');
      await triggerPushNow();
    } catch (err) {
      // Even if the push fails, the local state is already cleared.
      logger.warn('[clear_canvas] force push failed:', err);
    }

    const scope = cardType ?? status ?? titleContains ? '（按条件）' : '';
    return `已清空画布${scope}：共删除 ${matched.length} 张卡片。`;
  },
};

// Keep this helper export so future Day-2 refactors can swap in.
export { enrichCardDataFromTreeNode };
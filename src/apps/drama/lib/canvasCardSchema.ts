/**
 * Canvas card LLM payload schema & validation
 *
 * Defines the structured format LLM must output for spellpaw_add_canvas_card.
 * Keeps the spec close to existing CanvasNode / CanvasNodeData types.
 */
import type { CanvasNodeType, CanvasNodeData } from '@drama/types';
import { useProjectStore } from '@drama/stores/projectStore';

export interface CanvasCardPayload {
  cardType: CanvasNodeType;
  data: CanvasNodeData;
  position?: { x: number; y: number };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_CARD_TYPES: CanvasNodeType[] = ['script', 'art', 'character', 'deliverable', 'sceneCard'];
const VALID_STATUSES = ['draft', 'in_progress', 'review', 'done'];
const VALID_DELIVERABLE_TYPES = ['image', 'video', 'audio'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePosition(position: unknown): string | undefined {
  if (!isPlainObject(position)) return 'position 必须是对象';
  if (typeof position.x !== 'number') return 'position.x 必须是数字';
  if (typeof position.y !== 'number') return 'position.y 必须是数字';
}

function validateLinkedTreeNodeId(nodeId: string | undefined): string | undefined {
  if (nodeId === undefined) return;
  const tree = useProjectStore.getState().getCurrentTree();
  if (!tree) return '当前无项目，无法关联树节点';
  // Simple top-level check first
  if (tree.id === nodeId) return;
  const exists = (tree.children ?? []).some((act) =>
    act.id === nodeId ||
    (act.children ?? []).some((scene) =>
      scene.id === nodeId || (scene.children ?? []).some((shot) => shot.id === nodeId)
    )
  );
  if (!exists) return `linkedTreeNodeId 不存在: ${nodeId}`;
}

function validateStatus(status: unknown): string | undefined {
  if (status === undefined) return;
  if (typeof status !== 'string') return 'status 必须是字符串';
  if (!VALID_STATUSES.includes(status)) return `status 无效: ${status}`;
}

function validateTags(tags: unknown): string | undefined {
  if (tags === undefined) return;
  if (!Array.isArray(tags)) return 'tags 必须是数组';
  if (tags.some((t) => typeof t !== 'string')) return 'tags 每项必须是字符串';
}

function validateDeliverableType(type: unknown): string | undefined {
  if (type === undefined) return;
  if (typeof type !== 'string') return 'deliverableType 必须是字符串';
  if (!VALID_DELIVERABLE_TYPES.includes(type)) return `deliverableType 无效: ${type}`;
}

function validateCardTypeData(cardType: CanvasNodeType, data: CanvasNodeData): string | undefined {
  const { status, tags, deliverableType, duration, fileSize } = data;

  const statusErr = validateStatus(status);
  if (statusErr) return statusErr;

  const tagsErr = validateTags(tags);
  if (tagsErr) return tagsErr;

  if (duration !== undefined && typeof duration !== 'number') return 'duration 必须是数字';
  if (fileSize !== undefined && typeof fileSize !== 'number') return 'fileSize 必须是数字';

  if (cardType === 'deliverable') {
    const typeErr = validateDeliverableType(deliverableType);
    if (typeErr) return typeErr;
  }

  return;
}

export function validateCanvasCardPayload(payload: unknown): ValidationResult {
  if (!isPlainObject(payload)) {
    return { valid: false, error: 'payload 必须是对象' };
  }

  const { cardType, data, position } = payload as Record<string, unknown>;

  if (typeof cardType !== 'string' || !VALID_CARD_TYPES.includes(cardType as CanvasNodeType)) {
    return {
      valid: false,
      error: `cardType 无效: ${cardType}。可用: ${VALID_CARD_TYPES.join(', ')}`,
    };
  }

  if (!isPlainObject(data)) {
    return { valid: false, error: 'data 必须是对象' };
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    return { valid: false, error: 'data.title 必须是必填字符串' };
  }

  const typedData = data as CanvasNodeData;

  const typeErr = validateCardTypeData(cardType as CanvasNodeType, typedData);
  if (typeErr) return { valid: false, error: typeErr };

  if (position !== undefined) {
    const posErr = validatePosition(position);
    if (posErr) return { valid: false, error: posErr };
  }

  const linkedId = typedData.linkedTreeNodeId;
  if (linkedId !== undefined) {
    if (typeof linkedId !== 'string') {
      return { valid: false, error: 'linkedTreeNodeId 必须是字符串' };
    }
    const treeErr = validateLinkedTreeNodeId(linkedId);
    if (treeErr) return { valid: false, error: treeErr };
  }

  return { valid: true };
}

/**
 * Validate a partial update of a canvas card.
 * Same rules as validateCanvasCardPayload, but title is optional.
 */
export function validateCanvasCardUpdateData(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
): ValidationResult {
  if (!isPlainObject(data)) {
    return { valid: false, error: 'data 必须是对象' };
  }

  const typedData = data as CanvasNodeData;

  if (typedData.title !== undefined) {
    if (typeof typedData.title !== 'string' || typedData.title.trim() === '') {
      return { valid: false, error: 'data.title 必须是必填字符串' };
    }
  }

  const typeErr = validateCardTypeData(cardType, typedData);
  if (typeErr) return { valid: false, error: typeErr };

  const linkedId = typedData.linkedTreeNodeId;
  if (linkedId !== undefined) {
    if (typeof linkedId !== 'string') {
      return { valid: false, error: 'linkedTreeNodeId 必须是字符串' };
    }
    const treeErr = validateLinkedTreeNodeId(linkedId);
    if (treeErr) return { valid: false, error: treeErr };
  }

  return { valid: true };
}

/**
 * Build a normalized CanvasNodeData object from validated payload data.
 * Drops unknown fields to keep store data clean.
 */
export function normalizeCardData(
  cardType: CanvasNodeType,
  raw: Record<string, unknown>,
): CanvasNodeData {
  const common: CanvasNodeData = {
    title: (raw.title as string) ?? '未命名',
  };

  if (typeof raw.description === 'string') common.description = raw.description;
  if (typeof raw.status === 'string') common.status = raw.status as CanvasNodeData['status'];
  if (Array.isArray(raw.tags)) common.tags = raw.tags.filter((t): t is string => typeof t === 'string');
  if (typeof raw.linkedTreeNodeId === 'string') common.linkedTreeNodeId = raw.linkedTreeNodeId;

  switch (cardType) {
    case 'script': {
      const data = { ...common };
      if (typeof raw.dialogue === 'string') data.dialogue = raw.dialogue;
      if (typeof raw.notes === 'string') data.notes = raw.notes;
      if (typeof raw.duration === 'number') data.duration = raw.duration;
      return data;
    }
    case 'art': {
      const data = { ...common };
      if (typeof raw.thumbnail === 'string') data.thumbnail = raw.thumbnail;
      if (typeof raw.generatedPrompt === 'string') data.generatedPrompt = raw.generatedPrompt;
      if (typeof raw.prompt === 'string') data.generatedPrompt = raw.prompt;
      return data;
    }
    case 'sceneCard': {
      const data = { ...common };
      if (typeof raw.thumbnail === 'string') data.thumbnail = raw.thumbnail;
      if (typeof raw.generatedPrompt === 'string') data.generatedPrompt = raw.generatedPrompt;
      if (typeof raw.prompt === 'string') data.generatedPrompt = raw.prompt;
      return data;
    }
    case 'character': {
      return { ...common };
    }
    case 'deliverable': {
      const data = { ...common };
      if (typeof raw.deliverableType === 'string') data.deliverableType = raw.deliverableType as CanvasNodeData['deliverableType'];
      if (typeof raw.duration === 'number') data.duration = raw.duration;
      if (typeof raw.fileSize === 'number') data.fileSize = raw.fileSize;
      if (typeof raw.resolution === 'string') data.resolution = raw.resolution;
      return data;
    }
    default:
      return common;
  }
}

/**
 * Build a normalized partial CanvasNodeData object from an update payload.
 * Only includes fields present in `raw`, so it can safely merge with existing data.
 */
export function normalizeCardUpdateData(
  cardType: CanvasNodeType,
  raw: Record<string, unknown>,
): Partial<CanvasNodeData> {
  const common: Partial<CanvasNodeData> = {};

  if (typeof raw.title === 'string') common.title = raw.title;
  if (typeof raw.description === 'string') common.description = raw.description;
  if (typeof raw.status === 'string') common.status = raw.status as CanvasNodeData['status'];
  if (Array.isArray(raw.tags)) {
    common.tags = raw.tags.filter((t): t is string => typeof t === 'string');
  }
  if (typeof raw.linkedTreeNodeId === 'string') common.linkedTreeNodeId = raw.linkedTreeNodeId;

  switch (cardType) {
    case 'script': {
      const data: Partial<CanvasNodeData> = { ...common };
      if (typeof raw.dialogue === 'string') data.dialogue = raw.dialogue;
      if (typeof raw.notes === 'string') data.notes = raw.notes;
      if (typeof raw.duration === 'number') data.duration = raw.duration;
      return data;
    }
    case 'art':
    case 'sceneCard': {
      const data: Partial<CanvasNodeData> = { ...common };
      if (typeof raw.thumbnail === 'string') data.thumbnail = raw.thumbnail;
      if (typeof raw.generatedPrompt === 'string') data.generatedPrompt = raw.generatedPrompt;
      if (typeof raw.prompt === 'string') data.generatedPrompt = raw.prompt;
      return data;
    }
    case 'character': {
      return common;
    }
    case 'deliverable': {
      const data: Partial<CanvasNodeData> = { ...common };
      if (typeof raw.deliverableType === 'string') {
        data.deliverableType = raw.deliverableType as CanvasNodeData['deliverableType'];
      }
      if (typeof raw.duration === 'number') data.duration = raw.duration;
      if (typeof raw.fileSize === 'number') data.fileSize = raw.fileSize;
      if (typeof raw.resolution === 'string') data.resolution = raw.resolution;
      return data;
    }
    default:
      return common;
  }
}

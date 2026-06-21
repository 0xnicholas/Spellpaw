/**
 * Tree → Canvas migration: converts legacy project tree data to canvas cards.
 *
 * Mapping:
 *   project       → storyLineCard (root), position {0, 0}
 *   act           → storyLineCard (act),  positioned in columns
 *   scene         → storyLineCard (scene), positioned in rows within act column
 *   shot          → CardChild (inline child of scene card)
 *
 * Run once at app startup or on demand via settings.
 */
import type { TreeNode, CanvasNode, CardChild } from '@drama/types';
import { generateId } from '@/shared/lib/utils';

const ACT_COLUMN_WIDTH = 420;
const SCENE_ROW_HEIGHT = 220;
const PADDING = 50;

function buildShotChild(shot: TreeNode): CardChild {
  return {
    id: shot.id,
    type: 'shot',
    title: shot.title,
    data: {
      description: shot.metadata?.description ?? '',
      duration: shot.metadata?.duration,
      shotType: shot.metadata?.shotType ?? '',
      cameraMovement: shot.metadata?.cameraMovement ?? '',
      dialogue: shot.metadata?.dialogue ?? '',
      status: shot.status,
    },
  };
}

function buildSceneCard(scene: TreeNode, actIndex: number, sceneIndex: number): CanvasNode {
  const shots: CardChild[] = (scene.children ?? []).map(buildShotChild);

  return {
    id: generateId('canvas_'),
    type: 'storyline',
    position: {
      x: actIndex * ACT_COLUMN_WIDTH + PADDING,
      y: sceneIndex * SCENE_ROW_HEIGHT + PADDING,
    },
    data: {
      title: scene.title,
      description: scene.metadata?.description ?? '',
      status: scene.status,
      location: scene.metadata?.location,
      timeOfDay: scene.metadata?.timeOfDay,
      duration: scene.metadata?.duration,
      shotCount: shots.length,
      children: shots,
      linkedCardIds: [],
    },
  };
}

function buildActCard(act: TreeNode, actIndex: number): CanvasNode {
  const childRows = act.children ?? [];

  return {
    id: generateId('canvas_'),
    type: 'storyline',
    position: {
      x: actIndex * ACT_COLUMN_WIDTH + PADDING,
      y: PADDING - 60, // acts sit above their scene column
    },
    data: {
      title: act.title,
      description: act.metadata?.description ?? '',
      status: act.status,
      sceneCount: childRows.length,
      children: [],
      linkedCardIds: [],
    },
  };
}

export interface MigrationResult {
  nodes: CanvasNode[];
  warnings: string[];
}

/** Convert a legacy project tree to canvas cards. */
export function migrateTreeToCards(tree: TreeNode): MigrationResult {
  const nodes: CanvasNode[] = [];
  const warnings: string[] = [];

  // Root project card — always at origin
  nodes.push({
    id: generateId('canvas_'),
    type: 'storyline',
    position: { x: 0, y: 0 },
    data: {
      title: tree.title,
      description: tree.metadata?.description ?? '',
      status: tree.status,
      sceneCount: 0,
      children: [],
      linkedCardIds: [],
    },
  });

  const acts = tree.children ?? [];

  acts.forEach((act, actIndex) => {
    const scenes = act.children ?? [];

    // Act card
    nodes.push(buildActCard(act, actIndex));

    // Scene cards
    scenes.forEach((scene, sceneIndex) => {
      const card = buildSceneCard(scene, actIndex, sceneIndex);
      nodes.push(card);
    });
  });

  return { nodes, warnings };
}

/** Check if the given tree data is in legacy format and needs migration. */
export function isLegacyTree(tree: unknown): tree is TreeNode {
  if (!tree || typeof tree !== 'object') return false;
  const t = tree as Record<string, unknown>;
  return t.type === 'project' && Array.isArray(t.children);
}

/** Migration status key in localStorage */
const MIGRATION_KEY = 'spellpaw_tree_to_cards_migration_v1';

export function hasTreeMigrationRun(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'done';
  } catch {
    return false;
  }
}

export function markTreeMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch {
    // ignore
  }
}

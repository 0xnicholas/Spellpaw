/**
 * Auto-layout algorithm for mapping tree structure to canvas nodes.
 *
 * Layout strategy:
 * - Each act gets a column, arranged horizontally
 * - Scenes within an act are stacked vertically
 * - Existing non-scene cards (assets) are preserved
 */
import type { TreeNode, CanvasNode, CanvasEdge } from '@drama/types';

const ACT_COLUMN_WIDTH = 420;
const SCENE_ROW_HEIGHT = 220;
const PADDING_X = 50;
const PADDING_Y = 20;

export interface LayoutResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function findActIndex(root: TreeNode, sceneId: string): number {
  const acts = root.children ?? [];
  for (let i = 0; i < acts.length; i++) {
    if (acts[i].children?.some((s) => s.id === sceneId)) return i;
  }
  return 0;
}

function findSceneIndex(act: TreeNode, sceneId: string): number {
  return act.children?.findIndex((s) => s.id === sceneId) ?? 0;
}

/** Compute canvas position for a scene node based on its tree position. */
export function computeScenePosition(root: TreeNode, sceneId: string): { x: number; y: number } {
  const actIndex = findActIndex(root, sceneId);
  const acts = root.children ?? [];
  const act = acts[actIndex];
  const sceneIndex = act ? findSceneIndex(act, sceneId) : 0;
  return {
    x: actIndex * ACT_COLUMN_WIDTH + PADDING_X,
    y: sceneIndex * SCENE_ROW_HEIGHT + PADDING_Y,
  };
}

/** Build scene card for a given scene node. */
function buildSceneCard(scene: TreeNode, position: { x: number; y: number }): CanvasNode {
  return {
    id: `canvas_scene_${scene.id}`,
    type: 'sceneCard',
    position,
    data: {
      title: scene.title,
      description: scene.metadata?.description ?? '',
      status: scene.status,
      linkedTreeNodeId: scene.id,
    },
  };
}

/** Generate full layout from project tree. Preserves nothing — returns fresh nodes. */
export function layoutTreeToCanvas(tree: TreeNode): LayoutResult {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  const acts = tree.children ?? [];

  acts.forEach((act, actIndex) => {
    const scenes = act.children ?? [];
    scenes.forEach((scene, sceneIndex) => {
      const pos = {
        x: actIndex * ACT_COLUMN_WIDTH + PADDING_X,
        y: sceneIndex * SCENE_ROW_HEIGHT + PADDING_Y,
      };
      nodes.push(buildSceneCard(scene, pos));

      // Edge between consecutive scenes in the same act
      if (sceneIndex > 0) {
        const prevScene = scenes[sceneIndex - 1];
        edges.push({
          id: `edge_${prevScene.id}_${scene.id}`,
          source: `canvas_scene_${prevScene.id}`,
          target: `canvas_scene_${scene.id}`,
          animated: true,
        });
      }
    });
  });

  return { nodes, edges };
}

/** Diff two trees to find added/removed scene nodes. */
export function diffScenes(
  oldTree: TreeNode | null,
  newTree: TreeNode | null,
): { added: TreeNode[]; removed: string[] } {
  const oldSceneIds = new Set<string>();
  const newSceneIds = new Set<string>();

  function collectScenes(root: TreeNode, target: Set<string>) {
    root.children?.forEach((act) => {
      act.children?.forEach((scene) => {
        if (scene.type === 'scene') target.add(scene.id);
      });
    });
  }

  if (oldTree) collectScenes(oldTree, oldSceneIds);
  if (newTree) collectScenes(newTree, newSceneIds);

  const added: TreeNode[] = [];
  if (newTree) {
    newTree.children?.forEach((act) => {
      act.children?.forEach((scene) => {
        if (scene.type === 'scene' && !oldSceneIds.has(scene.id)) {
          added.push(scene);
        }
      });
    });
  }

  const removed = Array.from(oldSceneIds).filter((id) => !newSceneIds.has(id));

  return { added, removed };
}

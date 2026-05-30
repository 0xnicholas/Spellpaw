import type { TreeNode, Project, NarrativeTemplate, TemplateAct, TemplateScene } from '@/types';

const TEMPLATE_SCHEMA_VERSION = 1;

export function treeToTemplate(tree: TreeNode, project: Project): NarrativeTemplate {
  const acts: TemplateAct[] = [];
  let targetDuration = 0;

  function treeNodeToTemplateScene(node: TreeNode): TemplateScene {
    const duration = node.metadata?.duration ?? 0;
    targetDuration += duration;

    const suggestedShotTypes = node.metadata?.shotType ? [node.metadata.shotType] : undefined;
    const suggestedCameraMovement = node.metadata?.cameraMovement;

    const metadata: Partial<TreeNode['metadata']> = {};
    if (node.metadata?.duration !== undefined) metadata.duration = node.metadata.duration;
    if (node.metadata?.location !== undefined) metadata.location = node.metadata.location;
    if (node.metadata?.timeOfDay !== undefined) metadata.timeOfDay = node.metadata.timeOfDay;
    if (node.metadata?.notes !== undefined) metadata.notes = node.metadata.notes;

    const scene: TemplateScene = {
      title: node.title,
      description: node.metadata?.description ?? '',
      suggestedShotTypes,
      suggestedCameraMovement,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    if (node.children && node.children.length > 0) {
      scene.children = node.children.map((child) => treeNodeToTemplateScene(child));
    }

    return scene;
  }

  if (tree.children) {
    for (const actNode of tree.children) {
      if (actNode.type !== 'act') continue;

      const scenes: TemplateScene[] = [];
      if (actNode.children) {
        for (const sceneNode of actNode.children) {
          if (sceneNode.type !== 'scene' && sceneNode.type !== 'shot') continue;
          scenes.push(treeNodeToTemplateScene(sceneNode));
        }
      }

      acts.push({
        title: actNode.title,
        description: actNode.metadata?.description ?? '',
        scenes,
      });
    }
  }

  // Derive tags from project title + description heuristics
  const tags = deriveTags(project.title, project.description);

  return {
    id: `custom-${crypto.randomUUID()}`,
    name: tree.title || project.title,
    category: 'custom',
    description: tree.metadata?.description || project.description || '',
    targetDuration,
    targetPlatform: 'portrait',
    structure: { acts },
    stylePresets: {
      colorPalette: [project.coverColor || '#6366f1'],
      pacing: 'moderate',
      visualStyle: '',
    },
    tags,
    author: 'User',
    downloads: 0,
    version: TEMPLATE_SCHEMA_VERSION,
  };
}

function deriveTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tagMap: Record<string, string[]> = {
    suspense: ['悬疑', '反转', '惊悚', 'suspense', 'thriller', 'mystery'],
    romance: ['爱情', '甜宠', 'romance', 'love'],
    comedy: ['喜剧', '搞笑', 'comedy', 'funny'],
    drama: ['励志', 'drama', 'inspirational'],
    action: ['动作', 'action', 'fight'],
    documentary: ['纪录', 'documentary', 'real'],
  };

  const matched: string[] = [];
  for (const [category, keywords] of Object.entries(tagMap)) {
    if (keywords.some((k) => text.includes(k))) {
      matched.push(category);
    }
  }
  return matched.length > 0 ? matched : ['custom'];
}

export function validateTemplate(data: unknown): NarrativeTemplate {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Template data must be an object');
  }

  const t = data as Record<string, unknown>;

  if (!t.id || typeof t.id !== 'string') {
    throw new Error('Missing or invalid field: id');
  }
  if (!t.name || typeof t.name !== 'string') {
    throw new Error('Missing or invalid field: name');
  }
  if (!t.category || typeof t.category !== 'string') {
    throw new Error('Missing or invalid field: category');
  }
  if (!t.structure || typeof t.structure !== 'object' || t.structure === null) {
    throw new Error('Missing or invalid field: structure');
  }

  const structure = t.structure as Record<string, unknown>;
  if (!Array.isArray(structure.acts) || structure.acts.length === 0) {
    throw new Error('Missing or invalid field: structure.acts (must be a non-empty array)');
  }

  for (const act of structure.acts as Array<Record<string, unknown>>) {
    if (!act.title || typeof act.title !== 'string') {
      throw new Error('Each act must have a title');
    }
    if (!Array.isArray(act.scenes)) {
      throw new Error(`Act "${act.title}" must have a scenes array`);
    }
  }

  return data as NarrativeTemplate;
}

export function downloadTemplateFile(template: NarrativeTemplate) {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name.replace(/\s+/g, '_').toLowerCase()}.spellpaw-template.json`;
  a.click();
  URL.revokeObjectURL(url);
}

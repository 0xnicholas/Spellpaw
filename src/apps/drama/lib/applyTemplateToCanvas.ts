/**
 * applyTemplateToCanvas — converts a NarrativeTemplate directly into canvas cards.
 *
 * Replaces the deleted applyTemplateCore (which created tree nodes).
 * Generates storyline cards for acts, sceneCard cards for scenes,
 * and CardChild entries for shots within each scene card.
 */
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import { generateId } from '@/shared/lib/utils';
import type { CardChild } from '@drama/types';

interface TemplateAct {
  title: string;
  description?: string;
  scenes: TemplateScene[];
}

interface TemplateScene {
  title: string;
  description?: string;
  suggestedShotTypes?: string[];
  metadata?: Record<string, unknown>;
  children?: TemplateScene[];
}

interface NarrativeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  targetDuration: number;
  targetPlatform: string;
  structure: { acts: TemplateAct[] };
  tags: string[];
  version: string;
}

export async function applyTemplateToCanvas(templateId: string): Promise<string> {
  const templates = useCustomTemplateStore.getState().customTemplates;
  const template = templates.find((t) => t.id === templateId) as NarrativeTemplate | undefined;
  if (!template) {
    return JSON.stringify({
      success: false,
      error: 'validation_failed',
      suggestion: `unknown template: ${templateId}`,
      summary: `模板 ${templateId} 不存在`,
    });
  }

  const affected: string[] = [];

  for (const [actIdx, act] of template.structure.acts.entries()) {
    const actCard = await addEnrichedCard(
      'storyline',
      {
        title: act.title,
        description: act.description,
        status: 'draft',
        metadata: { type: 'act' },
      },
      { x: 50 + actIdx * 420, y: 50 },
    );
    affected.push(actCard.id);

    for (const [sceneIdx, scene] of act.scenes.entries()) {
      const dur = (scene.metadata as { duration?: number } | undefined)?.duration;
      const shotTypes = scene.suggestedShotTypes ?? [];
      const perShotDur =
        dur && shotTypes.length > 0
          ? Math.round((dur / shotTypes.length) * 10) / 10
          : undefined;

      const shotChildren: CardChild[] = shotTypes.map((st, i) => ({
        id: generateId('shot_'),
        type: 'shot',
        title: `${scene.title} 镜头 ${i + 1}`,
        data: { shotType: st, duration: perShotDur },
      }));

      const sceneMeta = { type: 'scene', ...((scene.metadata ?? {}) as Record<string, unknown>) };
      const sceneCard = await addEnrichedCard(
        'sceneCard',
        {
          title: scene.title,
          description: scene.description ?? '',
          location: (scene.metadata as { location?: string } | undefined)?.location,
          timeOfDay: (scene.metadata as { timeOfDay?: string } | undefined)?.timeOfDay,
          duration: dur,
          children: shotChildren,
          metadata: sceneMeta,
        },
        { x: 50 + actIdx * 420, y: 300 + sceneIdx * 280 },
      );
      affected.push(sceneCard.id);

      // Nested sub-scenes: add as additional CardChild entries
      if (scene.children?.length) {
        for (const sub of scene.children) {
          const subShotTypes = sub.suggestedShotTypes ?? [];
          const subShots: CardChild[] = subShotTypes.map((st, i) => ({
            id: generateId('shot_'),
            type: 'shot',
            title: `${sub.title} 镜头 ${i + 1}`,
            data: {
              shotType: st,
              duration: (sub.metadata as { duration?: number } | undefined)?.duration,
            },
          }));
          const currentChildren = sceneCard.data.children ?? [];
          sceneCard.data.children = [
            ...currentChildren,
            {
              id: generateId('subscene_'),
              type: 'scene',
              title: sub.title,
              data: {
                description: sub.description,
                children: subShots,
              },
            },
          ];
        }
      }
    }
  }

  const sceneCount = affected.length - template.structure.acts.length;
  return JSON.stringify({
    success: true,
    affectedCardIds: affected,
    summary: `已应用模板「${template.name}」：${template.structure.acts.length} 幕 ${sceneCount} 场景`,
  });
}

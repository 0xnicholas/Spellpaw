/**
 * applyTemplateToCanvas — converts a NarrativeTemplate directly into canvas cards.
 *
 * Replaces the deleted applyTemplateCore (which created tree nodes).
 * Generates storyline cards for acts, sceneCard cards for scenes,
 * and CardChild entries for shots within each scene card.
 */
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
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

/**
 * In-process cache for builtin templates fetched from /templates/. Keyed by
 * templateId. Avoids refetching the same JSON on every apply call.
 */
const builtinTemplateCache = new Map<string, NarrativeTemplate>();

/**
 * Try to load a builtin template JSON shipped under /public/templates/.
 * Returns null on any failure (404, network error, malformed JSON) so callers
 * can fall through to a friendly "unknown template" error.
 */
async function fetchBuiltinTemplate(templateId: string): Promise<NarrativeTemplate | null> {
  const cached = builtinTemplateCache.get(templateId);
  if (cached) return cached;

  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(`/templates/${templateId}.spellpaw-template.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as NarrativeTemplate;
    if (!json?.id || !json.structure?.acts) return null;
    builtinTemplateCache.set(templateId, json);
    return json;
  } catch {
    return null;
  }
}

export async function applyTemplateToCanvas(templateId: string): Promise<string> {
  // 1. Custom templates win — they're user-curated and may override a builtin.
  const templates = useCustomTemplateStore.getState().templates;
  let template = templates.find((t) => t.id === templateId) as NarrativeTemplate | undefined;

  // 2. Fall back to the builtin JSON shipped under /public/templates/.
  //    Without this, kickstart_project / apply_template would always fail
  //    for any user that hasn't explicitly imported the builtin via the
  //    template browser UI — which is the default state for every project.
  if (!template) {
    template = (await fetchBuiltinTemplate(templateId)) ?? undefined;
  }

  if (!template) {
    return JSON.stringify({
      success: false,
      error: 'validation_failed',
      suggestion: `unknown template: ${templateId}`,
      summary: `模板 ${templateId} 不存在`,
    });
  }

  const affected: string[] = [];
  // Snapshot of existing card titles keyed by type, used for dedup. Re-applying
  // a template should not duplicate scene cards with the same title.
  const existingCards = useCanvasStore.getState().getCurrentNodes();
  const existingTitlesByType = new Map<string, Set<string>>();
  for (const c of existingCards) {
    const set = existingTitlesByType.get(c.type) ?? new Set<string>();
    set.add(c.data.title);
    existingTitlesByType.set(c.type, set);
  }

  for (const [actIdx, act] of template.structure.acts.entries()) {
    const actTitles = existingTitlesByType.get('storyline') ?? new Set<string>();
    if (actTitles.has(act.title)) {
      // Skip duplicate act; reuse existing act card id for the summary.
      const existingAct = existingCards.find(
        (c) => c.type === 'storyline' && c.data.title === act.title,
      );
      if (existingAct) affected.push(existingAct.id);
    } else {
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
      actTitles.add(act.title);
    }

    for (const [sceneIdx, scene] of act.scenes.entries()) {
      const sceneTitles = existingTitlesByType.get('sceneCard') ?? new Set<string>();
      if (sceneTitles.has(scene.title)) {
        // Skip duplicate scene; reuse existing scene card id for the summary.
        const existingScene = existingCards.find(
          (c) => c.type === 'sceneCard' && c.data.title === scene.title,
        );
        if (existingScene) affected.push(existingScene.id);
        continue;
      }

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
      sceneTitles.add(scene.title);

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

  const sceneCount = affected.length - (existingTitlesByType.get('storyline')?.size ?? 0) - template.structure.acts.filter((a) => !(existingTitlesByType.get('storyline') ?? new Set()).has(a.title)).length;
  return JSON.stringify({
    success: true,
    affectedCardIds: affected,
    summary: `已应用模板「${template.name}」：${template.structure.acts.length} 幕 ${sceneCount} 场景`,
  });
}

/**
 * Skill loader — pairs each skill's markdown documentation (source of truth
 * for metadata) with its TS file (provides the `invoke` function).
 *
 * To add a new skill:
 *   1. Create `<id>.md` with YAML frontmatter (id, name, description,
 *      slashCommand, examples, parameters, required) + prose description.
 *   2. Create `<id>.ts` exporting `invoke` matching the `Skill['invoke']`
 *      signature.
 *   3. Add two import lines + one entry to SKILL_MODULES below.
 *
 * The loader runs at module init time and produces a frozen
 * `BUILT_IN_SKILLS` array that `registry.ts` consumes.
 */
import { parseFrontmatter } from '@shared/copilot/skills/frontmatter';
import type { Skill } from '@shared/copilot/skills/types';

// ── Pair imports ────────────────────────────────────────────────
// MD files are imported as raw text (?raw) so the YAML frontmatter
// can be parsed at load time. TS files provide the actual invoke.

import analyzePacingMd from './analyze-pacing.md?raw';
import { invoke as analyzePacingInvoke } from './analyze-pacing';
import duplicateProjectMd from './duplicate-project.md?raw';
import { invoke as duplicateProjectInvoke } from './duplicate-project';
import batchStoryboardMd from './batch-storyboard.md?raw';
import { invoke as batchStoryboardInvoke } from './batch-storyboard';
import characterProfileMd from './character-profile.md?raw';
import { invoke as characterProfileInvoke } from './character-profile';
import brainstormVariantsMd from './brainstorm-variants.md?raw';
import { invoke as brainstormVariantsInvoke } from './brainstorm-variants';
import exportStoryboardPdfMd from './export-storyboard-pdf.md?raw';
import { invoke as exportStoryboardPdfInvoke } from './export-storyboard-pdf';

// ── Module table ────────────────────────────────────────────────

interface SkillModule {
  md: string;
  invoke: Skill['invoke'];
}

const SKILL_MODULES: readonly SkillModule[] = [
  { md: analyzePacingMd, invoke: analyzePacingInvoke },
  { md: duplicateProjectMd, invoke: duplicateProjectInvoke },
  { md: batchStoryboardMd, invoke: batchStoryboardInvoke },
  { md: characterProfileMd, invoke: characterProfileInvoke },
  { md: brainstormVariantsMd, invoke: brainstormVariantsInvoke },
  { md: exportStoryboardPdfMd, invoke: exportStoryboardPdfInvoke },
] as const;

function buildSkill({ md, invoke }: SkillModule): Skill {
  const { meta } = parseFrontmatter(md);
  // Light runtime validation so a malformed MD fails loudly at startup,
  // not at first invocation.
  const required = ['id', 'name', 'description', 'slashCommand'] as const;
  for (const key of required) {
    if (typeof meta[key] !== 'string' || !meta[key]) {
      throw new Error(`Skill frontmatter missing required string field: ${key}`);
    }
  }
  if (typeof meta.examples !== 'object' || !Array.isArray(meta.examples)) {
    throw new Error(`Skill "${meta.id}" frontmatter: "examples" must be an array`);
  }
  if (typeof meta.parameters !== 'object' || meta.parameters === null) {
    throw new Error(`Skill "${meta.id}" frontmatter: "parameters" must be an object`);
  }
  return {
    id: meta.id as string,
    name: meta.name as string,
    description: meta.description as string,
    slashCommand: meta.slashCommand as string,
    examples: meta.examples as string[],
    parameters: {
      type: 'object',
      properties: meta.parameters as Record<string, { type: string; description: string }>,
      required: Array.isArray(meta.required) ? (meta.required as string[]) : [],
    },
    invoke,
  };
}

export const BUILT_IN_SKILLS: readonly Skill[] = Object.freeze(
  SKILL_MODULES.map(buildSkill),
);

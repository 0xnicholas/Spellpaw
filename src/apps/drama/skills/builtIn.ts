/**
 * Compatibility re-export layer.
 *
 * All skill definitions now live as `<id>.md` + `<id>.ts` pairs,
 * loaded by `./loader.ts`. This file re-exports the loader output so
 * legacy imports (`import { BUILT_IN_SKILLS, analyzePacingSkill } from './builtIn'`)
 * continue to work without churn.
 *
 * Preferred new import:
 *   import { BUILT_IN_SKILLS, getSkillById } from '@drama/skills/registry';
 */
export { BUILT_IN_SKILLS } from './loader';
import { BUILT_IN_SKILLS } from './loader';
import type { Skill } from './types';  // drama's typed SkillContext

export const analyzePacingSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'analyze-pacing')!;
export const duplicateProjectSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'duplicate-project')!;
export const batchStoryboardSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'batch-storyboard')!;
export const characterProfileSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'character-profile')!;
export const brainstormVariantsSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'brainstorm-variants')!;
export const exportStoryboardPdfSkill: Skill = BUILT_IN_SKILLS.find((s) => s.id === 'export-storyboard-pdf')!;

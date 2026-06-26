/**
 * Drama-specific Skill types.
 *
 * Skill and SkillResult are re-exported from the shared framework.
 * SkillContext is extended with drama's concrete types (TreeNode, Project)
 * for use by buildDramaSkillContext and tests; invoke functions cast
 * internally via `as TreeNode | null`.
 */
import type { TreeNode, Project } from '@drama/types';
import type {
  SkillContext as SharedSkillContext,
  Skill as SharedSkill,
  SkillResult as SharedSkillResult,
} from '@shared/copilot/skills/types';

export type Skill = SharedSkill;
export type SkillResult = SharedSkillResult;

export type SkillContext = Omit<SharedSkillContext, 'getProjectTree' | 'getCurrentProject'> & {
  getProjectTree: () => TreeNode | null;
  getCurrentProject: () => Project | null;
};

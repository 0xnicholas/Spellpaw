/**
 * Invoke for `export-storyboard-pdf`.
 * Pair file: ./export-storyboard-pdf.md (YAML frontmatter is the source of truth).
 */
import { exportStoryboardPDF } from '@drama/lib/exportPDF';
import type { Skill, SkillResult } from './types';

export const invoke: Skill['invoke'] = async (_args, ctx): Promise<SkillResult> => {
  const project = ctx.getCurrentProject();
  const cards = ctx.getCurrentCanvasNodes();
  if (!project) {
    return { summary: '当前没有打开的项目，无法导出 PDF。' };
  }
  if (cards.length === 0) {
    return { summary: `项目「${project.title}」无内容，无法导出 PDF。` };
  }
  exportStoryboardPDF(project, cards);
  return {
    summary: `已导出「${project.title}」的分镜 PDF（幕/场景/镜头表格 + 状态 + 时长）。请检查浏览器下载。`,
    needsLlmFollowup: false,
  };
};

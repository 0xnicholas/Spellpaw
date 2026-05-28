/**
 * Project analysis utilities — 结构补全建议 + 节奏分析
 */
import type { TreeNode } from '@/types';

export interface PacingIssue {
  nodeId: string;
  title: string;
  type: 'too_long' | 'too_short' | 'unbalanced';
  message: string;
}

export interface StructureSuggestion {
  message: string;
  severity: 'info' | 'warning';
}

/** Analyze scene duration distribution for pacing issues */
export function analyzePacing(tree: TreeNode): PacingIssue[] {
  const issues: PacingIssue[] = [];
  const sceneDurations: Array<{ id: string; title: string; duration: number }> = [];

  // Collect all scene durations
  for (const act of tree.children ?? []) {
    for (const scene of act.children ?? []) {
      const d = scene.metadata?.duration ?? 0;
      if (d > 0) {
        sceneDurations.push({ id: scene.id, title: scene.title, duration: d });
      }
    }
  }

  if (sceneDurations.length < 2) return issues;

  const avg = sceneDurations.reduce((s, x) => s + x.duration, 0) / sceneDurations.length;

  for (const scene of sceneDurations) {
    const ratio = scene.duration / avg;
    if (ratio > 1.8) {
      issues.push({
        nodeId: scene.id, title: scene.title, type: 'too_long',
        message: `「${scene.title}」(${scene.duration}s) 占总时长比例过高（平均 ${Math.round(avg)}s），建议拆分或压缩`,
      });
    } else if (ratio < 0.3 && avg > 10) {
      issues.push({
        nodeId: scene.id, title: scene.title, type: 'too_short',
        message: `「${scene.title}」(${scene.duration}s) 明显短于平均，考虑扩展内容`,
      });
    }
  }

  // Check act-level balance
  const actDurations = (tree.children ?? []).map((act) => {
    const total = (act.children ?? []).reduce((s, sc) => s + (sc.metadata?.duration ?? 0), 0);
    return { id: act.id, title: act.title, duration: total };
  });

  if (actDurations.length >= 2) {
    const maxAct = actDurations.reduce((a, b) => a.duration > b.duration ? a : b);
    const minAct = actDurations.reduce((a, b) => a.duration < b.duration ? a : b);
    if (minAct.duration > 0 && maxAct.duration / minAct.duration > 2.5) {
      issues.push({
        nodeId: maxAct.id, title: maxAct.title, type: 'unbalanced',
        message: `「${maxAct.title}」(${maxAct.duration}s) 时长是「${minAct.title}」(${minAct.duration}s) 的 ${(maxAct.duration / minAct.duration).toFixed(1)} 倍，节奏失衡`,
      });
    }
  }

  return issues;
}

/** Suggest structural completions based on current tree */
export function suggestCompletions(tree: TreeNode): StructureSuggestion[] {
  const suggestions: StructureSuggestion[] = [];
  const acts = tree.children ?? [];

  // Check: minimum 3 acts for drama structure
  if (acts.length === 0) {
    suggestions.push({ message: '项目尚未添加幕(act)。建议从模板快速开始，或手动添加第一幕。', severity: 'warning' });
  } else if (acts.length < 3) {
    suggestions.push({ message: `当前 ${acts.length} 幕，经典短剧结构建议至少 3 幕（铺垫→冲突→结局）`, severity: 'info' });
  }

  // Check each act has scenes
  for (const act of acts) {
    const sceneCount = act.children?.length ?? 0;
    if (sceneCount === 0) {
      suggestions.push({ message: `「${act.title}」没有场景，建议添加 1-3 个场景`, severity: 'warning' });
    } else if (sceneCount === 1) {
      suggestions.push({ message: `「${act.title}」只有 1 个场景，考虑增加场景丰富叙事`, severity: 'info' });
    }

    // Check scenes have shots
    for (const scene of act.children ?? []) {
      const shotCount = scene.children?.length ?? 0;
      if (shotCount === 0) {
        suggestions.push({ message: `「${scene.title}」没有镜头。使用 "展开分镜" 让 AI 为你生成镜头设计`, severity: 'info' });
      }
    }
  }

  // Check: total duration vs target
  const totalDuration = acts.reduce((s, act) =>
    s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0), 0);
  if (totalDuration > 0 && acts.length > 0) {
    const avgPerAct = totalDuration / acts.length;
    if (avgPerAct < 15) {
      suggestions.push({ message: `平均每幕 ${Math.round(avgPerAct)}s，节奏偏快。考虑将有张力的场景适当延长`, severity: 'info' });
    }
  }

  return suggestions;
}

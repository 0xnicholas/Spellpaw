/**
 * Project analysis utilities — 结构补全建议 + 节奏分析 + 时长分布预警
 */
import type { TreeNode } from '@drama/types';

export interface PacingIssue {
  nodeId: string;
  title: string;
  type: 'too_long' | 'too_short' | 'unbalanced' | 'front_heavy' | 'back_heavy';
  severity: 'warning' | 'info';
  message: string;
}

export interface StructureSuggestion {
  message: string;
  severity: 'info' | 'warning';
}

export interface DurationBar {
  nodeId: string;
  title: string;
  duration: number;
  actId: string;
  actTitle: string;
  color: string; // OKLCH-based visual weight
}

export interface PacingReport {
  totalDuration: number;
  sceneCount: number;
  actCount: number;
  avgSceneDuration: number;
  maxSceneDuration: number;
  minSceneDuration: number;
  durationStdDev: number;
  issues: PacingIssue[];
  suggestions: StructureSuggestion[];
  durationBars: DurationBar[];
  overallStatus: 'good' | 'warning' | 'critical';
}

const ACT_COLORS = [
  '--color-accent-500',
  '--color-success-500',
  '--color-warning-500',
  '--color-info-500',
];

/** Compute standard deviation */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Build duration bars for visualization */
function buildDurationBars(tree: TreeNode): DurationBar[] {
  const bars: DurationBar[] = [];
  const acts = tree.children ?? [];

  for (let actIdx = 0; actIdx < acts.length; actIdx++) {
    const act = acts[actIdx];
    const color = ACT_COLORS[actIdx % ACT_COLORS.length];
    for (const scene of act.children ?? []) {
      const d = scene.metadata?.duration ?? 0;
      if (d > 0) {
        bars.push({
          nodeId: scene.id,
          title: scene.title,
          duration: d,
          actId: act.id,
          actTitle: act.title,
          color,
        });
      }
    }
  }
  return bars;
}

/** Analyze scene duration distribution for pacing issues */
export function analyzePacing(tree: TreeNode): PacingIssue[] {
  const issues: PacingIssue[] = [];
  const sceneDurations: Array<{ id: string; title: string; duration: number; actIndex: number }> = [];

  // Collect all scene durations
  const acts = tree.children ?? [];
  for (let i = 0; i < acts.length; i++) {
    const act = acts[i];
    for (const scene of act.children ?? []) {
      const d = scene.metadata?.duration ?? 0;
      if (d > 0) {
        sceneDurations.push({ id: scene.id, title: scene.title, duration: d, actIndex: i });
      }
    }
  }

  if (sceneDurations.length < 2) return issues;

  const avg = sceneDurations.reduce((s, x) => s + x.duration, 0) / sceneDurations.length;
  const durations = sceneDurations.map((s) => s.duration);
  const deviation = stdDev(durations);
  const cv = avg > 0 ? deviation / avg : 0; // coefficient of variation

  for (const scene of sceneDurations) {
    const ratio = scene.duration / avg;
    if (ratio > 2.0) {
      issues.push({
        nodeId: scene.id,
        title: scene.title,
        type: 'too_long',
        severity: 'warning',
        message: `「${scene.title}」(${scene.duration}s) 远长于平均 (${Math.round(avg)}s)，建议拆分或压缩`,
      });
    } else if (ratio > 1.5) {
      issues.push({
        nodeId: scene.id,
        title: scene.title,
        type: 'too_long',
        severity: 'info',
        message: `「${scene.title}」(${scene.duration}s) 偏长，可考虑精简`,
      });
    } else if (ratio < 0.3 && avg > 10) {
      issues.push({
        nodeId: scene.id,
        title: scene.title,
        type: 'too_short',
        severity: 'info',
        message: `「${scene.title}」(${scene.duration}s) 明显短于平均，考虑扩展内容`,
      });
    }
  }

  // High variance warning
  if (cv > 0.6 && sceneDurations.length >= 3) {
    issues.push({
      nodeId: tree.id,
      title: tree.title,
      type: 'unbalanced',
      severity: 'warning',
      message: `场景时长波动大（离散系数 ${(cv * 100).toFixed(0)}%），节奏不均匀`,
    });
  }

  // Check act-level balance
  const actDurations = acts.map((act) => {
    const total = (act.children ?? []).reduce((s, sc) => s + (sc.metadata?.duration ?? 0), 0);
    return { id: act.id, title: act.title, duration: total };
  });

  if (actDurations.length >= 2) {
    const maxAct = actDurations.reduce((a, b) => (a.duration > b.duration ? a : b));
    const minAct = actDurations.reduce((a, b) => (a.duration < b.duration ? a : b));
    if (minAct.duration > 0 && maxAct.duration / minAct.duration > 2.5) {
      issues.push({
        nodeId: maxAct.id,
        title: maxAct.title,
        type: 'unbalanced',
        severity: 'warning',
        message: `「${maxAct.title}」(${maxAct.duration}s) 时长是「${minAct.title}」(${minAct.duration}s) 的 ${(maxAct.duration / minAct.duration).toFixed(1)} 倍，幕间节奏失衡`,
      });
    }
  }

  // Check front-heavy / back-heavy
  if (actDurations.length >= 3) {
    const firstThird = actDurations.slice(0, Math.ceil(actDurations.length / 3));
    const lastThird = actDurations.slice(Math.floor((actDurations.length * 2) / 3));
    const firstSum = firstThird.reduce((s, a) => s + a.duration, 0);
    const lastSum = lastThird.reduce((s, a) => s + a.duration, 0);
    const total = actDurations.reduce((s, a) => s + a.duration, 0);
    if (total > 0) {
      if (firstSum / total > 0.55) {
        issues.push({
          nodeId: tree.id,
          title: tree.title,
          type: 'front_heavy',
          severity: 'info',
          message: `前 ${firstThird.length} 幕占时 ${Math.round((firstSum / total) * 100)}%，铺垫偏长，建议压缩开头`,
        });
      } else if (lastSum / total > 0.55) {
        issues.push({
          nodeId: tree.id,
          title: tree.title,
          type: 'back_heavy',
          severity: 'info',
          message: `后 ${lastThird.length} 幕占时 ${Math.round((lastSum / total) * 100)}%，结尾偏长，注意收尾节奏`,
        });
      }
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
  const totalDuration = acts.reduce(
    (s, act) => s + (act.children ?? []).reduce((ss, sc) => ss + (sc.metadata?.duration ?? 0), 0),
    0
  );
  if (totalDuration > 0 && acts.length > 0) {
    const avgPerAct = totalDuration / acts.length;
    if (avgPerAct < 15) {
      suggestions.push({
        message: `平均每幕 ${Math.round(avgPerAct)}s，节奏偏快。考虑将有张力的场景适当延长`,
        severity: 'info',
      });
    }
  }

  return suggestions;
}

/** Generate a comprehensive pacing report */
export function generatePacingReport(tree: TreeNode): PacingReport {
  const acts = tree.children ?? [];
  const scenes = acts.flatMap((act) => act.children ?? []);
  const durations = scenes
    .map((sc) => sc.metadata?.duration ?? 0)
    .filter((d) => d > 0);

  const totalDuration = durations.reduce((s, d) => s + d, 0);
  const avgSceneDuration = durations.length > 0 ? totalDuration / durations.length : 0;
  const maxSceneDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minSceneDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const durationStdDev = stdDev(durations);

  const issues = analyzePacing(tree);
  const suggestions = suggestCompletions(tree);
  const durationBars = buildDurationBars(tree);

  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const overallStatus: PacingReport['overallStatus'] =
    warningCount >= 2 ? 'critical' : warningCount >= 1 ? 'warning' : 'good';

  return {
    totalDuration,
    sceneCount: scenes.length,
    actCount: acts.length,
    avgSceneDuration,
    maxSceneDuration,
    minSceneDuration,
    durationStdDev,
    issues,
    suggestions,
    durationBars,
    overallStatus,
  };
}

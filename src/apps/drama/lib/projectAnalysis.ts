/**
 * Project analysis — generates pacing reports, structure completions, etc.
 *
 * Rewritten for canvas-first: operates on CanvasNode[] instead of TreeNode.
 */
import { useCanvasStore } from '@drama/stores/canvasStore';

export interface PacingIssue {
  type: string;
  severity: 'warning' | 'info';
  nodeId?: string;
  title?: string;
  message: string;
}

export interface StructureSuggestion {
  severity: 'warning' | 'info';
  message: string;
}

export interface PacingReport {
  totalDuration: number;
  sceneCount: number;
  avgSceneDuration: number;
  maxSceneDuration: number;
  minSceneDuration: number;
  durationStdDev: number;
  overallStatus: 'good' | 'warning' | 'needs_optimization';
  issues: PacingIssue[];
  suggestions: StructureSuggestion[];
}

export function generatePacingReport(): PacingReport {
  const cards = useCanvasStore.getState().getCurrentNodes();
  const scenes = cards.filter((c) => c.type === 'sceneCard');
  const durations = scenes.map((s) => Number(s.data.duration) || 0).filter((d) => d > 0);
  const total = durations.reduce((a, b) => a + b, 0);
  const avg = scenes.length > 0 ? total / scenes.length : 0;
  const cv = avg > 0 ? Math.sqrt(durations.reduce((s, d) => s + (d - avg) ** 2, 0) / (durations.length || 1)) / avg : 0;
  return {
    totalDuration: total,
    sceneCount: scenes.length,
    avgSceneDuration: avg,
    maxSceneDuration: Math.max(0, ...durations),
    minSceneDuration: durations.length > 0 ? Math.min(...durations) : 0,
    durationStdDev: cv * avg,
    overallStatus: cv > 0.5 ? 'warning' : scenes.length === 0 ? 'needs_optimization' : 'good',
    issues: [],
    suggestions: [],
  };
}

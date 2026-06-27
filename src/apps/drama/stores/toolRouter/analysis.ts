/**
 * Analysis domain — read-only diagnostics over the current canvas.
 *
 * Phase 4: template / kickstart_project workflows removed. The remaining
 * handlers operate purely on the canvas tree.
 */
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { ToolRouter } from './types';

// ── analysisHandlers ──

export const analysisHandlers: ToolRouter = {
  analyze_structure: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    const acts = cards.filter(
      (c) => c.type === 'storyline' || c.data.metadata?.type === 'act',
    ).length;
    const scenes = cards.filter(
      (c) => c.type === 'sceneCard' || c.data.metadata?.type === 'scene',
    ).length;
    const summary =
      cards.length === 0
        ? '📊 结构诊断：0 幕 0 场景，画布为空。'
        : `📊 结构诊断：${acts} 幕 ${scenes} 场景，共 ${cards.length} 张画布卡。`;
    return JSON.stringify({
      success: true,
      summary,
      acts,
      scenes,
      totalCards: cards.length,
    });
  },

  get_pacing_report: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    const scenes = cards.filter((c) => c.type === 'sceneCard');
    const totalDuration = scenes.reduce(
      (s, c) => s + (Number(c.data.duration) || 0),
      0,
    );
    const withArt = scenes.filter((c) => c.data.thumbnail).length;
    const visualGap = scenes.length - withArt;
    const avgDuration = scenes.length > 0 ? Math.round(totalDuration / scenes.length) : 0;
    const summary =
      scenes.length === 0
        ? '🎬 节奏分析：画布无场景卡，无法分析节奏。'
        : `🎬 节奏分析：${scenes.length} 个场景，总时长 ${totalDuration}s（平均 ${avgDuration}s），${visualGap} 个场景缺分镜图。`;
    return JSON.stringify({
      success: true,
      summary,
      sceneCount: scenes.length,
      totalDuration,
      avgDuration,
      visualGap,
    });
  },

  optimize_pacing: async () => {
    const cards = useCanvasStore.getState().getCurrentNodes();
    const scenes = cards.filter((c) => c.type === 'sceneCard');
    const durations = scenes
      .map((c) => Number(c.data.duration) || 0)
      .filter((d) => d > 0);
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const adjustments: Array<{ sceneId: string; title: string; suggestedDuration: number }> = [];
    for (const scene of scenes) {
      const d = Number(scene.data.duration) || 0;
      if (d > 0 && avg > 0 && Math.abs(d - avg) > avg * 0.3) {
        adjustments.push({
          sceneId: scene.id,
          title: scene.data.title,
          suggestedDuration: Math.round(avg),
        });
      }
    }
    const summary =
      adjustments.length === 0
        ? '🎯 节奏优化：当前节奏均衡，无需调整。'
        : `🎯 节奏优化：建议调整 ${adjustments.length} 个场景时长到平均 ${Math.round(avg)}s。`;
    return JSON.stringify({
      success: true,
      summary,
      adjustmentCount: adjustments.length,
      adjustments,
    });
  },
};
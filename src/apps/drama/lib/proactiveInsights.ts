import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNode } from '@drama/types';

export interface ProactiveInsight {
  type: string;
  severity: 'info' | 'warning';
  message: string;
}

export function computeProactiveInsights(): ProactiveInsight[] {
  const cards = useCanvasStore.getState().getCurrentNodes();
  const insights: ProactiveInsight[] = [];

  if (cards.length === 0) {
    insights.push({ type: 'empty', severity: 'info', message: '画布为空，可以应用模板或 kickstart 一个项目' });
    return insights;
  }

  const acts = cards.filter((c) => c.type === 'storyline' && c.data.metadata?.type === 'act');
  if (acts.length === 0) {
    insights.push({ type: 'missing_acts', severity: 'warning', message: '项目没有幕结构，建议用 apply_template 或 add_storyline_card 添加' });
  }

  const scenes = cards.filter((c) => c.type === 'sceneCard');
  if (acts.length > 0 && scenes.length === 0) {
    insights.push({ type: 'missing_scenes', severity: 'warning', message: '有幕但没有场景卡' });
  }

  const arts = cards.filter((c) => c.type === 'art');
  if (scenes.length > 3 && arts.length === 0) {
    insights.push({ type: 'missing_art', severity: 'info', message: '场景卡较多但没有 AI 生成的参考图' });
  }

  return insights;
}

export function formatInsightsAsMessage(insights: ProactiveInsight[]): string {
  if (insights.length === 0) return '';
  return insights
    .map((i) => `${i.severity === 'warning' ? '⚠️' : '💡'} ${i.message}`)
    .join('\n');
}

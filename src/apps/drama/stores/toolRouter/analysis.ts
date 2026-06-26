/**
 * Analysis domain — read-only diagnostics plus the kickstart_project workflow.
 *
 * Rewritten for canvas-first: all handlers now operate on canvas cards.
 * Analysis handlers are stubbed until projectAnalysis.ts is rewritten (Task A6).
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { applyTemplateToCanvas } from '@drama/lib/applyTemplateToCanvas';
import type { CanvasNode } from '@drama/types';
import type { ToolRouter } from './types';

// ── Template scoring (used by match_template + kickstart_project) ──

const BUILTIN_TEMPLATES = [
  { id: 'suspense-reversal', name: '悬疑反转', category: 'suspense', keywords: ['悬疑','密室','反转','侦探','凶杀','失踪','谜','真相','阴谋','惊悚','犯罪','追凶','暗','恐怖'] },
  { id: 'sweet-romance', name: '甜宠短剧', category: 'romance', keywords: ['甜宠','恋爱','爱情','霸道','总裁','心动','初恋','约会','浪漫','甜蜜','表白','吻','宠','嫁','娶'] },
  { id: 'comedy-twist', name: '喜剧反转', category: 'comedy', keywords: ['喜剧','搞笑','幽默','段子','笑','荒诞','讽刺','无厘头','欢乐','逗','趣'] },
  { id: 'underdog-comeback', name: '励志逆袭', category: 'drama', keywords: ['励志','逆袭','奋斗','成长','追梦','突破','翻身','成功','努力','拼搏','创业','穷'] },
  { id: 'mini-documentary', name: '短纪录片', category: 'documentary', keywords: ['纪录','纪实','访谈','真实','纪录片','人文','社会','探索','历史','见证'] },
  { id: 'psychological-horror', name: '心理恐怖', category: 'horror', keywords: ['恐怖','惊悚','诡异','阴森','吓人','悬疑','神秘','不安','噩梦','灵异','鬼','邪'] },
  { id: 'action-chase', name: '动作追逐', category: 'action', keywords: ['动作','追逐','打斗','枪战','爆破','跑酷','特工','警匪','武侠','高能','燃','快节奏'] },
  { id: 'period-romance', name: '年代爱情', category: 'romance', keywords: ['年代','怀旧','民国','复古','老上海','战乱','家族','分离','重逢','错过','遗憾'] },
  { id: 'coming-of-age', name: '青春成长', category: 'drama', keywords: ['青春','校园','高中','大学','毕业','迷茫','成长','蜕变','找到自我','试错','选择'] },
  { id: 'fantasy-awakening', name: '玄幻觉醒', category: 'fantasy', keywords: ['玄幻','仙侠','异能','觉醒','超能力','异世界','奇幻','特效','修仙','古风魔幻'] },
];

function scoreTemplates(corpus: string) {
  const corpusLower = corpus.toLowerCase();
  return BUILTIN_TEMPLATES
    .map((t) => {
      const hits = t.keywords.filter((k) => corpusLower.includes(k)).length;
      return { ...t, score: hits / Math.max(1, t.keywords.length * 0.6), hits };
    })
    .sort((a, b) => b.score - a.score);
}

function findBestTemplate(theme: string, genre?: string) {
  if (genre) {
    const matched = BUILTIN_TEMPLATES.find((t) => t.category.toLowerCase() === genre.toLowerCase());
    if (matched) return matched;
  }
  const scores = scoreTemplates(theme);
  return scores[0];
}

function collectTextFromCards(cards: CanvasNode[]): string {
  const texts: string[] = [];
  for (const c of cards) {
    texts.push(c.data.title ?? '');
    if (c.data.description) texts.push(c.data.description);
    if (c.data.location) texts.push(c.data.location);
    const tags = Array.isArray(c.data.tags) ? c.data.tags.filter((t): t is string => typeof t === 'string') : [];
    texts.push(...tags);
    for (const child of c.data.children ?? []) {
      texts.push(child.title);
      if (child.data?.description) texts.push(String(child.data.description));
      if (child.data?.shotType) texts.push(String(child.data.shotType));
    }
  }
  return texts.join(' ');
}

// ── Stub: rewrite in Task A6 ──
const ANALYSIS_STUB = '📊 分析工具正在迁移到画布——请使用 get_canvas / add_<type>_card 等画布工具管理项目结构。节奏分析和模板匹配将在画布迁移完成后恢复。';

// ── analysisHandlers ──

export const analysisHandlers: ToolRouter = {
  analyze_structure: async () => ANALYSIS_STUB,

  get_pacing_report: async () => ANALYSIS_STUB,

  optimize_pacing: async () => ANALYSIS_STUB,

  match_template: async () => {
    const projectId = useProjectStore.getState().currentProjectId;
    if (!projectId) return '(当前无项目)';

    const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
    const title = project?.title ?? 'Untitled';
    const description = project?.description ?? '';

    const cards = useCanvasStore.getState().getCurrentNodes();
    const corpus = [title, description, collectTextFromCards(cards)].join(' ');

    const scores = scoreTemplates(corpus);
    const best = scores[0];
    const lines: string[] = [`📋 模板匹配结果：《${title}》`, ''];

    if (best.hits === 0) {
      lines.push('暂无明确匹配。关键词信号不足，建议从以下类型选择：');
      for (const s of scores) {
        lines.push(`  • 「${s.name}」— ${s.keywords.slice(0, 5).join('、')}`);
      }
    } else {
      lines.push(`最佳匹配: 「${best.name}」 相似度 ${Math.min(100, Math.round(best.score * 100))}%`);
      lines.push(`命中关键词: ${best.keywords.filter((k) => corpus.includes(k)).join('、') || '—'}`);
      lines.push('');
      lines.push('其他候选:');
      for (const s of scores.slice(1)) {
        const pct = Math.min(100, Math.round(s.score * 100));
        lines.push(`  • 「${s.name}」 ${pct}%${s.hits > 0 ? ' — ' + s.keywords.filter((k) => corpus.includes(k)).slice(0, 3).join('、') : ''}`);
      }
      lines.push('');
      lines.push(`如需套用: apply_template({ templateId: "${best.id}" })`);
    }

    return lines.join('\n');
  },

  kickstart_project: async (params) => {
    const theme = params.theme as string;
    const genre = params.genre as string | undefined;

    const best = findBestTemplate(theme, genre);
    if (!best) {
      return JSON.stringify({
        success: false,
        error: 'validation_failed',
        suggestion: 'no matching template found',
        summary: '未找到合适的叙事模板',
      });
    }

    const result = await applyTemplateToCanvas(best.id);
    return result;
  },
};

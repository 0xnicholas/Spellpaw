/**
 * Pandaria API client — token generation + HTTP helpers
 */
import { config } from '@/shared/config';

const PANDARIA_BASE = config.pandariaBase;
const AUTH_SECRET = config.pandariaAuthSecret;
const TENANT_ID = 'test-tenant';

// ---- Token generation ----
async function generateToken(): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    tenant_id: TENANT_ID,
    iat: now,
    exp: now + 3600,
  });

  const payloadBytes = encoder.encode(payload);
  const payloadB64 = btoa(String.fromCharCode(...payloadBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${payloadB64}.${sigB64}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await generateToken()}` };
}

// ---- API calls ----

interface ToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  endpoint: string;
}

export interface PandariaSession {
  id: string;
  title: string;
  model: string;
}

/** Create a Pandaria session with system_prompt + tools */
export async function createSession(
  title: string,
  systemPrompt: string,
  tools: ToolConfig[] = [],
): Promise<PandariaSession> {
  const res = await fetch(`${PANDARIA_BASE}/api/v1/sessions`, {
    method: 'POST',
    headers: { ...await authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, system_prompt: systemPrompt, tools }),
  });
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
  return res.json();
}

/** Send a user message to a session */
export async function sendMessage(sessionId: string, content: string): Promise<void> {
  const res = await fetch(`${PANDARIA_BASE}/api/v1/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { ...await authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: [{ type: 'text', text: content }],
    }),
  });
  if (!res.ok) throw new Error(`Send message failed: ${res.status}`);
}

/** Subscribe to SSE events for a session. Calls onEvent for each event. */
export function subscribeSSE(
  sessionId: string,
  onEvent: (event: Record<string, unknown>) => void,
): { close: () => void } {
  let aborted = false;
  const controller = new AbortController();

  (async () => {
    const token = await generateToken();
    if (aborted) return;

    const res = await fetch(`${PANDARIA_BASE}/api/v1/sessions/${sessionId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok || !res.body) return;
    aborted = false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch { /* skip malformed */ }
        }
      }
    }
  })();

  return {
    close: () => {
      aborted = true;
      controller.abort();
    },
  };
}

/** Infer genre from project title for style adaptation */
function inferGenre(title: string): string {
  const t = title.toLowerCase();
  if (/悬疑|密室|反转|侦探|凶杀|失踪|谜|真相|阴谋/.test(t)) return '悬疑';
  if (/甜宠|恋爱|爱情|霸道|总裁|心动|初恋|约会/.test(t)) return '甜宠';
  if (/喜剧|搞笑|幽默|段子|笑|荒诞/.test(t)) return '喜剧';
  if (/励志|逆袭|奋斗|成长|追梦|突破/.test(t)) return '励志';
  if (/动作|打斗|追逐|枪战|爆破|武侠/.test(t)) return '动作';
  if (/纪录|纪实|访谈|真实|纪录片/.test(t)) return '纪录';
  return '剧情';
}

function genreGuidance(genre: string): string {
  const map: Record<string, string> = {
    '悬疑': '注重悬念铺设和信息控制。每幕结尾留钩子，第三幕给出反转或真相。场景时长前紧后松，高潮部分最长。',
    '甜宠': '节奏轻快，场景不宜过长。注重情感递进，第二幕建立关系，第三幕确认关系。画面明亮温暖。',
    '喜剧': '节奏快，场景短（15-25s）。铺垫→笑点→反转的结构。第三幕回归温情或更大笑点。',
    '励志': '三幕结构清晰：困境→努力→成功。第二幕要有低谷，第三幕高潮 uplifting。场景时长逐渐递增。',
    '动作': '开场即冲突，节奏紧凑。动作场景可较长（40s+），文戏简短。第三幕大高潮。',
    '纪录': '真实感优先，节奏舒缓。场景时长均匀（20-30s）。注重画面质感和信息密度。',
    '剧情': '经典三幕结构，注重人物弧光。场景时长根据戏剧张力灵活调整。',
  };
  return map[genre] ?? map['剧情'];
}

/** Build system_prompt from project tree */
export function buildSystemPrompt(
  projectTitle: string,
  treeText: string,
  templateCategory?: string,
): string {
  const genre = templateCategory || inferGenre(projectTitle);
  const guidance = genreGuidance(genre);

  return [
    `你是 Spellpaw 的 AI 创作助手，帮助用户创作短剧/短视频。`,
    ``,
    `## 当前项目`,
    `- 名称：《${projectTitle}》`,
    `- 类型：${genre}`,
    ``,
    `## 创作风格指引`,
    guidance,
    ``,
    `## 项目结构`,
    treeText || '(空项目)',
    ``,
    `## 可用工具`,
    `- spellpaw_add_node (parentId, type, title, description, duration)`,
    `- spellpaw_update_node (nodeId, changes)`,
    `- spellpaw_delete_node (nodeId) ⚠️ 先征求用户同意`,
    `- spellpaw_get_subtree (nodeId) — 查看子树`,
    `- spellpaw_get_tree — 查看完整项目`,
    `- spellpaw_apply_template (templateId)`,
    `- spellpaw_match_template — 根据项目内容智能匹配叙事模板`,
    `- spellpaw_analyze_structure — 诊断结构健康度并给出补全建议`,
    `- spellpaw_get_pacing_report — 获取节奏分析报告（时长分布、CV、问题）`,
    `- spellpaw_optimize_pacing — 一键优化场景时长节奏（dryRun 预览 / 执行）`,
    `- spellpaw_generate_storyboard (nodeId, prompt?) — 为场景生成参考图`,
    ``,
    `## 项目结构说明`,
    `项目 → 幕(act) → 场景(scene) → 镜头(shot)`,
    `场景元数据: status, description, duration, location, timeOfDay`,
    `镜头元数据: status, description, duration, shotType, cameraMovement, dialogue`,
    ``,
    `## 协作规则`,
    `1. 每次只做一个逻辑操作，分步执行`,
    `2. 需要镜头详情时调用 get_subtree`,
    `3. 删除操作前先征求用户同意`,
    `4. 回复简洁、结构化`,
    `5. 展开分镜时逐幕进行`,
    `6. 用户问结构/节奏问题时，主动调用 analyze_structure 或 get_pacing_report，不要猜测`,
  ].filter(Boolean).join('\n');
}

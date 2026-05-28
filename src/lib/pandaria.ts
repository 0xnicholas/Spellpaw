/**
 * Pandaria API client — token generation + HTTP helpers
 */
import { config } from '@/config';

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

/** Build system_prompt from project tree */
export function buildSystemPrompt(
  projectTitle: string,
  treeText: string,
  templateCategory?: string,
): string {
  return [
    `你是 Spellpaw 的 AI 创作助手，帮助用户创作短剧/短视频。`,
    ``,
    `## 当前项目`,
    `- 名称：《${projectTitle}》`,
    templateCategory ? `- 类型：${templateCategory}` : '',
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
  ].filter(Boolean).join('\n');
}

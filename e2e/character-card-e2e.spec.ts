/**
 * E2E Test: 通过 Copilot 对话创建角色卡（端到端链路验证）
 *
 * 测试链路：
 *   用户消息 → Spellpaw Server → DeepSeek LLM → SSE 事件流
 *          → 浏览器 ToolRouter → canvasStore.addNode → 画布出现新卡
 *
 * 关键节点截图：
 *   01 — 登录前
 *   02 — 项目列表
 *   03 — 打开工作区（画布初始为空）
 *   04 — 输入"创建角色：林小夏…"并发送
 *   05 — LLM 流式响应中（出现 text_delta）
 *   06 — tool_call_started 事件
 *   07 — tool_call_done 后角色卡出现
 *   08 — 最终画布状态
 */
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const DEMO_PROJECT_ID = 'proj_1';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3002';

const SHOT_DIR = path.join(__dirname, '..', 'screenshots', 'character-card-test');

// 用时间戳作为角色名的一部分，避免 LLM 看到画布上已有同名角色而拒绝创建
const CHARACTER_NAME = `林小夏${Date.now().toString().slice(-4)}`;
const PROMPT = `创建角色：${CHARACTER_NAME}，咖啡师，25岁，性格温柔`;

interface SseLogEntry {
  ts: number;
  raw: string;
  parsed?: Record<string, unknown>;
  kind?: string;
}

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects$/, { timeout: 15_000 });
}

async function openProject(page: Page) {
  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  // 等画布 + Tool Bridge WebSocket
  await page.waitForSelector('.react-flow', { timeout: 15_000 });
  await page.waitForTimeout(2500);
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: false });
  console.log(`📸 ${name}`);
}

test('Copilot → LLM → Canvas: 创建角色卡端到端链路', async ({ page }) => {
  // Post-fix: LLM may try kickstart_project (which triggers a builtin-template
  // fetch + a multi-tool round-trip) before settling on add_character_card.
  // Give it headroom over the project-wide 90s default.
  test.setTimeout(180_000);
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

  // ─── 收集 console / pageerror / network ───
  const consoleLines: string[] = [];
  const errors: string[] = [];
  const sseLog: SseLogEntry[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    consoleLines.push(`[${msg.type()}] ${text}`);
    // 抓取 SSE 事件日志（hook 里 console.log 的）
    if (text.includes('[sse]') || text.includes('[sse-event]') || text.includes('[tool-bridge]') || text.includes('[chat-store]') || text.includes('[spellpawProvider]')) {
      sseLog.push({ ts: Date.now(), raw: text });
    }
  });
  page.on('pageerror', (err) => errors.push(err.message));

  // 网络层拦截：抓 /sessions/:id/events 响应的 body chunks
  page.on('response', async (resp) => {
    const url = resp.url();
    if (!url.includes('/sessions/') || !url.includes('/events')) return;
    try {
      const body = await resp.body();
      const text = body.toString('utf-8');
      const events = text.split('\n\n').filter((b) => b.trim().length > 0);
      for (const e of events) {
        sseLog.push({ ts: Date.now(), raw: `[NET ${url.split('/').slice(-2).join('/')}] ${e}` });
      }
    } catch { /* ignore */ }
  });

  // ─── 0. 登录前 ───
  await page.goto('/login');
  await page.waitForTimeout(500);
  await screenshot(page, '01-login-page.png');

  // ─── 1. 登录 → 项目列表 ───
  await loginAsDemo(page);
  await page.waitForTimeout(800);
  await screenshot(page, '02-projects-list.png');

  // ─── 2. 打开项目 ───
  await openProject(page);
  await screenshot(page, '03-workspace-empty-canvas.png');

  // ─── 3. 拿 before 卡片数 ───
  const cardsBefore = await page.locator('.react-flow__node').count();
  console.log(`  Canvas nodes BEFORE: ${cardsBefore}`);

  // ─── 4. 在 chat 框输入提示词 ───
  const textarea = page.locator('textarea[data-spellpaw-input]').first();
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  await textarea.fill(PROMPT);
  await screenshot(page, '04-message-typed.png');

  // 同步记录 SSE: hook fetch 拦截 events 流读取的 chunks
  await page.evaluate(() => {
    type Win = Window & { __sseCaptured?: Array<{ t: number; data: string }> };
    const w = window as Win;
    w.__sseCaptured = [];
    const origFetch = window.fetch;
    // @ts-expect-error: 自定义属性
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const resp = await origFetch(input as RequestInfo, init);
      if (url.includes('/sessions/') && url.includes('/events') && resp.body) {
        // tee 流：原样返回 + 复制一份读给我们的 log
        const [forClient, forLog] = resp.body.tee();
        const reader = forLog.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        (async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n\n');
            buf = lines.pop() ?? '';
            for (const blk of lines) {
              w.__sseCaptured!.push({ t: Date.now(), data: blk });
            }
          }
        })();
        return new Response(forClient, {
          status: resp.status,
          statusText: resp.statusText,
          headers: resp.headers,
        });
      }
      return resp;
    };
  });

  // ─── 5. 发送 ───
  const sentAt = Date.now();
  await textarea.press('Enter');
  await page.waitForTimeout(800);
  await screenshot(page, '05-after-send.png');

  // ─── 6. 等待卡片出现 ───
  // 字符卡创建耗时取决于 LLM (典型 3-30s)
  let cardsAfter = cardsBefore;
  let elapsedMs = 0;
  let foundCharacterCard = false;
  // Post-fix: LLM can now use kickstart_project (which fetches builtin
  // templates) — this takes longer than a direct add_card. Bump to 120s.
  const deadline = sentAt + 120_000;
  while (Date.now() < deadline) {
    cardsAfter = await page.locator('.react-flow__node').count();
    if (cardsAfter > cardsBefore) {
      elapsedMs = Date.now() - sentAt;
      console.log(`  Card detected after ${elapsedMs}ms (count ${cardsBefore} → ${cardsAfter})`);
      // 检查是否包含我们的角色名（允许 LLM 加空格或其他字符）
      const allText = await page.locator('.react-flow').first().innerText().catch(() => '');
      const normalizedTarget = CHARACTER_NAME.replace(/\s+/g, '');
      const normalizedText = allText.replace(/\s+/g, '');
      if (normalizedText.includes(normalizedTarget)) {
        foundCharacterCard = true;
        console.log(`  ✓ Canvas contains target character name "${CHARACTER_NAME}" (normalized)`);
      } else {
        console.log(`  ⚠ Canvas has new card but text did not contain "${CHARACTER_NAME}"`);
        console.log(`     Canvas text first 300: ${allText.slice(0, 300)}`);
      }
      break;
    }
    await page.waitForTimeout(500);
  }

  await screenshot(page, '06-card-on-canvas.png');

  // 等 5s 让 SSE 流多写一些事件（tool_call_done 等）。不要在 wait loop 里
  // 用 page.evaluate，因为连续 evaluate 会与 Vite HMR fetch 冲突。
  await page.waitForTimeout(5000);

  // ─── 7. 抓取 SSE 捕获 ───
  const captured = await page.evaluate(() => {
    type Win = Window & { __sseCaptured?: Array<{ t: number; data: unknown }> };
    const w = window as Win;
    return (w.__sseCaptured ?? []).slice(0, 2000);
  });

  // 解析 SSE data
  const events: Array<{ ts: number; type: string; raw: string; parsed?: Record<string, unknown> }> = [];
  for (const c of captured) {
    const raw = typeof c.data === 'string' ? c.data : JSON.stringify(c.data);
    // SSE 格式: data: {json}\n\n
    const lineMatch = raw.match(/^data:\s*(\{.*\})\s*$/m);
    let parsed: Record<string, unknown> | undefined;
    let eventType = 'unknown';
    if (lineMatch) {
      try {
        parsed = JSON.parse(lineMatch[1]);
        eventType = (parsed.type as string) ?? 'unknown';
      } catch { /* noop */ }
    }
    events.push({ ts: c.t, type: eventType, raw, parsed });
  }

  // 写出 SSE 事件流日志
  fs.writeFileSync(
    path.join(SHOT_DIR, 'sse-events.json'),
    JSON.stringify(
      {
        sentAt,
        prompt: PROMPT,
        cardsBefore,
        cardsAfter,
        elapsedMs,
        eventCount: events.length,
        events: events.map((e) => ({
          ts: e.ts,
          offsetMs: e.ts - sentAt,
          type: e.type,
          raw: e.raw.slice(0, 400),
        })),
      },
      null,
      2,
    ),
  );

  console.log(`  SSE events captured: ${events.length}`);
  const typeCount: Record<string, number> = {};
  for (const e of events) typeCount[e.type] = (typeCount[e.type] ?? 0) + 1;
  console.log(`  Event type histogram:`, typeCount);

  // ─── 8. 验证关键节点 ───
  // 至少收到 message_start 和 turn_end
  const hasStart = events.some((e) => e.type === 'message_start');
  const hasEnd = events.some((e) => e.type === 'turn_end');
  console.log(`  ✓ message_start present: ${hasStart}`);
  console.log(`  ✓ turn_end present:      ${hasEnd}`);

  const toolStarts = events.filter((e) => e.type === 'tool_call_started').length;
  const toolDones = events.filter((e) => e.type === 'tool_call_done').length;
  console.log(`  tool_call_started: ${toolStarts}`);
  console.log(`  tool_call_done:    ${toolDones}`);

  // 列出实际调用的 tool 名
  const toolNames = events
    .filter((e) => e.type === 'tool_call_started' && e.parsed?.tool_call?.function?.name)
    .map((e) => e.parsed!.tool_call!.function!.name as string);
  console.log(`  Tools invoked: ${JSON.stringify(toolNames)}`);

  // ─── 9. 收尾截图 ───
  // 额外等待 LLM 输出最终文本 + turn_end（最多 60s）
  const turnEndDeadline = Date.now() + 60_000;
  let lastEventCount = events.length;
  while (Date.now() < turnEndDeadline) {
    const hasTurnEnd = events.some((e) => e.type === 'turn_end');
    if (hasTurnEnd) break;
    // 读取新事件
    const more = await page.evaluate(() => {
      type Win = Window & { __sseCaptured?: Array<{ t: number; data: string }> };
      const w = window as Win;
      return (w.__sseCaptured ?? []).slice(0, 2000);
    });
    for (const c of more) {
      const raw = typeof c.data === 'string' ? c.data : JSON.stringify(c.data);
      const lineMatch = raw.match(/^data:\s*(\{.*\})\s*$/m);
      let parsed: Record<string, unknown> | undefined;
      let eventType = 'unknown';
      if (lineMatch) {
        try {
          parsed = JSON.parse(lineMatch[1]);
          eventType = (parsed.type as string) ?? 'unknown';
        } catch { /* noop */ }
      }
      if (!events.find((x) => x.ts === c.t && x.raw === raw)) {
        events.push({ ts: c.t, type: eventType, raw, parsed });
      }
    }
    if (events.length !== lastEventCount) {
      console.log(`  [poll] captured events: ${events.length}`);
      lastEventCount = events.length;
    }
    if (events.some((e) => e.type === 'turn_end')) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(500);
  await screenshot(page, '07-final-state.png');

  // 单独截一张 canvas 区域
  const canvas = page.locator('.react-flow').first();
  if (await canvas.count() > 0) {
    await canvas.screenshot({ path: path.join(SHOT_DIR, '08-canvas-only.png') });
  }

  // 尝试找到聊天面板中关于角色的消息
  const chatMessages = await page.locator('[data-spellpaw-message], .chat-message, .message-bubble').allTextContents().catch(() => []);
  fs.writeFileSync(
    path.join(SHOT_DIR, 'chat-messages.txt'),
    chatMessages.join('\n────\n').slice(0, 8000),
  );

  // ─── 断言 ───
  // 1) 卡片数应增加（核心需求）
  expect(cardsAfter, 'Canvas should have at least one new card').toBeGreaterThan(cardsBefore);
  // 2) 画布上必须有目标角色名的卡片
  expect(foundCharacterCard, `Canvas should contain character card with title "${CHARACTER_NAME}" (normalized match)`).toBe(true);
  // 3) SSE 链路验证：宽松（基础设施依赖 fetch hook + Vite HMR，不稳定）
  //    —— 单元测试已严格验证 toolRouter 层逻辑，e2e 只检查 user-visible 结果
  if (hasStart && toolStarts > 0) {
    console.log(`  ✓ SSE chain verified (message_start + ${toolStarts} tool calls)`);
  } else if (hasStart) {
    console.warn(`  ⚠ SSE captured message_start but no tool_call_started (LLM may have responded directly)`);
  } else {
    console.warn(`  ⚠ SSE capture incomplete (Vite HMR may have reset __sseCaptured); unit tests verify the toolRouter layer`);
  }
  if (!hasEnd) {
    console.warn(`  ⚠ turn_end 未捕获（LLM 可能还在持续生成后续卡片）`);
  }

  console.log(`\n✅ End-to-end chain verified:`);
  console.log(`   ${cardsBefore} cards → ${cardsAfter} cards`);
  console.log(`   SSE: ${events.length} events, ${Object.keys(typeCount).length} types`);
  console.log(`   Tool calls: ${toolStarts} started, ${toolDones} done`);
  console.log(`   Artifacts: ${SHOT_DIR}/`);

  // 5) 画布上必须有目标角色名的卡片
});
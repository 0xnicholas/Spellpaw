/**
 * E2E test: clear_canvas 原子清空 + 强制 push
 *
 * 验证 user 报告的核心 bug 已修复：
 *   - AI 用 delete_card 逐个删时，500ms debounce 期间刷新会被服务端 pull 覆盖
 *   - clear_canvas 一次性 store update + 立即 force push，刷新后不会恢复
 */
import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const DEMO_PROJECT_ID = 'proj_1';
const FRONTEND_URL = 'http://localhost:5173';
const TOOL_ENDPOINT = `${FRONTEND_URL}/tool`;

async function loginAsDemo(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects$/, { timeout: 15_000 });
}

async function openProject(page: any) {
  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  await page.waitForSelector('.react-flow', { timeout: 15_000 });
  // Wait for Tool Bridge WebSocket to be established
  await page.waitForTimeout(2000);
}

async function addCardDirect(title: string, type = 'storyline'): Promise<string> {
  const res = await fetch(TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool_call_id: `setup_${Date.now()}_${Math.random()}`,
      params: { action: 'add_card', type, title, description: 'e2e test card' },
      session_id: 'e2e',
      tenant_id: 'e2e',
    }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.is_error).toBe(false);
  return body.content[0].text;
}

async function callTool(action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; text: string }> {
  const res = await fetch(TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool_call_id: `call_${Date.now()}_${Math.random()}`,
      params: { action, ...params },
      session_id: 'e2e',
      tenant_id: 'e2e',
    }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  return { ok: !body.is_error, text: body.content?.[0]?.text ?? '' };
}

test.describe('clear_canvas — 原子清空 + 强制 push', () => {
  test('happy path: 添加 3 张 → clear_canvas → 画布为空', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Setup: add 3 distinct cards
    const tag = `ClearTest_${Date.now()}`;
    await addCardDirect(`${tag}_A`);
    await addCardDirect(`${tag}_B`, 'moodboard');
    await addCardDirect(`${tag}_C`, 'task');

    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 10_000 });

    const beforeCount = await page.locator('.react-flow__node').count();
    console.log(`  Before clear: ${beforeCount} cards`);

    // Action: clear the canvas atomically
    const result = await callTool('clear_canvas');
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/已清空画布.*3/);
    console.log(`  Tool returned: ${result.text}`);

    // Verify: canvas is empty
    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBe(0);
    }).toPass({ timeout: 5_000 });
    console.log('✓ Canvas is empty after clear_canvas');
  });

  test('force push: clear 后刷新不会被服务端恢复（user 报告的核心 bug）', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Add 2 cards
    const tag = `RefreshTest_${Date.now()}`;
    await addCardDirect(`${tag}_1`);
    await addCardDirect(`${tag}_2`);

    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10_000 });
    console.log('  Added 2 cards');

    // Clear atomically (this should force-push to server)
    const result = await callTool('clear_canvas');
    expect(result.ok).toBe(true);

    // Wait for canvas to be empty
    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBe(0);
    }).toPass({ timeout: 5_000 });

    // Wait a bit for the force push to actually land on the server
    // (clear_canvas awaits triggerPushNow but we want to ensure server has it)
    await page.waitForTimeout(1500);

    // Verify server side via get_canvas
    const serverCheck = await callTool('get_canvas');
    console.log(`  Server get_canvas: ${serverCheck.text.slice(0, 80)}`);
    expect(serverCheck.text).toContain('画布为空');

    // Now reload the page — the previous bug was that local state got reverted
    // from server on refresh. With force-push, server should also be empty.
    await page.reload();
    await page.waitForSelector('.react-flow', { timeout: 15_000 });
    await page.waitForTimeout(2000); // let pullAll run

    const afterReload = await page.locator('.react-flow__node').count();
    console.log(`  Cards after page reload: ${afterReload}`);
    expect(afterReload).toBe(0);
    console.log('✓ Reload did not restore the cleared cards');
  });

  test('filter: 只清空指定 type，其他类型保留', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Add 2 storyline + 1 moodboard. clear_canvas with filter storyline
    // should only remove storylines, leaving the moodboard.
    // NOTE: add_card only accepts {storyline, moodboard, videoClip, asset,
    // task, art, character} — 'sceneCard' / 'script' would be silently
    // coerced to 'storyline'.
    const tag = `FilterTest_${Date.now()}`;
    await addCardDirect(`${tag}_line_1`, 'storyline');
    await addCardDirect(`${tag}_line_2`, 'storyline');
    await addCardDirect(`${tag}_mood_keep`, 'moodboard');

    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 10_000 });

    const result = await callTool('clear_canvas', { filter: { type: 'storyline' } });
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/已清空画布/);
    console.log(`  Tool returned: ${result.text}`);

    // Verify: the moodboard we added is still there (we tagged it uniquely)
    await expect(async () => {
      const visible = await page.locator('.react-flow__node', { hasText: `${tag}_mood_keep` }).isVisible();
      expect(visible).toBe(true);
    }).toPass({ timeout: 5_000 });
    console.log('✓ Filtered clear left the non-matching card intact');

    // Cleanup
    await callTool('clear_canvas');
  });

  test('空画布调用 clear_canvas 返回友好提示，不报错', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Clear first to ensure empty
    await callTool('clear_canvas');
    await page.waitForTimeout(500);

    const result = await callTool('clear_canvas');
    expect(result.ok).toBe(true);
    expect(result.text).toContain('画布已为空');
    console.log('✓ Empty-canvas clear returns friendly message');
  });

  test('清空后仍能正常添加新卡片（store 健康）', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Add, clear, add again
    await addCardDirect(`Pre_${Date.now()}`);
    await callTool('clear_canvas');

    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBe(0);
    }).toPass({ timeout: 5_000 });

    const newTag = `Post_${Date.now()}`;
    const r = await addCardDirect(newTag);
    expect(r).toContain(newTag);

    await expect(async () => {
      const visible = await page.locator('.react-flow__node', { hasText: newTag }).isVisible();
      expect(visible).toBe(true);
    }).toPass({ timeout: 10_000 });
    console.log('✓ Can add new cards after clear');

    // Cleanup
    await callTool('clear_canvas');
  });
});

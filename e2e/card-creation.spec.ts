/**
 * E2E test: 通过对话生成画布卡片
 *
 * Tests the core capability at multiple levels:
 *   1. Infrastructure test: Vite Tool Server accepts /tool POST and routes via WebSocket
 *   2. Tool execution test: Calling spellpaw_add_card via the Tool Server actually adds a card
 *   3. UI verification: A new card appears on the canvas in the browser
 *   4. Mock mode test: chatStore.sendMessage creates cards without LLM
 */
import { test, expect, type Page } from '@playwright/test';

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const DEMO_PROJECT_ID = 'proj_1';
const FRONTEND_URL = 'http://localhost:5173';
const TOOL_ENDPOINT = `${FRONTEND_URL}/tool`;

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects$/, { timeout: 15_000 });
}

async function openProject(page: Page) {
  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  await page.waitForSelector('.react-flow', { timeout: 15_000 });
  // Wait for Tool Bridge WebSocket to be established
  await page.waitForTimeout(2000);
}

test.describe('Core capability: 通过对话生成画布卡片', () => {
  test('Tool Server 在没有浏览器连接时返回 503', async () => {
    // Pure HTTP test — verifies the Tool Server endpoint exists
    const res = await fetch(TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_call_id: 'test_001',
        params: { action: 'get_canvas' },
        session_id: 'test',
        tenant_id: 'test',
      }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.is_error).toBe(true);
    expect(body.content[0].text).toContain('No browser connected');
  });

  test('LLM 模式 — 通过对话触发工具调用', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const cardsBefore = await page.locator('.react-flow__node').count();
    console.log(`  Canvas cards before: ${cardsBefore}`);

    // Take a "before" screenshot
    await page.screenshot({ path: 'test-results/before-chat.png' });

    // Type message in chat — try multiple times to overcome LLM verbosity
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // First prompt: simple ask
    await textarea.fill('创建一张故事线卡片');
    await textarea.press('Enter');
    console.log('  Sent: 创建一张故事线卡片');

    // Wait for either: a card to appear OR an agent response
    await page.waitForTimeout(8000);
    const cardsAfter1 = await page.locator('.react-flow__node').count();
    console.log(`  Cards after 1st prompt: ${cardsAfter1}`);

    if (cardsAfter1 > cardsBefore) {
      console.log('✓ Card created on first prompt');
    } else {
      // LLM is chatty — try with more directive prompt
      await textarea.fill('立即调用 spellpaw_add_card 工具，type=storyline, title=雨夜追踪, description=悬疑夜戏');
      await textarea.press('Enter');
      console.log('  Sent directive prompt');

      await expect(async () => {
        const count = await page.locator('.react-flow__node').count();
        expect(count).toBeGreaterThan(cardsBefore);
      }).toPass({ timeout: 30_000, intervals: [1000, 2000] });
      console.log('✓ Card created on directive prompt');
    }

    await page.screenshot({ path: 'test-results/after-llm-chat.png' });
  });

  test('直接调用 Tool Server — 在浏览器连接后', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const cardsBefore = await page.locator('.react-flow__node').count();
    console.log(`  Canvas cards before: ${cardsBefore}`);

    // Now that the browser is connected via useToolBridge, we can call the Tool Server
    // and have it route to the browser's toolRouter via WebSocket
    const uniqueTitle = `DirectToolTest_${Date.now()}`;

    // Call spellpaw_add_card directly via the Tool Server
    const res = await fetch(TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_call_id: `direct_${Date.now()}`,
        params: {
          action: 'add_card',
          type: 'storyline',
          title: uniqueTitle,
          description: 'Created via direct Tool Server call',
        },
        session_id: 'e2e',
        tenant_id: 'e2e',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    console.log('  Tool response:', JSON.stringify(body).slice(0, 200));
    expect(body.is_error).toBe(false);

    // Wait for the new card to appear on the canvas
    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBeGreaterThan(cardsBefore);
    }).toPass({ timeout: 10_000 });

    // Verify the card has the expected title
    const newCard = page.locator('.react-flow__node', { hasText: uniqueTitle });
    await expect(newCard).toBeVisible({ timeout: 5_000 });
    console.log(`✓ Card "${uniqueTitle}" appeared on canvas`);
  });

  test('mock mode — chatStore.sendMessage 也支持创建卡片', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const cardsBefore = await page.locator('.react-flow__node').count();

    // Type a message that matches detectCardIntent regex
    const textarea = page.locator('textarea').first();
    await textarea.fill('创建一张情绪板卡片 测试情绪板');
    await textarea.press('Enter');

    // Mock mode should respond within ~1.5s and create the card
    await expect(async () => {
      const count = await page.locator('.react-flow__node').count();
      expect(count).toBeGreaterThan(cardsBefore);
    }).toPass({ timeout: 10_000 });

    const newCard = page.locator('.react-flow__node', { hasText: '测试情绪板' });
    await expect(newCard).toBeVisible({ timeout: 5_000 });
    console.log('✓ Mock mode created card');
  });

  test('get_canvas 工具返回画布内容', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // First add a card
    const uniqueTitle = `GetCanvasTest_${Date.now()}`;
    await fetch(TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_call_id: `setup_${Date.now()}`,
        params: {
          action: 'add_card',
          type: 'moodboard',
          title: uniqueTitle,
          description: 'For get_canvas test',
        },
        session_id: 'e2e',
        tenant_id: 'e2e',
      }),
    });

    // Wait for card to appear
    await expect(
      page.locator('.react-flow__node', { hasText: uniqueTitle })
    ).toBeVisible({ timeout: 10_000 });

    // Now call get_canvas to verify it sees the new card
    const res = await fetch(TOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_call_id: `query_${Date.now()}`,
        params: { action: 'get_canvas' },
        session_id: 'e2e',
        tenant_id: 'e2e',
      }),
    });

    const body = await res.json();
    expect(body.is_error).toBe(false);
    const canvasText = body.content[0].text;
    console.log('  Canvas text:', canvasText.slice(0, 200));
    expect(canvasText).toContain(uniqueTitle);
    console.log('✓ get_canvas returns the card we created');
  });
});

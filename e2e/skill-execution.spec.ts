/**
 * E2E test: Copilot skill system end-to-end.
 *
 * Verifies the buzzy.now-style skill flow actually works in a real
 * browser:
 *   1. /character-profile  → creates a character card on the canvas
 *   2. /brainstorm-variants → creates 3 storyline cards
 *   3. /analyze-pacing     → produces an analysis message
 *   4. Skill chip click    → inserts the slash command into the input
 *   5. Unknown slash cmd   → falls through gracefully
 */
import { test, expect, type Page } from '@playwright/test';

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const DEMO_PROJECT_ID = 'proj_1';
const TOOL_ENDPOINT = 'http://localhost:5173/tool';

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
  // Wait for Tool Bridge WebSocket to be established (retries can take up to 3s per URL)
  await page.waitForTimeout(5000);
}

async function callTool(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch(TOOL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool_call_id: `e2e_skill_${Date.now()}_${Math.random()}`,
      params: { action, ...params },
      session_id: 'e2e',
      tenant_id: 'e2e',
    }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  return { ok: !body.is_error, text: body.content?.[0]?.text ?? '' };
}

async function chatCardCount(page: Page): Promise<number> {
  return page.locator('.react-flow__node').count();
}

test.describe('Skill system — end-to-end', () => {
  test('character-profile skill creates a character card via direct tool call', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const before = await chatCardCount(page);
    const result = await callTool('spellpaw_skill_character-profile', {
      input: { 姓名: 'E2E测试角色', 职业: 'QA', 年龄: '30' },
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('E2E测试角色');
    expect(result.text).toMatch(/已创建角色卡/);

    // The new card should appear on canvas
    await expect(async () => {
      const count = await chatCardCount(page);
      expect(count).toBeGreaterThan(before);
    }).toPass({ timeout: 5_000 });
  });

  test('brainstorm-variants skill creates 3 storyline cards', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const before = await chatCardCount(page);
    const result = await callTool('spellpaw_skill_brainstorm-variants', {
      input: { 主题: 'AI 觉醒' },
    });
    expect(result.ok).toBe(true);
    expect(result.text).toContain('AI 觉醒');
    expect(result.text).toMatch(/喜剧反差/);
    expect(result.text).toMatch(/悬疑反转/);
    expect(result.text).toMatch(/温情治愈/);

    // 3 new cards should appear
    await expect(async () => {
      const count = await chatCardCount(page);
      expect(count).toBeGreaterThanOrEqual(before + 3);
    }).toPass({ timeout: 5_000 });
  });

  test('analyze-pacing skill returns a composite report', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const result = await callTool('spellpaw_skill_analyze-pacing', { input: {} });
    expect(result.ok).toBe(true);
    // Should include the structure + pacing sections (or the empty
    // diagnostic for an empty project)
    expect(result.text.length).toBeGreaterThan(10);
  });

  test('slash command via chat input runs the skill and shows progress', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const before = await chatCardCount(page);

    // Type a slash command directly in the chat input and send
    const textarea = page.locator('textarea[data-spellpaw-input]').first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('/character-profile 姓名:SlashTestUser');
    await textarea.press('Enter');

    // The skill result should appear in the chat
    await expect(async () => {
      const messages = await page.locator('[class*="prose"]').allTextContents();
      const found = messages.some((m) => m.includes('SlashTestUser'));
      expect(found).toBe(true);
    }).toPass({ timeout: 5_000 });

    // And a new card should appear on canvas
    await expect(async () => {
      const count = await chatCardCount(page);
      expect(count).toBeGreaterThan(before);
    }).toPass({ timeout: 5_000 });
  });

  test('clicking a SkillChip inserts the slash command into the input', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    // Find a skill chip and click it (chips live in the chat input bar)
    const chip = page.locator('button:has-text("/character-profile")').first();
    await expect(chip).toBeVisible({ timeout: 5_000 });
    await chip.click();

    // The textarea should now contain the slash command
    const textarea = page.locator('textarea[data-spellpaw-input]').first();
    const value = await textarea.inputValue();
    expect(value).toContain('/character-profile');
  });

  test('unknown slash command falls through to LLM (no crash)', async ({ page }) => {
    await loginAsDemo(page);
    await openProject(page);

    const textarea = page.locator('textarea[data-spellpaw-input]').first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    // Even though we have no LLM in tests, the page should not crash
    // when an unknown slash command is entered. The text should appear
    // in the user message, and the app stays responsive.
    await textarea.fill('/this-skill-does-not-exist');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    // The user message should be in the chat (just verifying no crash)
    const userMessages = await page.locator('text=/this-skill-does-not-exist/').count();
    expect(userMessages).toBeGreaterThan(0);
  });
});

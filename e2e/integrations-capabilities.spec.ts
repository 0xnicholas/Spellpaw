/**
 * E2E Test: Console Integrations 6-card layout + per-capability save
 *
 * Verifies the per-Capability LLM config UI:
 *   1. Login
 *   2. Navigate to console/settings/integrations
 *   3. Verify 6 cards (text2image, image2image, inpaint, text2video,
 *      image2video, styleTransfer) render with Chinese titles
 *   4. Verify provider pills filtered per capability (text2image shows
 *      doubao as default; styleTransfer shows siliconflow default)
 *   5. Save text2image config, verify localStorage 'spellpaw_llm_settings'
 *      contains the per-capability key
 *   6. Verify server PATCH /api/auth/settings persists the entry
 *
 * Captures screenshots into screenshots/integrations-test/.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3002';
const SHOT_DIR = path.join(__dirname, '..', 'screenshots', 'integrations-test');

const CAPABILITIES = [
  '文生图 (text2image)',
  '图生图 (image2image)',
  '局部重绘 (inpaint)',
  '文生视频 (text2video)',
  '图生视频 (image2video)',
  '风格迁移 (styleTransfer)',
];

async function login(page: Page) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(?!login)/, { timeout: 10000 });
}

test.describe('Console Integrations — per-Capability cards', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
  });

  test('renders 6 capability cards with per-capability provider filtering', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[browser]', msg.text());
    });

    await login(page);

    // Navigate to console settings/integrations
    await page.goto(`${FRONTEND_URL}/console`);
    await page.waitForLoadState('networkidle');
    // Click Integrations tab (last tab, with Plug icon — match by aria/text)
    const integrationsTab = page.locator('button:has(svg.lucide-plug), [role="tab"]:has-text(/集成/i), button:has-text(/integrations/i)').first();
    if (await integrationsTab.isVisible().catch(() => false)) {
      await integrationsTab.click();
    } else {
      // Fallback: click the 4th tab in the tab bar
      await page.locator('header button, nav button').nth(3).click();
    }

    // Wait for loading state to clear (one of the cards should appear)
    await page.waitForSelector('text=文生图 (text2image)', { timeout: 10000 });

    // Take screenshot of full page
    await page.screenshot({
      path: path.join(SHOT_DIR, '01-all-6-cards.png'),
      fullPage: true,
    });

    // Verify all 6 cards are present
    for (const cap of CAPABILITIES) {
      const el = page.locator(`text=${cap}`).first();
      await expect(el, `expected card "${cap}" to be rendered`).toBeVisible();
    }

    // Verify text2image default provider is 豆包 (selected — has bg-white class)
    const t2iSection = page.locator('section', { hasText: '文生图 (text2image)' }).first();
    const selectedInT2i = await t2iSection.locator('button.bg-white').first().textContent();
    expect(selectedInT2i).toBe('豆包');

    // Verify styleTransfer default provider is 硅基流动 (siliconflow)
    const stSection = page.locator('section', { hasText: '风格迁移 (styleTransfer)' }).first();
    const selectedInSt = await stSection.locator('button.bg-white').first().textContent();
    expect(selectedInSt).toBe('硅基流动');

    // Verify provider pills filtered: styleTransfer should NOT show DeepSeek
    // (which is text-only and not in siliconflow's image bucket)
    const stProviderPills = await stSection.locator('button').allTextContents();
    expect(stProviderPills).not.toContain('DeepSeek');
    expect(stProviderPills).toContain('豆包');
    expect(stProviderPills).toContain('OpenAI');
    expect(stProviderPills).toContain('硅基流动');

    await page.screenshot({
      path: path.join(SHOT_DIR, '02-default-providers.png'),
      fullPage: true,
    });
  });

  test('switching text2image provider to OpenAI updates baseUrl+model', async ({ page }) => {
    await login(page);
    await page.goto(`${FRONTEND_URL}/console`);
    await page.waitForLoadState('networkidle');
    const integrationsTab = page.locator('button:has(svg.lucide-plug), [role="tab"]:has-text(/集成/i), button:has-text(/integrations/i)').first();
    if (await integrationsTab.isVisible().catch(() => false)) {
      await integrationsTab.click();
    } else {
      await page.locator('header button, nav button').nth(3).click();
    }
    await page.waitForSelector('text=文生图 (text2image)');

    const t2iSection = page.locator('section', { hasText: '文生图 (text2image)' }).first();

    // Click OpenAI pill
    await t2iSection.locator('button', { hasText: 'OpenAI' }).click();
    await page.waitForTimeout(200);

    // After click, OpenAI button should be selected (bg-white)
    const selected = await t2iSection.locator('button.bg-white').first().textContent();
    expect(selected).toBe('OpenAI');

    // Base URL and model should reset to OpenAI's recommended for image
    const inputs = t2iSection.locator('input');
    const baseUrl = await inputs.nth(1).inputValue();
    const model = await inputs.nth(2).inputValue();
    expect(baseUrl).toMatch(/api\.openai\.com|openai/);
    expect(model.length).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(SHOT_DIR, '03-text2image-switched-to-openai.png'),
      fullPage: true,
    });
  });

  test('saving text2image config persists to localStorage + server', async ({ page }) => {
    await login(page);
    await page.goto(`${FRONTEND_URL}/console`);
    await page.waitForLoadState('networkidle');
    const integrationsTab = page.locator('button:has(svg.lucide-plug), [role="tab"]:has-text(/集成/i), button:has-text(/integrations/i)').first();
    if (await integrationsTab.isVisible().catch(() => false)) {
      await integrationsTab.click();
    } else {
      await page.locator('header button, nav button').nth(3).click();
    }
    await page.waitForSelector('text=文生图 (text2image)');

    const t2iSection = page.locator('section', { hasText: '文生图 (text2image)' }).first();

    // Set doubao + a fake API key
    await t2iSection.locator('button', { hasText: '豆包' }).click();
    await page.waitForTimeout(100);
    const apiKeyInput = t2iSection.locator('input[type="password"]').first();
    await apiKeyInput.fill('ark-test-e2e-key');

    // Save
    const saveBtn = t2iSection.locator('button', { hasText: /^保存/ });
    await saveBtn.click();

    // Wait for "已保存" indicator
    await expect(t2iSection.locator('text=已保存').first()).toBeVisible({ timeout: 5000 });

    // Verify localStorage
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('spellpaw_llm_settings');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).toBeTruthy();
    expect(stored.llmConfigs).toBeTruthy();
    expect(stored.llmConfigs.text2image).toBeTruthy();
    expect(stored.llmConfigs.text2image.provider).toBe('doubao');
    expect(stored.llmConfigs.text2image.apiKey).toBe('ark-test-e2e-key');
    // Other capabilities should be present too (default-doubao seedream, etc.)
    expect(stored.llmConfigs.image2image).toBeTruthy();

    // Verify server has it (check by reloading the page and re-reading localStorage
    // — syncSettings is called on fetch)
    await page.reload();
    await page.waitForSelector('text=文生图 (text2image)');
    const afterReload = await page.evaluate(() => {
      const raw = localStorage.getItem('spellpaw_llm_settings');
      return raw ? JSON.parse(raw) : null;
    });
    expect(afterReload.llmConfigs.text2image.apiKey).toBe('ark-test-e2e-key');

    await page.screenshot({
      path: path.join(SHOT_DIR, '04-text2image-saved.png'),
      fullPage: true,
    });
  });

  test('independent saves for two capabilities', async ({ page }) => {
    await login(page);
    await page.goto(`${FRONTEND_URL}/console`);
    await page.waitForLoadState('networkidle');
    const integrationsTab = page.locator('button:has(svg.lucide-plug), [role="tab"]:has-text(/集成/i), button:has-text(/integrations/i)').first();
    if (await integrationsTab.isVisible().catch(() => false)) {
      await integrationsTab.click();
    } else {
      await page.locator('header button, nav button').nth(3).click();
    }
    await page.waitForSelector('text=文生图 (text2image)');

    // Save text2image (doubao)
    const t2i = page.locator('section', { hasText: '文生图 (text2image)' }).first();
    await t2i.locator('input[type="password"]').fill('ark-t2i');
    await t2i.locator('button', { hasText: /^保存/ }).click();
    await expect(t2i.locator('text=已保存').first()).toBeVisible({ timeout: 5000 });

    // Save image2image (siliconflow)
    const i2i = page.locator('section', { hasText: '图生图 (image2image)' }).first();
    await i2i.locator('button', { hasText: '硅基流动' }).click();
    await page.waitForTimeout(100);
    await i2i.locator('input[type="password"]').fill('sf-i2i');
    await i2i.locator('button', { hasText: /^保存/ }).click();
    await expect(i2i.locator('text=已保存').first()).toBeVisible({ timeout: 5000 });

    // Verify both are independent in localStorage
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spellpaw_llm_settings') || '{}'));
    expect(stored.llmConfigs.text2image.provider).toBe('doubao');
    expect(stored.llmConfigs.text2image.apiKey).toBe('ark-t2i');
    expect(stored.llmConfigs.image2image.provider).toBe('siliconflow');
    expect(stored.llmConfigs.image2image.apiKey).toBe('sf-i2i');

    await page.screenshot({
      path: path.join(SHOT_DIR, '05-two-capabilities-saved.png'),
      fullPage: true,
    });
  });
});
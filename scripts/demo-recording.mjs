/**
 * End-to-end demo recording for the per-Capability LLM Integrations
 * page. Captures a video + a series of annotated screenshots
 * showing the new ProviderSelect dropdown UI.
 *
 * Outputs:
 *   screenshots/demo/video.webm        — full playthrough
 *   screenshots/demo/01-09-*.png       — key moments
 */

import { chromium } from 'playwright';
import fs from 'fs';

const SHOT_DIR = 'screenshots/demo';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: SHOT_DIR,
    size: { width: 1440, height: 900 },
  },
});

const page = await ctx.newPage();

// Track API calls for observability
const apiLog = [];
page.on('response', (r) => {
  if (r.url().includes('/api/auth/')) {
    apiLog.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:3002', '')}`);
  }
});

// 1. Login
console.log('▶ Step 1: login');
await page.goto('http://localhost:5173/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${SHOT_DIR}/01-login-page.png`, fullPage: false });
await page.fill('input[type="email"]', 'demo@spellpaw.xyz');
await page.fill('input[type="password"]', 'password123');
await page.screenshot({ path: `${SHOT_DIR}/02-login-filled.png`, fullPage: false });
await page.locator('button[type="submit"]').click();
await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 });
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${SHOT_DIR}/03-project-list.png`, fullPage: false });

// 2. Navigate to console Integrations
console.log('▶ Step 2: navigate to console Integrations');
await page.goto('http://localhost:5173/console');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
await page.locator('button:has-text("集成")').click();
await page.waitForSelector('text=文生图 (text2image)', { timeout: 10000 });
await page.waitForTimeout(500);

// 3. Initial view of all 9 cards
console.log('▶ Step 3: 9-capability overview');
await page.screenshot({ path: `${SHOT_DIR}/04-integrations-overview-top.png`, fullPage: false });

// 4. Scroll to see pre-configured text2image card detail
console.log('▶ Step 4: text2image pre-configured');
const t2i = page.locator('section', { hasText: '文生图 (text2image)' }).first();
await t2i.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/05-text2image-configured.png`, fullPage: false });

// 5. Open dropdown on text2image to show provider options
console.log('▶ Step 5: open text2image dropdown');
await t2i.locator('[aria-haspopup="listbox"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT_DIR}/06-text2image-dropdown-open.png`, fullPage: false });

// 6. Hover OpenAI to show selection state
const listbox = page.getByRole('listbox');
await listbox.locator('[role="option"]', { hasText: 'OpenAI' }).hover();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/07-dropdown-hover-openai.png`, fullPage: false });

// Close without selecting
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 7. image2image: show independent config (siliconflow)
console.log('▶ Step 6: image2image independent config');
const i2i = page.locator('section', { hasText: '图生图 (image2image)' }).first();
await i2i.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/08-image2image-siliconflow.png`, fullPage: false });

// 8. Open its dropdown
await i2i.locator('[aria-haspopup="listbox"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT_DIR}/09-image2image-dropdown.png`, fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 9. Scroll down to show text2audio (new capability)
console.log('▶ Step 7: text2audio new capability');
const t2a = page.locator('section', { hasText: '文生音频 (text2audio)' }).first();
await t2a.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/10-text2audio-openai-tts.png`, fullPage: false });

// 10. Scroll to text2model (no providers)
console.log('▶ Step 8: text2model placeholder');
const t2m = page.locator('section', { hasText: '文生模型 (text2model)' }).first();
await t2m.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/11-text2model-placeholder.png`, fullPage: false });

// 11. Scroll all the way back to top, then save a new capability to show "已保存"
console.log('▶ Step 9: save text2image and capture success');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

// Scroll back to text2image
await t2i.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

// Type an apiKey into text2image (already has doubao + ark-test from earlier tests)
const apiKeyInput = t2i.locator('input[type="password"]').first();
await apiKeyInput.click();
await apiKeyInput.fill('ark-demo-recording-key');
await page.waitForTimeout(200);

// Click 保存
await t2i.locator('button', { hasText: /^保存/ }).click();
await page.waitForSelector('text=已保存', { timeout: 5000 });
await page.screenshot({ path: `${SHOT_DIR}/12-saved-indicator.png`, fullPage: false });

// 12. Reload to show persistence
console.log('▶ Step 10: reload to show persistence');
await page.reload();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
// After reload, we're back on /console but default tab is profile — click 集成
await page.locator('button:has-text("集成")').click();
await page.waitForSelector('text=文生图 (text2image)', { timeout: 10000 });
await page.waitForTimeout(800);
await t2i.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/13-after-reload-persisted.png`, fullPage: false });

// 13. Final full-page screenshot
console.log('▶ Step 11: full page summary');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/14-full-page-final.png`, fullPage: true });

console.log('\n=== API calls captured ===');
apiLog.forEach((l) => console.log(' ', l));

console.log('\n=== Demo complete ===');
console.log(`Screenshots: ${SHOT_DIR}/`);

// Close browser; the recorded video is flushed to disk when the context closes
await ctx.close();
await browser.close();
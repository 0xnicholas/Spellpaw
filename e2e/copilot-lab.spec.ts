/**
 * Debug-only: 验证 /copilot-lab 能独立访问并正常渲染。
 * 失败时自动截图到 e2e/screenshots/。
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

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects$/, { timeout: 15_000 });
}

test('访问 /copilot-lab 后页面有内容且无报错', async ({ page }) => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await loginAsDemo(page);

  await page.goto(`${FRONTEND_URL}/copilot-lab`);
  await page.waitForTimeout(2000); // 等动画 + 路由切换

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab.png'), fullPage: true });

  // 基本可见性断言
  const headerText = await page.locator('text=Copilot Lab').first().textContent();
  expect(headerText).toBeTruthy();

  const banner = await page.locator('text=Lab mode').count();
  expect(banner).toBeGreaterThan(0);

  // Inspector 的 3 个 tab 都应该出现
  await expect(page.getByRole('button', { name: 'System Prompt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SSE' })).toBeVisible();

  // 清空事件后发条消息 —— 验证 SSE 流是否开始
  const textarea = page.locator('textarea[data-spellpaw-input]');
  await expect(textarea).toBeVisible();
  await textarea.fill('ping');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-after-send.png'), fullPage: true });

  // 切到 SSE tab 看是否有事件流
  await page.getByRole('button', { name: 'SSE' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-sse-tab.png'), fullPage: true });

  // 验证 @ 下拉：默认 Lab 无画布，应显示空状态 + Load Demo Canvas 按钮
  await page.getByRole('button', { name: '@ 引用画布元素' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-at-empty.png'), fullPage: true });

  // 点 Load Demo Canvas
  await page.getByRole('button', { name: 'Load Demo Canvas' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-at-demo.png'), fullPage: true });

  // 选第一个 demo 卡片
  const firstCard = page.locator('button', { hasText: 'Scene 1' }).first();
  await firstCard.click();
  await page.waitForTimeout(300);

  // 验证消息框出现引用 token
  const chatInput = page.locator('textarea[data-spellpaw-input]');
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toContain('@[Scene 1');
  expect(inputValue).toContain('demo-scene-1');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-at-inserted.png'), fullPage: true });

  // 验证 System Prompt 可编辑 + 重启 Session
  await page.getByRole('button', { name: 'System Prompt' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '编辑' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-prompt-edit.png'), fullPage: true });

  // 修改 prompt —— 选 prompt 编辑器（不取 chat input 那个 data-spellpaw-input 的）
  const editor = page.locator('textarea:not([data-spellpaw-input])').first();
  const newPrompt = '你是测试用的精简 system prompt。只回 ack。';
  await editor.fill(newPrompt);
  await page.waitForTimeout(300);

  // 点保存并重启 —— 按文本选择避免 role 多匹配问题
  const saveBtn = page.locator('button', { hasText: '保存并重启 Session' });
  await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await saveBtn.click();
  await page.waitForTimeout(5000); // 等 session 重建 + 第一个 turn
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-prompt-after-restart.png'), fullPage: true });

  // 验证：编辑模式退出，且 pre 内容已经反映新 prompt
  const viewText = await page.locator('pre').first().textContent();
  expect(viewText).toContain('精简 system prompt');
  expect(viewText).toContain('只回');

  // 切到 Tools tab
  await page.getByRole('button', { name: 'Tools' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-tools-tab.png'), fullPage: true });

  // 切到 System Prompt tab
  await page.getByRole('button', { name: 'System Prompt' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot-lab-prompt-tab.png'), fullPage: true });

  // 输出抓到的错误供调试
  if (pageErrors.length > 0) {
    console.log('PAGE ERRORS:', JSON.stringify(pageErrors, null, 2));
  }
  if (consoleErrors.length > 0) {
    console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
  }

  // 必须没有 page error（runtime exception）
  expect(pageErrors).toEqual([]);
});
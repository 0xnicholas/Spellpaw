/**
 * 验证 workspace Copilot 合并 Lab 功能后的关键行为：
 *  - inputLeftToolbar 出现 @ 和 上传按钮
 *  - View Prompt modal 能打开 + 显示 prompt
 *  - @ 选中后 setSelectedCardId 同步（contextChip 联动）
 */
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_EMAIL = 'demo@spellpaw.xyz';
const DEMO_PASSWORD = 'password123';
const DEMO_PROJECT_ID = 'proj_1';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/projects$/, { timeout: 15_000 });
}

test('workspace Copilot 合并 Lab 特性', async ({ page }) => {
  await loginAsDemo(page);
  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  await page.waitForSelector('.react-flow', { timeout: 15_000 });
  await page.waitForTimeout(2000); // 等 chat session 初始化

  // 1. header 应有 New / View Prompt / Share
  await expect(page.getByRole('button', { name: /New/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /View Prompt/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Share/ })).toBeVisible();

  // 2. 输入框 leftToolbar 应有 @ 和上传按钮
  await expect(page.getByRole('button', { name: /@ 引用画布元素/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /上传文件/ })).toBeVisible();

  // 截图：整体布局
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'workspace-merge-overview.png'), fullPage: true });

  // 3. 点 View Prompt 打开 modal
  await page.getByRole('button', { name: /View Prompt/ }).click();
  await page.waitForTimeout(500);
  // 直接验证 modal 出现（用文本查询）
  await expect(page.locator('text=System Prompt（只读）').first()).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'workspace-merge-view-prompt.png'), fullPage: true });

  // 关闭 modal（点 backdrop）
  await page.mouse.click(50, 50);
  await page.waitForTimeout(300);

  // 4. @ 按钮打开下拉
  await page.getByRole('button', { name: /@ 引用画布元素/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'workspace-merge-at-menu.png'), fullPage: true });

  // 5. workspace 项目画布可能为空 —— 这里不强制点卡片，仅验证菜单能打开
  //    （空状态本身已是预期行为：有 toast 提示用户先在画布上添加卡片）
  const menuHasCards = await page.locator('button:has(code)').count();
  if (menuHasCards > 0) {
    await page.locator('button:has(code)').first().click({ timeout: 3000 });
    await page.waitForTimeout(300);
    const chatInput = page.locator('textarea[data-spellpaw-input]');
    const value = await chatInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  } else {
    // 验证空状态提示
    await expect(page.locator('text=当前画布为空')).toBeVisible();
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'workspace-merge-at-inserted.png'), fullPage: true });
});
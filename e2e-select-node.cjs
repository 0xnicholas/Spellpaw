const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:5175';
const VIEWPORT = { width: 1440, height: 900 };

const authState = {
  origins: [{
    origin: BASE_URL,
    localStorage: [{
      name: 'spellpaw_auth',
      value: JSON.stringify({
        state: {
          isAuthenticated: true,
          user: { id: 'u_1', name: '创作者', email: 'creator@spellpaw.app' }
        }
      })
    }]
  }]
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, storageState: authState });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/project/proj_1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click on a scene node in the tree to trigger selection and bulk action bar
  const sceneNode = await page.locator('text=Scene 1-1: Cafe Encounter').first();
  if (await sceneNode.isVisible().catch(() => false)) {
    await sceneNode.click();
  } else {
    // Fallback: try clicking by partial text
    const fallback = await page.locator('.truncate:text("Scene 1-1")').first();
    if (await fallback.isVisible().catch(() => false)) {
      await fallback.click();
    }
  }

  await page.waitForTimeout(1000);

  // Screenshot with selection
  await page.screenshot({ path: path.join(__dirname, 'screenshots', '05-selected-node.png'), fullPage: false });

  // Also click on a shot to see detail panel
  const shotNode = await page.locator('text=Shot 1: Establishing').first();
  if (await shotNode.isVisible().catch(() => false)) {
    await shotNode.click();
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', '06-detail-panel.png'), fullPage: false });

  await browser.close();
  console.log('Screenshots saved: 05-selected-node.png, 06-detail-panel.png');
})();

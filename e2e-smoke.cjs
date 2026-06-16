const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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
          token: 'demo-token',
          user: { id: 'demo-user', name: 'Demo User', email: 'demo@spellpaw.xyz' }
        }
      })
    }]
  }]
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, storageState: authState });
  const outDir = path.resolve(__dirname, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];

  // Helper
  async function testPage(name, url, waitFor, fullPage = false) {
    const page = await context.newPage();
    const logs = [];
    const errors = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => errors.push(err.message));

    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(waitFor);

      // Check for white screen / empty body
      const bodyText = await page.evaluate(() => document.body.innerText.trim());
      const hasContent = bodyText.length > 10;

      // Check for React error overlays
      const hasErrorOverlay = await page.locator('div[role="dialog"]').count() > 0;

      const screenshotPath = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage });

      results.push({
        name,
        url,
        status: errors.length === 0 && hasContent ? 'PASS' : 'FAIL',
        bodyLength: bodyText.length,
        errors,
        logs: logs.slice(0, 10),
        screenshot: screenshotPath
      });
    } catch (e) {
      results.push({ name, url, status: 'CRASH', error: e.message });
    } finally {
      await page.close();
    }
  }

  // 1. Login page (no auth)
  const anonContext = await browser.newContext({ viewport: VIEWPORT });
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await anonPage.waitForTimeout(1500);
  await anonPage.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: false });
  const loginText = await anonPage.evaluate(() => document.body.innerText.trim());
  results.push({ name: '01-login', url: '/login', status: loginText.length > 10 ? 'PASS' : 'FAIL', bodyLength: loginText.length });
  await anonPage.close();
  await anonContext.close();

  // 2. Projects list
  await testPage('02-projects', '/projects', 2000);

  // 3. Workspace (main editing UI)
  await testPage('03-workspace', '/project/proj_1', 4000);

  // 4. Template market
  await testPage('04-templates', '/templates', 2000);

  await browser.close();

  // Report
  console.log('\n========== E2E Smoke Test Report ==========\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '💥';
    console.log(`${icon} ${r.name} (${r.url}) — ${r.status}`);
    if (r.bodyLength !== undefined) console.log(`   body text length: ${r.bodyLength}`);
    if (r.errors?.length) console.log(`   page errors: ${r.errors.join('; ')}`);
    if (r.logs?.length) console.log(`   logs: ${r.logs.join('\n         ')}`);
    if (r.error) console.log(`   crash: ${r.error}`);
    console.log('');
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  console.log(`Summary: ${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
})();

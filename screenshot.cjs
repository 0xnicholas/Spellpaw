const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'spellpaw_auth', value: '{"state":{"isAuthenticated":true,"user":{"id":"u_1","name":"创作者","email":"creator@spellpaw.app"}}}' }] }],
    },
  });

  const outDir = path.resolve(__dirname, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const page = await context.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`ERROR: ${err.message}`));

  await page.goto('http://localhost:5173/project/proj_1');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, '03-workspace.png'), fullPage: false });

  fs.writeFileSync(path.join(outDir, 'console.log'), logs.join('\n'));
  console.log('Console logs:', logs.slice(0, 20).join('\n') || 'No logs');

  await browser.close();
})();

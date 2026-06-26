/**
 * Visual verification screenshot for the redesigned login page.
 * Loads the login page at desktop & mobile widths and saves PNGs.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.resolve(__dirname, 'screenshots');
  const url = 'http://localhost:5173/login';

  // Desktop
  const desktopCtx = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
  const desktopPage = await desktopCtx.newPage();
  // Ensure the auth state is empty so we land on the login page.
  await desktopPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await desktopPage.evaluate(() => localStorage.removeItem('spellpaw_auth'));
  await desktopPage.goto(url, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);
  const desktopOut = path.join(outDir, 'login-desktop.png');
  await desktopPage.screenshot({ path: desktopOut, fullPage: false });
  console.log('saved', desktopOut);
  await desktopCtx.close();

  // Mobile (collage hidden, form only)
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => localStorage.removeItem('spellpaw_auth'));
  await mobilePage.goto(url, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(500);
  const mobileOut = path.join(outDir, 'login-mobile.png');
  await mobilePage.screenshot({ path: mobileOut, fullPage: false });
  console.log('saved', mobileOut);
  await mobileCtx.close();

  await browser.close();
})();

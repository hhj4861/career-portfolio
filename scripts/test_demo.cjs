/* BASE_URL=http://127.0.0.1:PORT node scripts/test_demo.cjs
 * Without BASE_URL, serves an isolated fixture using the checked-in demo files.
 * Current executor note: Chromium is blocked by socket() Operation not permitted.
 * Run this suite in a browser-enabled environment; test_demo_state.cjs is a
 * separate state-only check and does not substitute for browser or layout QA. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

(async () => {
  let server;
  let browser;
  const messages = [];
  try {
    let base = process.env.BASE_URL;
    if (!base) {
      server = http.createServer((request, response) => {
        if (request.url === '/demo.js') {
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          response.end(fs.readFileSync(path.join(root, 'demo.js')));
        } else if (request.url === '/demo.css') {
          response.setHeader('Content-Type', 'text/css; charset=utf-8');
          response.end(fs.readFileSync(path.join(root, 'templates/demo.css')));
        } else {
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="demo.css"><style>*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#172b3a;font:16px/1.75 system-ui,sans-serif}main{max-width:1100px;padding:24px 20px;margin:auto}h2{font-size:30px;line-height:1.4}.section-title{display:flex;gap:25px;justify-content:space-between}.eyebrow{font-size:11px}.pill{font-size:12px}@media(max-width:700px){.section-title{display:block}h2{font-size:25px}}</style><script src="demo.js" defer></script></head><body><main>${fs.readFileSync(path.join(root, 'templates/demo.html'), 'utf8')}</main></body></html>`);
        }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${server.address().port}/`;
    }
    const systemChromium = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ headless: true, executablePath: systemChromium });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#demo [data-demo-app]').waitFor({ state: 'visible' });
    const demo = page.locator('#demo');
    const postLoadRequests = [];
    page.on('request', request => postLoadRequests.push(request.url()));
    const check = (condition, message) => { assert(condition, message); messages.push(message); };
    const text = async id => (await page.locator(`#demo-${id}`).textContent()).trim();
    const analyze = async () => {
      await page.locator('#demo-analyze').click();
      await page.waitForFunction(() => !document.getElementById('demo-analyze').disabled);
    };
    const questions = page.locator('#demo-questions .demo-question');
    check(await text('unresolved') === '—', 'Initial state has no invented completed review');
    check(await demo.locator('.demo-disclaimer').textContent().then(t => t.includes('실제 회사 시스템의 복제가 아닙니다') && t.includes('가상 데이터')), 'Fictional, non-production scope is visible');
    await analyze();
    check(await questions.count() === 2 && await text('unresolved') === '2개', 'Analysis creates two unresolved questions');
    check(await text('approval-state') === '대기' && await page.locator('#demo-approve').isDisabled(), 'Analysis completion never grants approval');
    await questions.nth(0).locator('select').selectOption('partial');
    await analyze();
    check(await questions.nth(0).locator('select').inputValue() === 'partial' && await text('unresolved') === '2개', 'Reanalysis preserves incomplete answers and unresolved questions');
    await questions.nth(0).locator('select').selectOption('complete');
    await questions.nth(0).locator('[data-action="toggle-evidence"]').click();
    await questions.nth(0).locator('[data-action="check-evidence"]').check();
    await analyze();
    check(await text('unresolved') === '1개' && await text('evidence-count') === '1 / 2', 'Reanalysis preserves sufficient answers and confirmed evidence');
    await page.locator('#demo-scenario').selectOption('not-null');
    check(await text('unresolved') === '—', 'New scenario has isolated state');
    await analyze();
    await page.locator('#demo-scenario').selectOption('index');
    check(await text('unresolved') === '1개' && await text('evidence-count') === '1 / 2', 'Switching back restores the exact previous review state');
    await questions.nth(1).locator('select').selectOption('complete');
    await questions.nth(1).locator('[data-action="toggle-evidence"]').click();
    await questions.nth(1).locator('[data-action="check-evidence"]').check();
    check(await page.locator('#demo-approve').isDisabled(), 'All evidence is insufficient without explicit user acknowledgement');
    await page.locator('#demo-acknowledge').focus();
    await page.keyboard.press('Space');
    check(await page.locator('#demo-approve').isEnabled(), 'Keyboard acknowledgement unlocks manual approval');
    await page.keyboard.press('Tab');
    check(await page.locator('#demo-approve').evaluate(node => node === document.activeElement), 'Approval is reachable with the keyboard');
    await page.keyboard.press('Enter');
    check(await text('approval-state') === '승인됨' && await page.locator('#demo-approve').isDisabled(), 'Keyboard approval changes local state once and disables repeat approval');
    await analyze();
    check(await text('approval-state') === '대기' && !await page.locator('#demo-acknowledge').isChecked() && await text('evidence-count') === '2 / 2', 'Reanalysis preserves evidence but invalidates previous approval');
    await page.locator('#demo-acknowledge').check();
    await page.locator('#demo-approve').click();
    await questions.nth(0).locator('select').selectOption('partial');
    check(await text('approval-state') === '대기' && await text('unresolved') === '1개' && await text('evidence-count') === '1 / 2', 'Answer edits invalidate related evidence and approval');
    await page.locator('#demo-analyze').click();
    await page.locator('#demo-reset').click();
    await page.waitForTimeout(450);
    check(await text('unresolved') === '—' && await questions.count() === 0, 'Reset cancels pending analysis without stale results');
    await page.locator('#demo-analyze').click();
    await page.locator('#demo-scenario').selectOption('drop-column');
    await page.waitForTimeout(450);
    check(await text('unresolved') === '—' && await text('ddl').then(t => t.includes('DROP COLUMN')), 'Scenario change cancels pending analysis without cross-scenario contamination');
    await page.locator('#demo-analyze').evaluate(button => { button.click(); button.click(); button.click(); });
    await page.waitForFunction(() => !document.getElementById('demo-analyze').disabled);
    check(await text('analysis-badge') === '분석 완료 · 1회' && await questions.count() === 2, 'Repeated analysis clicks produce one run and no duplicate questions');
    await page.locator('#demo-scenario').selectOption('not-null');
    check(await text('analysis-badge') === '분석 완료 · 1회', 'Resetting another scenario does not clear this scenario');
    for (const scenario of ['index', 'not-null', 'drop-column']) {
      await page.locator('#demo-scenario').selectOption(scenario);
      if (await questions.count() === 0) await analyze();
      for (let i = 0; i < 2; i += 1) {
        await questions.nth(i).locator('select').selectOption('complete');
        const toggle = questions.nth(i).locator('[data-action="toggle-evidence"]');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
        await questions.nth(i).locator('[data-action="check-evidence"]').check();
      }
      await page.locator('#demo-acknowledge').check();
      await page.locator('#demo-approve').click();
      check(await text('approval-state') === '승인됨', `${scenario}: full review journey completes`);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(80);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '360px layout has no horizontal page overflow');
    check(await page.locator('.demo-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length === 1), '360px layout uses a single column');
    await page.screenshot({ path: '/tmp/career-demo-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.screenshot({ path: '/tmp/career-demo-desktop.png', fullPage: true });
    check(await page.locator('.demo-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length === 2), 'Desktop layout uses two columns');
    check(await page.locator('#demo-feedback').getAttribute('aria-live') === 'polite', 'Meaningful status feedback is exposed to assistive technology');
    check(errors.length === 0, `No browser JavaScript errors (${errors.length})`);
    // In isolated mode every post-load request would originate from this demo.
    if (!process.env.BASE_URL) check(postLoadRequests.length === 0, `No interaction-triggered network requests (${postLoadRequests.length})`);
    await page.reload({ waitUntil: 'networkidle' });
    check(await text('approval-state') === '대기' && await text('unresolved') === '—', 'Reload clears session-only simulation state');
    console.log(`PASS: ${messages.length} checks\n${messages.map(message => `  ✓ ${message}`).join('\n')}`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

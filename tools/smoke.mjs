// Headless-Chrome smoke test. Usage: node tools/smoke.mjs [--level N] [--shots]
// Serves repo root on a free port, loads the game, collects console errors, drives input, screenshots to shots/.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright-core');

const args = process.argv.slice(2);
const level = args.includes('--level') ? args[args.indexOf('--level') + 1] : null;
const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/${level ? `?level=${level}` : ''}`;

const errors = [];
const logs = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error') errors.push(t); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });

async function shot(name) { fs.mkdirSync('shots', { recursive: true }); await page.screenshot({ path: `shots/${name}.png` }); }
const state = async () => page.evaluate(() => (window.__GAME ? { state: window.__GAME.state, level: window.__GAME.levelIndex, player: window.__GAME.player && { x: Math.round(window.__GAME.player.x), y: Math.round(window.__GAME.player.y), hp: window.__GAME.player.hp }, frame: window.__GAME.frame } : null));

try {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await shot('01-title');
  console.log('after load:', JSON.stringify(await state()));
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');       // skip level card if any
  await page.waitForTimeout(2500);
  await shot('02-start');
  console.log('after start:', JSON.stringify(await state()));
  // run right + jump for a while
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(350); if (i % 4 === 3) await page.keyboard.press('KeyX'); }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  await shot('03-play');
  const s = await state();
  console.log('after play:', JSON.stringify(s));
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(350); }
  await page.keyboard.up('ArrowRight');
  await shot('04-play2');
  console.log('after play2:', JSON.stringify(await state()));
  await page.keyboard.press('KeyP'); await page.waitForTimeout(300); await shot('05-pause'); await page.keyboard.press('KeyP');
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); })(); }));
  console.log('rAF/s ~', fps);
} catch (e) { errors.push(`[harness] ${e.message}`); }

const lastLogs = logs.slice(-15);
console.log('--- console (last 15) ---\n' + lastLogs.join('\n'));
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

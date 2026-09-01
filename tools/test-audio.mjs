// Headless-Chrome audio test. Usage: node tools/test-audio.mjs
// Serves repo root, loads shots/_audio-test.html (imports src/audio/audio.js, plays every sfx + every
// theme for 300 ms each), reports console errors + AudioContext.state. Exit 1 on any problem.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright-core');

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
const url = `http://127.0.0.1:${port}/shots/_audio-test.html`;

const errors = [];
const logs = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('console', (m) => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || m.type() === 'warning') errors.push(t); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });

let result = null;
try {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__AUDIO_RESULT !== null, null, { timeout: 30000 });
  result = await page.evaluate(() => window.__AUDIO_RESULT);
} catch (e) { errors.push(`[harness] ${e.message}`); }

console.log('--- result ---');
console.log(JSON.stringify(result, null, 2));
if (result) {
  if (result.state !== 'running') errors.push(`[audio] AudioContext.state = ${result.state} (expected running)`);
  if (result.missingSfx?.length) errors.push(`[audio] missing sfx: ${result.missingSfx.join(', ')}`);
  if (result.missingThemes?.length) errors.push(`[audio] missing themes: ${result.missingThemes.join(', ')}`);
  if (result.errors?.length) errors.push(...result.errors.map((e) => `[page] ${e}`));
  if (result.played?.length !== 21) errors.push(`[audio] played ${result.played?.length} sfx, expected 21`);
  if (result.themes?.length !== 6) errors.push(`[audio] played ${result.themes?.length} themes, expected 6`);
  // shuk = 168 bpm → 11.2 steps/s; 2.5 s soak must schedule ≥ 24 steps and never fall behind the clock
  if (!(result.soak?.steps >= 24)) errors.push(`[audio] soak scheduled only ${result.soak?.steps} steps in 2.5 s`);
  if (!(result.soak?.notes >= 20)) errors.push(`[audio] soak scheduled only ${result.soak?.notes} notes`);
  if (result.stats?.late > 0) errors.push(`[audio] scheduler fell behind ${result.stats.late} times`);
  if (result.stats?.current !== null) errors.push(`[audio] music still marked current after stopMusic: ${result.stats?.current}`);
}
console.log('--- console ---\n' + logs.join('\n'));
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

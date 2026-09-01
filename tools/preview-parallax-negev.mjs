// Renders src/parallax/negev.js (sky + layers + fog) in headless Chrome at 3x and screenshots to shots/.
// Usage: node tools/preview-parallax-negev.mjs   → shots/parallax-negev-cam{0,400}-t{0,2}.png (+ a camY shot); exit 1 on console errors
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
  if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

fs.mkdirSync('shots', { recursive: true });
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block;image-rendering:pixelated}</style>
<canvas id="out" width="960" height="540"></canvas>
<script type="module">
  import px from '/src/parallax/negev.js';
  const W = 320, H = 180;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const g = src.getContext('2d'); g.imageSmoothingEnabled = false;
  const out = document.getElementById('out').getContext('2d'); out.imageSmoothingEnabled = false;
  window.render = (camX, camY, t) => {
    g.clearRect(0, 0, W, H);
    px.sky(g, W, H, t);
    for (const L of px.layers) L.draw(g, camX, camY, W, H, t);
    if (px.fog) px.fog(g, W, H, t);
    out.clearRect(0, 0, 960, 540); out.drawImage(src, 0, 0, 960, 540);
  };
  window.bench = (n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) window.render(i * 3, 0, i / 60); return (performance.now() - t0) / n; };
  window.__ready = true;
</script>`;
const pagePath = path.join('shots', '_preview-negev.html');
fs.writeFileSync(pagePath, html);

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });
try {
  await page.goto(`http://127.0.0.1:${port}/${pagePath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 5000 });
  for (const [camX, camY, t] of [[0, 0, 0], [0, 0, 2], [400, 0, 0], [400, 0, 2], [1200, 30, 1]]) {
    await page.evaluate(([cx, cy, tt]) => window.render(cx, cy, tt), [camX, camY, t]);
    const name = `shots/parallax-negev-cam${camX}${camY ? `-y${camY}` : ''}-t${t}.png`;
    await page.screenshot({ path: name });
    console.log(`wrote ${name}`);
  }
  const ms = await page.evaluate(() => window.bench(300));
  console.log(`avg full-frame render: ${ms.toFixed(3)} ms (sky+5 layers+fog @320x180, incl. 3x blit)`);
} catch (e) { errors.push(`[harness] ${e.message}`); }
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

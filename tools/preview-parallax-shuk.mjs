// Renders src/parallax/shuk.js (sky + layers + fog) at a few camX/t combos, scaled 3x to 960x540, into shots/parallax-shuk-*.png
// Usage: node tools/preview-parallax-shuk.mjs
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
  const f = path.join(ROOT, p); if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

fs.mkdirSync('shots', { recursive: true });
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000}canvas{display:block}</style>
<canvas id="big" width="960" height="540"></canvas>
<script type="module">
  import shuk from '/src/parallax/shuk.js';
  const W = 320, H = 180;
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const sctx = small.getContext('2d'); sctx.imageSmoothingEnabled = false;
  const big = document.getElementById('big'); const bctx = big.getContext('2d'); bctx.imageSmoothingEnabled = false;
  window.render = (camX, camY, t) => {
    sctx.clearRect(0, 0, W, H);
    shuk.sky(sctx, W, H, t);
    for (const L of shuk.layers) L.draw(sctx, camX, camY, W, H, t);
    if (shuk.fog) shuk.fog(sctx, W, H, t);
    bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0, 0, 960, 540);
    bctx.drawImage(small, 0, 0, W, H, 0, 0, 960, 540);
    return shuk.layers.map((l) => l.speed);
  };
  window.bench = (n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) window.render(i * 3, 0, i / 60); return (performance.now() - t0) / n; };
  window.ready = true;
</script>`;
fs.writeFileSync('shots/_preview-parallax-shuk.html', html);

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text()) && !/404/.test(m.text())) errors.push(`[console.error] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`[http ${r.status()}] ${r.url()}`); });

try {
  await page.goto(`http://127.0.0.1:${port}/shots/_preview-parallax-shuk.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, null, { timeout: 5000 });
  const combos = [[0, 0, 0], [400, 0, 0], [0, 0, 2], [400, 0, 2], [1234, 40, 5.5]];
  for (const [camX, camY, t] of combos) {
    const speeds = await page.evaluate(([cx, cy, tt]) => window.render(cx, cy, tt), [camX, camY, t]);
    const name = `shots/parallax-shuk-x${camX}-y${camY}-t${t}.png`;
    await page.screenshot({ path: name, clip: { x: 0, y: 0, width: 960, height: 540 } });
    console.log('wrote', name, 'speeds', speeds.join(','));
  }
  const ms = await page.evaluate(() => window.bench(300));
  console.log(`avg full-frame render (sky+5 layers+fog, incl. 3x blit): ${ms.toFixed(3)} ms`);
} catch (e) { errors.push(`[harness] ${e.message}`); }

console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

// Preview the Ayalon parallax module. Usage: node tools/preview-parallax-ayalon.mjs
// Serves repo root, renders sky+layers+fog at camX=0/400 and t=0/2, scaled 3x to 960x540, screenshots to shots/parallax-ayalon-*.png.
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
const HTML = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000}canvas{display:block}</style>
<canvas id="big" width="960" height="540"></canvas>
<script type="module">
  import px from '/src/parallax/ayalon.js';
  const W = 320, H = 180;
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const ctx = small.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const big = document.getElementById('big'); const bctx = big.getContext('2d'); bctx.imageSmoothingEnabled = false;
  window.render = (camX, camY, t) => {
    ctx.clearRect(0, 0, W, H);
    const t0 = performance.now();
    px.sky(ctx, W, H, t);
    for (const L of px.layers) L.draw(ctx, camX, camY, W, H, t);
    if (px.fog) px.fog(ctx, W, H, t);
    const ms = performance.now() - t0;
    bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0, 0, 960, 540); bctx.drawImage(small, 0, 0, 960, 540);
    return ms;
  };
  window.bench = (n) => { let tot = 0; for (let i = 0; i < n; i++) tot += window.render(i * 3, 0, i / 60); return tot / n; };
  window.ready = true;
</script>`;
const htmlPath = path.join('shots', '_preview-ayalon.html');
fs.writeFileSync(htmlPath, HTML);

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });

try {
  await page.goto(`http://127.0.0.1:${port}/${htmlPath}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, null, { timeout: 5000 });
  const cases = [[0, 0, 0], [0, 0, 2], [400, 0, 0], [400, 0, 2], [700, 0, 3], [400, 20, 5.3], [1200, 0, 9.1]];
  for (const [camX, camY, t] of cases) {
    const ms = await page.evaluate(([cx, cy, tt]) => window.render(cx, cy, tt), [camX, camY, t]);
    const name = `shots/parallax-ayalon-cam${camX}${camY ? `-y${camY}` : ''}-t${String(t).replace('.', '_')}.png`;
    await page.screenshot({ path: name });
    console.log(`${name}  (draw ${ms.toFixed(2)} ms, first call includes precompute)`);
  }
  const avg = await page.evaluate(() => window.bench(120));
  console.log(`avg frame draw over 120 frames: ${avg.toFixed(3)} ms`);
} catch (e) { errors.push(`[harness] ${e.message}`); }

console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

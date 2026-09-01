// Renders every UI function onto a 640×360 canvas (shown at 1.5×) with mock state and screenshots to shots/ui-*.png.
// Usage: node tools/test-ui.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright-core');

const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#2a2a3a}canvas{image-rendering:pixelated;width:960px;height:540px;display:block}</style>
<canvas id="c" width="640" height="360"></canvas>
<script type="module">
import { UI } from '/src/ui/ui.js';
const c = document.getElementById('c'); const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
const W = 640, H = 360;
// fake "game" background: banded sky + ground so overlays are judged against something
function bg(kind) {
  const bands = kind === 'jlm' ? ['#3b2a5a', '#5a3a6a', '#8a5a6a', '#c98a5a', '#e8b070'] : ['#2b4aa0', '#3d6ad0', '#6a9ae8', '#a8c8f0', '#f6d9a8'];
  bands.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(0, i * 60, W, 60); });
  ctx.fillStyle = '#e8c88a'; ctx.fillRect(0, 300, W, 60); ctx.fillStyle = '#c9a060'; ctx.fillRect(0, 300, W, 4);
  for (let x = 0; x < W; x += 40) { ctx.fillStyle = '#6a8e3a'; ctx.fillRect(x + 10, 280, 20, 20); }
}
const state = { hearts: 2, maxHearts: 3, lives: 3, score: 4200, shekels: 17, levelName: 'חוף תל אביב', levelNameEn: 'Tel Aviv Beach', quip: ['חניה בתל אביב זה לא מקום, זה מצב נפשי', "Parking in Tel Aviv isn't a place, it's a state of mind"], hummusTimer: 210, seeds: Infinity, muted: false, levelIndex: 0, levelCount: 5, dashReady: true };
const level = { id: 'telaviv', name: 'חוף תל אביב', nameEn: 'Tel Aviv Beach', intro: ['בוקר טוב תל אביב! השמש כבר בשבע בבוקר', 'Good morning Tel Aviv! The sun is out at 7am already'] };
const boss = { name: 'סבתא ריבקה', nameEn: 'Savta Rivka', hp: 5, maxHp: 9, phase: 2 };
const scenes = {
  title: (t) => { bg(); UI.drawTitle(ctx, W, H, t, state); },
  title2: (t) => { bg(); UI.drawTitle(ctx, W, H, t + 0.9, state); },
  hud: (t) => { bg(); for (let i = 0; i < 20; i++) UI.drawHud(ctx, W, H, state); ctx.clearRect(0, 0, W, H); bg(); UI.drawHud(ctx, W, H, state); UI.drawBubble(ctx, 200, 240, ['!תאכל', 'Eat!']); UI.drawBubble(ctx, 470, 200, ['?שלום! איפה הים', 'Shalom! Where is the beach?']); UI.drawBubble(ctx, 40, 30, ['!!!צפצוף', 'HONK!!!']); },
  hud1hp: (t) => { bg(); const s = { ...state, hearts: 1, hummusTimer: 0, quip: null, dashReady: false, muted: true, score: 123456, shekels: 999 }; for (let i = 0; i < 20; i++) UI.drawHud(ctx, W, H, s); ctx.clearRect(0, 0, W, H); bg(); UI.drawHud(ctx, W, H, s); },
  boss: (t) => { bg('jlm'); const s = { ...state, quip: null, hummusTimer: 0, levelName: 'ירושלים העתיקה', levelNameEn: 'Old City Jerusalem', levelIndex: 4 }; for (let i = 0; i < 20; i++) UI.drawHud(ctx, W, H, s); ctx.clearRect(0, 0, W, H); bg('jlm'); UI.drawHud(ctx, W, H, s); UI.drawBossBar(ctx, W, H, boss); UI.drawBubble(ctx, 400, 230, ['!אתה רזה מדי', "You're too thin!"]); },
  bosshit: (t) => { bg('jlm'); const s = { ...state, quip: null, hummusTimer: 0, levelName: 'ירושלים העתיקה', levelNameEn: 'Old City Jerusalem', levelIndex: 4 }; UI.drawHud(ctx, W, H, s); UI.drawBossBar(ctx, W, H, { ...boss, hp: 9 }); ctx.clearRect(0, 0, W, H); bg('jlm'); UI.drawHud(ctx, W, H, s); UI.drawBossBar(ctx, W, H, { ...boss, hp: 8, phase: 3 }); },
  card: (t) => { bg(); UI.drawHud(ctx, W, H, { ...state, quip: null, hummusTimer: 0 }); UI.drawLevelCard(ctx, W, H, t, level, 0.5); },
  cardwipe: (t) => { bg(); UI.drawLevelCard(ctx, W, H, t, level, 0.12); },
  cardout: (t) => { bg(); UI.drawLevelCard(ctx, W, H, t, level, 0.9); },
  clear: (t) => { bg(); UI.drawLevelClear(ctx, W, H, t, level, 0.7, state); },
  clearlast: (t) => { bg('jlm'); UI.drawLevelClear(ctx, W, H, t, { ...level, id: 'jerusalem', name: 'ירושלים העתיקה', nameEn: 'Old City' }, 0.7, { ...state, levelIndex: 4 }); },
  pause: (t) => { bg(); UI.drawHud(ctx, W, H, { ...state, quip: null }); UI.drawPause(ctx, W, H); },
  gameover: (t) => { bg(); UI.drawGameOver(ctx, W, H, t, { ...state, hearts: 0 }); },
  credits: (t) => { bg('jlm'); UI.drawCredits(ctx, W, H, t); },
  credits2: (t) => { bg('jlm'); UI.drawCredits(ctx, W, H, 12); },
  creditsend: (t) => { bg('jlm'); UI.drawCredits(ctx, W, H, 60); },
};
window.render = (name, t) => { ctx.clearRect(0, 0, W, H); scenes[name](t); return true; };
window.sceneNames = Object.keys(scenes);
window.ready = true;
</script>`;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/test-ui.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });
fs.mkdirSync('shots', { recursive: true });
try {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready === true, null, { timeout: 5000 });
  const names = await page.evaluate(() => window.sceneNames);
  for (const n of names) {
    try { await page.evaluate(([n, t]) => window.render(n, t), [n, 1.3]); }
    catch (e) { errors.push(`[scene ${n}] ${e.message}`); }
    await page.screenshot({ path: `shots/ui-${n}.png` });
    console.log('shot', `shots/ui-${n}.png`);
  }
  // perf: 300 HUD+title frames
  const ms = await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 300; i++) { window.render('title', i / 60); window.render('hud', i / 60); } return (performance.now() - t0) / 300; });
  console.log(`avg ms per (title+hud) frame: ${ms.toFixed(2)}`);
} catch (e) { errors.push(`[harness] ${e.message}`); }
console.log('--- errors ---'); console.log(errors.length ? errors.join('\n') : 'NONE');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);

// Dumb-bot play-test. Usage: node tools/playtest.mjs [--levels 1,2,3] [--secs 40] [--shots]
// For each level: loads ?level=N, starts the game, holds Right and jumps/spits/dashes on a schedule for --secs seconds.
// Reports max player x (% of level width), hp/lives, whether the exit was reached (levelclear) or the run died (gameover),
// console errors and the AudioContext state after the first keypress.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright-core');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LEVELS = opt('--levels', '1,2,3,4,5').split(',').map(Number);
const SECS = Number(opt('--secs', '40'));
const SHOTS = args.includes('--shots');
const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
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

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
let anyErrors = false;

for (const L of LEVELS) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /\[engine\]|\[sabra\]/.test(m.text()))) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });
  const snap = () => page.evaluate(() => {
    const g = window.__GAME; if (!g) return null;
    const gm = g.game; const p = g.player;
    return { state: g.state, level: g.levelIndex, x: p ? Math.round(p.x) : null, y: p ? Math.round(p.y) : null, hp: p ? p.hp : null, dead: p ? !!p.dead : null,
      lives: gm ? gm.lives : null, score: gm ? gm.score : null, width: gm && gm.map ? gm.map.w * 16 : null, exitX: gm && gm.level ? gm.level.exit.x : null,
      audio: window.__SABRA && window.__SABRA.Audio._stats ? window.__SABRA.Audio._stats() : null };
  });
  const r = { level: L, id: null, maxX: 0, pct: 0, exit: false, gameover: false, deaths: 0, hpMin: 3, finalState: null, audio: null, errors, secs: SECS };
  try {
    await page.goto(`http://127.0.0.1:${port}/?level=${L}`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');       // title → level card (first gesture → audio init)
    await page.waitForTimeout(400);
    const a0 = await snap();
    r.audio = a0 && a0.audio ? { state: a0.audio.state, current: a0.audio.current } : null;
    await page.keyboard.press('Space');       // skip level card
    await page.waitForTimeout(600);
    let s = await snap();
    r.id = await page.evaluate(() => window.__GAME.game.level.id);
    const width = s.width;
    let lastLives = s.lives, lastHp = s.hp, lastX = s.x, stuckT = 0;
    await page.keyboard.down('ArrowRight');
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < SECS * 1000) {
      i++;
      // jump: alternate short taps and long holds; when stuck, hold long + dash
      const hold = stuckT > 2 ? 320 : (i % 3 === 0 ? 300 : 120);
      await page.keyboard.down('Space'); await page.waitForTimeout(hold); await page.keyboard.up('Space');
      if (i % 2 === 0) await page.keyboard.press('KeyX');
      if (stuckT > 2 || i % 7 === 0) { await page.waitForTimeout(80); await page.keyboard.press('ShiftLeft'); }
      await page.waitForTimeout(stuckT > 2 ? 200 : 380);
      s = await snap();
      if (!s) { errors.push('[harness] __GAME missing'); break; }
      if (s.state === 'levelclear' || s.state === 'credits') { r.exit = true; r.finalState = s.state; break; }
      if (s.state === 'gameover') { r.gameover = true; r.finalState = s.state; break; }
      if (s.state === 'playing' && s.x != null) {
        if (s.x > r.maxX) r.maxX = s.x;
        if (s.hp != null && s.hp < r.hpMin) r.hpMin = s.hp;
        if (s.lives < lastLives) { r.deaths += s.lives < lastLives ? lastLives - s.lives : 0; }
        lastLives = s.lives; lastHp = s.hp;
        if (Math.abs(s.x - lastX) < 6) stuckT++; else stuckT = 0;
        lastX = s.x;
      } else if (s.state === 'levelcard') { await page.keyboard.press('Space'); }
    }
    await page.keyboard.up('ArrowRight');
    s = await snap();
    r.finalState = r.finalState || s.state; r.hp = s.hp; r.lives = s.lives; r.score = s.score; r.width = width; r.exitX = s.exitX;
    r.pct = width ? Math.round(100 * r.maxX / (s.exitX || width)) : 0;
    const a1 = await snap(); r.audioEnd = a1 && a1.audio ? { state: a1.audio.state, current: a1.audio.current, sfx: a1.audio.sfx, late: a1.audio.late } : null;
    if (SHOTS) { fs.mkdirSync('shots', { recursive: true }); await page.screenshot({ path: `shots/playtest-L${L}.png` }); }
  } catch (e) { errors.push(`[harness] ${e.message}`); }
  await page.close();
  if (errors.length) anyErrors = true;
  const line = `L${L} ${r.id}: maxX=${r.maxX}/${r.exitX} (${r.pct}%) hpMin=${r.hpMin} hp=${r.hp} lives=${r.lives} deaths=${r.deaths} score=${r.score} exit=${r.exit} gameover=${r.gameover} state=${r.finalState} audio=${JSON.stringify(r.audio)} audioEnd=${JSON.stringify(r.audioEnd)} errors=${errors.length ? errors.join(' | ') : 'NONE'}`;
  console.log(line);
  results.push(r);
}
await browser.close();
server.close();
const ok = !anyErrors && results.every((r) => !r.errors.length);
console.log(ok ? 'PLAYTEST OK' : 'PLAYTEST HAD ERRORS');
process.exit(ok ? 0 : 1);

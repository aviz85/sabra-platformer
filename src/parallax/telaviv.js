// SABRA! — src/parallax/telaviv.js
// חוף תל אביב בזריחה · Tel Aviv beach at sunrise.
// 5 parallax layers (0.05 skyline · 0.2 sea · 0.4 surf · 0.65 beach · 0.85 foreground) + sky + fog.
// Everything is fillRect at integer coords (banded gradients, stepped discs — no arcs, no gradients).
// Static parts are rasterised ONCE into offscreen canvases (lazy, first draw) and blitted; only the
// animated bits (clouds, waves, sparkle, gulls, flag, smoke, crab, ...) are redrawn every frame.

const W = 320, H = 180;      // internal canvas
const P = 640;               // tiling period of every layer
const HZ = 100;              // horizon (sea top) in layer space
const SX = 236, SY = 90, SR = 18; // sun centre / radius (screen space)
// NOTE: the skyline layer scrolls only 0.05×camX (≈120 px over a level), so its world x 0..~450 is what
// players actually see; the sun (screen x 218..254) must stay clear of tall towers in world x ~218..380.

const C = {
  // sky bands, top → horizon (indigo night → lavender → pink → peach → gold)
  sky: ['#26254f', '#33336a', '#454a8a', '#5f63a8', '#7f78bd', '#9f86c2', '#bd94bb', '#d9a0aa', '#eeae95', '#f9c283', '#ffd68f', '#ffe6a6'],
  star: '#9b9fd8', star2: '#c4c7ee',
  glow1: 'rgba(255,214,140,0.20)', glow2: 'rgba(255,226,160,0.26)', ray: 'rgba(255,238,190,0.17)',
  sunEdge: '#ffc857', sun: '#ffe27a', sunCore: '#fff4bd',
  cloudTop: '#fbe3dc', cloud: '#f3c4c0', cloudBot: '#e39fa3',
  // skyline — atmospheric perspective: farther = paler / bluer
  farfar: '#a2a5d5', far: '#8e92c8', mid: '#7c80ba', dark: '#6d71ad', white: '#a9acd8', floor: '#878bc4',
  win: 'rgba(255,225,170,0.75)', chimR: '#b894b4', chimW: '#cfcbe4', smoke: 'rgba(232,228,246,0.55)', blink: '#ff6a5a',
  // sea, far → near
  sea: ['#7c90c6', '#6383c1', '#4c7bbd', '#4083c3', '#3892c8', '#36a1cb'],
  crest: ['#93b6de', '#9dc4e6', '#a6d2ec', '#b1dcf0', '#bfe6f4'],
  trough: 'rgba(30,60,120,0.22)', sparkle: '#fff5cf', reflect: 'rgba(255,232,175,0.45)',
  nearSea: '#31a5c5', nearCrest: '#c3eef8', foam: '#f4fcff', foamShade: '#bfe9f3', bubble: '#ffffff',
  wet: '#c8a97a', wet2: '#d6ba88', gleam: 'rgba(255,248,220,0.5)',
  sand: '#ead6a0', sandDark: '#dcc48c', sandLight: '#f6e8bb',
  // props
  k: '#1a1a1a', pole: '#8a6a3c', poleDark: '#6b5a3a', red: '#d8433a', cream: '#f6f1e6', blue: '#2c5fb8',
  yellow: '#f0c23c', green: '#3e9a4a', pink: '#ee6f9c', teal: '#2fb0a8', skin: '#e0a877', orange: '#e08a2e',
  orangeDark: '#b8661c', grey: '#9aa0a8', silver: '#c0c0c8', gull: '#f8f8f8', gullTip: '#6e737a',
  spray: 'rgba(255,255,255,0.35)',
};

// ---------- tiny raster helpers ----------
function hash(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
// half-ellipse sitting on baseY (rows baseY-ry .. baseY)
function dome(g, cx, baseY, rx, ry, col) {
  g.fillStyle = col;
  for (let v = 0; v <= ry; v++) { const hw = Math.floor(rx * Math.sqrt(1 - (v / ry) ** 2)); g.fillRect(cx - hw, baseY - v, hw * 2 + 1, 1); }
}
function mk(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g];
}
// call fn(bx) for every tile base x that can touch the screen
function tiles(ox, fn) { for (let k = -1; k <= 1; k++) { const bx = ox + k * P; if (bx < W && bx + P > 0) fn(bx); } }
function offset(camX, camY, speed) { return [-Math.floor(camX * speed) % P, Math.max(-8, Math.min(8, -Math.round(camY * speed * 0.3)))]; } // subtle, clamped so near layers never swallow beach props
function blit(ctx, c, ox, dy) { tiles(ox, (bx) => ctx.drawImage(c, bx, dy)); }

// ---------- SKY (static: bands, stars, sun, rays) ----------
let skyC = null;
function buildSky() {
  const [c, g] = mk(W, H);
  const edges = [0, 12, 24, 36, 48, 58, 68, 76, 84, 92, 100, 108, H];
  for (let i = 0; i < C.sky.length; i++) R(g, 0, edges[i], W, edges[i + 1] - edges[i], C.sky[i]);
  // last stars of the night in the top bands
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 1) * W), y = Math.floor(hash(i, 2) * 40);
    if (y < 34) R(g, x, y, 1, 1, y < 16 && i % 3 === 0 ? C.star2 : C.star);
  }
  // sun rays (stepped beams, alternating long/short)
  for (let a = 0; a < 18; a++) {
    const ang = -Math.PI + (a + 0.5) * (Math.PI / 18);
    const len = a % 2 ? 46 : 70;
    for (let d = SR + 8; d < SR + len; d += 3) {
      const x = Math.round(SX + Math.cos(ang) * d), y = Math.round(SY + Math.sin(ang) * d);
      if (y < HZ) R(g, x - 1, y, 2, 2, C.ray);
    }
  }
  disc(g, SX, SY, 34, C.glow1);
  disc(g, SX, SY, 26, C.glow2);
  disc(g, SX, SY, SR + 1, C.sunEdge);
  disc(g, SX, SY, SR - 1, C.sun);
  disc(g, SX, SY - 1, 10, C.sunCore);
  return c;
}
const CLOUDS = [
  { x: 20, y: 26, len: 46, spd: 3.2 }, { x: 150, y: 40, len: 34, spd: 4.5 }, { x: 240, y: 20, len: 58, spd: 2.6 },
  { x: 90, y: 56, len: 26, spd: 5.5 }, { x: 300, y: 48, len: 40, spd: 3.8 },
];
function cloud(g, x, y, len) {
  const b1 = Math.floor(len * 0.25), b2 = Math.floor(len * 0.55);
  R(g, x + b1, y - 2, 6, 1, C.cloudTop); R(g, x + b1 - 1, y - 1, 9, 1, C.cloudTop);
  R(g, x + b2, y - 1, 7, 1, C.cloudTop);
  R(g, x + 3, y, len - 6, 1, C.cloudTop);
  R(g, x + 1, y + 1, len - 2, 2, C.cloud);
  R(g, x, y + 3, len, 1, C.cloud);
  R(g, x + 1, y + 4, len - 2, 1, C.cloudBot);
  R(g, x + 4, y + 5, len - 9, 1, C.cloudBot);
}
function sky(ctx, w, h, t) {
  if (!skyC) skyC = buildSky();
  ctx.drawImage(skyC, 0, 0);
  for (const cl of CLOUDS) {
    const span = W + cl.len + 20;
    const x = Math.round(((cl.x + t * cl.spd) % span + span) % span) - cl.len - 10;
    cloud(ctx, x, cl.y, cl.len);
  }
}

// ---------- LAYER 0 · skyline (0.05) ----------
let farC = null;
function bld(g, x, w, h, col) { R(g, x, HZ - h, w, h + 2, col); }
function floors(g, x, w, h, step = 4) { for (let y = HZ - h + step; y < HZ - 1; y += step) R(g, x, y, w, 1, C.floor); }
function windows(g, x, w, h, seed, density = 0.22) {
  for (let y = HZ - h + 2; y < HZ - 2; y += 3) for (let xx = x + 1; xx < x + w - 1; xx += 3) if (hash(xx + seed, y) < density) R(g, xx, y, 1, 1, C.win);
}
function dudShemesh(g, x, y) { // solar water heater: tilted panel + tank
  R(g, x, y - 1, 2, 1, C.dark); R(g, x + 1, y - 2, 2, 1, C.dark); R(g, x + 2, y - 3, 2, 1, C.dark);
  R(g, x + 3, y - 5, 4, 2, C.white); R(g, x + 3, y - 5, 4, 1, C.farfar);
}
function dish(g, x, y) { R(g, x, y - 3, 2, 3, C.farfar); R(g, x + 2, y - 2, 1, 1, C.dark); R(g, x + 1, y - 4, 1, 1, C.farfar); }
function antenna(g, x, y) { R(g, x, y - 6, 1, 6, C.dark); R(g, x - 1, y - 5, 3, 1, C.dark); R(g, x - 1, y - 3, 3, 1, C.dark); }
function waterTank(g, x, y) { R(g, x, y - 3, 4, 3, C.dark); R(g, x + 1, y - 4, 2, 1, C.dark); }
function bauhaus(g, x, w, h, side) {
  bld(g, x, w, h, C.white);
  for (let y = HZ - 4; y > HZ - h + 1; y -= 5) { // rounded balconies (the Bauhaus "ship" look)
    const bw = Math.floor(w * 0.55);
    if (side < 0) { R(g, x - 1, y - 1, bw + 1, 3, C.mid); R(g, x - 2, y, 1, 1, C.mid); }
    else { R(g, x + w - bw, y - 1, bw + 1, 3, C.mid); R(g, x + w + 1, y, 1, 1, C.mid); }
  }
  for (let y = HZ - 6; y > HZ - h + 1; y -= 5) R(g, x + (side < 0 ? w - 4 : 2), y, 2, 1, C.win);
}
function buildFar() {
  const [c, g] = mk(P, H);
  // far-far row of tiny buildings, fills every gap
  for (let x = 0; x < P; x += 5) { const h = 5 + Math.floor(hash(x, 11) * 7); bld(g, x, 5, h, C.farfar); }
  // --- Jaffa: stone houses, dome, clock tower, Hassan Bek mosque ---
  bld(g, 0, 14, 9, C.far); bld(g, 12, 10, 13, C.far); bld(g, 24, 12, 8, C.far); dome(g, 30, HZ - 8, 5, 4, C.far);
  bld(g, 38, 10, 11, C.far); bld(g, 50, 11, 7, C.far);
  bld(g, 60, 7, 28, C.mid); R(g, 61, HZ - 30, 5, 2, C.mid); R(g, 62, HZ - 32, 3, 2, C.mid); R(g, 63, HZ - 34, 1, 2, C.mid);
  R(g, 62, HZ - 25, 3, 3, C.white); R(g, 63, HZ - 24, 1, 1, C.mid); // the clock
  bld(g, 76, 16, 9, C.white); dome(g, 84, HZ - 9, 6, 5, C.white);
  bld(g, 93, 3, 32, C.white); R(g, 92, HZ - 22, 5, 1, C.mid); R(g, 93, HZ - 34, 3, 1, C.white); R(g, 94, HZ - 36, 1, 2, C.white); R(g, 94, HZ - 37, 1, 1, C.win);
  // --- Dan hotel — Agam's rainbow facade (hazed) ---
  const stripes = ['#9a8fc4', '#a08ac2', '#9c94c9', '#8f9cc9', '#93a4c8', '#9d9bc6'];
  for (let i = 0; i < 11; i++) R(g, 102, HZ - 22 + i * 2, 22, 2, stripes[i % 6]);
  R(g, 102, HZ - 23, 22, 1, C.mid);
  // --- Sarona tower (slanted top) + Moshe Aviv tower (spire with a blinking light) ---
  bld(g, 128, 10, 56, C.dark); for (let i = 1; i <= 5; i++) R(g, 128, HZ - 56 - i, 10 - i * 2, 1, C.dark); floors(g, 128, 10, 56); windows(g, 128, 10, 56, 4, 0.3);
  bld(g, 142, 12, 58, C.mid); R(g, 144, HZ - 62, 8, 4, C.mid); R(g, 146, HZ - 65, 4, 3, C.mid); R(g, 147, HZ - 72, 1, 7, C.dark);
  floors(g, 142, 12, 58); windows(g, 142, 12, 58, 5);
  // --- Azrieli trio: round · triangle · square ---
  bld(g, 160, 14, 50, C.mid); dome(g, 167, HZ - 50, 7, 3, C.mid); floors(g, 160, 14, 50); windows(g, 160, 14, 50, 1);
  bld(g, 178, 16, 44, C.mid); for (let v = 1; v <= 6; v++) { const hw = Math.floor(8 * (1 - v / 7)); R(g, 186 - hw, HZ - 44 - v, hw * 2 + 1, 1, C.mid); }
  floors(g, 178, 16, 44); windows(g, 178, 16, 44, 2);
  bld(g, 198, 14, 38, C.mid); floors(g, 198, 14, 38); windows(g, 198, 14, 38, 3);
  // --- Bauhaus trio (the White City) — the sun rises behind their dudei shemesh ---
  bauhaus(g, 218, 16, 14, -1); dudShemesh(g, 221, HZ - 14); antenna(g, 231, HZ - 14);
  bauhaus(g, 240, 12, 12, 1); dish(g, 242, HZ - 12);
  bauhaus(g, 256, 18, 16, -1); dudShemesh(g, 260, HZ - 16); waterTank(g, 268, HZ - 16);
  // --- Reading power station: hall + striped chimney (smoke is animated) ---
  bld(g, 280, 28, 12, C.mid); R(g, 280, HZ - 13, 28, 1, C.dark);
  bld(g, 296, 4, 36, C.chimW); for (let y = HZ - 36; y < HZ - 12; y += 4) R(g, 296, y, 4, 2, C.chimR);
  // --- construction site: skeleton + two cranes (Tel Aviv is never finished) ---
  for (let i = 0; i < 5; i++) R(g, 322, HZ - 4 - i * 4, 24, 1, C.mid);
  R(g, 322, HZ - 20, 1, 20, C.mid); R(g, 333, HZ - 20, 1, 20, C.mid); R(g, 345, HZ - 20, 1, 20, C.mid);
  R(g, 352, HZ - 46, 2, 46, C.dark); R(g, 336, HZ - 47, 52, 1, C.dark); R(g, 336, HZ - 46, 6, 2, C.dark);
  R(g, 351, HZ - 50, 4, 3, C.dark); R(g, 378, HZ - 46, 1, 14, C.dark); R(g, 377, HZ - 32, 3, 2, C.dark);
  R(g, 410, HZ - 36, 2, 36, C.mid); R(g, 386, HZ - 37, 36, 1, C.mid); R(g, 416, HZ - 36, 6, 2, C.mid); R(g, 392, HZ - 36, 1, 10, C.mid); R(g, 391, HZ - 26, 3, 2, C.mid);
  // --- mid-rise blocks with dudim, tanks, dishes ---
  bld(g, 432, 20, 16, C.far); waterTank(g, 434, HZ - 16); waterTank(g, 440, HZ - 16);
  bld(g, 458, 14, 22, C.far); dudShemesh(g, 460, HZ - 22); windows(g, 458, 14, 22, 6);
  bld(g, 476, 12, 12, C.mid); antenna(g, 482, HZ - 12);
  bld(g, 492, 18, 26, C.mid); dish(g, 495, HZ - 26); floors(g, 492, 18, 26); windows(g, 492, 18, 26, 7);
  bld(g, 514, 16, 14, C.far); dudShemesh(g, 517, HZ - 14);
  bld(g, 534, 12, 18, C.mid); antenna(g, 540, HZ - 18); windows(g, 534, 12, 18, 8);
  // --- beachfront towers + low houses looping back to Jaffa ---
  bld(g, 552, 12, 30, C.far); floors(g, 552, 12, 30); windows(g, 552, 12, 30, 9);
  bld(g, 568, 10, 36, C.mid); floors(g, 568, 10, 36); windows(g, 568, 10, 36, 10);
  bld(g, 582, 16, 24, C.far); for (let y = HZ - 24; y < HZ; y += 4) R(g, 582, y, 16, 1, C.farfar);
  bld(g, 602, 8, 20, C.mid); windows(g, 602, 8, 20, 11);
  bld(g, 612, 12, 9, C.far); bld(g, 624, 10, 12, C.far); dome(g, 629, HZ - 12, 4, 3, C.far); bld(g, 634, 6, 7, C.far);
  return c;
}
function drawFar(ctx, camX, camY, w, h, t) {
  if (!farC) farC = buildFar();
  const [ox, dy] = offset(camX, camY, 0.05);
  blit(ctx, farC, ox, dy);
  tiles(ox, (bx) => {
    // Reading chimney smoke
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.45 + i / 3) % 1 + 1) % 1;
      const x = bx + 298 + Math.round(ph * 12 + Math.sin(t * 1.3 + i * 2) * 1.5), y = HZ - 38 - Math.round(ph * 16) + dy;
      const s = 1 + Math.round(ph * 2);
      R(ctx, x, y, s, s, C.smoke);
    }
    // aviation light on Moshe Aviv tower
    if (Math.floor(t * 2) % 2 === 0) R(ctx, bx + 147, HZ - 73 + dy, 1, 1, C.blink);
  });
}

// ---------- LAYER 1 · sea (0.2): banded water, waves, sparkle, sun path, sailboat, paraglider ----------
let seaC = null;
function buildSea() {
  const [c, g] = mk(P, H);
  const edges = [HZ, 106, 113, 122, 132, 146, H];
  const chop = ['#8a9ccf', '#7290ca', '#5a87c5', '#4e90cb', '#46a0d0', '#44add3'];
  for (let i = 0; i < C.sea.length; i++) {
    R(g, 0, edges[i], P, edges[i + 1] - edges[i], C.sea[i]);
    const n = 40 + i * 30; // more, longer chop as the water gets nearer
    for (let k = 0; k < n; k++) R(g, Math.floor(hash(k, 70 + i) * P), edges[i] + Math.floor(hash(k, 80 + i) * (edges[i + 1] - edges[i])), 1 + Math.floor(hash(k, 90 + i) * (2 + i)), 1, chop[i]);
  }
  return c;
}
const WAVES = [
  { y: 104, wl: 9, amp: 1, spd: 0.9 }, { y: 110, wl: 11, amp: 1, spd: 1.0 }, { y: 117, wl: 13, amp: 1, spd: 1.1 },
  { y: 126, wl: 16, amp: 2, spd: 1.2 }, { y: 138, wl: 20, amp: 2, spd: 1.3 },
];
function crests(ctx, ph, dy, t, list, cols, step, wide, troughs) {
  for (let b = 0; b < list.length; b++) {
    const wv = list[b];
    for (let x = 0; x < W; x += step) {
      const wx = x + ph;
      if (hash(Math.floor(wx / step), b + 5) < 0.38) continue; // broken crests, not stripes
      const yy = wv.y + dy + Math.round(Math.sin(wx / wv.wl + t * wv.spd + b * 1.7) * wv.amp + Math.sin(wx / (wv.wl * 2.7) - t * wv.spd * 0.6) * 0.7);
      R(ctx, x, yy, wide, 1, cols[b]);
      if (troughs) R(ctx, x + 1, yy + 1, wide, 1, C.trough);
    }
  }
}
function sailboat(ctx, x, y) {
  R(ctx, x, y, 12, 2, '#4d5a90'); R(ctx, x + 1, y + 2, 10, 1, '#3f4a7c');
  R(ctx, x + 5, y - 11, 1, 11, '#6a6a90');
  for (let i = 0; i < 9; i++) R(ctx, x + 6, y - 10 + i, 1 + Math.floor(i * 0.7), 1, '#eef1ff');
  for (let i = 0; i < 6; i++) R(ctx, x + 5 - Math.floor(i * 0.5) - 1, y - 7 + i, Math.floor(i * 0.5) + 1, 1, '#d9def7');
  R(ctx, x + 5, y - 12, 2, 1, C.red);
}
function paraglider(ctx, x, y) {
  const rows = [[4, 8], [2, 12], [0, 16], [1, 14]];
  for (let r = 0; r < rows.length; r++) {
    const [o, wdt] = rows[r];
    for (let i = 0; i < wdt; i += 2) R(ctx, x + o + i, y + r, 2, 1, Math.floor((o + i) / 2) % 2 ? C.yellow : '#e05a4a');
  }
  R(ctx, x + 4, y + 4, 1, 4, '#8a8aa0'); R(ctx, x + 11, y + 4, 1, 4, '#8a8aa0');
  R(ctx, x + 5, y + 8, 1, 2, '#8a8aa0'); R(ctx, x + 10, y + 8, 1, 2, '#8a8aa0');
  R(ctx, x + 7, y + 9, 2, 1, C.skin); R(ctx, x + 6, y + 10, 4, 3, C.blue); R(ctx, x + 7, y + 13, 2, 2, C.k);
}
function drawSea(ctx, camX, camY, w, h, t) {
  if (!seaC) seaC = buildSea();
  const sp = 0.2;
  const [ox, dy] = offset(camX, camY, sp);
  blit(ctx, seaC, ox, dy);
  const ph = Math.floor(camX * sp);
  crests(ctx, ph, dy, t, WAVES, C.crest, 3, 2, true);
  // sun path: shimmering column under the sun (screen space, the sun is static)
  const tf = Math.floor(t * 6);
  for (let y = HZ + 1; y < HZ + 44; y += 2) {
    if (hash(y, tf) > 0.5) continue;
    const hw = 2 + Math.floor((y - HZ) / 5), jit = Math.floor(hash(y + 99, tf) * 7) - 3;
    R(ctx, SX - hw + jit, y + dy, hw * 2, 1, C.reflect);
  }
  tiles(ox, (bx) => {
    for (let i = 0; i < 28; i++) { // sparkles
      if ((Math.floor(t * 4) + i) % 3) continue;
      const x = bx + Math.floor(hash(i, 31) * P), y = HZ + 2 + Math.floor(hash(i, 32) * 36) + dy;
      if (x >= 0 && x < W) R(ctx, x, y, 1, 1, C.sparkle);
    }
    sailboat(ctx, bx + 292, HZ + 7 + Math.round(Math.sin(t * 1.8) * 1) + dy);
    paraglider(ctx, bx + 128 + Math.round(Math.sin(t * 0.6) * 8), 50 + Math.round(Math.sin(t * 1.1) * 3) + dy);
  });
}

// ---------- LAYER 2 · surf (0.4): near water, foam line, wet sand ----------
let nearC = null;
function buildNear() {
  const [c, g] = mk(P, H);
  R(g, 0, 126, P, 14, C.nearSea);
  for (let k = 0; k < 220; k++) R(g, Math.floor(hash(k, 44) * P), 126 + Math.floor(hash(k, 45) * 13), 1 + Math.floor(hash(k, 46) * 4), 1, hash(k, 47) < 0.6 ? '#3fb3d0' : '#2a97b8');
  R(g, 0, 140, P, 2, C.wet2); R(g, 0, 142, P, 5, C.wet); R(g, 0, 147, P, H - 147, C.sand);
  for (let i = 0; i < 90; i++) R(g, Math.floor(hash(i, 41) * P), 142 + Math.floor(hash(i, 42) * 5), 2, 1, C.wet2);
  return c;
}
const NEAR_WAVES = [{ y: 129, wl: 12, amp: 1, spd: 1.4 }, { y: 134, wl: 15, amp: 1, spd: 1.6 }];
function drawNear(ctx, camX, camY, w, h, t) {
  if (!nearC) nearC = buildNear();
  const sp = 0.4;
  const [ox, dy] = offset(camX, camY, sp);
  blit(ctx, nearC, ox, dy);
  const ph = Math.floor(camX * sp);
  crests(ctx, ph, dy, t, NEAR_WAVES, [C.nearCrest, C.nearCrest], 3, 2, false);
  const tide = Math.round(Math.sin(t * 0.7) * 1);
  const tf = Math.floor(t * 3);
  for (let x = 0; x < W; x += 2) {
    const wx = x + ph;
    const fy = 139 + tide + dy + Math.round(Math.sin(wx / 7 + t * 1.6) * 1 + Math.sin(wx / 23 - t * 0.9) * 1);
    R(ctx, x, fy, 2, 1, C.foam); R(ctx, x, fy + 1, 2, 1, C.foamShade);
    if (hash(wx >> 1, tf) < 0.09) R(ctx, x, fy - 1, 1, 1, C.bubble);
    if (hash(wx >> 1, tf + 7) < 0.06) R(ctx, x, fy + 3, 2, 1, C.gleam);
  }
}

// ---------- LAYER 3 · beach (0.65): umbrellas, towels, props, black flag, seagulls ----------
let beachC = null;
function canopy(g, cx, baseY, rx, ry, colA, colB) {
  for (let v = 0; v <= ry; v++) {
    const hw = Math.floor(rx * Math.sqrt(1 - (v / ry) ** 2));
    for (let x = cx - hw; x <= cx + hw; x++) R(g, x, baseY - v, 1, 1, Math.floor((x - cx + 100) / 4) % 2 ? colA : colB);
  }
  for (let x = cx - rx; x <= cx + rx; x += 2) R(g, x, baseY + 1, 1, 1, Math.floor((x - cx + 100) / 4) % 2 ? colA : colB);
}
const BEACH_BASE = 154;   // beach props stand on this row; the foreground sand (0.85) starts at 155
function umbrella(g, cx, base, colA, colB) {
  R(g, cx, 132, 1, base - 132 + 1, C.pole); R(g, cx, 124, 1, 2, C.poleDark);
  canopy(g, cx, 132, 10, 6, colA, colB);
}
function towel(g, x, y, colA, colB) { R(g, x, y, 16, 6, colA); for (let i = 1; i < 6; i += 2) R(g, x, y + i, 16, 1, colB); R(g, x, y, 1, 6, C.cream); R(g, x + 15, y, 1, 6, C.cream); }
function chair(g, x, y) { R(g, x, y - 6, 1, 6, C.cream); R(g, x, y - 6, 4, 1, C.cream); R(g, x, y - 2, 7, 1, C.cream); R(g, x + 1, y - 1, 1, 2, C.cream); R(g, x + 6, y - 1, 1, 2, C.cream); }
function buildBeach() {
  const [c, g] = mk(P, H);
  R(g, 0, 146, P, H - 146, C.sand);
  for (let i = 0; i < 320; i++) R(g, Math.floor(hash(i, 21) * P), 147 + Math.floor(hash(i, 22) * (H - 147)), 1, 1, hash(i, 23) < 0.5 ? C.sandDark : C.sandLight);
  const B = BEACH_BASE;
  // umbrellas (Tel Aviv classics: red/white, blue/white, yellow, green, pink)
  umbrella(g, 40, B, C.red, C.cream); umbrella(g, 150, B, C.blue, C.cream); umbrella(g, 300, B, C.yellow, C.cream);
  umbrella(g, 420, B, C.green, C.cream); umbrella(g, 560, B, C.pink, C.cream);
  // towels + sunbather (fell asleep at sunrise — the sun will win)
  towel(g, 60, B - 5, C.blue, C.cream); towel(g, 180, B - 5, C.red, C.yellow); towel(g, 330, B - 5, C.teal, C.cream);
  towel(g, 452, B - 5, C.pink, C.cream); towel(g, 588, B - 5, C.yellow, C.blue);
  R(g, 184, B - 6, 12, 3, C.skin); R(g, 182, B - 7, 4, 4, C.skin); R(g, 183, B - 6, 2, 1, C.k); R(g, 190, B - 6, 4, 3, C.blue); R(g, 196, B - 5, 2, 2, C.skin);
  R(g, 182, B - 8, 4, 1, C.orangeDark); // hair
  // cat curled on the teal towel (static body — tail is animated)
  R(g, 334, B - 6, 8, 4, C.orange); R(g, 335, B - 7, 6, 1, C.orange); R(g, 340, B - 8, 3, 3, C.orange); R(g, 340, B - 9, 1, 1, C.orange); R(g, 342, B - 9, 1, 1, C.orange);
  R(g, 336, B - 5, 1, 2, C.orangeDark); R(g, 338, B - 6, 1, 2, C.orangeDark); R(g, 341, B - 7, 1, 1, C.k);
  // cooler, flip-flops, plastic Keter chairs, green TLV bin, bucket+shovel, radio, sign, black-flag pole
  R(g, 84, B - 4, 7, 5, C.blue); R(g, 83, B - 5, 9, 2, C.cream); R(g, 86, B - 6, 3, 1, C.blue);
  R(g, 200, B - 1, 3, 2, C.yellow); R(g, 204, B - 1, 3, 2, C.yellow); R(g, 201, B - 1, 1, 1, C.red); R(g, 205, B - 1, 1, 1, C.red);
  chair(g, 110, B); chair(g, 480, B);
  R(g, 122, B - 7, 6, 8, C.green); R(g, 121, B - 8, 8, 2, '#1f6b2a'); R(g, 124, B - 4, 2, 1, C.cream);
  R(g, 468, B - 4, 5, 5, C.red); R(g, 467, B - 4, 7, 1, C.cream); R(g, 474, B - 4, 1, 4, C.yellow); R(g, 473, B - 1, 3, 2, C.yellow);
  R(g, 600, B - 4, 8, 5, '#3b3b46'); R(g, 601, B - 3, 3, 3, C.grey); R(g, 605, B - 3, 2, 1, C.red); R(g, 607, B - 11, 1, 7, C.silver);
  R(g, 250, 133, 1, B - 133 + 1, C.poleDark);
  // sign: no matkot — ha, good luck with that
  R(g, 500, 140, 1, B - 140 + 1, C.poleDark); R(g, 492, 130, 18, 12, C.k); R(g, 493, 131, 16, 10, C.cream);
  disc(g, 500, 136, 4, C.red); disc(g, 500, 136, 3, C.cream);
  R(g, 499, 134, 2, 3, '#a0622c'); R(g, 499, 137, 1, 2, '#a0622c');
  for (let i = 0; i < 7; i++) R(g, 497 + i, 139 - i, 1, 1, C.red);
  return c;
}
const GULLS = [0, 1, 2, 3, 4, 5].map((i) => ({ x: hash(i, 51) * P, y: 20 + Math.floor(hash(i, 52) * 48), spd: 7 + hash(i, 53) * 8, f: hash(i, 54) * 6 }));
function gull(ctx, x, y, f) {
  if (f === 0) { R(ctx, x, y - 1, 2, 1, C.gull); R(ctx, x + 2, y, 3, 1, C.gull); R(ctx, x + 5, y - 1, 2, 1, C.gull); R(ctx, x, y - 1, 1, 1, C.gullTip); R(ctx, x + 6, y - 1, 1, 1, C.gullTip); }
  else if (f === 1) { R(ctx, x, y, 7, 1, C.gull); R(ctx, x, y, 1, 1, C.gullTip); R(ctx, x + 6, y, 1, 1, C.gullTip); }
  else { R(ctx, x, y + 1, 2, 1, C.gull); R(ctx, x + 2, y, 3, 1, C.gull); R(ctx, x + 5, y + 1, 2, 1, C.gull); R(ctx, x, y + 1, 1, 1, C.gullTip); R(ctx, x + 6, y + 1, 1, 1, C.gullTip); }
}
function drawBeach(ctx, camX, camY, w, h, t) {
  if (!beachC) beachC = buildBeach();
  const sp = 0.65;
  const [ox, dy] = offset(camX, camY, sp);
  blit(ctx, beachC, ox, dy);
  tiles(ox, (bx) => {
    // black flag — דגל שחור: no swimming (nobody listens)
    for (let i = 0; i < 8; i++) R(ctx, bx + 251 + i, 134 + dy + Math.round(Math.sin(i * 0.8 + t * 6) * 1), 1, 5, C.k);
    // cat tail flick
    const flick = Math.floor(t * 1.5) % 4 === 0 ? 1 : 0;
    R(ctx, bx + 332, BEACH_BASE - 3 - flick + dy, 2, 1, C.orange); R(ctx, bx + 331, BEACH_BASE - 3 - flick * 2 + dy, 1, 1, C.orangeDark);
    // music notes from the radio (גלגל"צ, obviously)
    const nph = (t * 0.8) % 1;
    const nx = bx + 604 + Math.round(Math.sin(t * 3) * 1), ny = BEACH_BASE - 6 - Math.round(nph * 8) + dy;
    R(ctx, nx, ny, 1, 2, C.k); R(ctx, nx + 1, ny, 1, 1, C.k);
    // seagulls
    for (const gl of GULLS) {
      const x = bx + Math.floor(((gl.x - t * gl.spd) % P + P) % P), y = gl.y + dy + Math.round(Math.sin(t * 1.5 + gl.f) * 2);
      if (x > -8 && x < W) gull(ctx, x, y, Math.floor(t * 5 + gl.f) % 3);
    }
  });
}

// ---------- LAYER 4 · foreground sand (0.85): footprints, shells, crab ----------
let foreC = null;
function buildFore() {
  const [c, g] = mk(P, H);
  const F = BEACH_BASE + 1; // 155: foreground sand starts here (never covers the beach props above)
  R(g, 0, F, P, H - F, C.sand);
  for (let i = 0; i < 200; i++) R(g, Math.floor(hash(i, 61) * P), F + Math.floor(hash(i, 62) * (H - F)), 1, 1, hash(i, 63) < 0.5 ? C.sandDark : C.sandLight);
  for (let i = 0; i < 14; i++) { const x = 40 + i * 7, y = F + 1 + (i % 2) * 2; R(g, x, y, 2, 1, C.sandDark); R(g, x, y + 1, 1, 1, C.sandDark); } // footprints
  for (let i = 0; i < 10; i++) { const x = 360 + i * 8, y = F + 1 + (i % 2) * 2; R(g, x, y, 2, 1, C.sandDark); R(g, x + 1, y + 1, 1, 1, C.sandDark); }
  R(g, 140, F + 2, 3, 2, C.cream); R(g, 141, F + 1, 1, 1, C.cream); R(g, 141, F + 3, 1, 1, '#e9b0aa');
  R(g, 236, F + 2, 3, 2, '#e9b0aa'); R(g, 237, F + 1, 1, 1, C.cream);
  R(g, 520, F + 2, 3, 2, C.cream); R(g, 521, F + 1, 1, 1, '#e9b0aa');
  R(g, 190, F + 2, 2, 1, C.k); R(g, 193, F + 2, 2, 1, C.k); R(g, 192, F + 2, 1, 1, C.grey); // lost sunglasses
  R(g, 300, F + 1, 1, 1, '#5a8a4a'); R(g, 301, F + 2, 2, 1, '#5a8a4a'); R(g, 303, F + 1, 2, 1, '#5a8a4a'); R(g, 305, F + 2, 1, 1, '#5a8a4a'); // seaweed
  R(g, 440, F + 3, 2, 1, C.red); R(g, 600, F + 3, 2, 1, C.blue); // bottle caps
  R(g, 560, F, 3, 2, '#f4a0c0'); R(g, 561, F + 2, 2, 2, '#c98a4a'); R(g, 562, F + 4, 1, 1, '#c98a4a'); // dropped artik
  return c;
}
function drawFore(ctx, camX, camY, w, h, t) {
  if (!foreC) foreC = buildFore();
  const sp = 0.85;
  const [ox, dy] = offset(camX, camY, sp);
  blit(ctx, foreC, ox, dy);
  tiles(ox, (bx) => {
    // sideways crab
    const tri = Math.abs(((t * 0.5) % 2) - 1);
    const cx = bx + 300 + Math.round(tri * 24), y = BEACH_BASE + 3 + dy, f = Math.floor(t * 8) % 2;
    R(ctx, cx, y, 4, 2, C.red); R(ctx, cx, y - 1, 1, 1, C.k); R(ctx, cx + 3, y - 1, 1, 1, C.k);
    R(ctx, cx - 1, y - 1, 1, 1, C.red); R(ctx, cx + 4, y - 1, 1, 1, C.red);
    R(ctx, cx - 1, y + 1 + f, 1, 1, C.red); R(ctx, cx + 4, y + 2 - f, 1, 1, C.red);
  });
}

// ---------- FOG · sparse sea-spray shimmer near the bottom ----------
function fog(ctx, w, h, t) {
  const tf = Math.floor(t * 5);
  for (let i = 0; i < 14; i++) {
    if (hash(i, tf) > 0.55) continue;
    const x = Math.floor(hash(i + 40, tf) * W), y = 128 + Math.floor(hash(i + 80, tf) * 48);
    R(ctx, x, y, 1, 1, C.spray);
  }
}

export default {
  sky,
  layers: [
    { speed: 0.05, draw: drawFar },
    { speed: 0.2, draw: drawSea },
    { speed: 0.4, draw: drawNear },
    { speed: 0.65, draw: drawBeach },
    { speed: 0.85, draw: drawFore },
  ],
  fog,
};

// SABRA! — src/parallax/jerusalem.js
// ירושלים העתיקה בשעת הזהב · The Old City of Jerusalem, golden hour sliding into dusk.
// 5 parallax layers (0.05 Old City skyline · 0.2 stone rooftops · 0.4 stone alley facades · 0.65 archways & lanterns
// · 0.85 hanging bougainvillea) + banded dusk sky with twinkling stars & a thin moon + warm lamp-dust fog that
// slowly darkens with t (capped, never black).
// Everything is fillRect at integer coords (banded gradients, stepped discs/domes — no arcs, no createLinearGradient).
// Static parts are rasterised ONCE into offscreen canvases (lazy, first draw) and blitted; only animated bits
// (stars, laundry, cat tail, lantern flicker, vines, dust) are redrawn every frame.

const W = 320, H = 180;   // internal canvas
const P = 640;            // tiling period of every layer

const C = {
  // dusk sky, top → horizon (deep blue-violet → violet → rose → gold)
  sky: ['#10102e', '#16153c', '#1d1a4c', '#26205c', '#31286c', '#3e3079', '#4f3884', '#63408a', '#7a488a', '#935283', '#ad5f78', '#c4716a', '#d98a5c', '#eaa655', '#f5c05e', '#fbd672', '#ffe58c'],
  star1: '#8d90c8', star2: '#c9cbef', star3: '#ffffff', starWarm: '#ffe9b0',
  moon: '#fff4cf', moonGlow: 'rgba(255,240,200,0.10)', moonGlow2: 'rgba(255,240,200,0.06)',
  // far skyline — atmospheric perspective (pale violet), gold dome gleams
  ridge2: '#6a5fa3', ridge1: '#584c90', far: '#463c7e', farLite: '#514684', farDark: '#3c3372', farGround: '#382f6b',
  gold: '#cfa542', goldLite: '#f1d56e', goldDark: '#9c7a30', drum: '#4b5aa4', drumLite: '#6a7cc0', drumDark: '#3a4685',
  farWin: '#ffd58a', onion: '#d5b24f', olive: '#4f4585',
  // mid-far rooftops
  mfWall: '#7f6f90', mfShade: '#665877', mfLite: '#8f8099', mfEdge: '#9a8ba6', mfWin: '#372c52', mfLit: '#f6b35a', mfLit2: '#ffd07a',
  mfDome: '#8a7b9c', mfDomeLite: '#a596b2', tank: '#c9c0cf', tankShade: '#a49aae', panel: '#252a48', panelLite: '#4b5a8c',
  dish: '#bbb4c2', dishDark: '#8d8698', antenna: '#4a4062', mfGround: '#584a6a', minaretGreen: '#4ff0a5', cross: '#e9dfc4',
  // mid facades — Jerusalem stone in warm dusk light
  stone: '#b89f7f', stoneLite: '#c8b08e', stoneDark: '#a68d6e', mortar: '#9b8368', shade: '#8b7459', shadeDark: '#6f5c46',
  winDark: '#2a2240', winLit: '#ffc45a', winLit2: '#ffe08e', winWarm: '#f39a3e', shutter: '#3f7d4d', shutterDark: '#2e5e3a', shutterLite: '#5a9a62',
  rail: '#3a3248', rope: '#2a2333', ac: '#cfcac6', acDark: '#9e9894', acGrill: '#7e7876', drip: '#7fb6d8',
  cat: '#1c1828', catEye: '#ffe36a', spray: '#f7f3ea', sprayShadow: '#c7c0b5', plaque: '#f4efe6', plaqueRed: '#c9342b', ink: '#1a1a24',
  midGround: '#6b5a4a',
  // near archways
  archLite: '#dcc39b', arch: '#c2a77e', archMid: '#a88d67', archDark: '#7d664e', archDeep: '#5a4838', keystone: '#e9d4ad',
  cobble: '#6f6156', cobbleLite: '#857567', cobbleLite2: '#948477', cobbleGap: '#564a41',
  lanternMetal: '#2a2424', lanternGlass: '#ffcf70', lanternCore: '#fff2c0', chain: '#3d3535',
  glow1: 'rgba(255,190,90,0.20)', glow2: 'rgba(255,205,120,0.16)', glow3: 'rgba(255,220,150,0.12)',
  mezuzah: '#d9b24c', signWood: '#7a5537', signWoodLite: '#95693f', signCream: '#f6e8c6', signRed: '#c0392b', signBlue: '#2b5fae',
  door: '#3a5a8a', doorDark: '#284066', doorKnob: '#e0c060',
  // nearest — bougainvillea
  vine: '#2b5a34', leaf: '#3a7d45', leafLite: '#57a35a', magenta: '#d8307f', magentaLite: '#ff5fae', magentaDeep: '#a41d5e', pot: '#a35a3a', potLite: '#c07248',
  // fog
  dusk: 'rgba(18,8,46,1)', dust: '#ffd9a0',
};

// ---------- tiny raster helpers ----------
function hash(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
// stepped disc — one fillRect per row, no anti-aliasing
function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
// half-ellipse sitting on baseY (rows baseY-ry .. baseY), one fillRect per row
function dome(g, cx, baseY, rx, ry, col) {
  g.fillStyle = col;
  for (let v = 0; v <= ry; v++) { const hw = Math.floor(rx * Math.sqrt(1 - (v / ry) ** 2)); g.fillRect(cx - hw, baseY - v, hw * 2 + 1, 1); }
}
// rectangle with a stepped round top (arched window / doorway)
function arch(g, x, y, w, h, col) {
  const steps = w >= 9 ? 3 : w >= 5 ? 2 : 1;
  for (let s = 0; s < steps; s++) { const inset = steps - s; if (w - inset * 2 > 0) R(g, x + inset, y + s, w - inset * 2, 1, col); }
  R(g, x, y + steps, w, h - steps, col);
}
// a stepped cone / spire: widthAtBase at baseY narrowing to 1 at baseY-h
function spire(g, cx, baseY, halfW, h, col) {
  for (let v = 0; v < h; v++) { const hw = Math.max(0, Math.round(halfW * (1 - v / h))); R(g, cx - hw, baseY - v, hw * 2 + 1, 1, col); }
}
function cypress(g, cx, baseY, h, col) {
  for (let v = 0; v < h; v++) {
    const f = v / h; const hw = f < 0.15 ? 2 : f < 0.5 ? 2 : f < 0.8 ? 1 : 0; const hw2 = (f > 0.2 && f < 0.45) ? 3 : hw;
    R(g, cx - hw2, baseY - v, hw2 * 2 + 1, 1, col);
  }
}
function mk(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g];
}
// call fn(bx) for every tile base x that can touch the screen
function tiles(ox, fn) { for (let k = -1; k <= 1; k++) { const bx = ox + k * P; if (bx < W && bx + P > 0) fn(bx); } }
function offset(camX, camY, speed) { return [-Math.floor(camX * speed) % P, -Math.round(camY * speed * 0.3)]; }
function blit(ctx, c, ox, dy) { tiles(ox, (bx) => ctx.drawImage(c, bx, dy)); }
// paint a period-wide composition 3× so items crossing the seam wrap seamlessly
function seamless(g, paint) { for (const dx of [-P, 0, P]) paint(g, dx); }
// Jerusalem-stone block texture: hash-varied blocks with 1px mortar
function stoneWall(g, x, y, w, h, base, lite, dark, mortar, bw = 7, bh = 4, seed = 0) {
  R(g, x, y, w, h, base);
  let row = 0;
  for (let yy = y; yy < y + h; yy += bh, row++) {
    R(g, x, yy, w, 1, mortar);
    const off = (row & 1) ? Math.floor(bw / 2) : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const r = hash(xx + seed, yy);
      const bx = Math.max(x, xx), bwid = Math.min(x + w, xx + bw) - bx;
      if (bwid <= 0) continue;
      if (r < 0.28) R(g, bx, yy + 1, bwid, bh - 1, lite); else if (r > 0.78) R(g, bx, yy + 1, bwid, bh - 1, dark);
      if (xx >= x) R(g, xx, yy, 1, bh, mortar);
    }
  }
}

// ---------- micro Hebrew font (3×5, drawn right-to-left) ----------
const GLYPH = {
  'א': ['#.#', '##.', '.#.', '.##', '#.#'],
  'ה': ['###', '..#', '#.#', '#.#', '#.#'],
  'ו': ['#', '#', '#', '#', '#'],
  'ח': ['###', '#.#', '#.#', '#.#', '#.#'],
  'י': ['##', '.#', '..', '..', '..'],
  'ל': ['#..', '###', '..#', '..#', '.#.'],
  'מ': ['.##', '#.#', '#.#', '#.#', '###'],
  'ם': ['###', '#.#', '#.#', '#.#', '###'],
  'נ': ['.##', '..#', '..#', '..#', '###'],
  'ן': ['.##', '..#', '..#', '..#', '..#'],
  'ס': ['.##', '#.#', '#.#', '#.#', '.##'],
  'ש': ['#.#.#', '#.#.#', '#.#.#', '#...#', '#####'],
  'ב': ['###', '..#', '..#', '..#', '####'],
  'ת': ['###', '#.#', '#.#', '#.#', '##.#'],
  ' ': ['..', '..', '..', '..', '..'],
};
// draw `str` RTL, right edge at xRight; returns left edge x. Multi-char glyph rows (ב/ת) may be wider than their first row.
function text(g, xRight, y, str, col) {
  let x = xRight;
  for (const ch of str) {
    const gl = GLYPH[ch]; if (!gl) continue;
    const w = Math.max(...gl.map((r) => r.length)); x -= w;
    for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === '#') R(g, x + c + (w - gl[r].length), y + r, 1, 1, col);
    x -= 1;
  }
  return x;
}
function textWidth(str) { let w = 0; for (const ch of str) { const gl = GLYPH[ch]; if (gl) w += Math.max(...gl.map((r) => r.length)) + 1; } return w - 1; }

// =====================================================================
// SKY — banded dusk gradient, thin moon (static, cached) + twinkling stars (per frame)
// =====================================================================
let skyC = null;
function buildSky() {
  const [c, g] = mk(W, H);
  const n = C.sky.length, top = 0, bottom = 108;             // gradient spans 0..108, then warm horizon glow
  for (let i = 0; i < n; i++) {
    const y0 = top + Math.floor((bottom - top) * i / n), y1 = top + Math.floor((bottom - top) * (i + 1) / n);
    R(g, 0, y0, W, y1 - y0, C.sky[i]);
  }
  R(g, 0, 108, W, 72, '#fff0b0');
  // dithered band seams (pixel-checker) for a painterly transition, only on the lower warm bands
  for (let i = 9; i < n; i++) {
    const y = top + Math.floor((bottom - top) * i / n);
    for (let x = ((i & 1) ? 2 : 0); x < W; x += 4) if (hash(x, i) < 0.6) R(g, x, y - 1, 1, 1, C.sky[i]);
  }
  // sun-glow bloom near horizon (banded, right of centre) — the sun already dipped behind the hills
  R(g, 150, 90, 160, 18, 'rgba(255,220,140,0.18)');
  R(g, 190, 82, 110, 26, 'rgba(255,220,140,0.14)');
  R(g, 220, 76, 70, 32, 'rgba(255,230,160,0.12)');
  // moon: thin waxing crescent at (58,26), lit on the left (toward the set sun)
  const mx = 58, my = 26, r = 9;
  disc(g, mx, my, r + 5, C.moonGlow2); disc(g, mx, my, r + 2, C.moonGlow);
  g.fillStyle = C.moon;
  for (let dy = -r; dy <= r; dy++) {
    const hw1 = Math.floor(Math.sqrt(r * r - dy * dy));
    const r2 = 8, ix = mx + 5, dy2 = dy + 1;
    const inner = Math.abs(dy2) <= r2 ? Math.floor(Math.sqrt(r2 * r2 - dy2 * dy2)) : -1;
    const x0 = mx - hw1, x1 = inner >= 0 ? Math.min(mx + hw1, ix - inner - 1) : mx + hw1;
    if (x1 >= x0) g.fillRect(x0, my + dy, x1 - x0 + 1, 1);
  }
  return c;
}
const STARS = [];
for (let i = 0; i < 70; i++) {
  const x = Math.floor(hash(i, 11) * W), y = Math.floor(hash(i, 23) ** 1.6 * 96);
  STARS.push({ x, y, big: hash(i, 5) < 0.14, spd: 1.5 + hash(i, 7) * 3, ph: hash(i, 9) * 6.283, born: hash(i, 13) });
}
function drawStars(ctx, t) {
  const reveal = 0.45 + Math.min(1, t / 40) * 0.55;            // more stars appear as dusk deepens
  for (const s of STARS) {
    if (s.born > reveal) continue;
    if (s.x > 44 && s.x < 72 && s.y > 12 && s.y < 40) continue; // keep the moon clean
    const tw = 0.5 + 0.5 * Math.sin(t * s.spd + s.ph);
    const col = tw < 0.35 ? C.star1 : tw < 0.75 ? C.star2 : C.star3;
    R(ctx, s.x, s.y, 1, 1, col);
    if (s.big && tw > 0.6) { R(ctx, s.x - 1, s.y, 1, 1, C.star1); R(ctx, s.x + 1, s.y, 1, 1, C.star1); R(ctx, s.x, s.y - 1, 1, 1, C.star1); R(ctx, s.x, s.y + 1, 1, 1, C.star1); }
  }
}
function drawShootingStar(ctx, t) { // one streak every ~11 s, lasts 0.6 s
  const cycle = 11, ph = t % cycle; if (ph > 0.6) return;
  const n = Math.floor(t / cycle), x0 = 120 + Math.floor(hash(n, 3) * 180), y0 = 8 + Math.floor(hash(n, 4) * 30);
  const x = x0 - Math.floor(ph * 110), y = y0 + Math.floor(ph * 40);
  R(ctx, x, y, 1, 1, C.star3); R(ctx, x + 2, y - 1, 2, 1, C.star2); R(ctx, x + 5, y - 2, 3, 1, C.star1);
}
function sky(ctx, w, h, t) {
  if (!skyC) skyC = buildSky();
  ctx.drawImage(skyC, 0, 0);
  drawStars(ctx, t);
  drawShootingStar(ctx, t);
}

// =====================================================================
// LAYER 1 (0.05) — Old City skyline: Mount of Olives, walls, Dome of the Rock, spires, minarets, cypresses
// =====================================================================
let farC = null;
function buildFar() {
  const [c, g] = mk(P, H);
  g.save(); g.translate(0, -16);   // whole skyline sits 16px higher so it clears the rooftops in front
  // Mount of Olives — two ridges, farther one paler (wrap-safe via 640-periodic sines)
  const k = 6.283 / P;
  for (let x = 0; x < P; x++) {
    const y2 = 96 - Math.round(5 * Math.sin(x * k * 2 + 0.6) + 3 * Math.sin(x * k * 5 + 2.1) + 2 * Math.sin(x * k * 11));
    R(g, x, y2, 1, H - y2, C.ridge2);
  }
  for (let x = 0; x < P; x++) {
    const y1 = 106 - Math.round(4 * Math.sin(x * k * 3 + 1.9) + 2 * Math.sin(x * k * 7 + 0.4) + 1.5 * Math.sin(x * k * 13 + 3));
    R(g, x, y1, 1, H - y1, C.ridge1);
  }
  seamless(g, (g, dx) => {
    // Church of Mary Magdalene (golden onion domes on the Mount of Olives)
    for (const [ox, h] of [[470, 10], [478, 14], [487, 10], [482, 8]]) {
      const x = dx + ox; R(g, x - 1, 100 - h, 3, h, C.olive);
      dome(g, x, 100 - h, 2, 3, C.onion); spire(g, x, 100 - h - 3, 1, 3, C.onion); R(g, x, 100 - h - 6, 1, 1, C.goldLite);
    }
    // olive-grove cypresses on the ridge
    for (const ox of [430, 452, 500, 512, 190, 175, 372]) cypress(g, dx + ox, 104 + Math.floor(hash(ox, 1) * 3), 11 + Math.floor(hash(ox, 2) * 6), C.olive);
  });
  // ---- city walls: crenellated top at y=114, body to 134, then ground
  R(g, 0, 134, P, H - 134, C.farGround);
  R(g, 0, 116, P, 18, C.far);
  R(g, 0, 116, P, 1, C.farLite);
  for (let x = 0; x < P; x += 5) R(g, x, 113, 3, 3, C.far);
  for (let x = 0; x < P; x += 23) { R(g, x, 122, 1, 3, C.farDark); R(g, x + 11, 126, 1, 2, C.farWin); }
  seamless(g, (g, dx) => {
    // Tower of David citadel (x≈40): square tower + minaret + turrets
    R(g, dx + 22, 96, 30, 38, C.far); R(g, dx + 22, 96, 30, 1, C.farLite);
    for (let x = 0; x < 30; x += 4) R(g, dx + 22 + x, 94, 2, 2, C.far);
    R(g, dx + 30, 82, 12, 16, C.far); R(g, dx + 30, 82, 12, 1, C.farLite); for (let x = 0; x < 12; x += 4) R(g, dx + 30 + x, 80, 2, 2, C.far);
    R(g, dx + 44, 70, 3, 28, C.far); R(g, dx + 43, 78, 5, 2, C.farLite); spire(g, dx + 45, 70, 2, 5, C.far);
    R(g, dx + 35, 90, 1, 2, C.farWin); R(g, dx + 45, 84, 1, 2, C.farWin); R(g, dx + 27, 104, 1, 2, C.farWin);
    // Damascus-gate style twin turrets (x≈120)
    R(g, dx + 112, 104, 7, 30, C.far); R(g, dx + 128, 104, 7, 30, C.far);
    for (const tx of [112, 128]) for (let x = 0; x < 7; x += 3) R(g, dx + tx + x, 102, 2, 2, C.far);
    arch(g, dx + 118, 118, 11, 16, C.farDark); R(g, dx + 121, 124, 5, 10, C.farWin);
    // Lutheran Church of the Redeemer — tall pale spire (x≈160)
    R(g, dx + 154, 86, 12, 48, C.far); R(g, dx + 154, 86, 12, 1, C.farLite); spire(g, dx + 159, 86, 6, 22, C.far);
    R(g, dx + 159, 62, 1, 4, C.farLite); R(g, dx + 158, 63, 3, 1, C.farLite); R(g, dx + 158, 96, 1, 3, C.farWin); R(g, dx + 161, 96, 1, 3, C.farWin);
    // Hurva synagogue — big pale dome (x≈220)
    R(g, dx + 206, 108, 30, 26, C.far); dome(g, dx + 221, 108, 15, 12, C.farLite); dome(g, dx + 221, 108, 15, 12, C.far); R(g, dx + 213, 100, 3, 5, C.farLite);
    R(g, dx + 221, 92, 1, 4, C.farLite); R(g, dx + 212, 112, 1, 2, C.farWin); R(g, dx + 229, 112, 1, 2, C.farWin);
    // ---- Dome of the Rock (x≈300): octagonal base, blue drum, golden dome, gleam
    const cx = dx + 300;
    R(g, cx - 26, 118, 52, 16, C.far); R(g, cx - 26, 118, 52, 1, C.farLite);
    for (let x = -24; x < 26; x += 5) arch(g, cx + x, 122, 3, 8, C.farDark);
    R(g, cx - 14, 106, 28, 12, C.drum); R(g, cx - 14, 106, 28, 1, C.drumLite); R(g, cx - 14, 112, 28, 1, C.goldDark);
    for (let x = -12; x < 14; x += 4) R(g, cx + x, 108, 2, 3, C.drumDark);
    dome(g, cx, 106, 14, 15, C.goldDark);
    dome(g, cx - 1, 106, 13, 14, C.gold);
    for (let v = 0; v < 12; v++) { const hw = Math.floor(6 * Math.sqrt(1 - (v / 12) ** 2)); R(g, cx - 7 - Math.floor(v / 3), 104 - v, hw, 1, C.goldLite); }
    R(g, cx - 9, 100, 3, 1, C.goldLite); R(g, cx - 10, 97, 2, 1, C.goldLite);
    R(g, cx, 87, 1, 5, C.gold); R(g, cx - 1, 88, 3, 1, C.goldLite); disc(g, cx, 86, 1, C.goldLite);
    // Dome of the Chain — small sibling dome to the left
    R(g, cx - 40, 116, 12, 18, C.far); dome(g, cx - 34, 116, 6, 6, C.gold); R(g, cx - 36, 111, 2, 1, C.goldLite);
    // Al-Aqsa — long grey-silver dome to the right
    R(g, cx + 30, 116, 34, 18, C.far); dome(g, cx + 47, 116, 12, 8, C.farLite); R(g, cx + 47, 106, 1, 3, C.farLite);
    // Dormition Abbey — conical roof + bell tower (x≈420)
    R(g, dx + 408, 104, 22, 30, C.far); spire(g, dx + 419, 104, 11, 14, C.farLite); spire(g, dx + 419, 104, 11, 14, C.far);
    R(g, dx + 419, 88, 1, 3, C.farLite); R(g, dx + 432, 92, 6, 42, C.far); spire(g, dx + 435, 92, 3, 8, C.farLite); R(g, dx + 434, 100, 2, 3, C.farWin);
    // a slender minaret with a balcony (x≈560)
    R(g, dx + 558, 78, 4, 56, C.far); R(g, dx + 556, 92, 8, 2, C.farLite); R(g, dx + 556, 84, 8, 2, C.farLite);
    spire(g, dx + 560, 78, 2, 6, C.far); R(g, dx + 560, 70, 1, 3, C.farLite); R(g, dx + 559, 96, 2, 2, C.farWin);
    // YMCA-ish square tower + church campanile with a cross (x≈600)
    R(g, dx + 596, 98, 10, 36, C.far); R(g, dx + 596, 98, 10, 1, C.farLite); R(g, dx + 598, 92, 6, 6, C.far); R(g, dx + 600, 88, 2, 4, C.farLite); R(g, dx + 598, 89, 6, 1, C.farLite);
    R(g, dx + 601, 106, 1, 3, C.farWin);
    // cypresses inside the walls
    for (const ox of [80, 96, 195, 250, 262, 388, 400, 470, 520, 540, 590, 630]) cypress(g, dx + ox, 116, 12 + Math.floor(hash(ox, 3) * 6), C.farDark);
  });
  g.restore(); R(g, 0, H - 16, P, 16, C.farGround);
  return c;
}
function drawFar(ctx, camX, camY) {
  if (!farC) farC = buildFar();
  const [ox, dy] = offset(camX, camY, 0.05);
  blit(ctx, farC, ox, dy);
}

// =====================================================================
// LAYER 2 (0.2) — stone rooftops: domes, water tanks, dud shemesh, dishes, antennae, a minaret with green light
// =====================================================================
let midfarC = null;
const MF_BASE = 150;
const MF_BUILDINGS = [
  [0, 46, 28, 'dome'], [48, 38, 20, 'tank'], [90, 54, 36, 'dud'], [148, 36, 24, 'dish'], [188, 60, 32, 'tanks'],
  [252, 42, 42, 'antenna'], [298, 30, 18, 'dome'], [332, 56, 34, 'dud'], [392, 40, 26, 'tank'], [436, 62, 38, 'church'],
  [502, 44, 22, 'dish'], [550, 50, 32, 'dome'], [604, 36, 28, 'antenna'],
];
function buildMidFar() {
  const [c, g] = mk(P, H);
  R(g, 0, MF_BASE, P, H - MF_BASE, C.mfGround);
  seamless(g, (g, dx) => {
    // minaret (x≈330) rising behind the rooftops, green mosque light ring at the balcony
    R(g, dx + 322, 70, 6, MF_BASE - 70, C.mfShade); R(g, dx + 322, 70, 2, MF_BASE - 70, C.mfWall);
    R(g, dx + 320, 88, 10, 3, C.mfLite); R(g, dx + 320, 91, 10, 1, C.minaretGreen); R(g, dx + 320, 100, 10, 2, C.mfLite);
    spire(g, dx + 325, 70, 3, 8, C.mfLite); R(g, dx + 325, 60, 1, 3, C.mfEdge); R(g, dx + 323, 61, 5, 1, C.mfEdge);
    for (const [bx, bw, bh, type] of MF_BUILDINGS) {
      const x = dx + bx, y = MF_BASE - bh;
      R(g, x, y, bw, bh, C.mfWall); R(g, x + bw - 6, y, 6, bh, C.mfShade); R(g, x, y, bw, 1, C.mfEdge);
      R(g, x, y, 1, bh, C.mfLite);
      // arched windows in rows, some lit
      for (let wy = y + 6; wy < MF_BASE - 6; wy += 10) for (let wx = x + 4; wx < x + bw - 8; wx += 8) {
        const lit = hash(wx, wy) < 0.4;
        arch(g, wx, wy, 3, 5, lit ? (hash(wx + 1, wy) < 0.5 ? C.mfLit : C.mfLit2) : C.mfWin);
      }
      // rooftop props
      if (type === 'dome') { dome(g, x + Math.floor(bw / 2), y, Math.floor(bw / 2) - 3, Math.floor(bw / 4), C.mfDome); dome(g, x + Math.floor(bw / 2) - 2, y, Math.floor(bw / 2) - 6, Math.floor(bw / 4) - 1, C.mfDomeLite); dome(g, x + Math.floor(bw / 2), y, Math.floor(bw / 2) - 3, Math.floor(bw / 4), 'rgba(0,0,0,0)'); R(g, x + Math.floor(bw / 2), y - Math.floor(bw / 4) - 3, 1, 3, C.mfEdge); }
      if (type === 'tank' || type === 'tanks') { R(g, x + 4, y - 7, 8, 7, C.tank); R(g, x + 10, y - 7, 2, 7, C.tankShade); R(g, x + 4, y - 8, 8, 1, C.tankShade); if (type === 'tanks') { R(g, x + 16, y - 6, 7, 6, C.tank); R(g, x + 21, y - 6, 2, 6, C.tankShade); R(g, x + 30, y - 9, 8, 9, C.tank); R(g, x + 36, y - 9, 2, 9, C.tankShade); } }
      if (type === 'dud') { // dud shemesh: tilted solar panel + tank on top — the national rooftop bird
        for (let i = 0; i < 6; i++) R(g, x + 6 + i * 2, y - 1 - i, 8, 1, C.panel); for (let i = 1; i < 5; i += 2) R(g, x + 8 + i * 2, y - 1 - i, 2, 1, C.panelLite);
        R(g, x + 8, y - 11, 14, 4, C.tank); R(g, x + 20, y - 11, 2, 4, C.tankShade); R(g, x + 8, y - 12, 14, 1, C.tankShade);
        R(g, x + 26, y - 5, 1, 5, C.antenna); R(g, x + 26, y - 6, 3, 1, C.antenna);
      }
      if (type === 'dish') { R(g, x + bw - 14, y - 6, 1, 6, C.antenna); disc(g, x + bw - 12, y - 7, 3, C.dishDark); disc(g, x + bw - 12, y - 7, 2, C.dish); R(g, x + bw - 10, y - 6, 1, 1, C.antenna); disc(g, x + 8, y - 8, 3, C.dishDark); disc(g, x + 8, y - 8, 2, C.dish); R(g, x + 8, y - 5, 1, 5, C.antenna); }
      if (type === 'antenna') { R(g, x + 8, y - 12, 1, 12, C.antenna); for (let i = 0; i < 4; i++) R(g, x + 5, y - 11 + i * 3, 7, 1, C.antenna); R(g, x + bw - 10, y - 5, 5, 5, C.tank); R(g, x + bw - 6, y - 5, 1, 5, C.tankShade); }
      if (type === 'church') { R(g, x + 10, y - 20, 12, 20, C.mfWall); R(g, x + 18, y - 20, 4, 20, C.mfShade); R(g, x + 10, y - 20, 12, 1, C.mfEdge); spire(g, x + 15, y - 20, 6, 8, C.mfLite); R(g, x + 15, y - 32, 1, 5, C.cross); R(g, x + 13, y - 31, 5, 1, C.cross); arch(g, x + 14, y - 16, 3, 6, C.mfLit); dome(g, x + 44, y, 12, 8, C.mfDome); dome(g, x + 42, y, 9, 6, C.mfDomeLite); R(g, x + 44, y - 11, 1, 3, C.cross); }
      // parapet notches
      for (let px = x + 2; px < x + bw - 2; px += 6) R(g, px, y - 1, 3, 1, C.mfEdge);
    }
  });
  return c;
}
function drawMidFar(ctx, camX, camY) {
  if (!midfarC) midfarC = buildMidFar();
  const [ox, dy] = offset(camX, camY, 0.2);
  blit(ctx, midfarC, ox, dy);
}

// =====================================================================
// LAYER 3 (0.4) — Jerusalem-stone alley facades: arched windows, green shutters, laundry, AC units, cat, graffiti
// =====================================================================
let midC = null;
const MID_BASE = 160;
const MID_BUILDINGS = [ // x, w, h
  [0, 84, 52], [88, 70, 44], [162, 96, 62], [262, 60, 40], [326, 90, 56], [420, 76, 48], [500, 66, 60], [570, 66, 44],
];
// laundry lines: [x0, x1, y, seed]
const LINES = [[96, 152, 124, 1], [170, 250, 106, 2], [330, 410, 114, 3], [504, 562, 108, 4], [10, 78, 118, 5]];
const CLOTH = [C.spray, C.signBlue, C.signRed, C.winLit, C.magentaLite, C.spray, C.shutterLite, C.drip];
function buildMid() {
  const [c, g] = mk(P, H);
  R(g, 0, MID_BASE, P, H - MID_BASE, C.midGround);
  seamless(g, (g, dx) => {
    MID_BUILDINGS.forEach(([bx, bw, bh], bi) => {
      const x = dx + bx, y = MID_BASE - bh;
      stoneWall(g, x, y, bw, bh, C.stone, C.stoneLite, C.stoneDark, C.mortar, 7, 4, bi * 97);
      R(g, x + bw - 7, y, 7, bh, C.shade); R(g, x + bw - 2, y, 2, bh, C.shadeDark);   // shadow side
      R(g, x, y, bw, 2, C.stoneLite); R(g, x, y + 2, bw, 1, C.mortar);                  // roof parapet
      // windows: arched, with green shutters; some lit
      for (let wy = y + 10; wy < MID_BASE - 12; wy += 18) for (let wx = x + 6; wx < x + bw - 14; wx += 16) {
        if (bi === 1 && wy === y + 28 && wx - dx >= 100 && wx - dx <= 136) continue;   // wall patch reserved for the plaque
        const r = hash(wx + bi, wy), lit = r < 0.45;
        arch(g, wx, wy, 5, 9, lit ? C.winLit : C.winDark);
        if (lit) { R(g, wx + 1, wy + 3, 3, 6, C.winLit2); if (r < 0.15) { disc(g, wx + 2, wy + 5, 1, C.winDark); R(g, wx + 1, wy + 7, 3, 2, C.winDark); } } // savta silhouette watching the street
        R(g, wx - 2, wy + 1, 2, 8, C.shutter); R(g, wx + 5, wy + 1, 2, 8, C.shutter);
        for (let s = 0; s < 8; s += 2) { R(g, wx - 2, wy + 1 + s, 2, 1, C.shutterDark); R(g, wx + 5, wy + 1 + s, 2, 1, C.shutterDark); }
        R(g, wx - 2, wy + 9, 9, 1, C.shadeDark); R(g, wx - 2, wy + 10, 9, 1, C.stoneLite); // sill
        if (hash(wx, wy + 3) < 0.35) { R(g, wx - 3, wy + 10, 11, 1, C.rail); for (let rx = -3; rx < 8; rx += 2) R(g, wx + rx, wy + 8, 1, 2, C.rail); }
        if (hash(wx, wy + 5) < 0.3) { R(g, wx + 8, wy + 1, 6, 5, C.ac); R(g, wx + 8, wy + 4, 6, 2, C.acDark); for (let ax = 0; ax < 6; ax += 2) R(g, wx + 8 + ax, wy + 2, 1, 2, C.acGrill); R(g, wx + 9, wy + 6, 1, 1, C.drip); }
      }
      // ground-floor doorway
      arch(g, x + Math.floor(bw / 2) - 4, MID_BASE - 14, 8, 14, C.shadeDark); arch(g, x + Math.floor(bw / 2) - 3, MID_BASE - 13, 6, 13, C.door);
      R(g, x + Math.floor(bw / 2) - 3, MID_BASE - 13, 6, 13, C.doorDark); arch(g, x + Math.floor(bw / 2) - 3, MID_BASE - 13, 6, 6, C.door); R(g, x + Math.floor(bw / 2), MID_BASE - 7, 1, 1, C.doorKnob);
      R(g, x + Math.floor(bw / 2) + 4, MID_BASE - 11, 1, 3, C.mezuzah);
    });
    // Jerusalem stone rooftop dud shemesh on building 4
    R(g, dx + 270, MID_BASE - 40 - 1, 12, 1, C.panel); for (let i = 0; i < 5; i++) R(g, dx + 272 + i * 2, MID_BASE - 42 - i, 10, 1, C.panel); R(g, dx + 276, MID_BASE - 50, 12, 4, C.tank); R(g, dx + 286, MID_BASE - 50, 2, 4, C.tankShade);
    // graffiti on building 5: נ נח נחמ נחמן מאומן — mandatory Israeli wall art
    const gx = dx + 494, gy = MID_BASE - 26;
    text(g, gx + 1, gy + 1, 'נ נח נחמ נחמן מאומן', C.sprayShadow); text(g, gx, gy, 'נ נח נחמ נחמן מאומן', C.spray);
    // ceramic street plaque on building 2: אין חניה (there is never parking)
    const px = dx + 102, py = MID_BASE - 16, pw = textWidth('אין חניה') + 6;
    R(g, px, py, pw, 9, C.plaqueRed); R(g, px + 1, py + 1, pw - 2, 7, C.plaque); text(g, px + pw - 3, py + 2, 'אין חניה', C.ink);
    // "חומוס" shop sign on building 6, with a proper RTL arrow (←)
    const sx = dx + 505, sy = MID_BASE - 30, sw = textWidth('חומוס') + 14;
    R(g, sx, sy - 1, sw, 11, C.signWood); R(g, sx + 1, sy, sw - 2, 9, C.signCream); text(g, sx + sw - 3, sy + 2, 'חומוס', C.signRed);
    R(g, sx + 3, sy + 4, 6, 1, C.signBlue); R(g, sx + 4, sy + 3, 1, 1, C.signBlue); R(g, sx + 4, sy + 5, 1, 1, C.signBlue); R(g, sx + 5, sy + 2, 1, 1, C.signBlue); R(g, sx + 5, sy + 6, 1, 1, C.signBlue);
    // laundry lines (rope + pegs are static; clothes animate)
    for (const [x0, x1, y] of LINES) { const mid = Math.floor((x0 + x1) / 2); R(g, dx + x0, y, mid - x0, 1, C.rope); R(g, dx + mid, y + 1, x1 - mid, 1, C.rope); R(g, dx + x0, y - 2, 1, 4, C.rail); R(g, dx + x1, y - 1, 1, 4, C.rail); }
  });
  return c;
}
function drawLaundry(ctx, bx, dy, t) {
  for (const [x0, x1, y, seed] of LINES) {
    const n = Math.floor((x1 - x0 - 6) / 9);
    for (let i = 0; i < n; i++) {
      const cx = bx + x0 + 5 + i * 9, kind = hash(seed, i), col = CLOTH[Math.floor(hash(seed + 7, i) * CLOTH.length)];
      const sag = i > Math.floor(n / 2) - 1 ? 1 : 0;
      const wave = Math.sin(t * 3.2 + i * 1.1 + seed) ;
      const flap = Math.round(wave * 1.5), lift = wave > 0.7 ? 1 : 0;
      const cw = kind < 0.4 ? 6 : kind < 0.7 ? 4 : 5, ch = kind < 0.4 ? 7 : kind < 0.7 ? 9 : 5; // shirt / pants / towel
      R(ctx, cx, y + 1 + sag, cw, ch - 2, col);
      R(ctx, cx + flap, y + ch - 1 + sag - lift, cw, 2, col);
      if (kind < 0.4) { R(ctx, cx - 1, y + 1 + sag, 1, 2, col); R(ctx, cx + cw, y + 1 + sag, 1, 2, col); }   // sleeves
      if (kind >= 0.4 && kind < 0.7) R(ctx, cx + 1, y + 5 + sag, 2, ch - 5, C.rope);                          // pants gap
      R(ctx, cx + 1, y + sag, 1, 1, C.signWoodLite); R(ctx, cx + cw - 2, y + sag, 1, 1, C.signWoodLite);      // pegs
      // a lone sock stays put, of course
      if (i === n - 1 && seed === 2) R(ctx, cx + 8, y + 1 + sag, 2, 4, C.magenta);
    }
  }
}
function drawCat(ctx, x, y, t) { // silhouette cat sitting on a wall, tail swishing
  R(ctx, x, y - 4, 8, 4, C.cat); R(ctx, x + 7, y - 8, 4, 5, C.cat); R(ctx, x + 7, y - 9, 1, 1, C.cat); R(ctx, x + 10, y - 9, 1, 1, C.cat);
  R(ctx, x + 8, y - 7, 1, 1, C.catEye); R(ctx, x + 10, y - 7, 1, 1, C.catEye);
  const s = Math.sin(t * 2.4);
  const tx = x - 1 - Math.round(s * 2);
  R(ctx, x - 1, y - 2, 1, 2, C.cat); R(ctx, tx - 1, y - 4 - Math.round(Math.abs(s) * 2), 1, 3, C.cat); R(ctx, tx, y - 5 - Math.round(Math.abs(s) * 2), 1, 1, C.cat);
}
function drawMid(ctx, camX, camY, W_, H_, t) {
  if (!midC) midC = buildMid();
  const [ox, dy] = offset(camX, camY, 0.4);
  blit(ctx, midC, ox, dy);
  tiles(ox, (bx) => {
    drawLaundry(ctx, bx, dy, t);
    drawCat(ctx, bx + 300, MID_BASE - 40 + dy, t);
    drawCat(ctx, bx + 140, MID_BASE - 44 + dy, t + 2);
  });
}

// =====================================================================
// LAYER 4 (0.65) — stone archways over the alley, hanging lanterns (glow flickers), cobbles, shop, mezuzah
// =====================================================================
let nearC = null;
const NEAR_BASE = 160;
const ARCHES = [[40, 92], [380, 84]];              // x, span
const LANTERNS = [[86, 62], [422, 68], [232, 84], [560, 92]];  // x, lantern top y (post/chain)
function archway(g, x, span) {
  const top = 54, pw = 12, r = Math.floor(span / 2), cx = x + r;
  // pillars with stone texture
  stoneWall(g, x, top + 12, pw, NEAR_BASE - top - 12, C.arch, C.archLite, C.archMid, C.archDark, 6, 5, 11);
  stoneWall(g, x + span - pw, top + 12, pw, NEAR_BASE - top - 12, C.arch, C.archLite, C.archMid, C.archDark, 6, 5, 13);
  R(g, x + pw - 2, top + 12, 2, NEAR_BASE - top - 12, C.archDark); R(g, x + span - pw, top + 12, 2, NEAR_BASE - top - 12, C.archLite);
  // arch ring: outer stepped semicircle minus inner
  const ro = r, ri = r - 9, by = top + 12 + ri;  // arch spring line
  for (let v = 0; v <= ro; v++) {
    const hwO = Math.floor(ro * Math.sqrt(1 - (v / ro) ** 2));
    const hwI = v <= ri ? Math.floor(ri * Math.sqrt(1 - (v / ri) ** 2)) : -1;
    const yy = by - v;
    if (hwI >= 0) { R(g, cx - hwO, yy, hwO - hwI, 1, C.arch); R(g, cx + hwI + 1, yy, hwO - hwI, 1, C.archMid); }
    else R(g, cx - hwO, yy, hwO * 2 + 1, 1, v > ro - 3 ? C.archLite : C.arch);
  }
  // voussoir joints
  for (let a = 0; a <= 8; a++) { const ang = Math.PI * a / 8; const jx = Math.round(cx + Math.cos(ang) * (r - 4)), jy = Math.round(by - Math.sin(ang) * (r - 4)); R(g, jx, jy, 1, 1, C.archDark); }
  R(g, cx - 2, by - ro, 5, 3, C.keystone); R(g, cx - 1, by - ro - 1, 3, 1, C.keystone);
  // wall above the arch ring up to y=top
  R(g, x, top, span, 6, C.arch); R(g, x, top, span, 1, C.archLite); R(g, x, top + 5, span, 1, C.archDark);
  for (let px = x; px < x + span; px += 8) R(g, px, top - 2, 4, 2, C.arch);
}
function buildNear() {
  const [c, g] = mk(P, H);
  // cobbled alley edge
  R(g, 0, NEAR_BASE, P, H - NEAR_BASE, C.cobble);
  for (let y = NEAR_BASE; y < H; y += 4) for (let x = ((y / 4) & 1) ? 3 : 0; x < P; x += 6) {
    const r = hash(x, y); R(g, x, y, 5, 3, r < 0.3 ? C.cobbleLite2 : r < 0.6 ? C.cobbleLite : C.cobble); R(g, x + 5, y, 1, 3, C.cobbleGap); R(g, x, y + 3, 6, 1, C.cobbleGap);
  }
  R(g, 0, NEAR_BASE, P, 1, C.cobbleLite2);
  seamless(g, (g, dx) => {
    for (const [ax, span] of ARCHES) archway(g, dx + ax, span);
    // lantern chains / brackets (static). Lanterns hang from arch keystones or wall brackets.
    for (const [lx, ly] of LANTERNS) { R(g, dx + lx, ly - 8, 1, 8, C.chain); }
    R(g, dx + 226, 84, 7, 1, C.chain); R(g, dx + 226, 84, 1, 4, C.chain);          // wall bracket
    R(g, dx + 554, 92, 7, 1, C.chain); R(g, dx + 554, 92, 1, 4, C.chain);
    // a blue Old-City door with mezuzah + a step, between the arches (x≈200)
    stoneWall(g, dx + 196, 96, 40, NEAR_BASE - 96, C.arch, C.archLite, C.archMid, C.archDark, 6, 5, 17);
    R(g, dx + 196, 96, 40, 2, C.archLite);
    arch(g, dx + 208, 118, 16, NEAR_BASE - 118, C.archDeep); arch(g, dx + 210, 120, 12, NEAR_BASE - 120, C.door);
    R(g, dx + 216, 122, 1, NEAR_BASE - 122, C.doorDark); R(g, dx + 213, 134, 1, 2, C.doorKnob); R(g, dx + 218, 134, 1, 2, C.doorKnob);
    R(g, dx + 224, 126, 1, 4, C.mezuzah); R(g, dx + 206, NEAR_BASE - 3, 20, 3, C.archLite); R(g, dx + 206, NEAR_BASE - 1, 20, 1, C.archMid);
    // a stone bench + a forgotten Bamba bag (tiny) by the wall (x≈520)
    R(g, dx + 520, NEAR_BASE - 8, 22, 3, C.archLite); R(g, dx + 520, NEAR_BASE - 5, 22, 1, C.archMid); R(g, dx + 522, NEAR_BASE - 5, 3, 5, C.archMid); R(g, dx + 537, NEAR_BASE - 5, 3, 5, C.archMid);
    R(g, dx + 546, NEAR_BASE - 4, 5, 4, C.signRed); R(g, dx + 547, NEAR_BASE - 3, 3, 2, C.winLit);
    // low stone wall stub at x≈600 with a ceramic "שבת שלום" tile
    stoneWall(g, dx + 588, 132, 52, NEAR_BASE - 132, C.arch, C.archLite, C.archMid, C.archDark, 6, 5, 19); R(g, dx + 588, 132, 52, 2, C.archLite);
    const tw = textWidth('שבת שלום') + 6; R(g, dx + 594, 138, tw, 9, C.signBlue); R(g, dx + 595, 139, tw - 2, 7, C.plaque); text(g, dx + 594 + tw - 3, 140, 'שבת שלום', C.signBlue);
  });
  return c;
}
function drawLantern(ctx, x, y, t, i) {
  const f = Math.sin(t * 9 + i * 2.1) * 0.5 + Math.sin(t * 23 + i) * 0.5;
  const r = 13 + Math.round(f);
  disc(ctx, x, y + 4, r, C.glow3); disc(ctx, x, y + 4, r - 5, C.glow2); disc(ctx, x, y + 4, r - 9, C.glow1);
  R(ctx, x - 3, y - 1, 7, 1, C.lanternMetal); R(ctx, x - 2, y, 5, 7, C.lanternMetal);
  R(ctx, x - 1, y + 1, 3, 5, f > 0.3 ? C.lanternCore : C.lanternGlass); R(ctx, x, y + 2, 1, 3, C.lanternCore);
  R(ctx, x - 3, y + 7, 7, 1, C.lanternMetal); R(ctx, x, y + 8, 1, 1, C.lanternMetal);
}
function drawNear(ctx, camX, camY, W_, H_, t) {
  if (!nearC) nearC = buildNear();
  const [ox, dy] = offset(camX, camY, 0.65);
  blit(ctx, nearC, ox, dy);
  tiles(ox, (bx) => { LANTERNS.forEach(([lx, ly], i) => { const x = bx + lx; if (x > -20 && x < W + 20) drawLantern(ctx, x, ly + dy, t, i); }); });
}

// =====================================================================
// LAYER 5 (0.85) — hanging bougainvillea curtains (sway in slices), a potted vine on a ledge
// =====================================================================
let vineC = null;             // one 640×64 strip, drawn in horizontal slices with per-slice sway
const VINE_H = 64;
const VINE_CLUSTERS = [[12, 74, 52, 1], [300, 54, 40, 2], [560, 70, 34, 3], [200, 26, 20, 4]]; // x, w, h, seed
function buildVines() {
  const [c, g] = mk(P, VINE_H);
  seamless(g, (g, dx) => {
    for (const [vx, vw, vh, seed] of VINE_CLUSTERS) {
      const x = dx + vx;
      // stems — a few hanging strands of varying length
      for (let s = 0; s < Math.floor(vw / 6); s++) {
        const sx = x + 2 + s * 6 + Math.floor(hash(seed, s) * 3), len = Math.floor(vh * (0.5 + hash(seed + 1, s) * 0.5));
        for (let v = 0; v < len; v++) { const wob = Math.round(Math.sin(v * 0.4 + s) * 1.2); R(g, sx + wob, v, 1, 1, C.vine); }
        for (let v = 2; v < len; v += 4) {
          const wob = Math.round(Math.sin(v * 0.4 + s) * 1.2), side = (v / 4 + s) & 1 ? 1 : -2;
          const r = hash(seed + 3, s * 100 + v);
          if (r < 0.55) { R(g, sx + wob + side, v, 2, 1, r < 0.2 ? C.leafLite : C.leaf); R(g, sx + wob + side, v + 1, 1, 1, C.leaf); }
          else { const col = r < 0.72 ? C.magentaLite : r < 0.9 ? C.magenta : C.magentaDeep; R(g, sx + wob + side, v, 2, 2, col); R(g, sx + wob + side + (side > 0 ? 1 : 0), v - 1, 1, 1, C.magentaLite); }
        }
      }
      // dense crown at the top
      for (let px = x; px < x + vw; px += 2) for (let py = 0; py < 8; py += 2) {
        const r = hash(px + seed * 31, py);
        if (r < 0.35) R(g, px, py, 2, 2, C.leaf); else if (r < 0.5) R(g, px, py, 2, 2, C.leafLite); else if (r < 0.8) R(g, px, py, 2, 2, r < 0.62 ? C.magenta : C.magentaLite); else if (r < 0.86) R(g, px, py, 2, 2, C.magentaDeep);
      }
    }
  });
  return c;
}
function drawVines(ctx, camX, camY, W_, H_, t) {
  if (!vineC) vineC = buildVines();
  const [ox, dy] = offset(camX, camY, 0.85);
  const SL = 8; // slice height; lower slices sway more
  tiles(ox, (bx) => {
    for (let s = 0; s < VINE_H / SL; s++) {
      const sway = Math.round(Math.sin(t * 1.4 + s * 0.55) * (s * 0.45));
      ctx.drawImage(vineC, 0, s * SL, P, SL, bx + sway, dy + s * SL, P, SL);
    }
  });
}

// =====================================================================
// FOG — warm lamp-dust motes + slow dusk darkening (capped)
// =====================================================================
const MOTES = [];
for (let i = 0; i < 26; i++) MOTES.push({ x: hash(i, 41) * W, y: hash(i, 43) * H, vx: 2 + hash(i, 47) * 4, vy: 3 + hash(i, 53) * 5, ph: hash(i, 59) * 6.283 });
function fog(ctx, w, h, t) {
  const dark = Math.min(0.26, t * 0.007);                  // ~37 s to full dusk; never darker than 26%
  if (dark > 0.004) { ctx.fillStyle = `rgba(18,8,46,${dark.toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
  // faint warm haze hugging the alley floor (lamp light bouncing off stone)
  ctx.fillStyle = 'rgba(255,180,90,0.05)'; ctx.fillRect(0, 120, w, 60);
  for (const m of MOTES) {
    const x = Math.floor((m.x + t * m.vx + Math.sin(t * 0.8 + m.ph) * 6) % w), y = Math.floor(((m.y - t * m.vy) % h + h) % h);
    const a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2 + m.ph));
    ctx.fillStyle = `rgba(255,217,160,${a.toFixed(2)})`; ctx.fillRect(x, y, 1, 1);
  }
}

export default {
  sky,
  layers: [
    { speed: 0.05, draw: (ctx, camX, camY) => drawFar(ctx, camX, camY) },
    { speed: 0.2, draw: (ctx, camX, camY) => drawMidFar(ctx, camX, camY) },
    { speed: 0.4, draw: drawMid },
    { speed: 0.65, draw: drawNear },
    { speed: 0.85, draw: drawVines },
  ],
  fog,
};

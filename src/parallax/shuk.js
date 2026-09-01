// SABRA! — parallax: שוק מחנה יהודה / Mahane Yehuda market, high noon.
// fillRect-only pixel art (no arcs, no createLinearGradient), integer coords, tiling layers (period ≤ 640).
// Static parts are baked lazily into offscreen canvases on first draw; only animated bits redraw per frame.

const W = 320, H = 180, LH = 240;   // LH: layer canvas height (extra rows so a camY shift never shows a gap)

// ---------------------------------------------------------------- palette
const C = {
  sky: ['#3f8bd6', '#57a0e0', '#75b6e8', '#97cbee', '#b8def3', '#d3eaf3', '#e6f0e8', '#f0efe0'],
  sunCore: '#fffce9', sun: '#ffec96', sunHalo: 'rgba(255,240,180,0.30)', wisp: '#e4f1fa',
  // far hills (atmospheric perspective: pale + blue)
  hillFar: '#c8d5e2', hillNear: '#b6c6d7', hillStone: '#e7e6df', hillStoneS: '#d1d2cc', hillWin: '#a9b8c9', hillTree: '#8ea69a', hillTreeD: '#7a9388', hillWhite: '#f4f5f2', hillPanel: '#5d7290',
  // neighborhood
  stone: '#e9e0c9', stoneS: '#cfc1a3', stoneD: '#b8a98b', roof: '#c9bb9d', win: '#5e6f86', winL: '#8fa5bd', shut: '#2d7c73', shutD: '#215f58', tank: '#2b2b2b', tankL: '#4a4a4a', dish: '#cfd3d6', dishD: '#8b9096', tree: '#3f6d49', treeL: '#5f8f66', trunk: '#5a3f27', base2: '#d9cdb1', base2D: '#b5a78a',
  // facades
  fac: '#ead9b6', facS: '#d3be93', facD: '#b89f73', facLine: '#dbc79f', mortar: '#c9b48c', arch: '#3f4c5f', archL: '#6a7c94', frame: '#f4ecd8', door: '#3a2b1f', doorL: '#5a4330', rail: '#2e2e2e', slab: '#cdb78e', ac: '#d5d9dc', acD: '#8f959a', street: '#8f7c5c', streetL: '#a8957a', shutter: '#b7b2a8', shutterD: '#8f8a80',
  signBoard: '#f6ebcb', signBlue: '#1d3f86', signRed: '#c62a22', signYellow: '#f5d94a', ink: '#1b1b1b', white: '#f7f3e8',
  flagBlue: '#1f5fc8', poster1: '#e8483a', poster2: '#f2c21a', poster3: '#3a8fd6', poster4: '#f3efe6', poster5: '#3fa35a',
  // stalls
  wood: '#b07a3e', woodL: '#d69a52', woodD: '#7a5128', pole: '#6b4220', poleL: '#9a6a3a', crate: '#c08d4c', crateD: '#8c6232', crateL: '#dcae6b', burlap: '#c9a978', burlapD: '#a58656', shade: '#5c4a35', shadeL: '#6f5b42',
  awnRed: '#d63b2f', awnGreen: '#2f8a4a', awnBlue: '#2b62b8', awnYellow: '#e9b520', awnWhite: '#f6f1e4', awnDark: 'rgba(0,0,0,0.25)',
  orange: '#f28c1e', orangeL: '#fbb24c', tomato: '#d8302a', tomatoL: '#f0665a', cucumber: '#3f9a3c', cucumberL: '#6cc25e', lemon: '#f2d232', lemonL: '#fbe98a', eggplant: '#4e2a6e', eggplantL: '#7a4aa0', pepperR: '#d12b2b', pepperY: '#f2c21a', pepperG: '#3fa03a', pomeg: '#b3182f', melonG: '#2f7a3a', melonR: '#e0413f', pita: '#e3c58a', pitaD: '#c9a466', olive: '#3d4a2c', oliveL: '#5c6b3d',
  paprika: '#c8341f', turmeric: '#e6a71e', cumin: '#a8793b', sumac: '#7d1e2f', zaatar: '#5f7a2e', pepperBlack: '#2e2620',
  lampShade: '#2a2a2a', bulb: '#ffe36e', bulbCore: '#fff7c8', cord: '#2b2b2b',
  cat: '#e08a2e', catD: '#a95f1a', catK: '#1a1a1a', pigeon: '#8d939c', pigeonL: '#b9bec5', pigeonK: '#3b3f45',
  garlic: '#f3efe4', garlicS: '#cfc6b1', garlicP: '#b39bc4', stem: '#b9a87e', pepDried: '#c8251c', pepDriedL: '#e8483a', pepStem: '#3f7a2e', apricot: '#e08a2c', apricotD: '#b46a1e', fig: '#6e3a58', figL: '#9a5a80', date: '#7a4620', dateL: '#a3642f', brass: '#c9a23a', brassL: '#e8c96a', brassD: '#8f6f20', dial: '#efe8d3', hamsa: '#2f6fd8', hamsaL: '#5b93ea', eye: '#f7f3e8',
  fly: '#1a1a1a', flyW: '#8a8a8a',
  mote: 'rgba(255,224,150,0.55)', mote2: 'rgba(255,236,190,0.30)',
};

// ---------------------------------------------------------------- tiny helpers (fillRect only)
function mk(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function line(g, x0, y0, x1, y1, c) {
  g.fillStyle = c;
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (;;) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
}
function art(g, rows, x, y, pal) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]; let i = 0;
    while (i < row.length) {
      const ch = row[i]; if (ch === '.') { i++; continue; }
      let run = 1; while (i + run < row.length && row[i + run] === ch) run++;
      g.fillStyle = pal[ch]; g.fillRect(x + i, y + j, run, 1); i += run;
    }
  }
}
// deterministic pseudo-random in [0,1)
function rnd(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
// context wrapper that repeats every fillRect at ±P so items crossing the period edge wrap seamlessly
function wrap(ctx, P) {
  return {
    set fillStyle(v) { ctx.fillStyle = v; }, get fillStyle() { return ctx.fillStyle; },
    fillRect(x, y, w, h) { ctx.fillRect(x, y, w, h); if (x < 0) ctx.fillRect(x + P, y, w, h); if (x + w > P) ctx.fillRect(x - P, y, w, h); },
  };
}
// blit a periodic layer canvas across the screen + run per-frame animation for each tile
function tile(ctx, cv, P, speed, camX, camY, anim, t) {
  let ox = -Math.floor(camX * speed) % P; if (ox > 0) ox -= P;
  let oy = -Math.round(camY * speed * 0.3); if (oy < -60) oy = -60; if (oy > 0) oy = 0;
  for (let x = ox - P; x < W; x += P) if (x + P > 0) ctx.drawImage(cv, x, oy);
  if (anim) for (let x = ox - P; x < W; x += P) anim(ctx, x, oy, t);
}

// ---------------------------------------------------------------- pixel fonts
const DIG = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '..#', '..#'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'], '.': ['.', '.', '.', '.', '#'], '-': ['..', '..', '##', '..', '..'],
  '₪': ['####..', '#....#', '#....#', '#....#', '..####'],
};
const HEB = {
  'ש': ['#.#.#', '#.#.#', '#.#.#', '#.#.#', '#.#.#', '#...#', '#####'],
  'ו': ['###', '..#', '..#', '..#', '..#', '..#', '..#'],
  'ק': ['#####', '#...#', '#...#', '#...#', '#..##', '#....', '#....'],
  'מ': ['#.###', '##..#', '#...#', '#...#', '#...#', '#...#', '.####'],
  'ח': ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#'],
  'נ': ['..###', '....#', '....#', '....#', '....#', '....#', '.####'],
  'ה': ['#####', '....#', '....#', '#...#', '#...#', '#...#', '#...#'],
  'י': ['###', '..#', '..#', '...', '...', '...', '...'],
  'ד': ['#####', '...#.', '...#.', '...#.', '...#.', '...#.', '...#.'],
  'ר': ['####.', '....#', '....#', '....#', '....#', '....#', '....#'],
  'ב': ['####.', '....#', '....#', '....#', '....#', '....#', '#####'],
  'כ': ['####.', '....#', '....#', '....#', '....#', '....#', '####.'],
  'ל': ['#....', '.#...', '.####', '....#', '....#', '....#', '..###'],
  'צ': ['#...#', '#...#', '#..#.', '#.#..', '##...', '#....', '#####'],
  'ע': ['#...#', '#...#', '#...#', '.#..#', '.#..#', '..#.#', '#####'],
  'ס': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'ט': ['#..#.', '#.#.#', '#...#', '#...#', '#...#', '#...#', '.####'],
  'א': ['#...#', '##..#', '.#.#.', '..#..', '.#.#.', '#..##', '#...#'],
  'פ': ['#####', '#...#', '#.#.#', '#.###', '#....', '#....', '#####'],
};
// Draws a LOGICAL Hebrew string right-to-left starting at right edge `xr`. Digits inside stay LTR.
function hebText(g, str, xr, y, color) {
  const pal = { '#': color };
  let x = xr; let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === ' ') { x -= 3; i++; continue; }
    if (DIG[ch]) { // collect a LTR run of digit-ish chars
      let j = i; let wsum = 0; while (j < str.length && DIG[str[j]]) { wsum += DIG[str[j]][0].length + 1; j++; }
      let cx = x - wsum + 1;
      for (let k = i; k < j; k++) { art(g, DIG[str[k]], cx, y + 1, pal); cx += DIG[str[k]][0].length + 1; }
      x -= wsum; i = j; continue;
    }
    const gl = HEB[ch]; if (gl) { x -= gl[0].length; art(g, gl, x, y, pal); x -= 1; }
    i++;
  }
  return x;
}
function numText(g, str, x, y, color) { // LTR numbers/prices
  const pal = { '#': color };
  for (const ch of str) { const gl = DIG[ch]; if (!gl) { x += 2; continue; } art(g, gl, x, y, pal); x += gl[0].length + 1; }
  return x;
}

// ---------------------------------------------------------------- pixel props
const DUD = ['...tttttttt.', '..ttttttttts', '...ssssssss.', '...l......l.', '..ffffffffff', '..fpqpppppqf', '.fpppqppppqf', '.ffffffffff.', '.l........l.'];
const DUD_PAL = { t: '#f6f3ea', s: '#c9c4b6', p: '#2f4157', q: '#6d8bb0', f: '#e9e6dc', l: '#8a8578' };
const CYPRESS = ['..d..', '..d..', '.ddd.', '.dld.', '.ddd.', '.dld.', 'dddld', 'ddldd', 'dddld', 'ddldd', '.ddd.', '.ddd.', '..t..', '..t..'];
const CAT = ['.k....k.', '.kk..kk.', '.oooooo.', '.okooko.', '.oooooo.', 'ooooooo.', 'oooooooo', '.oo..oo.'];
const CAT_PAL = { o: C.cat, k: C.catK };
const CAT_SLEEP = ['...ooooo..', '..ooooooo.', '.oooooooo.', 'oooooooooo', '.oooooooo.', '..ooo.ooo.'];
const PIGEON = ['...gk', '.gggg', 'ggggg', '.g.g.'];
const PIGEON_PAL = { g: C.pigeon, k: C.pigeonK };
const STAR = ['...#...', '..#.#..', '#######', '.#...#.', '#######', '..#.#..', '...#...'];
const HAMSA = ['.#.#.#.', '.#.#.#.', '##.#.##', '#######', '.#####.', '.#eee#.', '.#eke#.', '..###..', '...#...'];
const HAMSA_PAL = { '#': C.hamsa, e: C.eye, k: C.ink };
const DISH = ['.ddd.', 'dddDd', '.ddd.', '..s..'];
const DISH_PAL = { d: C.dish, D: C.white, s: C.dishD };

function produceMound(g, x, y, w, kind) {
  // round produce mound rising above a crate: rows of 3px "fruits" in a brick pattern
  const sets = {
    orange: [[C.orange, C.orangeL]], tomato: [[C.tomato, C.tomatoL]], lemon: [[C.lemon, C.lemonL]], cucumber: [[C.cucumber, C.cucumberL]],
    eggplant: [[C.eggplant, C.eggplantL]], pepper: [[C.pepperR, C.tomatoL], [C.pepperY, C.lemonL], [C.pepperG, C.cucumberL]],
    pomeg: [[C.pomeg, C.tomatoL]], olive: [[C.olive, C.oliveL]],
  };
  const s = sets[kind] || sets.orange;
  let n = 0;
  for (let row = 0; row < 3; row++) {
    const yy = y - row * 2;
    const inset = row * 2 + 1;
    for (let xx = x + inset + (row % 2) * 2; xx + 3 <= x + w - inset; xx += 4) {
      const col = s[n % s.length]; n++;
      R(g, xx, yy, 3, 3, col[0]); R(g, xx, yy, 1, 1, col[1]);
    }
  }
}
function spicePyramid(g, x, y, col, colL) { // base width 12, 6 rows tall, tip at y
  for (let r = 0; r < 6; r++) { R(g, x + 6 - r - 1, y + r, 2 + r * 2, 1, col); }
  R(g, x + 5, y + 1, 1, 4, colL);
}
function crate(g, x, y, w, h) {
  R(g, x, y, w, h, C.crate);
  R(g, x, y, w, 1, C.crateL); R(g, x, y + h - 1, w, 1, C.crateD);
  for (let yy = y + 3; yy < y + h - 1; yy += 4) R(g, x + 1, yy, w - 2, 1, C.crateD);
  R(g, x, y, 1, h, C.crateD); R(g, x + w - 1, y, 1, h, C.crateD);
}
function sack(g, x, y, w, h, spice, spiceL) {
  R(g, x, y, w, h, C.burlap); R(g, x, y, 1, h, C.burlapD); R(g, x + w - 1, y, 1, h, C.burlapD);
  R(g, x + 1, y, w - 2, 1, C.burlapD); R(g, x + 2, y + h - 1, w - 4, 1, C.burlapD);
  spicePyramid(g, x + ((w - 12) >> 1), y - 5, spice, spiceL);
}
function shutterWindow(g, x, y, w, h, openShutters) {
  R(g, x - 1, y - 1, w + 2, h + 2, C.frame);
  R(g, x, y, w, h, C.win); R(g, x + 1, y + 1, w - 2, 1, C.winL);
  if (openShutters) {
    R(g, x - 4, y - 1, 3, h + 2, C.shut); R(g, x + w + 1, y - 1, 3, h + 2, C.shut);
    for (let yy = y + 1; yy < y + h; yy += 2) { R(g, x - 3, yy, 1, 1, C.shutD); R(g, x + w + 2, yy, 1, 1, C.shutD); }
  } else {
    R(g, x, y, w, h, C.shut); for (let yy = y + 1; yy < y + h; yy += 2) R(g, x + 1, yy, w - 2, 1, C.shutD);
  }
}
function archWindow(g, x, y, w, h) { // pointed-ish Jerusalem arch, w even
  const half = w >> 1;
  R(g, x - 1, y + half, w + 2, h - half + 1, C.frame);
  for (let r = 0; r < half; r++) { const ww = Math.min(w + 2, 2 * (r + 1) + 2); R(g, x + half - (ww >> 1), y + r, ww, 1, C.frame); }
  for (let r = 1; r < half; r++) { const ww = Math.min(w, 2 * r + 1); R(g, x + half - (ww >> 1), y + r, ww, 1, C.arch); }
  R(g, x, y + half, w, h - half, C.arch);
  R(g, x + 1, y + half, w - 2, 1, C.archL);
  R(g, x + half, y + half - 1, 1, h - half + 1, C.frame);
}
function balcony(g, x, y, w) {
  R(g, x, y, w, 2, C.slab); R(g, x, y + 2, w, 1, C.facD);
  R(g, x, y - 6, w, 1, C.rail);
  for (let xx = x; xx < x + w; xx += 3) R(g, xx, y - 6, 1, 6, C.rail);
}
function laundry(g, x0, y0, x1, y1) {
  line(g, x0, y0, x1, y1, C.rail);
  const cols = [C.poster1, C.poster3, C.white, C.poster2, C.poster5, C.white];
  const n = Math.max(2, Math.floor((x1 - x0) / 7));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n; const x = Math.round(x0 + (x1 - x0) * u) - 2; const y = Math.round(y0 + (y1 - y0) * u) + 1;
    const h = 3 + Math.floor(rnd(i * 7 + x0) * 3);
    R(g, x, y, 4, h, cols[(i + x0) % cols.length]);
    R(g, x - 1, y - 1, 1, 1, C.rail); R(g, x + 4, y - 1, 1, 1, C.rail);
  }
}
function dudSmall(g, x, y) { R(g, x, y, 5, 2, C.hillWhite); R(g, x + 1, y + 2, 4, 2, C.hillPanel); }

// ================================================================ SKY
let skyCv = null;
function buildSky() {
  skyCv = mk(W, H); const g = skyCv.getContext('2d');
  const bands = C.sky; const bh = [22, 22, 22, 22, 24, 24, 24, 20];
  let y = 0; for (let i = 0; i < bands.length; i++) { R(g, 0, y, W, bh[i], bands[i]); y += bh[i]; }
  // dithered transitions between bands (checker of 2px cells on the boundary row) — keeps ≥6px bands but softens
  y = 0;
  for (let i = 0; i < bands.length - 1; i++) {
    y += bh[i];
    g.fillStyle = bands[i];
    for (let x = ((i % 2) * 2); x < W; x += 4) g.fillRect(x, y, 2, 1);
    g.fillStyle = bands[i + 1];
    for (let x = ((i % 2) * 2); x < W; x += 4) g.fillRect(x, y - 1, 2, 1);
  }
  // hard midday sun
  disc(g, 254, 30, 16, C.sunHalo);
  disc(g, 254, 30, 12, C.sun);
  disc(g, 254, 30, 9, C.sunCore);
}
const WISPS = [
  { x: 30, y: 26, s: 2.2, rows: ['....wwwwwwwww......', 'wwwwwwwwwwwwwwwwww.', '......wwwwww.......'] },
  { x: 150, y: 48, s: 1.6, rows: ['..wwwwwww....', 'wwwwwwwwwwwww', '...wwwwww....'] },
  { x: 250, y: 64, s: 1.3, rows: ['.wwwww..', 'wwwwwwww'] },
];
function sky(ctx, _W, _H, t) {
  if (!skyCv) buildSky();
  ctx.drawImage(skyCv, 0, 0);
  const pal = { w: C.wisp };
  for (const w of WISPS) {
    const span = W + 40; const x = Math.round(((w.x + t * w.s) % span + span) % span) - 20;
    art(ctx, w.rows, x, w.y, pal);
    if (x + w.rows[0].length > W) art(ctx, w.rows, x - span, w.y, pal);
  }
}

// ================================================================ L1 — Jerusalem hills (speed 0.05, P 480)
const P1 = 480; let l1 = null;
function hFar(x) { const a = (x / P1) * Math.PI * 2; return 64 + Math.round(6 * Math.sin(a) + 4 * Math.sin(a * 3 + 1) + 2 * Math.sin(a * 7 + 2)); }
function hNear(x) { const a = (x / P1) * Math.PI * 2; return 78 + Math.round(5 * Math.sin(a * 2 + 2) + 3 * Math.sin(a * 5 + 0.5) + 2 * Math.sin(a * 11)); }
function buildL1() {
  l1 = mk(P1, LH); const g = wrap(l1.getContext('2d'), P1);
  for (let x = 0; x < P1; x++) R(g, x, hFar(x), 1, LH - hFar(x), C.hillFar);
  // far ridge: pale stone hamlets, cypresses, a minaret, and the Chords Bridge (גשר המיתרים)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd(i * 3 + 1) * P1); const y = hFar(x);
    const w = 4 + Math.floor(rnd(i * 3 + 2) * 6), h = 3 + Math.floor(rnd(i * 3 + 3) * 4);
    R(g, x, y - h, w, h + 1, C.hillStone); R(g, x + w - 1, y - h, 1, h + 1, C.hillStoneS);
    if (w >= 6) R(g, x + 1, y - h + 1, 1, 1, C.hillWin);
    R(g, x + 1, y - h - 1, 2, 1, C.hillWhite);
  }
  for (let i = 0; i < 18; i++) { const x = Math.floor(rnd(i * 5 + 40) * P1); const y = hFar(x); const h = 4 + Math.floor(rnd(i * 5 + 41) * 4); R(g, x, y - h, 1, h + 1, C.hillTree); R(g, x + 1, y - h + 1, 1, h, C.hillTreeD); }
  // minaret + dome
  { const x = 120; const y = hFar(x); R(g, x, y - 18, 3, 19, C.hillStone); R(g, x - 1, y - 12, 5, 1, C.hillStoneS); R(g, x + 1, y - 20, 1, 2, C.hillStoneS); R(g, x + 6, y - 5, 9, 6, C.hillStone); disc(g, x + 10, y - 5, 4, C.hillStoneS); }
  // Chords bridge: leaning white mast + cables
  { const bx = 330; const y = hFar(bx); line(g, bx, y, bx + 14, y - 34, C.hillWhite); line(g, bx + 1, y, bx + 15, y - 34, C.hillWhite);
    for (let i = 0; i < 7; i++) line(g, bx + 13 - Math.floor(i * 0.4), y - 33 + i * 3, bx - 30 + i * 6, y, C.hillStoneS); R(g, bx - 34, y - 1, 40, 2, C.hillStone); }
  // near ridge
  for (let x = 0; x < P1; x++) R(g, x, hNear(x), 1, LH - hNear(x), C.hillNear);
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rnd(i * 9 + 100) * P1); const y = hNear(x);
    const w = 6 + Math.floor(rnd(i * 9 + 101) * 8), h = 4 + Math.floor(rnd(i * 9 + 102) * 5);
    R(g, x, y - h, w, h + 2, C.hillStone); R(g, x + w - 2, y - h, 2, h + 2, C.hillStoneS);
    for (let wx = x + 1; wx < x + w - 2; wx += 3) R(g, wx, y - h + 2, 1, 2, C.hillWin);
    dudSmall(g, x + 1, y - h - 3);
    if (rnd(i * 9 + 103) < 0.5) R(g, x + w + 1, y - 7, 2, 8, C.hillTreeD);
  }
  for (let i = 0; i < 14; i++) { const x = Math.floor(rnd(i * 13 + 200) * P1); const y = hNear(x); const h = 6 + Math.floor(rnd(i * 13 + 201) * 6); R(g, x, y - h, 2, h + 1, C.hillTreeD); R(g, x, y - h + 1, 1, h - 1, C.hillTree); }
}

// ================================================================ L2 — neighborhood roofs (speed 0.2, P 480)
const P2 = 480; let l2 = null;
function buildL2() {
  l2 = mk(P2, LH); const g = wrap(l2.getContext('2d'), P2);
  const BASE = 122;
  R(g, 0, BASE, P2, LH - BASE, C.base2); R(g, 0, BASE, P2, 1, C.base2D);
  let x = 2; let i = 0; const blds = [];
  while (x < P2 - 14) {
    const w = 18 + Math.floor(rnd(i * 4 + 300) * 22); const h = 14 + Math.floor(rnd(i * 4 + 301) * 22);
    blds.push({ x, w, h, i }); x += w + 3 + Math.floor(rnd(i * 4 + 302) * 9); i++;
  }
  for (const b of blds) {
    const top = BASE - b.h;
    R(g, b.x, top, b.w, b.h, C.stone);
    R(g, b.x + b.w - 3, top, 3, b.h, C.stoneS);       // shadow side (sun from the right → shade on right? sun top-right, lit face)
    R(g, b.x, top, b.w, 1, C.roof);
    for (let yy = top + 5; yy < BASE; yy += 6) R(g, b.x, yy, b.w - 3, 1, C.stoneD); // stone courses
    // windows
    for (let yy = top + 4; yy + 5 < BASE; yy += 8) for (let xx = b.x + 3; xx + 4 < b.x + b.w - 3; xx += 7) {
      const openS = rnd(xx * 3 + yy) < 0.5;
      R(g, xx, yy, 3, 4, C.win); R(g, xx, yy, 3, 1, C.winL);
      if (openS) { R(g, xx - 1, yy, 1, 4, C.shut); R(g, xx + 3, yy, 1, 4, C.shut); } else R(g, xx, yy + 1, 3, 3, C.shut);
    }
    // roof furniture — a dud shemesh on EVERY roof, plus tanks/dishes/antennas
    const r = rnd(b.i * 4 + 303);
    if (b.w >= 16) art(g, DUD, b.x + 2, top - 9, DUD_PAL); else dudSmall(g, b.x + 1, top - 4);
    if (b.w >= 26) { R(g, b.x + b.w - 10, top - 6, 5, 6, C.tank); R(g, b.x + b.w - 9, top - 6, 1, 6, C.tankL); R(g, b.x + b.w - 10, top - 7, 5, 1, C.tankL); }
    if (r < 0.4) art(g, DISH, b.x + b.w - 8, top - 4, DISH_PAL);
    if (r > 0.6) { R(g, b.x + b.w - 6, top - 9, 1, 9, C.rail); R(g, b.x + b.w - 8, top - 9, 5, 1, C.rail); R(g, b.x + b.w - 7, top - 7, 3, 1, C.rail); }
    if (r > 0.3 && r < 0.5) { R(g, b.x + 6, top - 2, 3, 2, C.ac); R(g, b.x + 6, top - 2, 1, 2, C.acD); }
  }
  // laundry lines between neighbors + cypresses in gaps + one cat, one dome
  for (let k = 0; k + 1 < blds.length; k++) {
    const a = blds[k], b = blds[k + 1];
    if (rnd(k * 3 + 400) < 0.45) laundry(g, a.x + a.w - 1, BASE - a.h + 6 + Math.floor(rnd(k + 401) * 8), b.x, BASE - b.h + 8 + Math.floor(rnd(k + 402) * 8));
    else if (b.x - (a.x + a.w) >= 5) art(g, CYPRESS, a.x + a.w, BASE - 14, { d: C.tree, l: C.treeL, t: C.trunk });
  }
  { const b = blds[3]; art(g, CAT, b.x + b.w - 14, BASE - b.h - 8, CAT_PAL); }                            // roof cat, judging you
  { const b = blds[7] || blds[1]; const cx = b.x + (b.w >> 1); const top = BASE - b.h; disc(g, cx, top - 3, 6, C.stoneS); R(g, cx - 6, top - 3, 13, 3, C.stone); R(g, cx, top - 11, 1, 3, C.brass); }
  { const b = blds[10] || blds[2]; const x = b.x + 2; const top = BASE - b.h; R(g, x, top - 30, 4, 30, C.stone); R(g, x + 3, top - 30, 1, 30, C.stoneS); R(g, x - 1, top - 22, 6, 1, C.stoneD); R(g, x + 1, top - 33, 2, 3, C.treeL); } // minaret
}

// ================================================================ L3 — shuk street facades (speed 0.4, P 320)
const P3 = 320; let l3 = null;
let FLAG = null; // 2D char rows for the animated flag
function buildL3() {
  l3 = mk(P3, LH); const g = wrap(l3.getContext('2d'), P3);
  const GROUND = 160;
  R(g, 0, GROUND, P3, LH - GROUND, C.street); R(g, 0, GROUND - 6, P3, 6, C.streetL); R(g, 0, GROUND - 6, P3, 1, C.facD);
  function facade(x, w, top, shade) {
    R(g, x, top, w, GROUND - top, C.fac);
    for (let yy = top + 6; yy < GROUND - 6; yy += 7) { R(g, x, yy, w, 1, C.facLine); for (let xx = x + ((yy / 7 | 0) % 2) * 6; xx < x + w; xx += 12) R(g, xx, yy - 6, 1, 6, C.facLine); }
    if (shade) R(g, x + w - shade, top, shade, GROUND - top, C.facS);
    R(g, x, top, w, 2, C.facD); R(g, x, top - 1, w, 1, C.facS);
  }
  // --- A: corner house with the big market sign
  facade(0, 96, 54, 4);
  art(g, DUD, 8, 45, DUD_PAL); art(g, DUD, 60, 45, DUD_PAL); R(g, 40, 47, 5, 7, C.tank); R(g, 41, 47, 1, 7, C.tankL); art(g, DISH, 80, 49, DISH_PAL);
  R(g, 5, 62, 86, 15, C.signBoard); R(g, 5, 62, 86, 1, C.signBlue); R(g, 5, 76, 86, 1, C.signBlue); R(g, 5, 62, 1, 15, C.signBlue); R(g, 90, 62, 1, 15, C.signBlue);
  hebText(g, 'שוק מחנה יהודה', 86, 66, C.signBlue);
  archWindow(g, 10, 84, 8, 16); archWindow(g, 44, 84, 8, 16); archWindow(g, 78, 84, 8, 16);
  balcony(g, 24, 112, 24); shutterWindow(g, 30, 96, 6, 10, true);
  laundry(g, 26, 106, 46, 108);
  R(g, 8, 108, 6, 4, C.ac); R(g, 8, 108, 1, 4, C.acD); R(g, 10, 113, 1, 1, C.winL);
  // shop front: arched door, mezuzah, rolled shutter half open
  R(g, 36, 130, 22, 30, C.door); for (let r = 0; r < 6; r++) R(g, 36 + 6 - r, 124 + r, 10 + 2 * r, 1, C.door);
  R(g, 38, 138, 18, 22, C.doorL); R(g, 40, 132, 14, 6, C.shutter); for (let yy = 133; yy < 138; yy += 2) R(g, 40, yy, 14, 1, C.shutterD);
  R(g, 59, 137, 1, 3, C.signBlue); // mezuzah
  shutterWindow(g, 70, 124, 8, 12, false);
  R(g, 62, 150, 30, 10, C.facS); // stone bench
  // --- B: narrow house with red sale banner + torn posters
  facade(96, 54, 84, 3);
  art(g, DUD, 100, 75, DUD_PAL); art(g, DISH, 132, 78, DISH_PAL); R(g, 144, 76, 1, 8, C.rail); R(g, 142, 76, 5, 1, C.rail);
  shutterWindow(g, 104, 94, 6, 9, true); shutterWindow(g, 132, 94, 6, 9, false);
  R(g, 100, 108, 32, 9, C.signRed); R(g, 100, 108, 32, 1, C.pomeg); R(g, 100, 116, 32, 1, C.pomeg);
  hebText(g, 'מבצע', 128, 109, C.white); // "SALE"
  balcony(g, 134, 118, 14); laundry(g, 136, 108, 148, 110);
  const posters = [[100, 124, 12, 16, C.poster1], [113, 126, 10, 12, C.poster2], [124, 122, 14, 18, C.poster3], [139, 128, 9, 10, C.poster4], [110, 140, 16, 12, C.poster4]];
  for (const [px, py, pw, ph, pc] of posters) { R(g, px, py, pw, ph, pc); R(g, px + 2, py + 2, pw - 4, 1, C.white); R(g, px + 2, py + 5, pw - 5, 1, C.ink); R(g, px + 2, py + 7, pw - 7, 1, C.ink); R(g, px + pw - 3, py + ph - 3, 3, 3, C.fac); }
  R(g, 100, 152, 50, 8, C.facS);
  // --- alley between B and C: stairs climbing into the neighbourhood, a bulb string, a cat that owns the place
  for (let st = 0; st < 5; st++) { const yy = GROUND - 6 - st * 4; R(g, 150, yy, 26, 4, st % 2 ? C.streetL : C.facS); R(g, 150, yy, 26, 1, C.frame); }
  for (let u = 0; u <= 26; u++) { const yy = 96 + Math.round(3 * 4 * (u / 26) * (1 - u / 26)); R(g, 150 + u, yy, 1, 1, C.cord); if (u % 5 === 2) R(g, 150 + u, yy + 1, 2, 2, BULB_COL[(u / 5 | 0) % 5]); }
  art(g, CAT, 158, 132, CAT_PAL);
  R(g, 150, 84, 1, GROUND - 84, C.facS); R(g, 175, 84, 1, GROUND - 84, C.facD); // alley walls
  // --- C: tall house with the hummus joint
  facade(176, 74, 60, 4);
  art(g, DUD, 180, 51, DUD_PAL); art(g, DUD, 206, 51, DUD_PAL); R(g, 232, 54, 5, 6, C.tank); art(g, DISH, 224, 54, DISH_PAL); art(g, PIGEON, 238, 48, PIGEON_PAL);
  for (let fl = 0; fl < 2; fl++) { const yy = 68 + fl * 22; shutterWindow(g, 182, yy, 6, 9, fl === 0); archWindow(g, 202, yy - 2, 8, 12); shutterWindow(g, 226, yy, 6, 9, fl === 1); }
  balcony(g, 180, 104, 30); laundry(g, 182, 96, 206, 97);
  balcony(g, 216, 104, 30); R(g, 220, 96, 6, 4, C.ac); R(g, 220, 96, 1, 4, C.acD);
  R(g, 180, 118, 66, 12, C.signBlue); R(g, 180, 118, 66, 1, C.winL); R(g, 180, 129, 66, 1, C.arch);
  hebText(g, 'חומוס', 242, 121, C.signYellow); numText(g, '10₪', 184, 122, C.white);
  R(g, 182, 132, 62, 28, C.door); R(g, 184, 132, 58, 14, C.shutter); for (let yy = 133; yy < 146; yy += 2) R(g, 184, yy, 58, 1, C.shutterD);
  R(g, 192, 146, 42, 14, C.doorL); R(g, 212, 148, 4, 12, C.brass);
  R(g, 246, 114, 1, 46, C.rail); R(g, 243, 112, 7, 3, C.signYellow); // street lamp
  // --- D: low garden wall with posters, graffiti and pigeons — the neighbourhood shows above it
  facade(250, 70, 122, 3);
  R(g, 250, 120, 70, 3, C.facS); R(g, 250, 120, 70, 1, C.frame);
  art(g, PIGEON, 270, 116, PIGEON_PAL); art(g, PIGEON, 300, 116, PIGEON_PAL);
  const posters2 = [[254, 128, 12, 16, C.poster3], [268, 130, 10, 12, C.poster1], [292, 126, 14, 18, C.poster2], [308, 132, 9, 10, C.poster5]];
  for (const [px, py, pw, ph, pc] of posters2) { R(g, px, py, pw, ph, pc); R(g, px + 2, py + 2, pw - 4, 1, C.white); R(g, px + 2, py + 5, pw - 5, 1, C.ink); R(g, px + 2, py + 7, pw - 7, 1, C.ink); R(g, px + pw - 3, py + ph - 3, 3, 3, C.fac); }
  // graffiti: "יאללה" + a heart
  hebText(g, 'יאללה', 318, 142, C.poster1);
  R(g, 282, 144, 2, 2, C.pomeg); R(g, 285, 144, 2, 2, C.pomeg); R(g, 282, 146, 5, 2, C.pomeg); R(g, 283, 148, 3, 1, C.pomeg); R(g, 284, 149, 1, 1, C.pomeg);
  art(g, CYPRESS, 312, 106, { d: C.tree, l: C.treeL, t: C.trunk });
  // flag data (16 x 14): white, blue stripes, Magen David
  FLAG = [];
  for (let r = 0; r < 14; r++) { let row = ''; for (let c = 0; c < 16; c++) { let ch = 'w'; if (r === 1 || r === 2 || r === 11 || r === 12) ch = 'b'; if (r >= 3 && r <= 9 && c >= 4 && c <= 10 && STAR[r - 3][c - 4] === '#') ch = 'b'; row += ch; } FLAG.push(row); }
  // flag pole off facade A balcony (pole is static, flag animated)
  line(g, 48, 118, 66, 104, C.rail); R(g, 66, 102, 2, 2, C.brass);
}
function animL3(ctx, ox, oy, t) {
  // waving Israeli flag hanging from the tilted pole (columns bob independently)
  const fx = ox + 50, fy = oy + 118;
  for (let c = 0; c < 16; c++) {
    const top = fy - Math.round(c * 14 / 18) + Math.round(Math.sin(t * 5 + c * 0.55) * 1.2);
    let r = 0;
    while (r < 14) { const ch = FLAG[r][c]; let run = 1; while (r + run < 14 && FLAG[r + run][c] === ch) run++; ctx.fillStyle = ch === 'b' ? C.flagBlue : C.white; ctx.fillRect(fx + c, top + r, 1, run); r += run; }
  }
  // AC drip on facade A (a single drop falling every ~1.4 s)
  const ph = (t % 1.4) / 1.4; ctx.fillStyle = C.winL; ctx.fillRect(ox + 10, oy + 113 + Math.round(ph * 40), 1, 2);
  // alley cat tail
  const up = Math.floor(t * 2) % 2 === 0; ctx.fillStyle = C.cat; ctx.fillRect(ox + 166, oy + (up ? 136 : 139), 3, 1);
}

// ================================================================ L4 — the stalls (speed 0.65, P 320)
const P4 = 320; let l4 = null;
const AWN = [[C.awnRed, C.awnWhite], [C.awnGreen, C.awnWhite], [C.awnBlue, C.awnWhite]];
const STRING_Y = 84;
function sagY(u) { return STRING_Y + Math.round(4 * 4 * u * (1 - u)); }
const BULB_COL = ['#ff4b4b', '#ffd23f', '#4fd15a', '#4f9bff', '#ff7fd1'];
const BULB_DIM = ['#8c2a2a', '#8c7422', '#2a7a34', '#2a5a8c', '#8c467a'];
function buildL4() {
  l4 = mk(P4, LH); const g = wrap(l4.getContext('2d'), P4);
  const GROUND = 160;
  R(g, 0, GROUND, P4, LH - GROUND, C.shade);
  function poleAt(px, top) { R(g, px, top, 2, GROUND - top, C.pole); R(g, px, top, 1, GROUND - top, C.poleL); R(g, px - 1, top - 1, 4, 2, C.brass); }
  // four light strings per period: three stalls + the open gap (pole at 242), all sagging between pole knobs
  for (let i = 0; i < 4; i++) { const x0 = i * 80; for (let u = 0; u <= 80; u++) R(g, x0 + 3 + u, sagY(u / 80), 1, 1, C.cord); }
  for (let i = 0; i < 3; i++) {
    const x0 = i * 80; const [ca, cw] = AWN[i];
    poleAt(x0 + 2, STRING_Y - 2); poleAt(x0 + 69, STRING_Y - 2);
    // awning: striped cloth + scallops + shadow
    const ay = 92;
    for (let s = 0; s < 12; s++) { const sx = x0 + 1 + s * 6; const col = s % 2 ? cw : ca; R(g, sx, ay, 6, 14, col); R(g, sx + 1, ay + 14, 4, 2, col); R(g, sx + 2, ay + 16, 2, 1, col); }
    R(g, x0 + 1, ay, 72, 1, C.woodD); R(g, x0 + 1, ay + 1, 72, 1, C.awnDark);
    R(g, x0 + 3, ay + 17, 68, 1, C.awnDark);
    // back panel with shelves (spice stall) — jars & tins
    if (i === 1) {
      R(g, x0 + 4, 108, 66, 26, C.woodD); R(g, x0 + 4, 116, 66, 1, C.wood); R(g, x0 + 4, 126, 66, 1, C.wood);
      const jars = [C.turmeric, C.paprika, C.olive, C.sumac, C.zaatar, C.cumin, C.tomato, C.lemon];
      for (let j = 0; j < 12; j++) { const jx = x0 + 6 + j * 5 + (j % 3 === 0 ? 1 : 0); R(g, jx, 110, 4, 6, jars[(j + i) % jars.length]); R(g, jx, 110, 4, 1, C.white); R(g, jx + 1, 111, 1, 3, 'rgba(255,255,255,0.35)'); }
      for (let j = 0; j < 9; j++) { const jx = x0 + 7 + j * 7; R(g, jx, 120, 5, 6, jars[(j * 3 + i) % jars.length]); R(g, jx + 1, 120, 3, 1, C.pitaD); }
    }
    // table
    R(g, x0 + 3, 132, 68, 4, C.wood); R(g, x0 + 3, 132, 68, 1, C.woodL); R(g, x0 + 3, 135, 68, 1, C.woodD);
    R(g, x0 + 5, 136, 2, 24, C.woodD); R(g, x0 + 67, 136, 2, 24, C.woodD);
    // apron cloth under the table (striped)
    for (let s = 0; s < 11; s++) R(g, x0 + 7 + s * 6, 136, 6, 10, s % 2 ? cw : ca);
    R(g, x0 + 7, 146, 60, 1, C.awnDark);
    // stacked crates under the table
    crate(g, x0 + 8, 147, 20, 13); crate(g, x0 + 30, 147, 20, 13); crate(g, x0 + 52, 148, 14, 12);
    // produce on the table (per stall)
    if (i === 0) { // fruit
      crate(g, x0 + 6, 122, 20, 10); produceMound(g, x0 + 6, 121, 20, 'orange');
      crate(g, x0 + 28, 122, 20, 10); produceMound(g, x0 + 28, 121, 20, 'tomato');
      crate(g, x0 + 50, 122, 18, 10); produceMound(g, x0 + 50, 121, 18, 'lemon');
      R(g, x0 + 10, 108, 18, 8, C.signYellow); R(g, x0 + 18, 116, 1, 6, C.woodD); numText(g, '10₪', x0 + 11, 110, C.ink);
      R(g, x0 + 52, 110, 16, 8, C.white); R(g, x0 + 59, 118, 1, 4, C.woodD); numText(g, '3.90', x0 + 53, 112, C.ink);
    } else if (i === 1) { // spices
      sack(g, x0 + 6, 122, 14, 10, C.paprika, C.tomatoL); sack(g, x0 + 22, 122, 14, 10, C.turmeric, C.lemonL); sack(g, x0 + 38, 122, 14, 10, C.sumac, C.pomeg); sack(g, x0 + 54, 122, 14, 10, C.zaatar, C.cucumberL);
      R(g, x0 + 24, 107, 36, 9, C.signRed); R(g, x0 + 24, 107, 36, 1, C.pomeg); hebText(g, 'הכל 5₪', x0 + 58, 108, C.white);
    } else { // peppers, eggplants, cucumbers + a sleeping cat
      crate(g, x0 + 6, 122, 20, 10); produceMound(g, x0 + 6, 121, 20, 'pepper');
      crate(g, x0 + 28, 122, 18, 10); produceMound(g, x0 + 28, 121, 18, 'eggplant');
      crate(g, x0 + 48, 124, 20, 8); art(g, CAT_SLEEP, x0 + 53, 118, CAT_PAL); R(g, x0 + 55, 121, 1, 1, C.catK); R(g, x0 + 58, 121, 1, 1, C.catK);
      R(g, x0 + 12, 109, 16, 8, C.white); R(g, x0 + 19, 117, 1, 5, C.woodD); numText(g, '5₪', x0 + 14, 111, C.ink);
    }
    // hanging lamp under the awning (shade static, bulb animated)
    R(g, x0 + 36, 108, 1, 4, C.cord); R(g, x0 + 35, 112, 3, 1, C.lampShade); R(g, x0 + 34, 113, 5, 1, C.lampShade); R(g, x0 + 33, 114, 7, 1, C.lampShade); R(g, x0 + 32, 115, 9, 1, C.lampShade); R(g, x0 + 33, 116, 7, 1, C.brassD);
  }
  // --- the gap (240..320): a lone lamp pole, blue plastic crates, and the watermelon cart
  poleAt(242, STRING_Y - 2);
  for (let k = 0; k < 3; k++) { R(g, 246, 154 - k * 6, 12, 6, C.awnBlue); R(g, 246, 154 - k * 6, 12, 1, '#5b8ae0'); for (let xx = 248; xx < 257; xx += 3) R(g, xx, 156 - k * 6, 1, 2, '#1e4a94'); }
  { const cx = 262, cw = 52; // cart body
    R(g, cx, 138, cw, 12, C.wood); R(g, cx, 138, cw, 1, C.woodL); R(g, cx, 149, cw, 1, C.woodD); for (let xx = cx + 4; xx < cx + cw; xx += 8) R(g, xx, 139, 1, 10, C.woodD);
    disc(g, cx + 10, 155, 4, C.rail); disc(g, cx + 10, 155, 2, C.woodL); disc(g, cx + cw - 10, 155, 4, C.rail); disc(g, cx + cw - 10, 155, 2, C.woodL);
    line(g, cx + cw, 142, cx + cw + 8, 138, C.woodD); // handle
    // watermelon pile (two rows), striped
    const melon = (mx, my) => { R(g, mx + 1, my, 8, 6, C.melonG); R(g, mx, my + 1, 10, 4, C.melonG); for (let sx = mx + 2; sx < mx + 9; sx += 3) R(g, sx, my + 1, 1, 4, '#1f5a2a'); R(g, mx + 4, my, 1, 1, '#1f5a2a'); };
    for (let m = 0; m < 5; m++) melon(cx + 2 + m * 10, 132); for (let m = 0; m < 4; m++) melon(cx + 7 + m * 10, 126);
    // one cut open, seeds and all
    R(g, cx + 42, 124, 10, 2, C.melonG); R(g, cx + 43, 126, 8, 3, C.melonR); R(g, cx + 44, 129, 6, 1, C.melonR); R(g, cx + 45, 127, 1, 1, C.ink); R(g, cx + 48, 126, 1, 1, C.ink);
    // sign on a stick: אבטיח 10₪
    R(g, cx + 20, 116, 1, 10, C.woodD); R(g, cx + 4, 102, 34, 15, C.signYellow); R(g, cx + 4, 102, 34, 1, C.signRed); R(g, cx + 4, 116, 34, 1, C.signRed); hebText(g, 'אבטיח', cx + 36, 103, C.ink); numText(g, '10₪', cx + 15, 111, C.signRed); }
  // pigeon on stall 1's awning bar and a fallen orange on the street
  art(g, PIGEON, 120, 88, PIGEON_PAL);
  R(g, 236, 157, 3, 3, C.orange); R(g, 236, 157, 1, 1, C.orangeL);
}
function animL4(ctx, ox, oy, t) {
  for (let i = 0; i < 4; i++) {
    const x0 = ox + i * 80;
    if (i % 2 === 0) { // bulbs
      for (let b = 0; b < 8; b++) {
        const u = (b + 0.5) / 8; const bx = x0 + 3 + Math.round(u * 80); const by = oy + sagY(u) + 1 + Math.round(Math.sin(t * 2.5 + b * 1.3 + i) * 0.6);
        const on = Math.floor(t * 4 + b * 1.7 + i) % 7 !== 0; const k = (b + i * 3) % 5;
        ctx.fillStyle = C.cord; ctx.fillRect(bx, by, 2, 1);
        ctx.fillStyle = on ? BULB_COL[k] : BULB_DIM[k]; ctx.fillRect(bx, by + 1, 2, 2);
        if (on) { ctx.fillStyle = C.bulbCore; ctx.fillRect(bx, by + 1, 1, 1); }
      }
    } else { // bunting: mini Israeli flags alternating with blue pennants, swaying
      for (let b = 0; b < 9; b++) {
        const u = (b + 0.5) / 9; const sway = Math.round(Math.sin(t * 3 + b * 0.9 + i) * 1.4);
        const bx = x0 + 3 + Math.round(u * 80) - 3 + sway; const by = oy + sagY(u) + 1;
        if (b % 2 === 0) { ctx.fillStyle = C.white; ctx.fillRect(bx, by, 7, 6); ctx.fillStyle = C.flagBlue; ctx.fillRect(bx, by + 1, 7, 1); ctx.fillRect(bx, by + 4, 7, 1); ctx.fillRect(bx + 3, by + 2, 1, 2); ctx.fillRect(bx + 2, by + 3, 3, 1); }
        else { ctx.fillStyle = C.flagBlue; ctx.fillRect(bx, by, 7, 2); ctx.fillRect(bx + 1, by + 2, 5, 1); ctx.fillRect(bx + 2, by + 3, 3, 1); ctx.fillRect(bx + 3, by + 4, 1, 1); }
      }
    }
    if (i < 3) { // lamp bulb swings with the breeze
      const sw = Math.round(Math.sin(t * 1.7 + i) * 1.0);
      ctx.fillStyle = C.bulb; ctx.fillRect(x0 + 35 + sw, oy + 117, 3, 2);
      ctx.fillStyle = C.bulbCore; ctx.fillRect(x0 + 36 + sw, oy + 117, 1, 1);
    }
  }
  // sleeping cat's tail flick (stall 2) + pigeon head bob (stall 1)
  const tailUp = Math.floor(t * 1.5) % 3 === 0;
  ctx.fillStyle = C.cat; ctx.fillRect(ox + 160 + 63, oy + (tailUp ? 119 : 122), 3, 1); ctx.fillRect(ox + 160 + 65, oy + (tailUp ? 118 : 121), 1, 1);
  if (Math.floor(t * 2) % 4 === 0) { ctx.fillStyle = C.pigeon; ctx.fillRect(ox + 123, oy + 89, 2, 1); }
}

// ================================================================ L5 — near: awning edge & hanging goods (speed 0.85, P 320)
const P5 = 320; let l5 = null;
function buildL5() {
  l5 = mk(P5, LH); const g = wrap(l5.getContext('2d'), P5);
  // red/cream awning edge across the top-left, with fringe
  for (let s = 0; s < 22; s++) { const sx = s * 8; const col = s % 2 ? C.awnWhite : '#b52a21'; R(g, sx, 0, 8, 18, col); R(g, sx + 1, 18, 6, 2, col); R(g, sx + 2, 20, 4, 1, col); }
  R(g, 0, 0, 176, 2, '#7a1a12'); R(g, 0, 15, 176, 1, C.awnDark); R(g, 0, 16, 176, 2, '#8d1f16');
  // green awning stub at top-right
  for (let s = 0; s < 14; s++) { const sx = 208 + s * 8; const col = s % 2 ? C.awnWhite : '#25703c'; R(g, sx, 0, 8, 10, col); R(g, sx + 1, 10, 6, 2, col); R(g, sx + 2, 12, 4, 1, col); }
  R(g, 208, 0, 112, 2, '#184a27'); R(g, 208, 8, 112, 2, '#1f5c31');
  // garlic braid
  { const x = 22; R(g, x + 3, 18, 2, 4, C.stem); R(g, x + 2, 20, 1, 3, C.stem);
    for (let i = 0; i < 6; i++) { const y = 22 + i * 7; const off = i % 2 ? 1 : 0;
      R(g, x + off, y, 7, 6, C.garlic); R(g, x + off + 1, y - 1, 5, 1, C.garlic); R(g, x + off + 6, y + 1, 1, 5, C.garlicS); R(g, x + off + 1, y + 5, 5, 1, C.garlicS);
      R(g, x + off + 2, y + 1, 1, 4, C.garlicP); R(g, x + off + 4, y + 2, 1, 3, C.garlicP); R(g, x + off + 3, y - 2, 1, 1, C.stem); } }
  // dried red pepper string
  { const x = 96; R(g, x + 1, 18, 1, 56, C.cord);
    for (let i = 0; i < 8; i++) { const y = 20 + i * 7; const px = x + (i % 2 ? 2 : -2);
      R(g, px + 1, y, 1, 1, C.pepStem); R(g, px, y + 1, 3, 4, C.pepDried); R(g, px, y + 1, 1, 3, C.pepDriedL); R(g, px + 1, y + 5, 1, 2, C.pepDried); R(g, px + 1, y + 6, 1, 1, C.pepStem); } }
  // dried fruit string: apricots, figs, dates
  { const x = 150; R(g, x + 2, 18, 1, 50, C.cord);
    for (let i = 0; i < 7; i++) { const y = 21 + i * 7; const k = i % 3;
      if (k === 0) { R(g, x, y, 5, 4, C.apricot); R(g, x + 2, y + 1, 1, 2, C.apricotD); R(g, x, y, 1, 4, C.apricotD); }
      else if (k === 1) { R(g, x + 1, y, 3, 1, C.figL); R(g, x, y + 1, 5, 4, C.fig); R(g, x + 1, y + 1, 1, 3, C.figL); R(g, x + 2, y - 1, 1, 1, C.pepStem); }
      else { R(g, x + 1, y, 3, 5, C.date); R(g, x + 1, y, 1, 4, C.dateL); } } }
  // hamsa amulet against the evil eye (and the flies)
  { R(g, 179, 18, 1, 5, C.cord); art(g, HAMSA, 176, 23, HAMSA_PAL); }
  // hanging brass scale under the green awning
  { const cx = 258; R(g, cx, 12, 1, 4, C.cord); disc(g, cx, 22, 6, C.brassD); disc(g, cx, 22, 5, C.dial); R(g, cx - 1, 19, 1, 3, C.ink); R(g, cx, 22, 1, 1, C.ink); R(g, cx - 3, 18, 1, 1, C.ink); R(g, cx + 3, 18, 1, 1, C.ink); R(g, cx - 4, 22, 1, 1, C.ink); R(g, cx + 4, 22, 1, 1, C.ink);
    line(g, cx - 4, 27, cx - 9, 48, C.cord); line(g, cx + 4, 27, cx + 9, 48, C.cord);
    R(g, cx - 10, 48, 21, 2, C.brass); R(g, cx - 10, 48, 21, 1, C.brassL); R(g, cx - 8, 50, 17, 1, C.brassD);
    // a lone lemon on the scale, being weighed for the last 40 years
    R(g, cx - 2, 44, 5, 4, C.lemon); R(g, cx - 1, 44, 1, 1, C.lemonL); }
}
function animL5(ctx, ox, oy, t) {
  // flies orbiting the dried fruit and the garlic
  const anchors = [[152, 40], [156, 58], [26, 50], [180, 34]];
  for (let i = 0; i < anchors.length; i++) {
    const [ax, ay] = anchors[i]; const ph = t * (5 + i) + i * 2;
    const fx = ox + ax + Math.round(Math.sin(ph) * (5 + i) + Math.sin(ph * 2.3) * 2), fy = oy + ay + Math.round(Math.cos(ph * 1.3) * 4);
    ctx.fillStyle = C.fly; ctx.fillRect(fx, fy, 1, 1);
    ctx.fillStyle = C.flyW; ctx.fillRect(fx + (Math.floor(t * 30 + i) % 2 ? 1 : -1), fy, 1, 1);
  }
  // pepper string sways a pixel
  const sw = Math.round(Math.sin(t * 1.3) * 1.0);
  if (sw) { ctx.fillStyle = C.pepDriedL; ctx.fillRect(ox + 97 + sw, oy + 70, 1, 3); }
}

// ================================================================ FOG — warm dust motes, sparse
function fog(ctx, _W, _H, t) {
  for (let i = 0; i < 16; i++) {
    const sp = 4 + (i % 3) * 3; const span = W + 8;
    const x = Math.floor((((i * 53 + 7) + t * sp) % span + span) % span) - 4;
    const y = Math.floor(((i * 37 + 11) % H) + Math.sin(t * 0.7 + i) * 3);
    const big = i % 4 === 0;
    ctx.fillStyle = big ? C.mote2 : C.mote; ctx.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
  }
}

// ================================================================ export
export default {
  sky,
  layers: [
    { speed: 0.05, draw: (ctx, camX, camY, _W, _H, t) => { if (!l1) buildL1(); tile(ctx, l1, P1, 0.05, camX, camY, null, t); } },
    { speed: 0.2, draw: (ctx, camX, camY, _W, _H, t) => { if (!l2) buildL2(); tile(ctx, l2, P2, 0.2, camX, camY, null, t); } },
    { speed: 0.4, draw: (ctx, camX, camY, _W, _H, t) => { if (!l3) buildL3(); tile(ctx, l3, P3, 0.4, camX, camY, animL3, t); } },
    { speed: 0.65, draw: (ctx, camX, camY, _W, _H, t) => { if (!l4) buildL4(); tile(ctx, l4, P4, 0.65, camX, camY, animL4, t); } },
    { speed: 0.85, draw: (ctx, camX, camY, _W, _H, t) => { if (!l5) buildL5(); tile(ctx, l5, P5, 0.85, camX, camY, animL5, t); } },
  ],
  fog,
};

// SABRA! — src/parallax/negev.js
// המדבר וים המלח בצהריים · The Negev + Dead Sea at HIGH NOON.
// 5 parallax layers (0.05 Jordan mountains + Dead Sea · 0.2 mesas / Makhtesh Ramon · 0.4 acacias, tent,
// camel caravan · 0.65 bus stop, signs, cacti · 0.85 dunes + tumbleweed) + bleached sky + heat-haze fog.
// Everything is fillRect at integer coords (banded gradients, stepped discs — no arcs, no gradients).
// Static parts are rasterised ONCE into offscreen canvases (lazy, first draw) and blitted; only the
// animated bits (sun shimmer, vultures, caravan, tumbleweed, sea gleam, haze) are redrawn per frame.

const W = 320, H = 180;   // internal canvas
const P = 640;            // tiling period of every layer
const LH = H + 48;        // static layer canvas height (extra rows so camY shifts never expose the bottom)

const C = {
  // sky bands, zenith → horizon (noon: blue bleached to white-hot cream)
  sky: ['#5ea7dc', '#6db1e0', '#7fbbe4', '#93c6e8', '#a8d1ea', '#bcdbec', '#cde3ec', '#dce9ec', '#e8ede8', '#f0eedf', '#f5efd8', '#f8f1d6'],
  sunGlow1: 'rgba(255,255,255,0.14)', sunGlow2: 'rgba(255,255,255,0.20)', sunGlow3: 'rgba(255,255,245,0.30)',
  sunRim: '#fff6cc', sun: '#fffbe6', sunCore: '#ffffff',
  vulture: '#4b4a55',
  // far: Jordan mountains (palest violet) + Dead Sea + salt
  jordanFar: '#cfcbe1', jordan: '#bfb9d6', jordanShade: '#b1aacb',
  sea: ['#9fe6e0', '#72d9d4', '#4fc9c8', '#42bcc0'], seaGleam: '#ffffff', seaGleam2: '#d9fbf7',
  salt: '#f8f6ee', saltShine: '#ffffff', saltFlat: '#efe4c6', saltFlat2: '#e9dcbb',
  skin: '#e2a878', paper: '#fbfbf6', paperInk: '#8b8b95', swim: '#e0445a',
  // mesas (0.2) — atmospheric perspective: dusty, slightly pinkish
  cap: '#f2d7a8', ochre: '#e4ab6b', ochre2: '#d99a5b', red: '#cf7b5c', red2: '#c26b52', violet: '#ab8db6', violet2: '#9c7ea8',
  strataLine: 'rgba(90,40,70,0.22)', shade: 'rgba(70,30,90,0.22)', haze: 'rgba(255,240,220,0.28)',
  plainFar: '#ead6ae', plainFar2: '#e4cda3',
  // mid (0.4)
  plainMid: '#efd7a6', plainMid2: '#e7cb95', pebble: '#d6b27e',
  rock: '#bd6d42', rockDark: '#8f4b2f', rockLight: '#d99364',
  trunk: '#6d472a', leaf: '#7f9d45', leaf2: '#9db655', leafDark: '#5f7d35', shadow: '#d9b985',
  tent: '#2f2a27', tent2: '#43382f', tentStripe: '#7a4a2e', tentOpen: '#15110f', rope: '#c9b48c',
  dish: '#c7cbd0', dishDark: '#8d939a', panel: '#274b80', panelLine: '#4d78b8', tank: '#f2f2f0', tankShade: '#c3c5c8',
  camel: '#8f6a45', camelDark: '#6f5033', keff: '#f4f2ec', robe: '#4a3a30',
  ibex: '#7b5a3a', ibexHorn: '#4a3421', ibexLight: '#9a7650',
  pillar: '#f5f2ea', pillarShade: '#d7d1c0', pillarDark: '#bfb8a6',
  // near-mid (0.65)
  plainNear: '#f2dba5', plainNear2: '#ebcf92',
  post: '#8d9298', postDark: '#5f646a', roof: '#a6abb0', roofDark: '#7c8288', bench: '#8b5a2b', benchDark: '#6a4220',
  yellow: '#f6c531', yellowDark: '#c99a1d', k: '#1a1a1a', brownSign: '#6e4126', brownSign2: '#54301b', white: '#ffffff',
  cat: '#e08a2e', catDark: '#b8661c', hyrax: '#8c6a48', hyraxDark: '#6a4d32',
  cactus: '#5c9c3f', cactusDark: '#3f7a31', cactusLight: '#7ab452', spine: '#eef3cf', fruit: '#d63d63', fruit2: '#f06a8a',
  // near (0.85)
  duneLight: '#f7e1ad', dune: '#efd196', duneShade: '#e1ba78', duneDeep: '#d6a86a',
  rippleLight: '#fff0c6', rippleDark: '#dcb473', duneBack: '#f2d9a3', duneBackShade: '#e6c486',
  weed: '#a98550', weedDark: '#7d5f34', shrub: '#8e9a4b', shrubDark: '#6c7a35',
};

// ---------- tiny raster helpers ----------
function hash(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
// stepped disc (row fills — no arcs)
function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
// string-art blit: rows of chars, pal char→color, '.' transparent
function art(g, x, y, rows, pal) {
  x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]; let i = 0;
    while (i < row.length) {
      const ch = row[i]; if (ch === '.') { i++; continue; }
      let run = 1; while (i + run < row.length && row[i + run] === ch) run++;
      g.fillStyle = pal[ch]; g.fillRect(x + i, y + j, run, 1); i += run;
    }
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

// 3x5 pixel digits for signs
const DIG = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '3': ['###', '..#', '.##', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'],
  '-': ['...', '...', '###', '...', '...'], 'm': ['...', '...', '###', '#.#', '#.#'],
};
function text(g, x, y, s, col) {
  for (const ch of s) { const d = DIG[ch]; if (d) art(g, x, y, d, { '#': col }); x += 4; }
}

// ---------- string-art creatures ----------
const CAMEL_PAL = { b: C.camel, d: C.camelDark };
const CAMEL = [
  [
    '....bb..............',
    '...bbbb.............',
    '...bbb..............',
    '....bb......bbbb....',
    '....bb.....bbbbbbb..',
    '....bb....bbbbbbbbb.',
    '....bbb..bbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbb',
    '......bbbbbbbbbbbbb.',
    '.......bbbbbbbbbbb..',
    '.......dd.dd..dd.dd.',
    '.......d..d...d..d..',
    '.......d..d...d..d..',
    '......d..d....d...d.',
  ], [
    '....bb..............',
    '...bbbb.............',
    '...bbb..............',
    '....bb......bbbb....',
    '....bb.....bbbbbbb..',
    '....bb....bbbbbbbbb.',
    '....bbb..bbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbb',
    '......bbbbbbbbbbbbb.',
    '.......bbbbbbbbbbb..',
    '.......d.dd...d.dd..',
    '......d..d....d..d..',
    '.....d....d..d....d.',
    '....d.....d..d.....d',
  ],
];
const BEDOUIN_PAL = { w: C.keff, r: C.robe, s: '#c99364' };
const BEDOUIN = [
  ['.www.', '.wsw.', '.www.', 'rrrrr', '.rrr.', '.rrr.', '.rrr.', '.r.r.', '.r.r.'],
  ['.www.', '.wsw.', '.www.', 'rrrrr', '.rrr.', '.rrr.', '.rrr.', '.rr..', 'r..r.'],
];
const IBEX = [
  '....h.h.....',
  '...h...h....',
  '..hhh.h.....',
  '..ii..h.....',
  '..iii.......',
  '..iiiiiiiiii',
  '...iiiiiiiii',
  '....iiiliii.',
  '....ii...ii.',
  '....i.....i.',
  '....i.....i.',
  '...i.....i..',
];
const IBEX_PAL = { i: C.ibex, h: C.ibexHorn, l: C.ibexLight };
const CAT_SLEEP = ['..o..o..', '.oooooo.', 'ooooooooo', '.oooooo.o'];
const CAT_PAL = { o: C.cat };
const HYRAX = ['.bbbb.', 'bbbbbk', 'bbbbbb', '.b..b.'];
const HYRAX_PAL = { b: C.hyrax, k: C.k };
const VULTURE = [['k.....k', '.k...k.', '..kkk..'], ['..kkk..', '.k...k.', 'k.....k']];
const VULTURE_PAL = { k: C.vulture };
const WEED_PAL = { w: C.weed, d: C.weedDark };
const TUMBLE0 = ['...ww.w..', '.w.wdw.w.', '..wdw.dw.', '.wd.w..ww', 'ww.w.dw..', '..wd..w.w', '.w.wdw.w.', '..w.ww...', '.....w...'];
// second frame = the same weed rotated a quarter turn (rows ↔ columns)
const TUMBLE1 = TUMBLE0[0].split('').map((_, i) => TUMBLE0.map((r) => r[TUMBLE0[0].length - 1 - i] || '.').join(''));
const TUMBLE = [TUMBLE0, TUMBLE1];

// ---------- static builders ----------
let built = null;

function buildFar() {
  const [c, g] = mk(P, LH);
  // Jordan mountains — two ridges, far paler, nearer a touch deeper
  for (let x = 0; x < P; x++) {
    const a = 86 - Math.round(4 * Math.sin(x / 41) + 3 * Math.sin(x / 17 + 1) + 2 * hash(x >> 2, 7));
    R(g, x, a, 1, 102 - a, C.jordanFar);
    const b = 92 - Math.round(3 * Math.sin(x / 23 + 2) + 2 * Math.sin(x / 9) + 2 * hash(x >> 1, 9));
    R(g, x, b, 1, 102 - b, C.jordan);
    if (hash(x, 11) < 0.35) R(g, x, b, 1, 1, C.jordanShade);
  }
  // Dead Sea — turquoise strip, banded far→near
  R(g, 0, 100, P, 3, C.sea[0]); R(g, 0, 103, P, 3, C.sea[1]); R(g, 0, 106, P, 3, C.sea[2]); R(g, 0, 109, P, 2, C.sea[3]);
  for (let x = 0; x < P; x += 2) if (hash(x, 21) < 0.16) R(g, x, 101 + Math.floor(hash(x, 22) * 3) * 3, 2, 1, C.seaGleam2);
  // the classic: people floating and reading the newspaper
  for (const px of [150, 402, 556]) {
    R(g, px, 105, 1, 1, C.skin); R(g, px + 1, 106, 5, 1, C.swim); R(g, px + 6, 105, 1, 1, C.skin);
    R(g, px + 2, 103, 3, 2, C.paper); R(g, px + 3, 103, 1, 1, C.paperInk);
  }
  // salt shore + salt flats
  R(g, 0, 111, P, 3, C.salt);
  for (let x = 0; x < P; x++) { if (hash(x, 31) < 0.3) R(g, x, 111, 1, 1, C.saltShine); if (hash(x, 32) < 0.18) R(g, x, 113, 1, 1, C.saltFlat2); }
  R(g, 0, 114, P, LH - 114, C.saltFlat);
  for (let x = 0; x < P; x += 3) if (hash(x, 33) < 0.25) R(g, x, 116 + Math.floor(hash(x, 34) * 12), 3, 1, C.saltFlat2);
  return c;
}

// a banded mesa: flat top (optional upper tier), near-vertical cliff with ledges, talus fan at the foot,
// strata bands offset per mesa, shadow on the left face (sun is high-right)
function mesa(g, x0, x1, top, base, seed = 0, tier = 0) {
  const bands = [[C.cap, 3], [C.ochre, 5], [C.red, 6], [C.violet, 5], [C.red2, 6], [C.ochre2, 6], [C.violet2, 7], [C.red, 8], [C.ochre, 9], [C.violet, 6]];
  if (tier > 0) {
    const tx0 = x0 + Math.floor((x1 - x0) * 0.28), tx1 = x0 + Math.floor((x1 - x0) * 0.62);
    for (let y = top - tier; y < top; y++) {
      const sp = Math.floor((y - top + tier) / 5);
      R(g, tx0 - sp, y, tx1 - tx0 + sp * 2, 1, y === top - tier ? C.cap : (y - top + tier < 3 ? C.cap : C.ochre));
      R(g, tx0 - sp, y, 1 + (sp >> 1), 1, C.shade);
    }
  }
  let y = top, bi = seed % bands.length;
  let k = 0;
  while (y < base) {
    const [col, h] = bands[bi % bands.length];
    for (k = 0; k < h && y < base; k++, y++) {
      const d = y - top, fromBase = base - y;
      let spread = Math.floor(d / 9);
      if (fromBase < 8) spread += (8 - fromBase) * 2;          // talus fan
      const lx = x0 - spread, rx = x1 + spread;
      R(g, lx, y, rx - lx, 1, col);
      if (k === 0 && d > 0) R(g, lx, y, rx - lx, 1, C.strataLine);
      if (hash(y, x0 + seed) < 0.4) R(g, lx + Math.floor(hash(y, x1) * (rx - lx - 2)), y, 2, 1, C.strataLine);
      R(g, lx, y, 2 + (spread >> 1), 1, C.shade);              // shadowed left face
      if (fromBase < 8) R(g, rx - 1 - (8 - fromBase), y, 1, 1, C.cap);   // sunlit talus rim
    }
    bi++;
  }
  R(g, x0 + 1, top, x1 - x0 - 2, 1, '#fbe8c4');
}

function buildMesas() {
  const [c, g] = mk(P, LH);
  const BASE = 128;
  // ground plain of the mesa layer first (so the talus sits on it)
  R(g, 0, BASE - 4, P, LH - BASE + 4, C.plainFar);
  for (let x = 0; x < P; x += 2) if (hash(x, 41) < 0.2) R(g, x, BASE + Math.floor(hash(x, 42) * 20), 4, 1, C.plainFar2);
  // Makhtesh Ramon rim: a long cliff with the crater "bite" in the middle
  mesa(g, 340, 520, 90, BASE, 2);
  R(g, 400, 90, 56, 12, C.violet2);              // crater floor seen through the notch
  R(g, 400, 90, 56, 1, C.strataLine); R(g, 400, 96, 56, 1, C.strataLine);
  R(g, 404, 98, 48, 2, C.violet); R(g, 410, 101, 36, 1, C.ochre2);
  R(g, 456, 84, 30, 6, C.cap); R(g, 456, 84, 30, 1, '#fbe8c4'); R(g, 456, 84, 2, 6, C.shade);   // higher rim block
  // mesas + buttes
  mesa(g, 40, 112, 78, BASE, 0, 8);
  mesa(g, 212, 232, 98, BASE, 4);
  mesa(g, 268, 276, 106, BASE, 6);                // slim needle
  mesa(g, 570, 610, 96, BASE, 3, 5);
  // noon haze hugging the mesa bases (depth cue)
  R(g, 0, BASE - 14, P, 6, C.haze); R(g, 0, BASE - 8, P, 8, 'rgba(255,240,220,0.18)');
  return c;
}

function acacia(g, x, base) {
  R(g, x - 9, base, 18, 1, C.shadow); R(g, x - 6, base + 1, 10, 1, C.shadow);
  R(g, x, base - 10, 2, 10, C.trunk); R(g, x - 3, base - 8, 3, 1, C.trunk); R(g, x + 2, base - 7, 3, 1, C.trunk);
  R(g, x - 8, base - 13, 18, 3, C.leaf); R(g, x - 7, base - 15, 16, 2, C.leaf2); R(g, x - 9, base - 11, 20, 1, C.leafDark);
  R(g, x - 5, base - 16, 12, 1, C.leaf2);
  for (let i = 0; i < 9; i++) R(g, x - 8 + i * 2, base - 13 + (i % 2), 1, 1, C.leafDark);
}
function rockPile(g, x, base, n = 3) {
  for (let i = 0; i < n; i++) {
    const w = 8 - i * 2, h = 4 - i, rx = x + i * 2, ry = base - h - i * 3;
    R(g, rx, ry, w, h, C.rock); R(g, rx, ry + h - 1, w, 1, C.rockDark); R(g, rx, ry, 1, h, C.rockDark); R(g, rx + w - 2, ry, 1, 1, C.rockLight);
  }
}
function tent(g, x, base) {
  // black bedouin goat-hair tent: low, wide, with an ochre stripe — plus a satellite dish and a dud shemesh
  const rows = [[x + 12, 12], [x + 8, 20], [x + 5, 26], [x + 3, 30], [x + 1, 34], [x, 36], [x, 36], [x, 36], [x, 36], [x, 36]];
  rows.forEach(([rx, w], i) => R(g, rx, base - 10 + i, w, 1, i === 4 ? C.tentStripe : (i < 2 ? C.tent2 : C.tent)));
  R(g, x + 13, base - 6, 5, 6, C.tentOpen);                 // doorway
  R(g, x + 22, base - 4, 1, 4, C.rope); R(g, x - 3, base - 3, 3, 1, C.rope); R(g, x + 36, base - 3, 3, 1, C.rope);
  R(g, x + 12, base - 10, 12, 1, C.tent2);
  // dud shemesh (solar boiler) on the roof, obviously
  R(g, x + 22, base - 12, 8, 3, C.panel); R(g, x + 23, base - 11, 6, 1, C.panelLine);
  R(g, x + 23, base - 14, 7, 2, C.tank); R(g, x + 23, base - 13, 7, 1, C.tankShade);
  // satellite dish — for the Champions League, of course
  R(g, x + 6, base - 11, 1, 3, C.dishDark); R(g, x + 4, base - 15, 4, 4, C.dish); R(g, x + 3, base - 14, 1, 2, C.dish); R(g, x + 5, base - 13, 1, 1, C.dishDark);
  // shade
  R(g, x - 2, base, 40, 1, C.shadow);
}
function saltPillar(g, x, base) {
  // Lot's wife (אשת לוט) — she looked back. Don't look back.
  R(g, x, base - 16, 5, 16, C.pillar); R(g, x + 1, base - 19, 3, 3, C.pillar); R(g, x - 1, base - 12, 7, 6, C.pillar);
  R(g, x, base - 12, 1, 12, C.pillarShade); R(g, x - 1, base - 8, 1, 2, C.pillarShade); R(g, x + 4, base - 6, 1, 6, C.pillarShade);
  R(g, x + 2, base - 18, 1, 1, C.pillarDark); R(g, x, base, 8, 1, C.shadow);
}

function buildMid() {
  const [c, g] = mk(P, LH);
  const BASE = 142;
  R(g, 0, BASE - 2, P, LH - BASE + 2, C.plainMid);
  for (let x = 0; x < P; x += 2) if (hash(x, 51) < 0.22) R(g, x, BASE + 1 + Math.floor(hash(x, 52) * 24), 2, 1, hash(x, 53) < 0.5 ? C.plainMid2 : C.pebble);
  acacia(g, 60, BASE); acacia(g, 470, BASE); acacia(g, 590, BASE);
  rockPile(g, 120, BASE, 3); rockPile(g, 300, BASE, 2); rockPile(g, 520, BASE, 3);
  tent(g, 180, BASE);
  // ibex ledge — a rock outcrop with an ibex posing like a tourist photo
  R(g, 370, BASE - 12, 26, 12, C.rock); R(g, 366, BASE - 6, 34, 6, C.rock); R(g, 370, BASE - 12, 26, 1, C.rockLight); R(g, 366, BASE - 1, 34, 1, C.rockDark);
  R(g, 370, BASE - 12, 1, 12, C.rockDark); R(g, 376, BASE - 9, 1, 1, C.rockDark); R(g, 388, BASE - 4, 1, 1, C.rockDark);
  art(g, 378, BASE - 24, IBEX, IBEX_PAL);
  saltPillar(g, 250, BASE);
  // a few shrubs
  for (const sx of [20, 340, 430, 620]) { R(g, sx, BASE - 3, 5, 3, C.leafDark); R(g, sx + 1, BASE - 4, 3, 1, C.leaf); R(g, sx - 1, BASE, 7, 1, C.shadow); }
  return c;
}

function sabra(g, x, base, big = true) {
  // opuntia (צבר) paddles with red fruit — the hero's family
  const paddle = (px, py, w, h) => {
    R(g, px + 1, py, w - 2, h, C.cactus); R(g, px, py + 1, w, h - 2, C.cactus);
    R(g, px + 1, py + h - 1, w - 2, 1, C.cactusDark); R(g, px + w - 1, py + 1, 1, h - 2, C.cactusDark);
    R(g, px + 1, py + 1, 1, h - 3, C.cactusLight);
    for (let j = 1; j < h - 1; j += 2) for (let i = 1 + (j & 1); i < w - 1; i += 3) R(g, px + i, py + j, 1, 1, C.spine);
  };
  paddle(x, base - 8, 7, 8);
  if (big) { paddle(x - 4, base - 14, 6, 7); paddle(x + 4, base - 15, 6, 8); R(g, x - 3, base - 16, 2, 2, C.fruit); R(g, x + 6, base - 17, 2, 2, C.fruit); R(g, x - 3, base - 16, 1, 1, C.fruit2); }
  else { paddle(x + 2, base - 13, 5, 6); R(g, x + 3, base - 15, 2, 2, C.fruit); }
  R(g, x - 2, base, big ? 12 : 9, 1, C.shadow);
}
function busStop(g, x, base) {
  // Egged bus stop. Next bus: Thursday. Maybe.
  R(g, x - 1, base - 22, 30, 1, C.roofDark); R(g, x, base - 24, 28, 2, C.roof); R(g, x, base - 21, 28, 1, 'rgba(60,40,20,0.15)');
  R(g, x + 1, base - 21, 2, 21, C.post); R(g, x + 1, base - 21, 1, 21, C.postDark);
  R(g, x + 25, base - 21, 2, 21, C.post); R(g, x + 25, base - 21, 1, 21, C.postDark);
  R(g, x + 5, base - 9, 18, 2, C.bench); R(g, x + 5, base - 8, 18, 1, C.benchDark); R(g, x + 6, base - 7, 1, 7, C.benchDark); R(g, x + 21, base - 7, 1, 7, C.benchDark);
  // yellow sign on its own pole
  R(g, x + 34, base - 26, 1, 26, C.post); R(g, x + 30, base - 32, 9, 9, C.yellow); R(g, x + 30, base - 24, 9, 1, C.yellowDark); R(g, x + 38, base - 32, 1, 9, C.yellowDark);
  art(g, x + 31, base - 30, ['.kkkkk.', 'kk.k.kk', 'kkkkkkk', '.k...k.'], { k: C.k });
  // a cat, asleep in the only shade for 40 km
  art(g, x + 9, base - 4, CAT_SLEEP, CAT_PAL); R(g, x + 11, base - 2, 1, 1, C.catDark); R(g, x + 14, base - 2, 1, 1, C.catDark);
  R(g, x, base, 29, 1, C.shadow);
}
function elevationSign(g, x, base) {
  // "-430 m" — lowest point on earth. Also lowest point of your week.
  R(g, x + 9, base - 14, 2, 14, C.brownSign2);
  R(g, x, base - 22, 20, 9, C.brownSign); R(g, x, base - 14, 20, 1, C.brownSign2); R(g, x, base - 22, 20, 1, '#8a5533');
  text(g, x + 3, base - 20, '-430', C.white);
  R(g, x + 8, base, 5, 1, C.shadow);
}
function camelSign(g, x, base) {
  // yellow diamond: camels crossing (זהירות גמלים)
  R(g, x + 4, base - 16, 1, 16, C.post);
  const ws = [1, 3, 5, 7, 9, 7, 5, 3, 1];
  ws.forEach((w, i) => R(g, x + 4 - (w >> 1), base - 26 + i, w, 1, C.yellow));
  ws.forEach((w, i) => { if (i > 4) R(g, x + 4 + (w >> 1), base - 26 + i, 1, 1, C.yellowDark); });
  art(g, x + 2, base - 24, ['.k.k.', 'kkkkk', 'k.k.k'], { k: C.k });
  R(g, x + 2, base, 5, 1, C.shadow);
}

function buildNearMid() {
  const [c, g] = mk(P, LH);
  const BASE = 152;
  R(g, 0, BASE - 2, P, LH - BASE + 2, C.plainNear);
  for (let x = 0; x < P; x += 2) if (hash(x, 61) < 0.2) R(g, x, BASE + Math.floor(hash(x, 62) * 26), 3, 1, C.plainNear2);
  // כביש 90 — the road to Eilat. Straight. Forever.
  R(g, 0, BASE + 4, P, 5, '#b7a58b'); R(g, 0, BASE + 4, P, 1, '#c4b399'); R(g, 0, BASE + 8, P, 1, '#a2907a');
  for (let x = 4; x < P; x += 16) R(g, x, BASE + 6, 8, 1, '#efe4c4');
  busStop(g, 90, BASE);
  elevationSign(g, 250, BASE);
  camelSign(g, 470, BASE);
  sabra(g, 30, BASE, true); sabra(g, 330, BASE, false); sabra(g, 560, BASE, true);
  rockPile(g, 400, BASE, 2); art(g, 402, BASE - 11, HYRAX, HYRAX_PAL);   // שפן סלע sunbathing on the rock
  rockPile(g, 610, BASE, 1);
  return c;
}

function buildDunes() {
  const [c, g] = mk(P, LH);
  // back dune ridge (paler), then front dunes with wind ripples
  for (let x = 0; x < P; x++) {
    const yb = 158 - Math.round(6 * Math.sin(x / 38 + 1) + 3 * Math.sin(x / 13));
    R(g, x, yb, 1, LH - yb, C.duneBack);
    if (Math.cos(x / 38 + 1) < -0.3) R(g, x, yb + 1, 1, 3, C.duneBackShade);
  }
  const ridge = (x) => 164 - Math.round(5 * Math.sin(x / 57 + 3) + 2 * Math.sin(x / 19 + 1));
  for (let x = 0; x < P; x++) {
    const yf = ridge(x), slope = ridge(x + 2) - ridge(x - 2);
    R(g, x, yf, 1, LH - yf, C.dune);
    R(g, x, yf, 1, 1, C.rippleLight);                                   // sunlit crest
    if (slope > 0) R(g, x, yf + 1, 1, 3, C.duneShade);                  // lee side falls into shadow
    for (let y = yf + 4; y < LH; y++) {
      const ph = (x + y * 3 + Math.floor(hash(y >> 2, 3) * 4)) % 11;
      if (y % 4 === 0 && ph < 4) R(g, x, y, 1, 1, '#e7c98b');
      else if (y % 4 === 2 && ph > 7) R(g, x, y, 1, 1, C.duneLight);
    }
  }
  // shrubs and small sabras on the dune crests
  for (const sx of [140, 410, 600]) { R(g, sx, 156, 7, 4, C.shrub); R(g, sx + 1, 155, 5, 1, C.shrubDark); R(g, sx + 2, 154, 3, 1, C.shrub); R(g, sx - 1, 159, 9, 1, C.duneShade); }
  sabra(g, 40, 162, true); sabra(g, 300, 161, false); sabra(g, 500, 163, true);
  return c;
}

function build() {
  built = { far: buildFar(), mesas: buildMesas(), mid: buildMid(), nearMid: buildNearMid(), dunes: buildDunes() };
}

// ---------- sky ----------
const SUNX = 232, SUNY = 30;
function sky(ctx, w, h, t) {
  const bands = C.sky, n = bands.length, bh = 9;   // 12 × 9 px = 108 px of gradient, then cream to the bottom
  for (let i = 0; i < n; i++) R(ctx, 0, i * bh, w, bh, bands[i]);
  R(ctx, 0, n * bh, w, h - n * bh, bands[n - 1]);
  // white-hot sun with stepped glow; rim breathes with t (heat pulse)
  const pulse = Math.round(Math.sin(t * 2.2) + 1);
  disc(ctx, SUNX, SUNY, 26 + pulse, C.sunGlow1);
  disc(ctx, SUNX, SUNY, 19, C.sunGlow2);
  disc(ctx, SUNX, SUNY, 14, C.sunGlow3);
  disc(ctx, SUNX, SUNY, 10, C.sunRim);
  disc(ctx, SUNX, SUNY, 8, C.sun);
  disc(ctx, SUNX, SUNY, 6, C.sunCore);
  // heat rays: sparse horizontal glints around the sun, flicker
  for (let i = 0; i < 6; i++) {
    const a = t * 0.7 + i * 1.047;
    const rx = SUNX + Math.round(Math.cos(a) * (30 + (i % 3) * 4)), ry = SUNY + Math.round(Math.sin(a) * (16 + (i % 2) * 3));
    if (hash(i, Math.floor(t * 6)) < 0.7) R(ctx, rx, ry, 3, 1, 'rgba(255,255,255,0.45)');
  }
  // two vultures circling — patient, like a Bezeq technician
  for (let i = 0; i < 2; i++) {
    const a = t * 0.35 + i * Math.PI;
    const vx = 118 + Math.round(Math.cos(a) * 46), vy = 46 + Math.round(Math.sin(a) * 9) + i * 6;
    art(ctx, vx, vy, VULTURE[Math.floor(t * 2.5 + i) & 1], VULTURE_PAL);
  }
}

// ---------- layers ----------
const layers = [
  { speed: 0.05, draw(ctx, camX, camY, w, h, t) {
    if (!built) build();
    const [ox, dy] = offset(camX, camY, 0.05);
    blit(ctx, built.far, ox, dy);
    // sea gleam: salt crystals + water sparkle at the horizon, twinkle with t
    const ft = Math.floor(t * 5);
    for (let i = 0; i < 18; i++) {
      const gx = Math.floor(hash(i, 77) * w), gy = 100 + dy + Math.floor(hash(i, 78) * 11);
      if (hash(i, ft) < 0.4) R(ctx, gx, gy, 2, 1, gy > 109 + dy ? C.saltShine : C.seaGleam);
    }
  } },
  { speed: 0.2, draw(ctx, camX, camY) {
    if (!built) build();
    const [ox, dy] = offset(camX, camY, 0.2);
    blit(ctx, built.mesas, ox, dy);
  } },
  { speed: 0.4, draw(ctx, camX, camY, w, h, t) {
    if (!built) build();
    const [ox, dy] = offset(camX, camY, 0.4);
    blit(ctx, built.mid, ox, dy);
    // camel caravan drifting slowly leftwards (one per period), bedouin leading, legs alternate
    const cx = P - (Math.floor(t * 6) % P);
    const f = Math.floor(t * 2) & 1;
    const xs = (((ox + cx) % P) + P) % P;
    for (const x of [xs, xs - P]) {
      if (x + 76 < 0 || x - 12 > w) continue;
      art(ctx, x - 12, 142 + dy - 9, BEDOUIN[f], BEDOUIN_PAL);
      for (let i = 0; i < 3; i++) art(ctx, x + i * 24, 142 + dy - 14, CAMEL[(f + i) & 1], CAMEL_PAL);
      R(ctx, x - 12, 142 + dy, 80, 1, 'rgba(120,90,50,0.25)');
    }
  } },
  { speed: 0.65, draw(ctx, camX, camY) {
    if (!built) build();
    const [ox, dy] = offset(camX, camY, 0.65);
    blit(ctx, built.nearMid, ox, dy);
  } },
  { speed: 0.85, draw(ctx, camX, camY, w, h, t) {
    if (!built) build();
    const [ox, dy] = offset(camX, camY, 0.85);
    blit(ctx, built.dunes, ox, dy);
    // tumbleweed: rolls right, hops a little, two rotation frames
    const tx = Math.floor(t * 34) % P;
    const hop = Math.round(Math.abs(Math.sin(t * 5)) * 3);
    const f = Math.floor(t * 8) & 1;
    const xs = (((ox + tx) % P) + P) % P;
    for (const x of [xs, xs - P]) {
      if (x + 9 < 0 || x > w) continue;
      R(ctx, x + 1, 160 + dy, 7, 1, 'rgba(120,90,50,0.22)');
      art(ctx, x, 152 + dy - hop, TUMBLE[f], WEED_PAL);
    }
  } },
];

// ---------- fog: heat haze ----------
function fog(ctx, w, h, t) {
  const src = ctx.canvas;
  // 1-2 px horizontal jitter bands between horizon and mid-ground, shimmering with t
  for (let y = 84; y < 150; y += 5) {
    if (hash(y, 5) > 0.45) continue;
    const s = Math.round(Math.sin(t * 3.1 + y * 0.9) * 1.2);
    if (s === 0) continue;
    const bh = 1 + (y & 1);
    ctx.drawImage(src, 0, y, w, bh, s, y, w, bh);
  }
  // mirage on the far strip: pale flickering sheen just above the salt line
  for (let i = 0; i < 3; i++) {
    const y = 97 + i * 5 + (Math.floor(t * 4 + i) & 1);
    const a = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(t * 2.7 + i * 2.1));
    R(ctx, 0, y, w, 1, `rgba(255,255,255,${a.toFixed(3)})`);
  }
  // scorching: very faint warm bleach over the whole frame
  R(ctx, 0, 0, w, h, 'rgba(255,244,214,0.06)');
}

export default { sky, layers, fog };

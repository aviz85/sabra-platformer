// SABRA! — src/art/items.js
// Pickups (animated: bob + shine) and decorative props (single frame).
// Format per CONTRACT.md / src/engine/sprite.js: { w, h, fps, palette, frames }, '.' = transparent.
// Hand-drawn string art for the small pickups; a tiny integer-only pixel painter (rects, bresenham
// lines, ellipses, bezier fronds, a 5px Hebrew bitmap font) for the larger props. No anti-aliasing,
// no fractional coords — every pixel is placed on the integer grid.

// ---------------------------------------------------------------------------------------------
// Master palette — each def gets only the subset of colors it actually uses (see def()).
// ---------------------------------------------------------------------------------------------
const MASTER = {
  k: '#1b1420', K: '#3a2f3f', '6': '#101014', '1': '#3c3c44', '2': '#b9b4ad',
  w: '#ffffff', W: '#f3eee4', '7': '#fff4d6', g: '#c9c9d1', G: '#8a8a96',
  r: '#d4261f', R: '#f25b48', q: '#8c1210', '!': '#e0407a', '*': '#8a2260',
  y: '#f7c531', Y: '#ffe98a', o: '#ef8a1c', O: '#c05e0c',
  s: '#f6c9a2', S: '#d9a074', h: '#f5da6e',
  b: '#7a4a22', B: '#a9713a', d: '#4a2a12', '3': '#9c6b3c', '4': '#6b4423', '5': '#c9935a',
  t: '#e5c58a', T: '#f4dfb2', n: '#e9d29b', e: '#eadbb0', E: '#cdb684', c: '#d9b56c',
  v: '#4f9a2f', V: '#7fc94a', u: '#2b5e1c', '@': '#6f8f5a', '&': '#46643a', '^': '#a3c48d',
  l: '#0038b8', L: '#3d7be0', i: '#8ed0f5', a: '#4fb6d8', '%': '#2f8f8f',
  m: '#dfe3ea', M: '#9aa3b3', p: '#f2a0b5', P: '#7c4dab', z: '#b8860b', Z: '#e8b923',
  x: '#c9b99a', X: '#a08f70', j: '#e8dfc6',
};

function def(w, h, fps, frames) {
  const palette = {};
  for (const f of frames) for (const row of f) for (const ch of row) {
    if (ch === '.' || palette[ch]) continue;
    if (!(ch in MASTER)) throw new Error(`items.js: unknown palette char '${ch}'`);
    palette[ch] = MASTER[ch];
  }
  return { w, h, fps, palette, frames };
}

// --- frame helpers (frames are arrays of strings) --------------------------------------------
const put = (frame, x, y, ch) => frame.map((row, i) => (i === y ? row.slice(0, x) + ch + row.slice(x + 1) : row));
const puts = (frame, list) => list.reduce((f, [x, y, ch]) => put(f, x, y, ch), frame);
const down = (frame, n = 1) => {
  const blank = '.'.repeat(frame[0].length);
  return [...Array(n).fill(blank), ...frame.slice(0, frame.length - n)];
};
// 4-frame bob: rest, rest+shine, down, down+shine
const bob4 = (base, shineA = [], shineB = shineA) => [base, puts(base, shineA), down(base), puts(down(base), shineB)];

// ---------------------------------------------------------------------------------------------
// Pixel painter for the props
// ---------------------------------------------------------------------------------------------
class Px {
  constructor(w, h) { this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill('.')); }
  p(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; return this; }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.g[y][x] : '.'; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c); return this; }
  box(x, y, w, h, c) { this.hl(x, y, w, c); this.hl(x, y + h - 1, w, c); this.vl(x, y, h, c); this.vl(x + w - 1, y, h, c); return this; }
  hl(x, y, n, c) { for (let i = 0; i < n; i++) this.p(x + i, y, c); return this; }
  vl(x, y, n, c) { for (let i = 0; i < n; i++) this.p(x, y + i, c); return this; }
  line(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      this.p(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  // quadratic bezier, thickness via extra line offset
  curve(x0, y0, cx, cy, x1, y1, c, steps = 24) {
    let px = x0, py = y0;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      const x = Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1);
      const y = Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1);
      this.line(px, py, x, y, c); px = x; py = y;
    }
    return this;
  }
  ell(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      if (x * x * ry * ry + y * y * rx * rx <= rx * rx * ry * ry) this.p(cx + x, cy + y, c);
    }
    return this;
  }
  stamp(x, y, rows, map) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') this.p(x + i, y + j, map && map[ch] ? map[ch] : ch); } });
    return this;
  }
  // Hebrew RTL text: xRight = right edge; glyphs laid right-to-left with 1px spacing
  text(xRight, y, str, c) {
    let x = xRight;
    for (const ch of str) {
      const gl = FONT[ch];
      if (!gl) throw new Error(`items.js FONT: missing glyph '${ch}'`);
      const gw = gl[0].length;
      this.stamp(x - gw + 1, y, gl, { '#': c });
      x -= gw + 1;
    }
    return this;
  }
  textWidth(str) { let w = 0; for (const ch of str) w += FONT[ch][0].length + 1; return w - 1; }
  // inner outline: any painted pixel touching transparent (4-neigh) becomes c. `only` restricts to a set of source chars.
  edge(c = 'k', only = null) {
    const src = this.g.map((r) => r.slice());
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const ch = src[y][x];
      if (ch === '.' || (only && !only.includes(ch))) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const xx = x + dx, yy = y + dy;
        return xx < 0 || yy < 0 || xx >= this.w || yy >= this.h ? false : src[yy][xx] === '.';
      });
      if (n) this.g[y][x] = c;
    }
    return this;
  }
  // replace every `from` char that has `neighbor` char directly at (dx,dy) with `to` — cheap shading
  shade(from, to, dx, dy, neighbor = '.') {
    const src = this.g.map((r) => r.slice());
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y][x] !== from) continue;
      const xx = x + dx, yy = y + dy;
      const nb = xx < 0 || yy < 0 || xx >= this.w || yy >= this.h ? '.' : src[yy][xx];
      if (nb === neighbor) this.g[y][x] = to;
    }
    return this;
  }
  rows() { return this.g.map((r) => r.join('')); }
}

// 5px-tall Hebrew bitmap font (legible-ish at pixel scale). '#' = ink.
const FONT = {
  'א': ['#..#', '##.#', '.##.', '#.##', '#..#'],
  'ב': ['###.', '...#', '...#', '...#', '####'],
  'ג': ['.##.', '..#.', '..#.', '.##.', '#.#.'],
  'ד': ['####', '..#.', '..#.', '..#.', '..#.'],
  'ה': ['####', '...#', '#..#', '#..#', '#..#'],
  'ו': ['##', '.#', '.#', '.#', '.#'],
  'ח': ['####', '#..#', '#..#', '#..#', '#..#'],
  'י': ['##', '.#', '.#', '..', '..'],
  'ל': ['..#', '###', '..#', '..#', '##.'],
  'ם': ['####', '#..#', '#..#', '#..#', '####'],
  'מ': ['.###', '#..#', '#..#', '#..#', '##.#'],
  'נ': ['.##', '..#', '..#', '..#', '###'],
  'ן': ['##', '.#', '.#', '.#', '.#'],
  'צ': ['#..#', '#.#.', '##..', '#...', '####'],
  'ק': ['####', '#..#', '#..#', '#...', '#...'],
  'ר': ['####', '...#', '...#', '...#', '...#'],
  'ש': ['#.#.#', '#.#.#', '#.#.#', '#..##', '#####'],
  'ף': ['####', '#..#', '##.#', '...#', '...#'],
  '4': ['#..#', '#..#', '####', '...#', '...#'],
  ' ': ['..', '..', '..', '..', '..'],
};

// =============================================================================================
// PICKUPS
// =============================================================================================

// BAMBA — the red bag, the yellow logo band, and of course the baby. 12x12, bobbing.
const BAMBA_BASE = [
  '.kkkkkkkkkk.',
  'kRrRrRrRrRrk',
  'krrrrrrrrrrk',
  'krryyyyyyrrk',
  'krryryryyrrk',
  'krrhhhhhrrrk',
  'krhsssssrrrk',
  'krhsksksrrrk',
  'krrssssrrrrk',
  'kqrqrqrqrqqk',
  '.kkkkkkkkkk.',
  '............',
];
const BAMBA = def(12, 12, 6, bob4(BAMBA_BASE, [[2, 2, 'W'], [2, 3, 'W']], [[9, 3, 'W'], [9, 4, 'W']]));

// FALAFEL — pita pocket, three falafel balls, tahini, tomato, parsley. 10x10, bobbing.
const FALAFEL_BASE = [
  '..k.kk.k..',
  '.kvkbbkvk.',
  '.kbBbBbBk.',
  'kbbBWrWbbk',
  'kTTTTTTTTk',
  'kTttttttTk',
  'kcttttttck',
  '.kcttttck.',
  '..kkcckk..',
  '..........',
];
const FALAFEL = def(10, 10, 4, bob4(FALAFEL_BASE, [[2, 5, 'T']], [[6, 5, 'T']]));

// HUMMUS — blue-rimmed plate, mound with chickpeas, paprika swirl, glinting olive oil. 12x10.
const HUMMUS_BASE = [
  '....kkkk....',
  '..kkeeeekk..',
  '.keecEeecek.',
  'keErreEErrek',
  'kWeeErreeeWk',
  'kWWWeeeeWWWk',
  'kllWWWWWWllk',
  '.kkllllllkk.',
  '..kkkkkkkk..',
  '............',
];
const HUMMUS = def(12, 10, 4, bob4(HUMMUS_BASE, [[5, 2, 'Y'], [6, 3, 'w']], [[7, 2, 'Y'], [4, 2, 'w']]));

// KREMBO — chocolate dome with a bite showing the cream, foil skirt, biscuit base. 10x14.
const KREMBO_BASE = [
  '..........',
  '...kkkk...',
  '..kdBBdk..',
  '.kdBBBddk.',
  '.kddBdddk.',
  'kWWkdddddk',
  'kWWWkddddk',
  '.kWkdddddk',
  '.kdddddddk',
  'kmMmMmMmMk',
  'kMmMmMmMmk',
  'kttttttttk',
  '.kkkkkkkk.',
  '..........',
];
const KREMBO = def(10, 14, 6, bob4(KREMBO_BASE, [[3, 3, 'W']], [[6, 2, 'W']]));

// SHEKEL — spinning ₪ coin, 4 frames. 8x8.
const SHEKEL = def(8, 8, 8, [
  [
    '..kkkk..',
    '.kYYYYk.',
    'kYzYzzYk',
    'kYzYYzYk',
    'kZzYYzZk',
    'kZzzYzZk',
    '.kZZZZk.',
    '..kkkk..',
  ],
  [
    '...kk...',
    '..kYYk..',
    '.kYzzYk.',
    '.kYzYZk.',
    '.kZYzZk.',
    '.kZzzZk.',
    '..kZZk..',
    '...kk...',
  ],
  [
    '...kk...',
    '...kk...',
    '..kYZk..',
    '..kYZk..',
    '..kYZk..',
    '..kYZk..',
    '...kk...',
    '...kk...',
  ],
  [
    '...kk...',
    '..kZZk..',
    '.kZzzZk.',
    '.kZYzYk.',
    '.kYzYYk.',
    '.kYzzYk.',
    '..kYYk..',
    '...kk...',
  ],
]);

// HEARTS 8x8 — full pulses (2 frames), empty is a hollow.
const HEART_FULL = def(8, 8, 3, [
  [
    '.kk..kk.',
    'kRRkkRRk',
    'kRWRrrrk',
    'krrrrrrk',
    '.krrrrk.',
    '..krrk..',
    '...kk...',
    '........',
  ],
  [
    'kkk..kkk',
    'kRRkkRRk',
    'kRWRrrrk',
    'kRrrrrrk',
    'krrrrrrk',
    '.krrrrk.',
    '..krrk..',
    '...kk...',
  ],
]);
const HEART_EMPTY = def(8, 8, 1, [[
  '.kk..kk.',
  'kKKkkKKk',
  'kK1KKK1k',
  'k11111Kk',
  '.k1111k.',
  '..k11k..',
  '...kk...',
  '........',
]]);

// CHECKPOINT_FLAG 16x32 — frame 0: flag down (unclaimed, drooping at the base). frame 1: up, flying.
const FLAG_ROWS = [
  'kkkkkkkkkkkk',
  'kllllllllllk',
  'kwwwwwwwwwwk',
  'kwwwwlwwwwwk',
  'kwwlllllwwwk',
  'kwwwlwlwwwwk',
  'kwwlllllwwwk',
  'kwwwwlwwwwwk',
  'kwwwwwwwwwwk',
  'kllllllllllk',
  'kkkkkkkkkkkk',
];
function flagPole(P) {
  P.rect(3, 2, 2, 28, 'M').vl(3, 2, 28, 'm');              // pole with highlight
  P.rect(2, 0, 4, 2, 'Z').p(2, 0, 'z').p(5, 0, 'z');       // brass finial
  P.rect(0, 30, 8, 2, 'G').hl(0, 30, 8, '2').hl(0, 31, 8, 'k').p(0, 30, 'k').p(7, 30, 'k'); // base
  P.vl(2, 2, 28, 'k').vl(5, 2, 28, 'k');                   // pole outline
  return P;
}
const CHECKPOINT_FLAG = def(16, 32, 1, [
  (() => {                                       // down: furled, grey, sagging at the base
    const P = flagPole(new Px(16, 32));
    P.stamp(5, 18, FLAG_ROWS.slice(0, 11).map((r) => r.slice(0, 7)), { l: 'G', w: '2' });
    P.vl(11, 19, 9, 'K');                        // folded edge
    return P.rows();
  })(),
  (() => {                                       // up: flying at the top, tip of the flag lifted by wind
    const P = flagPole(new Px(16, 32));
    P.stamp(5, 2, FLAG_ROWS.map((r) => r.slice(0, 11)));
    // ripple: last two columns shifted up a pixel
    for (let y = 2; y < 13; y++) { P.p(15, y, P.get(14, y)); P.p(14, y, P.get(13, y)); }
    P.p(15, 1, 'k').p(14, 1, 'k').p(15, 13, '.').p(14, 13, '.').p(15, 12, 'k').p(14, 12, 'k');
    P.vl(15, 2, 11, '.').vl(15, 2, 10, 'k');
    return P.rows();
  })(),
]);

// EXIT_DOOR 24x32 — Israeli apartment door: stone frame, plaque 'דירה', a golden '4',
// intercom on the left post, mezuzah on the right post, and a glowing gap (frames pulse).
const EXIT_DOOR = def(24, 32, 4, [0, 1, 2].map((phase) => {
  const P = new Px(24, 32);
  P.rect(0, 0, 24, 32, 'x').box(0, 0, 24, 32, 'k').hl(0, 31, 24, 'K');   // stone frame
  P.vl(1, 1, 30, 'j').hl(1, 1, 22, 'j');                                 // stone highlight
  // plaque
  P.rect(3, 1, 18, 7, 'W').box(3, 1, 18, 7, 'k').hl(4, 2, 16, '7');
  P.text(19, 2, 'דירה', 'l');
  // door body
  const glow = ['x', 'Y', '7'][phase];
  P.rect(3, 8, 18, 23, glow);                                            // gap light behind door
  P.rect(4, 9, 16, 22, '3').box(4, 9, 16, 22, 'k');
  P.vl(5, 10, 20, '5');                                                  // wood highlight
  // two panels
  P.box(6, 11, 12, 7, '4').box(6, 20, 12, 9, '4');
  P.hl(7, 12, 10, '5').hl(7, 21, 10, '5');
  P.vl(7, 12, 5, '5').vl(7, 21, 7, '5');
  // number 4 in gold
  P.text(15, 13, '4', 'Z').p(12, 13, 'z');
  // peephole + handle
  P.p(11, 22, 'Z').p(12, 22, 'z');
  P.rect(6, 23, 3, 1, 'Z').p(6, 23, 'z').p(6, 24, 'z');
  // intercom on left post
  P.rect(0, 12, 3, 8, 'M').box(0, 12, 3, 8, 'K').p(1, 14, 'k').p(1, 16, 'k').p(1, 18, phase === 2 ? 'R' : 'r');
  // mezuzah on right post (tilted inward)
  P.p(22, 10, 'l').p(22, 11, 'l').p(21, 12, 'l').p(21, 13, 'l').p(21, 14, 'l').p(22, 11, 'Z');
  // threshold glow spill
  if (phase) P.hl(4, 31, 16, phase === 2 ? 'Y' : 'y');
  return P.rows();
}));

// ARROW_SIGN 16x16 — wooden arrow on a post pointing the way, arrow blinks yellow/white.
const ARROW_SIGN = def(16, 16, 2, [0, 1].map((phase) => {
  const P = new Px(16, 16);
  P.rect(0, 2, 13, 9, '3').box(0, 2, 13, 9, 'k');
  P.line(12, 2, 15, 6, 'k').line(12, 10, 15, 6, 'k');
  P.rect(13, 4, 2, 5, '3').p(13, 3, '3').p(13, 9, '3').p(14, 6, '3');
  P.hl(1, 3, 11, '5').vl(1, 3, 7, '5');
  const a = phase ? 'w' : 'y';
  P.hl(3, 6, 7, a).hl(8, 5, 2, a).hl(8, 7, 2, a).p(7, 4, a).p(7, 8, a).hl(3, 5, 3, a).hl(3, 7, 3, a);
  P.rect(5, 11, 3, 5, '4').vl(5, 11, 5, '3').hl(4, 15, 5, 'k');
  return P.rows();
}));

// =============================================================================================
// PROPS (single frame)
// =============================================================================================
const prop = (w, h, fn) => { const P = new Px(w, h); fn(P); return def(w, h, 1, [P.rows()]); };

// UMBRELLA 32x40 — striped beach umbrella, scalloped edge, tilted pole shadow.
const UMBRELLA = prop(32, 40, (P) => {
  for (let y = 0; y <= 15; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 15.5, dy = y - 15;
    if ((dx * dx) / (15.5 * 15.5) + (dy * dy) / (15 * 15) <= 1) {
      const ang = Math.atan2(-dy, dx);
      const sec = Math.floor(ang / (Math.PI / 7));
      P.p(x, y, sec % 2 ? 'W' : 'r');
    }
  }
  P.shade('r', 'R', 0, -1, '.');               // sun-lit rim on the red stripes
  P.edge('k');
  P.hl(0, 15, 32, 'k');
  for (let x = 1; x < 31; x += 4) P.hl(x, 16, 3, 'q').p(x + 1, 17, 'k');    // scallops with shadow
  P.hl(2, 14, 28, 'q');                        // inner shadow under canopy
  P.rect(15, 16, 2, 24, 'M').vl(15, 16, 24, 'm').vl(14, 16, 24, 'k').vl(17, 16, 24, 'k');
  P.rect(15, 0, 2, 2, 'Z').p(14, 1, 'k').p(17, 1, 'k').hl(15, 0, 2, 'k');
  P.p(15, 39, 'k').p(16, 39, 'k').hl(13, 39, 6, '1');
});

// LIFEGUARD_TOWER 48x64 — the white-and-blue hut on stilts with 'מציל' and a red flag.
const LIFEGUARD_TOWER = prop(48, 64, (P) => {
  // stilts + braces
  P.rect(8, 40, 4, 24, 'T').rect(36, 40, 4, 24, 'T');
  P.vl(9, 40, 24, 'W').vl(37, 40, 24, 'W');
  P.line(11, 42, 36, 60, '3').line(36, 42, 11, 60, '3');
  P.hl(6, 62, 8, '4').hl(34, 62, 8, '4').hl(4, 63, 12, '4').hl(32, 63, 12, '4');
  P.vl(8, 40, 24, 'k').vl(11, 40, 24, 'k').vl(36, 40, 24, 'k').vl(39, 40, 24, 'k');
  // deck
  P.rect(2, 36, 44, 4, 'W').box(2, 36, 44, 4, 'k').hl(3, 37, 42, '7').hl(3, 39, 42, '2');
  // ladder on the left
  for (let y = 41; y < 62; y += 4) P.hl(1, y, 6, '3');
  P.vl(1, 40, 24, '4').vl(6, 40, 24, '4');
  // hut
  P.rect(6, 12, 36, 24, 'W').box(6, 12, 36, 24, 'k');
  P.vl(7, 13, 22, '7').hl(7, 13, 34, '7').vl(40, 13, 22, '2').hl(8, 34, 33, '2');
  P.rect(6, 12, 36, 4, 'l').hl(6, 15, 36, 'L');
  P.box(6, 12, 36, 4, 'k');
  // opening
  P.rect(16, 18, 16, 14, 'a').box(16, 18, 16, 14, 'k').hl(17, 19, 14, 'i').rect(17, 24, 14, 7, '1');
  P.hl(17, 24, 14, 'K');
  // sign plate with מציל
  P.rect(8, 25, 32, 8, 'W').box(8, 25, 32, 8, 'l').hl(9, 26, 30, '7');
  P.rect(16, 25, 16, 8, 'W').box(16, 25, 16, 8, 'l');
  P.text(15 + Math.floor((16 + P.textWidth('מציל')) / 2) - 1, 27, 'מציל', 'l');
  // roof
  P.rect(2, 8, 44, 4, 'l').hl(2, 8, 44, 'L').box(2, 8, 44, 4, 'k');
  for (let x = 4; x < 46; x += 4) P.p(x, 10, 'L').p(x + 1, 10, 'L');
  P.hl(3, 12, 42, 'K');            // roof shadow line
  // railing on deck
  for (let x = 3; x < 46; x += 6) P.vl(x, 32, 4, '3');
  P.hl(2, 32, 44, '4').hl(2, 33, 44, '5');
  P.rect(6, 12, 36, 1, 'k');
  // flag mast + red flag
  P.vl(43, 0, 9, 'M').vl(42, 0, 9, 'k').vl(44, 0, 9, 'k');
  P.rect(35, 1, 8, 5, 'r').box(35, 1, 8, 5, 'k').hl(36, 2, 6, 'R');
});

// CRATE 16x16 — wooden fruit crate spilling over with oranges (תפוזי יפו!).
const CRATE = prop(16, 16, (P) => {
  P.rect(0, 5, 16, 11, '3').box(0, 5, 16, 11, 'k');
  P.hl(1, 8, 14, '4').hl(1, 11, 14, '4').hl(1, 14, 14, '4');
  P.hl(1, 6, 14, '5').hl(1, 9, 14, '5').hl(1, 12, 14, '5');
  P.vl(1, 5, 11, '5').vl(14, 5, 11, '4');
  P.rect(5, 9, 6, 4, 'W').box(5, 9, 6, 4, 'k').hl(6, 10, 2, 'l').hl(6, 11, 4, 'o');   // label
  // oranges
  const or = (x, y) => P.ell(x, y, 2, 2, 'o').p(x - 1, y - 1, 'Y').p(x + 1, y + 1, 'O').p(x + 2, y, 'O');
  or(3, 4); or(8, 3); or(12, 4); or(6, 6); or(11, 7);
  P.edge('k', ['o', 'Y', 'O']);
  P.p(8, 0, 'v').p(9, 0, 'v').p(9, 1, 'u').p(2, 1, 'v').p(3, 1, 'u');
});

// AWNING 48x16 — striped market awning with scalloped fringe and shadow.
const AWNING = prop(48, 16, (P) => {
  P.rect(0, 0, 48, 2, '4').hl(0, 0, 48, 'k');
  for (let x = 0; x < 48; x++) {
    const stripe = Math.floor(x / 6) % 2;
    P.vl(x, 2, 9, stripe ? 'W' : 'r');
    P.p(x, 2, stripe ? '7' : 'R');
  }
  P.hl(0, 11, 48, 'k');
  for (let x = 0; x < 48; x += 6) {
    const c = Math.floor(x / 6) % 2 ? 'W' : 'r';
    P.hl(x + 1, 12, 4, c).hl(x + 2, 13, 2, c).p(x + 1, 12, 'k').p(x + 4, 12, 'k').p(x + 2, 14, 'k').p(x + 3, 14, 'k');
  }
  P.shade('r', 'q', 0, 1, 'k'); P.shade('W', '2', 0, 1, 'k');
  P.vl(0, 2, 10, 'k').vl(47, 2, 10, 'k');
  P.hl(0, 15, 48, '.');
  P.line(0, 11, 47, 11, 'k');
  // brackets
  P.line(2, 2, 2, 8, 'K').line(45, 2, 45, 8, 'K');
});

// PALM 32x64 — leaning trunk with ring shading, six thick drooping fronds, coconuts.
const PALM = prop(32, 64, (P) => {
  // trunk: bezier from base to crown, 5px wide, shaded left/right, ring notches every 4 rows
  const pts = [];
  for (let s = 0; s <= 47; s++) { const t = s / 47, u = 1 - t; pts.push([Math.round(u * u * 12 + 2 * u * t * 10 + t * t * 20), Math.round(u * u * 63 + 2 * u * t * 40 + t * t * 16)]); }
  for (const [x, y] of pts) P.hl(x - 2, y, 5, 'B');
  for (const [x, y] of pts) { P.p(x + 1, y, '5'); P.p(x - 2, y, 'b'); P.p(x - 1, y, 'b'); }
  for (let i = 3; i < pts.length; i += 4) { const [x, y] = pts[i]; P.p(x - 1, y, 'd').p(x, y, 'd').p(x + 1, y, 'd').p(x + 2, y, 'b'); }
  P.edge('k', ['B', 'b', '5', 'd']);
  P.hl(9, 63, 8, 'k');
  // fronds: 5px thick arcs (outline + dark + light), with leaflets hanging off the underside
  const crown = [20, 15];
  const bez = (t, cx, cy, x1, y1) => { const u = 1 - t; return [Math.round(u * u * crown[0] + 2 * u * t * cx + t * t * x1), Math.round(u * u * crown[1] + 2 * u * t * cy + t * t * y1)]; };
  const frond = (cx, cy, x1, y1) => {
    for (const [dy, c] of [[-2, 'u'], [-1, 'v'], [0, 'V'], [1, 'v'], [2, 'u']]) P.curve(crown[0], crown[1] + dy, cx, cy + dy, x1, y1 + dy, c, 20);
    for (let s = 3; s <= 18; s += 3) {
      const [x, y] = bez(s / 20, cx, cy, x1, y1);
      P.line(x, y + 2, x - 1, y + 5, 'v').line(x + 1, y + 2, x, y + 5, 'u');
    }
  };
  frond(6, 4, 1, 22);
  frond(12, 0, 3, 8);
  frond(26, -2, 31, 10);
  frond(30, 8, 30, 26);
  frond(28, 18, 24, 34);
  frond(12, 18, 8, 34);
  P.edge('k', ['v', 'V', 'u']);
  // coconuts
  P.rect(17, 15, 3, 3, 'b').p(18, 15, 'B').rect(21, 16, 3, 3, 'b').p(22, 16, 'B').rect(19, 18, 3, 3, 'd').p(20, 18, 'b');
  P.edge('k', ['b', 'd']);
});

// CACTUS 16x32 — the sabra itself: stacked pads, glossy spines, magenta fruit. (זהירות, דוקר!)
const CACTUS = prop(16, 32, (P) => {
  const pad = (cx, cy, rx, ry) => { P.ell(cx, cy, rx, ry, 'v'); P.ell(cx - 1, cy - 1, rx - 2, ry - 2, 'V'); };
  pad(8, 26, 5, 5);
  pad(4, 17, 4, 5);
  pad(12, 16, 3, 5);
  pad(7, 8, 4, 5);
  P.edge('u', ['v', 'V']);
  P.edge('u', ['v', 'V']);
  P.edge('k', ['u']);
  // spines (areoles)
  [[8, 24], [6, 27], [10, 28], [3, 15], [5, 19], [12, 14], [11, 18], [7, 6], [8, 10], [5, 9]].forEach(([x, y]) => P.p(x, y, 'Y').p(x + 1, y, 'u'));
  // fruit on the pad tips
  const fruit = (x, y) => P.rect(x, y, 2, 3, '!').p(x, y + 1, '*').p(x + 1, y, 'R').hl(x, y - 1, 2, 'k').p(x - 1, y, 'k').p(x + 2, y, 'k').p(x - 1, y + 1, 'k').p(x + 2, y + 1, 'k');
  fruit(2, 11); fruit(12, 10); fruit(10, 2);
  P.hl(3, 31, 10, 'k');
});

// LAMP 8x40 — Tel Aviv street lamp, warm bulb.
const LAMP = prop(8, 40, (P) => {
  P.rect(3, 8, 2, 32, 'K').vl(3, 8, 32, 'G').vl(2, 8, 32, 'k').vl(5, 8, 32, 'k');
  P.rect(1, 35, 6, 5, 'K').box(1, 35, 6, 5, 'k').hl(2, 36, 4, 'G');
  P.rect(1, 1, 6, 7, 'Y').box(1, 1, 6, 7, 'k').p(3, 3, 'w').p(4, 3, 'w').p(3, 4, 'w');
  P.hl(2, 0, 4, 'k').hl(3, 0, 2, 'K');
  P.p(0, 5, 'y').p(7, 5, 'y').hl(2, 8, 4, 'k').hl(1, 9, 6, 'y');
});

// TRAFFIC_CONE 8x12 — orange cone with reflective band. (Ayalon's national flower.)
const TRAFFIC_CONE = def(8, 12, 1, [[
  '...kk...',
  '..kook..',
  '..koOk..',
  '.kooOOk.',
  '.kWWWWk.',
  '.kW22Wk.',
  'kooOOOOk',
  'kooOOOOk',
  'kkkkkkkk',
  'k111111k',
  'k1KKKK1k',
  '.kkkkkk.',
]]);

// TENT 48x32 — Bedouin goat-hair tent: striped canopy, guy ropes, open front with rug and finjan.
const TENT = prop(48, 32, (P) => {
  // canopy trapezoid
  for (let y = 4; y <= 26; y++) {
    const t = (y - 4) / 22;
    const x0 = Math.round(14 - 13 * t), x1 = Math.round(33 + 13 * t);
    const c = (y >> 1) % 3 === 0 ? 'b' : 'K';
    P.hl(x0, y, x1 - x0 + 1, c);
  }
  P.hl(14, 4, 20, '4');
  P.edge('k', ['b', 'K', '4']);
  // opening
  P.rect(18, 14, 12, 13, '6').hl(18, 14, 12, 'k').hl(18, 24, 12, 'r').hl(18, 25, 12, 'Y').hl(18, 26, 12, 'r');
  for (let x = 18; x < 30; x += 2) P.p(x, 25, 'r');
  // finjan (coffee pot) glimpse
  P.rect(22, 19, 3, 4, 'Z').p(21, 21, 'z').p(25, 19, 'z').p(23, 18, 'z');
  // poles
  P.vl(14, 4, 27, '5').vl(15, 4, 27, '3').vl(33, 4, 27, '5').vl(34, 4, 27, '3');
  P.p(14, 3, 'k').p(15, 3, 'k').p(33, 3, 'k').p(34, 3, 'k');
  // guy ropes + pegs
  P.line(1, 26, 0, 30, 'Y').line(46, 26, 47, 30, 'Y');
  P.line(14, 5, 6, 30, 'Y').line(33, 5, 41, 30, 'Y');
  P.p(0, 30, 'k').p(47, 30, 'k').p(6, 30, 'k').p(41, 30, 'k');
  P.hl(0, 31, 48, '4');
});

// MENORAH 16x24 — seven golden branches, seven flames.
const MENORAH = prop(16, 24, (P) => {
  // base + stem
  P.rect(4, 21, 8, 2, 'Z').hl(3, 23, 10, 'z').hl(6, 20, 4, 'Z');
  P.rect(7, 6, 2, 15, 'Z');
  // arms: three nested U shapes
  P.curve(7, 12, 7, 17, 1, 13, 'Z').curve(8, 12, 8, 17, 14, 13, 'Z');
  P.vl(1, 6, 8, 'Z').vl(14, 6, 8, 'Z');
  P.curve(7, 12, 7, 15, 3, 12, 'Z').curve(8, 12, 8, 15, 12, 12, 'Z');
  P.vl(3, 6, 7, 'Z').vl(12, 6, 7, 'Z');
  P.curve(7, 11, 7, 13, 5, 11, 'Z').curve(8, 11, 8, 13, 10, 11, 'Z');
  P.vl(5, 6, 6, 'Z').vl(10, 6, 6, 'Z');
  P.shade('Z', 'z', 1, 0, '.');
  // cups + flames
  for (const x of [1, 3, 5, 7, 10, 12, 14]) {
    P.hl(x - 1 < 0 ? 0 : x - 1, 5, x === 7 ? 3 : 2, 'z');
    P.p(x, 4, 'Y'); P.p(x, 3, 'o'); P.p(x, 2, 'r');
    P.p(x, 5, 'Z');
  }
  P.p(8, 4, 'Y').p(8, 3, 'o').p(7, 1, 'Y');
  P.p(7, 2, 'o').p(7, 3, 'Y').p(8, 2, 'r');
});

// OLIVE_TREE 32x40 — gnarled trunk, silver-green canopy, black olives.
const OLIVE_TREE = prop(32, 40, (P) => {
  // canopy clumps
  const clumps = [[16, 12, 12, 7], [8, 16, 7, 6], [24, 15, 7, 6], [16, 20, 10, 5], [12, 8, 6, 5], [21, 9, 6, 4]];
  for (const [cx, cy, rx, ry] of clumps) P.ell(cx, cy, rx, ry, '@');
  for (const [cx, cy, rx, ry] of clumps) P.ell(cx - 1, cy - 2, rx - 3, ry - 3, '^');
  P.ell(16, 22, 11, 3, '&');
  P.ell(8, 19, 5, 2, '&');
  P.ell(24, 19, 5, 2, '&');
  P.edge('&', ['@', '^', '&']);
  P.edge('k', ['&']);
  // olives
  [[6, 14], [12, 17], [20, 19], [26, 13], [15, 6], [22, 16], [10, 10]].forEach(([x, y]) => P.p(x, y, 'k').p(x + 1, y, '6').p(x, y + 1, 'P'));
  // trunk
  P.rect(13, 24, 6, 15, 'B');
  P.line(13, 24, 11, 39, 'b').line(18, 24, 21, 39, 'b');
  P.rect(12, 30, 8, 9, 'B').line(14, 26, 12, 38, 'd').line(17, 25, 19, 38, '5');
  P.hl(9, 39, 14, 'd');
  P.edge('k', ['B', 'b', 'd', '5']);
  P.p(10, 39, 'k').p(11, 39, 'k').p(20, 39, 'k').p(21, 39, 'k');
});

// BENCH 24x12 — park bench with wooden slats and iron legs.
const BENCH = prop(24, 12, (P) => {
  P.rect(1, 0, 22, 2, '3').rect(1, 3, 22, 2, '3');
  P.hl(1, 0, 22, '5').hl(1, 3, 22, '5');
  P.rect(0, 6, 24, 3, '3').hl(0, 6, 24, '5').hl(0, 8, 24, '4');
  P.vl(2, 2, 4, 'K').vl(21, 2, 4, 'K');
  P.rect(2, 9, 2, 3, 'K').rect(20, 9, 2, 3, 'K').p(3, 9, 'G').p(21, 9, 'G');
  P.hl(1, 11, 4, 'k').hl(19, 11, 4, 'k');
  P.edge('k', ['3', '5', '4']);
});

// BARREL 12x16 — pickle barrel, open top, cucumbers in brine.
const BARREL = prop(12, 16, (P) => {
  P.rect(1, 2, 10, 13, '3');
  P.vl(3, 2, 13, '5').vl(6, 2, 13, '4').vl(9, 2, 13, '4');
  P.edge('k', ['3', '5', '4']);
  P.hl(0, 5, 12, 'M').hl(0, 11, 12, 'M').p(0, 5, 'k').p(11, 5, 'k').p(0, 11, 'k').p(11, 11, 'k');
  P.hl(1, 6, 10, 'G').hl(1, 12, 10, 'G');
  P.ell(5, 2, 5, 1, 'k'); P.hl(2, 2, 8, '%'); P.hl(1, 2, 1, 'k'); P.p(10, 2, 'k');
  P.hl(3, 2, 2, 'V').hl(7, 2, 2, 'u').p(5, 2, 'v').p(6, 1, 'v').p(8, 1, 'V').p(3, 1, 'u');
  P.hl(2, 1, 8, 'k').hl(1, 1, 1, '.').hl(3, 1, 1, 'u').p(6, 1, 'v').p(8, 1, 'V');
  P.hl(2, 0, 8, '.').p(5, 0, 'k').p(6, 0, 'k').hl(3, 0, 2, 'k').hl(7, 0, 2, 'k');
  P.hl(1, 15, 10, 'k');
});

// SIGNS 32x24 — painted signboards with Hebrew text + an icon, on a post.
function signBoard(P, bg, hi, ink, text, icon) {
  P.rect(0, 0, 32, 17, bg).box(0, 0, 32, 17, 'k').hl(1, 1, 30, hi).vl(1, 1, 15, hi);
  P.text(15 + Math.floor((P.textWidth(text) + 1) / 2), 2, text, ink);
  icon(P);
  P.rect(14, 17, 4, 7, '3').vl(14, 17, 7, '5').vl(17, 17, 7, '4').hl(13, 23, 6, 'k');
  P.p(2, 2, 'k').p(29, 2, 'k').p(2, 14, 'k').p(29, 14, 'k');   // nails
}
const SIGN_SHUK = prop(32, 24, (P) => signBoard(P, 'y', 'Y', 'k', 'שוק', (Q) => {
  // tomato, cucumber, lemon
  Q.ell(6, 12, 2, 2, 'r').p(5, 11, 'R').p(6, 9, 'v').p(7, 9, 'v');
  Q.hl(11, 12, 6, 'v').hl(11, 11, 6, 'V').hl(11, 13, 6, 'u');
  Q.ell(24, 12, 3, 2, 'o').p(23, 11, 'Y').p(26, 12, 'O');
  Q.edge('k', ['r', 'R', 'v', 'V', 'u', 'o', 'Y', 'O']);
}));
const SIGN_BEACH = prop(32, 24, (P) => signBoard(P, 'a', 'i', 'W', 'חוף', (Q) => {
  // waves + sun
  for (let x = 3; x < 29; x += 4) Q.hl(x, 13, 2, 'W').hl(x + 2, 14, 2, 'l');
  for (let x = 5; x < 29; x += 4) Q.hl(x, 10, 2, 'W').hl(x + 2, 11, 2, 'l');
  Q.ell(26, 9, 2, 2, 'y').p(25, 8, 'Y');
}));
const SIGN_AYALON = prop(32, 24, (P) => signBoard(P, 'u', 'v', 'W', 'איילון', (Q) => {
  // highway shield + car
  Q.rect(2, 9, 8, 6, 'W').box(2, 9, 8, 6, 'k').hl(4, 11, 4, 'r').p(5, 12, 'r').p(6, 12, 'r');
  Q.rect(19, 12, 10, 3, 'R').rect(21, 10, 6, 2, 'R').hl(22, 10, 4, 'i');
  Q.p(20, 15, 'k').p(21, 15, 'k').p(26, 15, 'k').p(27, 15, 'k').p(28, 13, 'Y').p(19, 13, 'r');
  Q.edge('k', ['R', 'i']);
  Q.hl(12, 14, 6, 'W').p(13, 12, 'W').p(15, 12, 'W').p(17, 12, 'W');
}));
const SIGN_NEGEV = prop(32, 24, (P) => signBoard(P, 't', 'T', 'd', 'נגב', (Q) => {
  // camel silhouette + sun
  Q.rect(6, 12, 9, 2, 'd').rect(8, 10, 3, 2, 'd').rect(11, 10, 2, 1, 'd').p(4, 12, 'd').p(4, 11, 'd').p(3, 10, 'd').p(3, 11, 'd');
  Q.p(6, 14, 'd').p(7, 15, 'd').p(13, 14, 'd').p(14, 15, 'd').p(10, 14, 'd').p(10, 15, 'd');
  Q.ell(23, 11, 3, 3, 'o').ell(23, 11, 2, 2, 'y').p(22, 10, 'Y');
  Q.hl(18, 15, 12, 'B');
}));
const SIGN_JLM = prop(32, 24, (P) => signBoard(P, '4', '3', 'W', 'ירושלים', (Q) => {
  // golden dome + walls
  Q.ell(16, 12, 4, 3, 'Z').p(14, 10, 'Y').p(16, 8, 'Z').p(16, 7, 'k');
  Q.rect(9, 12, 14, 3, 'j').box(9, 12, 14, 3, 'X');
  Q.rect(5, 11, 3, 4, 'j').rect(24, 11, 3, 4, 'j');
  Q.p(5, 10, 'j').p(7, 10, 'j').p(24, 10, 'j').p(26, 10, 'j');
  Q.edge('k', ['Z', 'Y']);
  Q.hl(11, 13, 2, 'X').hl(19, 13, 2, 'X');
}));

export default {
  BAMBA, FALAFEL, HUMMUS, KREMBO, SHEKEL, HEART_FULL, HEART_EMPTY, CHECKPOINT_FLAG, EXIT_DOOR, ARROW_SIGN,
  UMBRELLA, LIFEGUARD_TOWER, CRATE, AWNING, PALM, CACTUS, LAMP, TRAFFIC_CONE, TENT, MENORAH, OLIVE_TREE, BENCH, BARREL,
  SIGN_SHUK, SIGN_BEACH, SIGN_AYALON, SIGN_NEGEV, SIGN_JLM,
};

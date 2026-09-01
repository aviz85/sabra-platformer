// SABRA! — parallax: "פקק באיילון" · Ayalon Highway at sunset.
// Contract: default export { sky, layers[], fog }. W=320, H=180, t = seconds.
// Rules: fillRect / drawImage at integer coords only, banded gradients (≥6px), no arcs, no createLinearGradient.
// Static parts are pre-rendered lazily (once) into offscreen canvases of width P=640 and blitted each frame;
// only the animated bits (cars, train, twinkling windows, clouds, blinking lamps, cat tails, mangal smoke) redraw.

const W = 320, H = 180, P = 640;
const EXTRA = 64; // extra rows below H in static canvases so a camY shift never exposes a gap

// ───────────────────────────── palette ─────────────────────────────
const C = {
  sky: ['#120c2a', '#1c1240', '#2e1a56', '#48225f', '#672a66', '#8b325f', '#ae3f52', '#cd5340', '#e76b33', '#f58838', '#fca540', '#ffc25a', '#ffd984'],
  sunGlow: '#ffcb62', sun: '#fff1b4', sunCore: '#ffffff', star: '#d9d0ff', starDim: '#8f86b8',
  cloudL: '#ff9a5c', cloudD: '#3c1d4f', cloudS: '#2a1341',
  farFar: '#83589a', far: '#6b4279', farWin: '#ffd58a', farBase: '#5d3a6e', farRail: '#4b2c5a', farHi: '#8e5f9c',
  mid: '#3d2349', midDark: '#31193d', midWin: '#ffb75a', midHi: '#5b3566', tv: '#8ad0ff', tv2: '#d8f2ff',
  concrete: '#514059', concreteHi: '#6f5b76', concreteSh: '#352739', ground3: '#2c2131',
  signGreen: '#1f6d3d', signGreenDk: '#144d2a', white: '#f6f4ec', post: '#2b2232', postHi: '#463a4d',
  road: '#2b2432', roadFar: '#332b3a', road2: '#231c29', lane: '#d2c69b', laneDim: '#8f8670',
  barrier: '#5d5063', barrierHi: '#80718a', barrierSh: '#3b3041',
  body: '#181322', roof: '#282040', win: '#4a3856', wheel: '#0a080f', silver: '#5a5066', silverRoof: '#6e6480',
  tail: '#ff3030', tailGlow: 'rgba(255,60,50,0.38)', head: '#fff6cc', headGlow: 'rgba(255,240,190,0.30)',
  taxi: '#f1c233', taxiRoof: '#ffd766', taxiDk: '#1a1408', bus: '#2d6f9e', busRoof: '#3f86b8', busWin: '#ffe28a',
  police: '#e4e4ee', policeRoof: '#f4f4fa', blue: '#3f70ff', red: '#ff3a3a',
  wolt: '#00c2e8', woltDk: '#0088a8', rider: '#1c1524', helmet: '#f0e0d0',
  bamba: '#e2472b', bambaDk: '#b8321c', bambaYel: '#ffd23f', skin: '#f6c9a8', cheek: '#f28a8a', hair: '#7a4a2a',
  cream: '#f1e9d6', creamDk: '#c9bfa6', ink: '#2b2232', pink: '#ff6ab0', cyan: '#4fe3ff', green: '#9dff6a',
  smoke: 'rgba(235,225,245,0.5)', dud: '#cfc9d6', dudDk: '#8f889a', panel: '#48659a', dish: '#a9a2b3',
};

// ───────────────────────────── helpers ─────────────────────────────
function mkCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function hash(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
function mod(a, b) { return ((a % b) + b) % b; }
// draw a string-art bitmap ('.' transparent) with fillRect runs; s = pixel scale
function blit(ctx, rows, pal, x, y, s = 1) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]; let i = 0;
    while (i < row.length) {
      const ch = row[i]; if (ch === '.') { i++; continue; }
      let run = 1; while (i + run < row.length && row[i + run] === ch) run++;
      ctx.fillStyle = pal[ch]; ctx.fillRect(x + i * s, y + j * s, run * s, s); i += run;
    }
  }
}
// stepped pixel disc (rows of fillRect — no arcs)
function disc(ctx, cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); R(ctx, cx - hw, cy + dy, 2 * hw + 1, 1, c); }
}

// ───────────────────────────── 5px pixel font (Hebrew + Latin + digits) ─────────────────────────────
const FONT = {
  'א': ['#..#', '##.#', '.##.', '#.##', '#..#'],
  'ב': ['###.', '...#', '...#', '...#', '####'],
  'ג': ['.##.', '..#.', '..#.', '.##.', '#..#'],
  'ד': ['####', '..#.', '..#.', '..#.', '..#.'],
  'ה': ['####', '...#', '#..#', '#..#', '#..#'],
  'ו': ['##', '.#', '.#', '.#', '.#'],
  'ז': ['###', '.#.', '.#.', '.#.', '.#.'],
  'ח': ['####', '#..#', '#..#', '#..#', '#..#'],
  'ט': ['#.##', '#..#', '#..#', '#..#', '.###'],
  'י': ['##', '.#', '..', '..', '..'],
  'כ': ['###.', '...#', '...#', '...#', '###.'],
  'ל': ['#...', '.###', '...#', '...#', '.##.'],
  'ם': ['####', '#..#', '#..#', '#..#', '####'],
  'מ': ['#..##', '##..#', '.#..#', '.#..#', '..###'],
  'נ': ['.##', '..#', '..#', '..#', '###'],
  'ס': ['####', '#..#', '#..#', '#..#', '.###'],
  'ע': ['#..#', '#..#', '.#.#', '..##', '###.'],
  'פ': ['####', '...#', '##.#', '...#', '####'],
  'צ': ['#..#', '#.#.', '.##.', '.#..', '####'],
  'ק': ['####', '#..#', '#..#', '#.##', '#...'],
  'ר': ['####', '...#', '...#', '...#', '...#'],
  'ש': ['#.#.#', '#.#.#', '#.#.#', '#.#.#', '#####'],
  'ת': ['####', '#..#', '#..#', '#..#', '##.#'],
  '״': ['#.#', '...', '...', '...', '...'],
  '♥': ['.#.#.', '#####', '#####', '.###.', '..#..'],
  '₪': ['###.#', '#.#.#', '#.#.#', '#.###', '#....'],
  ' ': ['..', '..', '..', '..', '..'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['###', '..#', '.##', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  ',': ['.', '.', '.', '#', '#'],
  '.': ['.', '.', '.', '.', '#'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '..#', '..#'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'], 'C': ['.##', '#..', '#..', '#..', '.##'],
  'D': ['##.', '#.#', '#.#', '#.#', '##.'], 'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
  'H': ['#.#', '#.#', '###', '#.#', '#.#'], 'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '.#.'],
  'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  'N': ['#..#', '##.#', '#.##', '#..#', '#..#'], 'O': ['###', '#.#', '#.#', '#.#', '###'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
  'R': ['##.', '#.#', '##.', '#.#', '#.#'], 'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
  'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'], 'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
};
function glyph(ch) { return FONT[ch] || FONT['?']; }
function textW(s, sc = 1) { let w = 0; for (const ch of s) w += glyph(ch)[0].length + 1; return (w - 1) * sc; }
// Hebrew: first char is the RIGHTMOST. xRight = inclusive right edge.
function textRTL(ctx, s, xRight, y, color, sc = 1) {
  let xr = xRight; const pal = { '#': color };
  for (const ch of s) { const g = glyph(ch); const gw = g[0].length * sc; blit(ctx, g, pal, xr - gw + 1, y, sc); xr -= gw + sc; }
}
function textLTR(ctx, s, xLeft, y, color, sc = 1) {
  let xl = xLeft; const pal = { '#': color };
  for (const ch of s) { const g = glyph(ch); blit(ctx, g, pal, xl, y, sc); xl += (g[0].length + 1) * sc; }
}

// ───────────────────────────── hand-drawn bitmaps ─────────────────────────────
export const BITMAPS = {
  cloudA: ['..........lllll...........', '.......lllddddlll.........', '....llldddddddddlll.......', '..llddddddddddddddlll.....', '.lddddddddddddddddddll....', '.ddddddddddddddddddddddl..', '..sddddddddddddddddddds...', '....sssssdddddddssss......'],
  cloudB: ['......llll........', '...llldddddll.....', '.llddddddddddll...', '.ddddddddddddddll.', '..sdddddddddddds..', '....ssssddsss.....'],
  arrowUp: ['..#..', '.###.', '#.#.#', '..#..', '..#..'],
  arrowUpR: ['.####', '...##', '..#.#', '.#...', '#....'],
  dud: ['..wwwwwww.', '.wwwwwwwww', '..kkkkkkk.', '.....pppp.', '....pppp..', '...pppp...', '..k.....k.'],
  dish: ['.gggg.', 'g....g', 'g..k.g', '.g..g.', '..gg..', '..k...', '..k...'],
  tank: ['.kkkkk.', 'kkkkkkk', 'kkkkkkk', 'kkkkkkk', '.k...k.'],
  antenna: ['.#.#.', '..#..', '.###.', '..#..', '..#..', '..#..', '..#..', '..#..'],
  cat0: ['#.#......', '###......', '####.....', '.######..', '.######..', '.######.#', '.#.##.###'],
  cat1: ['#.#.....#', '###.....#', '####....#', '.######.#', '.######.#', '.######.#', '.#.##.##.'],
  mangal: ['.ccccc.', '.kkkkk.', '..kkk..', '.k...k.'],
  baby: ['..hhhhh..', '.hhhhhhh.', '.sssssss.', 'ss.sss.ss', 'sssssssss', 'sccssscc.', 'ss.....ss', '.ss...ss.', '..sssss..'],
  house: ['...#...', '..###..', '.#####.', '#######', '.##.##.', '.##.##.'],
  carS: ['....rrrrr....', '...rwwrwwr...', 'hbbbbbbbbbbbt', 'hbbbbbbbbbbbt', 'bbbbbbbbbbbbb', '.kk.......kk.'],
  carL: ['......rrrrrrrrrr......', '.....rwwwwrwwwwwr.....', '....rwwwwwrwwwwwwr....', 'hhbbbbbbbbbbbbbbbbbbtt', 'hhbbbbbbbbbbbbbbbbbbtt', 'bbbbbbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbbbbbb', '.bbkkkkbbbbbbbbkkkkbb.', '..kkkkkk......kkkkkk..', '...kkkk........kkkk...'],
  // Dan bus — the 'DAN' livery text ('d') is baked into the bitmap; low-floor skirt between the wheels carries it.
  bus: ['.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bwwwwbwwwwbwwwwbwwwwbwwwwbwwwwbwwwwwbwwb', 'bwwwwbwwwwbwwwwbwwwwbwwwwbwwwwbwwwwwbwwb', 'hbbbbbbbbbbbbbbddbbbdbbdbbdbbbbbbbbbbbbt', 'hbbbbbbbbbbbbbbdbdbdbdbddbdbbbbbbbbbbbbt', 'bbbbbbbbbbbbbbbdbdbdddbdbddbbbbbbbbbbbbb', '.bbkkkkbbbbbbbbdbdbdbdbdbbdbbbbkkkkbbbb.', '..kkkkkkbbbbbbbddbbdbdbdbbdbbbkkkkkk....', '...kkkk........................kkkk.....'],
  scooter: ['.....hhh......', '....hhhh.bbbb.', '....rrr..bbbb.', '...rrrrr.bbbb.', '..rrrrrrrrrr..', '.kk.rrrr.kkk..', 'kkkk....kkkkk.', '.kk......kkk..'],
  tinyCar: ['.###.', '#####', '#####', '.#.#.'],
  lampHead: ['yyy', '.y.'],
  crane: ['##############', '#............#', '#.......#.....', '..............', '........#.....', '........#.....', '.......###....'],
  camera: ['kkkkkk', 'kwwwwk', 'kw.rwk', 'kkkkkk'],
  plane: ['..#.', '####', '..#.'],
};

// ───────────────────────────── shared bits ─────────────────────────────
const HORIZON = 118;
let skyOff = null;
const STARS = []; for (let i = 0; i < 26; i++) STARS.push({ x: Math.floor(hash(i * 3 + 1) * W), y: Math.floor(hash(i * 3 + 2) * 34), k: i });

function buildSky() {
  skyOff = mkCanvas(W, H);
  const o = skyOff.getContext('2d'); o.imageSmoothingEnabled = false;
  const hs = [12, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 8]; // = 118
  let y = 0;
  for (let i = 0; i < hs.length; i++) { R(o, 0, y, W, hs[i], C.sky[i]); y += hs[i]; }
  R(o, 0, HORIZON, W, H - HORIZON, C.sky[12]);
  // horizon glow band (banded, no gradient)
  R(o, 0, 96, W, 6, '#f89a3c'); R(o, 0, 102, W, 8, '#feb44a');
  // sun with 2 stepped glow rings
  R(o, 130, 74, 120, 8, 'rgba(255,190,90,0.22)'); R(o, 120, 82, 140, 8, 'rgba(255,170,80,0.22)'); R(o, 100, 90, 180, 6, 'rgba(255,160,80,0.18)');
  disc(o, 190, 84, 21, '#ffb04c');
  disc(o, 190, 84, 17, C.sunGlow);
  disc(o, 190, 84, 13, C.sun);
  disc(o, 190, 84, 8, C.sunCore);
  // thin dark "sunset stripes" across the sun (classic pixel sunset)
  R(o, 166, 79, 48, 1, 'rgba(120,40,80,0.35)'); R(o, 164, 87, 52, 1, 'rgba(120,40,80,0.35)'); R(o, 168, 94, 44, 1, 'rgba(120,40,80,0.3)');
}

const CLOUDS = [
  { bm: 'cloudA', y: 22, base: 30, v: 3.0 },
  { bm: 'cloudB', y: 46, base: 170, v: 2.2 },
  { bm: 'cloudB', y: 60, base: 290, v: 1.6 },
  { bm: 'cloudA', y: 74, base: 100, v: 1.2 },
];
const CLOUD_PAL = { l: C.cloudL, d: C.cloudD, s: C.cloudS };

function sky(ctx, w, h, t) {
  if (!skyOff) buildSky();
  ctx.drawImage(skyOff, 0, 0);
  // stars (twinkle)
  const tk = Math.floor(t * 2);
  for (const s of STARS) {
    const v = hash(s.k * 17 + tk);
    if (v < 0.25) continue;
    R(ctx, s.x, s.y, 1, 1, v > 0.8 ? C.star : C.starDim);
  }
  // clouds drift from right to left, wrap every W+40
  for (const c of CLOUDS) {
    const bm = BITMAPS[c.bm]; const cw = bm[0].length; const per = W + cw + 20;
    const x = Math.floor(mod(c.base - t * c.v, per)) - cw;
    blit(ctx, bm, CLOUD_PAL, x, c.y);
  }
  // a plane on approach to Ben Gurion every 40 s, blinking light
  const pp = mod(t, 40);
  if (pp < 12) {
    const px = Math.floor(W + 10 - pp * 30), py = 14 + Math.floor(pp * 0.8);
    blit(ctx, BITMAPS.plane, { '#': '#c9bde0' }, px, py);
    if (Math.floor(t * 4) % 2 === 0) R(ctx, px + 3, py + 1, 1, 1, C.red);
  }
}

// ───────────────────────────── layer factory ─────────────────────────────
function makeLayer(speed, paint, dynamic) {
  let off = null;
  return {
    speed,
    draw(ctx, camX, camY, w, h, t) {
      if (!off) {
        off = mkCanvas(P, H + EXTRA);
        const o = off.getContext('2d'); o.imageSmoothingEnabled = false;
        for (const sh of [-P, 0, P]) { o.save(); o.translate(sh, 0); paint(o); o.restore(); } // wrap edges
      }
      const ox = -mod(Math.floor(camX * speed), P); // (-P, 0]
      // Vertical parallax is clamped to 8 px (like telaviv.js): at ground level (camY≈76) the near lane
      // stays BELOW the road tiles and only shows inside pits — "the Ayalon underneath" — never on the play line.
      const dy = Math.max(-8, Math.min(8, -Math.round(camY * speed * 0.3)));
      ctx.drawImage(off, ox, dy);
      if (ox + P < W) ctx.drawImage(off, ox + P, dy);
      if (!dynamic) return;
      // k = copy index; full-width overlays draw only for k === 0 so they never double up when both copies are on screen
      for (let k = 0; k < 2; k++) {
        const bx = ox + k * P;
        if (bx >= W) continue;
        ctx.save(); ctx.translate(bx, dy); dynamic(ctx, t, bx, k); ctx.restore();
      }
    },
  };
}
// visible test for an element at local x (width w) given copy base bx
const vis = (bx, x, w) => bx + x + w > 0 && bx + x < W;

// ───────────────────────────── L1 · far skyline (0.05) ─────────────────────────────
const FARFAR = [[0, 30, 22], [70, 20, 30], [150, 34, 18], [268, 22, 26], [318, 26, 16], [370, 26, 22], [540, 20, 30], [600, 30, 18]];
const FAR = [
  { x: 6, w: 72, h: 12 },                // Azrieli mall base
  { x: 12, w: 18, h: 56, cap: 'round' }, { x: 36, w: 16, h: 62, cap: 'edge' }, { x: 58, w: 16, h: 48 },  // round / triangle / square
  { x: 84, w: 12, h: 26 }, { x: 104, w: 14, h: 66, cap: 'antenna' }, // Moshe Aviv tower
  { x: 126, w: 16, h: 74, cap: 'step' },  // Azrieli Sarona — tallest
  { x: 150, w: 22, h: 30, cap: 'crane' },
  { x: 180, w: 14, h: 24 }, { x: 200, w: 20, h: 18 }, { x: 226, w: 12, h: 28 }, { x: 244, w: 14, h: 22 }, // low blocks behind the sun
  { x: 264, w: 16, h: 36 }, { x: 286, w: 12, h: 44, cap: 'antenna' }, { x: 304, w: 22, h: 26 }, { x: 332, w: 14, h: 38 }, { x: 352, w: 18, h: 30 }, { x: 376, w: 12, h: 42 }, { x: 394, w: 20, h: 22 },
  { x: 430, w: 18, h: 40 }, { x: 454, w: 12, h: 48, cap: 'antenna' }, { x: 472, w: 10, h: 26 }, { x: 500, w: 20, h: 24 }, { x: 526, w: 14, h: 32 },
  { x: 596, w: 16, h: 38, cap: 'antenna' }, { x: 616, w: 14, h: 30 }, { x: 634, w: 10, h: 22 },
];
const WIN1 = [];

function paintFar(o) {
  R(o, 0, HORIZON, P, H + EXTRA - HORIZON, C.farBase);
  for (const [x, w, h] of FARFAR) R(o, x, HORIZON - h, w, h, C.farFar);
  for (const b of FAR) {
    const top = HORIZON - b.h;
    R(o, b.x, top, b.w, b.h, C.far);
    if (b.cap === 'step') { R(o, b.x + 2, top - 6, b.w - 4, 6, C.far); R(o, b.x + 5, top - 10, b.w - 10, 4, C.far); R(o, b.x + 7, top - 18, 1, 8, C.far); }
    if (b.cap === 'antenna') { R(o, b.x + (b.w >> 1), top - 9, 1, 9, C.far); }
    if (b.cap === 'round') { R(o, b.x + b.w - 3, top, 2, b.h, C.farHi); R(o, b.x + 2, top, 1, b.h, '#5f3a6d'); }
    if (b.cap === 'edge') { R(o, b.x + (b.w >> 1), top, 1, b.h, C.farHi); R(o, b.x, top - 1, b.w, 1, C.farHi); }
    if (b.cap === 'crane') { blit(o, BITMAPS.crane, { '#': C.far }, b.x + 4, top - 8); }
    if (b.h > 12 && b.cap !== 'round') {
      for (let wy = top + 3; wy < HORIZON - 3; wy += 4) for (let wx = b.x + 2; wx < b.x + b.w - 1; wx += 3) {
        if (hash(wx * 7 + wy * 13) > 0.58) { R(o, wx, wy, 1, 1, C.farWin); WIN1.push({ x: wx, y: wy }); }
      }
    } else if (b.cap === 'round') {
      for (let wy = top + 3; wy < HORIZON - 3; wy += 4) for (let wx = b.x + 3; wx < b.x + b.w - 4; wx += 3) {
        if (hash(wx * 5 + wy * 11) > 0.5) { R(o, wx, wy, 1, 1, C.farWin); WIN1.push({ x: wx, y: wy }); }
      }
    }
  }
  // distant tail-light river at the horizon
  for (let x = 0; x < P; x += 3) { const v = hash(x * 3.1); if (v > 0.35) R(o, x, HORIZON - 2 + (v > 0.7 ? 1 : 0), 2, 1, v > 0.8 ? '#ff5a3a' : '#c23a3a'); }
}
// twinkle sets are re-rolled only when their tick changes (every 24 frames) — not per window per frame
let win1Tick = -1; const win1Dark = [];
function dynFar(ctx, t, bx) {
  // twinkling windows: a handful go dark each tick
  const tk = Math.floor(t * 2.5);
  if (tk !== win1Tick) { win1Tick = tk; win1Dark.length = 0; for (let i = 0; i < WIN1.length; i++) if (hash(i * 31 + tk * 7) < 0.14) win1Dark.push(WIN1[i]); }
  for (const wn of win1Dark) if (vis(bx, wn.x, 1)) R(ctx, wn.x, wn.y, 1, 1, C.far);
  // antenna beacons
  const blink = Math.floor(t * 1.5) % 2 === 0;
  for (const b of FAR) if (b.cap === 'antenna' && vis(bx, b.x, b.w)) R(ctx, b.x + (b.w >> 1), HORIZON - b.h - 9, 1, 1, blink ? C.red : '#7a2a3a');
  if (vis(bx, 126, 16)) R(ctx, 133, HORIZON - 74 - 18, 1, 1, blink ? '#7a2a3a' : C.red);
  // twinkle the tail-light river
  for (let i = 0; i < 10; i++) { const x = Math.floor(hash(i * 9 + tk * 3) * P); if (vis(bx, x, 2)) R(ctx, x, HORIZON - 2 + (i & 1), 2, 1, '#ff7a4a'); }
}

// ───────────────────────────── L2 · rooftops (0.2) ─────────────────────────────
const MID = [
  [0, 28, 30, 0], [34, 18, 36, 1], [58, 26, 22, 0], [92, 22, 30, 0], [120, 30, 18, 1], [156, 16, 26, 0], [178, 24, 22, 0],
  [210, 20, 20, 1], [238, 28, 34, 0], [272, 18, 38, 1],
  // ── gap 296..410: the Ayalon train bridge ──
  [416, 32, 26, 0], [454, 20, 34, 1], [480, 26, 20, 0], [512, 24, 32, 0], [542, 18, 24, 1], [566, 30, 30, 0], [602, 22, 28, 0], [630, 14, 18, 1],
];
const BRIDGE = { l: 296, r: 410, y: 104 };
const MIDBASE = 128;
const WIN2 = [];
const DUD_PAL = { w: C.dud, k: C.dudDk, p: C.panel };
const DISH_PAL = { g: C.dish, k: C.dudDk };
const CAT_PAL = { '#': '#1a1224' };
const MANGAL_PAL = { c: '#ff6a2a', k: '#1c1524' };
const MID_PROPS = [ // [buildingIndex, kind, dx]
  [0, 'dud', 4], [0, 'dish', 20], [1, 'tank', 5], [1, 'antenna', 13], [2, 'dud', 10], [3, 'laundry', 3], [5, 'antenna', 5], [6, 'dud', 2], [6, 'dud', 13],
  [7, 'dish', 14], [8, 'tank', 4], [8, 'dish', 18], [9, 'antenna', 6],
  [10, 'dud', 2], [10, 'dud', 12], [10, 'tank', 24], [11, 'antenna', 8], [12, 'laundry', 2], [13, 'dud', 6], [13, 'dish', 17], [14, 'dud', 6],
  [15, 'dud', 3], [15, 'tank', 20], [16, 'dish', 6], [16, 'dud', 12],
];
const CAT_ROOF = 4;   // MID index where the cat sits
const MANGAL_ROOF = 12;
function midTop(i) { return MIDBASE - MID[i][2]; }
function paintMid(o) {
  R(o, 0, MIDBASE, P, H + EXTRA - MIDBASE, C.mid);
  for (let i = 0; i < MID.length; i++) {
    const [x, w, h, dk] = MID[i]; const top = MIDBASE - h; const col = dk ? C.midDark : C.mid;
    R(o, x, top, w, h, col);
    R(o, x + w - 1, top, 1, h, C.midHi); // sunlit right edge (sun is to the right/behind)
    R(o, x, top, w, 1, C.midHi);
    for (let wy = top + 4; wy < MIDBASE - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      const v = hash(wx * 3 + wy * 17 + i);
      if (v > 0.5) { const tv = v > 0.9; R(o, wx, wy, 2, 1, tv ? C.tv : C.midWin); WIN2.push({ x: wx, y: wy, tv, col }); }
    }
  }
  // Ayalon train bridge across the gap (far skyline shows through underneath)
  R(o, BRIDGE.l - 2, BRIDGE.y, BRIDGE.r - BRIDGE.l + 4, 1, C.midHi); R(o, BRIDGE.l - 2, BRIDGE.y + 1, BRIDGE.r - BRIDGE.l + 4, 4, C.midDark); R(o, BRIDGE.l - 2, BRIDGE.y + 5, BRIDGE.r - BRIDGE.l + 4, 1, '#22112c');
  for (let x = BRIDGE.l + 2; x < BRIDGE.r; x += 38) { R(o, x, BRIDGE.y + 6, 6, MIDBASE - BRIDGE.y - 6, C.midDark); R(o, x + 5, BRIDGE.y + 6, 1, MIDBASE - BRIDGE.y - 6, C.midHi); }
  R(o, BRIDGE.l, BRIDGE.y - 5, BRIDGE.r - BRIDGE.l, 1, C.midDark); for (let x = BRIDGE.l; x < BRIDGE.r; x += 4) R(o, x, BRIDGE.y - 5, 1, 5, C.midDark);
  R(o, BRIDGE.l + 20, BRIDGE.y - 7, 1, 2, C.midDark); R(o, BRIDGE.l + 20, BRIDGE.y - 7, 6, 1, C.midDark); // catenary mast
  for (const [bi, kind, dx] of MID_PROPS) {
    const [x] = MID[bi]; const top = midTop(bi);
    if (kind === 'dud') blit(o, BITMAPS.dud, DUD_PAL, x + dx, top - 7);
    else if (kind === 'dish') blit(o, BITMAPS.dish, DISH_PAL, x + dx, top - 7);
    else if (kind === 'tank') blit(o, BITMAPS.tank, { k: C.midDark }, x + dx, top - 5);
    else if (kind === 'antenna') blit(o, BITMAPS.antenna, { '#': C.midDark }, x + dx, top - 8);
    else if (kind === 'laundry') {
      R(o, x + dx, top - 7, 1, 7, C.midDark); R(o, x + dx + 16, top - 7, 1, 7, C.midDark); R(o, x + dx, top - 6, 17, 1, '#6a5a70');
      const cols = ['#e0e8ff', '#ffb0c8', '#9fe0a0', '#ffe28a'];
      for (let k = 0; k < 4; k++) R(o, x + dx + 2 + k * 4, top - 5, 3, 3 + (k & 1), cols[k]);
    }
  }
  // the mangal (BBQ) sits on the roof — smoke is dynamic
  { const [x] = MID[MANGAL_ROOF]; blit(o, BITMAPS.mangal, MANGAL_PAL, x + 19, midTop(MANGAL_ROOF) - 4); }
}
let tvTick = -1; const tvBright = [];   // TV screens flickering this tick (t*8)
let win2Tick = -1; const win2Dark = [];  // windows switched off this tick (t*1.5)
function dynMid(ctx, t, bx) {
  const tk = Math.floor(t * 8), dk = Math.floor(t * 1.5);
  if (tk !== tvTick) { tvTick = tk; tvBright.length = 0; for (let i = 0; i < WIN2.length; i++) if (WIN2[i].tv && hash(i + tk) > 0.5) tvBright.push(WIN2[i]); }
  if (dk !== win2Tick) { win2Tick = dk; win2Dark.length = 0; for (let i = 0; i < WIN2.length; i++) if (!WIN2[i].tv && hash(i * 13 + dk * 5) < 0.08) win2Dark.push(WIN2[i]); }
  for (const wn of tvBright) if (vis(bx, wn.x, 2)) R(ctx, wn.x, wn.y, 2, 1, C.tv2);
  for (const wn of win2Dark) if (vis(bx, wn.x, 2)) R(ctx, wn.x, wn.y, 2, 1, wn.col);
  // cat on a roof edge, tail flicks
  { const [x, w] = MID[CAT_ROOF]; const top = midTop(CAT_ROOF);
    if (vis(bx, x, w)) { blit(ctx, Math.floor(t * 1.3) % 2 ? BITMAPS.cat1 : BITMAPS.cat0, CAT_PAL, x + w - 14, top - 7); R(ctx, x + w - 14 + 1, top - 5, 1, 1, C.green); } }
  // mangal smoke puffs rising
  { const [x] = MID[MANGAL_ROOF]; const top = midTop(MANGAL_ROOF);
    if (vis(bx, x, 20)) for (let k = 0; k < 3; k++) {
      const ph = mod(t * 0.45 + k * 0.33, 1); const sy = top - 7 - Math.floor(ph * 26); const sx = x + 20 + Math.floor(Math.sin(t * 1.4 + k * 2) * 3) + k;
      const sz = ph < 0.4 ? 2 : ph < 0.75 ? 3 : 4; if (ph < 0.92) R(ctx, sx, sy, sz, sz, ph < 0.6 ? C.smoke : 'rgba(230,220,240,0.18)');
    } }
  // the train: every 16 s, 4.5 s crossing, alternating direction
  const cyc = Math.floor(t / 16), ph = mod(t, 16);
  if (ph < 4.5 && vis(bx, BRIDGE.l, BRIDGE.r - BRIDGE.l)) {
    const len = 52, p = ph / 4.5, span = BRIDGE.r - BRIDGE.l + len;
    const dir = cyc % 2 === 0 ? 1 : -1;
    const x = Math.floor(dir > 0 ? BRIDGE.l - len + p * span : BRIDGE.r - p * span);
    ctx.save(); ctx.beginPath(); ctx.rect(BRIDGE.l, 0, BRIDGE.r - BRIDGE.l, H + EXTRA); ctx.clip();
    const y = BRIDGE.y - 6;
    R(ctx, x, y, len, 6, '#9c88ad'); R(ctx, x, y, len, 1, '#b8a4c8'); R(ctx, x, y + 5, len, 1, '#6e5a80');
    for (let wx = x + 2; wx < x + len - 2; wx += 4) R(ctx, wx, y + 2, 2, 2, C.midWin);
    R(ctx, x + 25, y, 2, 6, '#6e5a80'); // two-car split
    R(ctx, dir > 0 ? x + len - 1 : x, y + 2, 1, 2, C.head); R(ctx, dir > 0 ? x : x + len - 1, y + 2, 1, 2, C.tail);
    ctx.restore();
  }
  // rooftop lamp blinking on the tallest one
  if (vis(bx, 272, 18)) R(ctx, 280, midTop(9) - 9, 1, 1, Math.floor(t * 2) % 2 ? C.red : '#5a2030');
}

// ───────────────────────────── L3 · overpass, signs, billboards (0.4) ─────────────────────────────
const WALL = 128;
function sign(o, x, y, w, he, en, arrow) {
  R(o, x, y, w, 18, C.white); R(o, x + 1, y + 1, w - 2, 16, C.signGreen); R(o, x + 1, y + 16, w - 2, 1, C.signGreenDk);
  textRTL(o, he, x + w - 4, y + 3, C.white); textLTR(o, en, x + w - 3 - textW(en), y + 10, C.white);
  blit(o, BITMAPS[arrow], { '#': C.white }, x + 3, y + 6);
}
function gantryPost(o, x, top) { R(o, x, top, 3, WALL - top, C.post); R(o, x, top, 1, WALL - top, C.postHi); }
function paintOverpass(o) {
  // retaining wall + ground
  R(o, 0, WALL, P, 1, C.concreteHi); R(o, 0, WALL + 1, P, 5, C.concrete); R(o, 0, WALL + 6, P, 2, C.concreteSh);
  R(o, 0, WALL + 8, P, H + EXTRA - WALL - 8, C.ground3);
  for (let x = 0; x < P; x += 40) R(o, x, WALL + 1, 1, 5, C.concreteSh); // wall segments
  // graffiti
  textRTL(o, 'יאללה', 190, WALL + 1, C.pink);
  textRTL(o, 'אני ♥ ת״א', 336, WALL + 1, C.cyan);
  textRTL(o, 'פקק?', 590, WALL + 1, C.bambaYel);
  textRTL(o, 'סבבה!', 458, WALL + 1, C.green);
  // overpass deck with pillars
  const dl = 90, dr = 300, dy = 62;
  R(o, dl, dy, dr - dl, 2, C.roadFar); R(o, dl, dy + 2, dr - dl, 7, C.concrete); R(o, dl, dy + 9, dr - dl, 2, C.concreteSh); R(o, dl, dy + 4, dr - dl, 1, C.concreteHi);
  R(o, dl, dy - 6, dr - dl, 1, C.post); for (let x = dl; x < dr; x += 6) R(o, x, dy - 6, 1, 6, C.post);
  for (const px of [116, 262]) { R(o, px, dy + 11, 12, WALL - dy - 11, C.concrete); R(o, px + 10, dy + 11, 2, WALL - dy - 11, C.concreteHi); R(o, px, dy + 11, 2, WALL - dy - 11, C.concreteSh); }
  // tiny jammed cars on the deck + lamp post
  for (let x = dl + 6, k = 0; x < dr - 8; x += 17, k++) { const tx = hash(k + 900) > 0.7; blit(o, BITMAPS.tinyCar, { '#': tx ? C.taxi : k % 3 === 1 ? C.silver : C.body }, x, dy - 4); R(o, x + 4, dy - 2, 1, 1, C.tail); }
  R(o, 195, dy - 26, 1, 20, C.post); R(o, 195, dy - 26, 5, 1, C.post); blit(o, BITMAPS.lampHead, { y: C.bambaYel }, 199, dy - 26);
  // Billboard A — Bamba
  { const x = 10, y = 80; R(o, 44, y + 32, 3, WALL - y - 32, C.post); R(o, 44, y + 32, 1, WALL - y - 32, C.postHi);
    R(o, x, y, 68, 32, C.post); R(o, x + 1, y + 1, 66, 30, C.bamba); R(o, x + 1, y + 26, 66, 5, C.bambaDk);
    blit(o, BITMAPS.baby, { h: C.hair, s: C.skin, c: C.cheek }, x + 5, y + 4, 2);
    textRTL(o, 'במבה', x + 64, y + 4, C.bambaYel, 2);
    textRTL(o, 'הכי טעים בפקק!', x + 65, y + 17, C.white);
    for (let k = 0; k < 3; k++) R(o, x + 12 + k * 22, y - 3, 3, 3, C.post); }
  // Billboard B — real estate
  { const x = 330, y = 86; R(o, 363, y + 30, 3, WALL - y - 30, C.post); R(o, 363, y + 30, 1, WALL - y - 30, C.postHi);
    R(o, x, y, 70, 30, C.post); R(o, x + 1, y + 1, 68, 28, C.cream); R(o, x + 1, y + 1, 68, 8, C.bus);
    textRTL(o, 'דירה בת״א', x + 66, y + 2, C.white);
    blit(o, BITMAPS.house, { '#': C.ink }, x + 4, y + 12);
    textRTL(o, 'רק', x + 66, y + 12, C.bambaDk);
    textLTR(o, '₪9,999,999', x + 14, y + 12, C.ink);
    textRTL(o, 'בלי חניה', x + 66, y + 21, C.creamDk); }
  // gantry 1 — Jerusalem
  gantryPost(o, 470, 74); R(o, 412, 74, 60, 3, C.post); R(o, 412, 74, 60, 1, C.postHi);
  sign(o, 414, 78, 56, 'ירושלים', 'JERUSALEM', 'arrowUpR');
  // gantry 2 — Tel Aviv centre / Haifa
  gantryPost(o, 600, 70); R(o, 498, 70, 105, 3, C.post); R(o, 498, 70, 105, 1, C.postHi);
  sign(o, 502, 74, 52, 'ת״א מרכז', 'TEL AVIV', 'arrowUp');
  sign(o, 558, 74, 40, 'חיפה', 'HAIFA', 'arrowUp');
  // sodium street lamps with warm light pools on the wall
  for (const lx of [84, 396, 632]) {
    R(o, lx, 86, 1, WALL - 86, C.post); R(o, lx, 86, 4, 1, C.post); blit(o, BITMAPS.lampHead, { y: C.bambaYel }, lx + 3, 86);
    R(o, lx - 3, 90, 12, 14, 'rgba(255,200,110,0.07)'); R(o, lx - 6, 104, 18, 14, 'rgba(255,200,110,0.09)'); R(o, lx - 9, 118, 24, 12, 'rgba(255,200,110,0.12)');
  }
  // speed camera (flashes on jammed cars, of course)
  R(o, 618, 100, 2, WALL - 100, C.post); blit(o, BITMAPS.camera, { k: C.post, w: '#8a7a92', r: '#5a1a1a' }, 616, 96);
}
function dynOverpass(ctx, t, bx) {
  // billboard lamps flicker
  const f = Math.floor(t * 9);
  if (vis(bx, 10, 68)) for (let k = 0; k < 3; k++) { const on = hash(k + f) > 0.15; R(ctx, 22 + k * 22, 78, 3, 1, on ? C.bambaYel : '#6a4a2a'); if (on) R(ctx, 21 + k * 22, 80, 5, 1, 'rgba(255,220,120,0.25)'); }
  // speed-camera red LED + rare white flash
  if (vis(bx, 616, 6)) {
    R(ctx, 620, 98, 1, 1, Math.floor(t * 2) % 2 ? C.red : '#5a1a1a');
    if (mod(t, 7) < 0.12) { R(ctx, 613, 95, 12, 8, '#ffffff'); R(ctx, 600, 90, 40, 40, 'rgba(255,255,255,0.28)'); }
  }
  // lamp glow on overpass
  if (vis(bx, 190, 12)) R(ctx, 197, 38, 7, 2, Math.floor(t * 30) % 20 === 0 ? 'rgba(255,220,100,0.15)' : 'rgba(255,220,100,0.35)');
}

// ───────────────────────────── traffic helpers ─────────────────────────────
const CAR_PALS = {
  dark: { r: C.roof, w: C.win, b: C.body, k: C.wheel, t: C.tail, h: C.head },
  silver: { r: C.silverRoof, w: C.win, b: C.silver, k: C.wheel, t: C.tail, h: C.head },
  taxi: { r: C.taxiRoof, w: C.win, b: C.taxi, k: C.wheel, t: C.tail, h: C.head },
  police: { r: C.policeRoof, w: C.win, b: C.police, k: C.wheel, t: C.tail, h: C.head },
  bus: { r: C.busRoof, w: C.busWin, b: C.bus, k: C.wheel, t: C.tail, h: C.head },
};
// stop-and-go position: monotonic (never reverses), lurches
function jamX(base, v, t, phase) { return mod(base - v * (t + 0.8 * Math.sin(t * 0.9 + phase)), P); }

// ───────────────────────────── L4 · far lanes (0.65) ─────────────────────────────
const ROAD4 = 134;
const LANE_A = [], LANE_B = [];
for (let i = 0; i < 9; i++) LANE_A.push({ base: i * 71 + Math.floor(hash(i + 100) * 26), kind: hash(i + 200) > 0.7 ? 'silver' : hash(i + 300) > 0.8 ? 'taxi' : 'dark' });
for (let i = 0; i < 8; i++) LANE_B.push({ base: i * 80 + Math.floor(hash(i + 400) * 30), kind: i === 3 ? 'bus' : hash(i + 500) > 0.75 ? 'taxi' : 'dark' });
function paintRoadFar(o) {
  R(o, 0, ROAD4, P, 1, C.laneDim); R(o, 0, ROAD4 + 1, P, 16, C.roadFar);
  for (let x = 0; x < P; x += 16) R(o, x, ROAD4 + 8, 8, 1, C.laneDim);
  R(o, 0, ROAD4 + 17, P, H + EXTRA - ROAD4 - 17, C.road);
  R(o, 0, ROAD4, P, 17, 'rgba(255,70,45,0.10)'); // jam glow bed
}
function drawSmallCar(ctx, x, y, kind) {
  const pal = CAR_PALS[kind] || CAR_PALS.dark;
  if (kind === 'bus') { R(ctx, x, y - 2, 26, 8, C.bus); R(ctx, x, y - 2, 26, 1, C.busRoof); for (let k = 1; k < 25; k += 3) R(ctx, x + k, y, 2, 2, C.busWin); R(ctx, x + 25, y + 3, 1, 2, C.tail); R(ctx, x, y + 3, 1, 2, C.head); R(ctx, x + 2, y + 6, 3, 1, C.wheel); R(ctx, x + 21, y + 6, 3, 1, C.wheel); return 26; }
  blit(ctx, BITMAPS.carS, pal, x, y); return 13;
}
function dynRoadFar(ctx, t, bx) {
  ctx.save(); ctx.globalAlpha *= 0.62;
  for (const c of LANE_A) { const x = Math.floor(jamX(c.base, 10, t, 0)); if (!vis(bx, x - 2, 30)) continue; R(ctx, x + 13, ROAD4 + 3, 3, 2, C.tailGlow); drawSmallCar(ctx, x, ROAD4 + 1, c.kind); }
  for (const c of LANE_B) { const x = Math.floor(jamX(c.base, 14, t, 2)); if (!vis(bx, x - 2, 30)) continue; const w = drawSmallCar(ctx, x, ROAD4 + 9, c.kind); R(ctx, x + w, ROAD4 + 11, 4, 2, C.tailGlow); R(ctx, x - 5, ROAD4 + 11, 5, 2, C.headGlow); R(ctx, x + w - 3, ROAD4 + 15, 4, 1, 'rgba(255,50,40,0.25)'); }
  // haze on top of the far lanes (thicker when cars are jammed)
  R(ctx, -bx, ROAD4, W, 17, 'rgba(255,90,50,0.07)');
  ctx.restore();
}

// ───────────────────────────── L5 · near lane + barrier (0.85) ─────────────────────────────
const BAR = 148;
const NEAR = [
  { base: 20, kind: 'dark' }, { base: 110, kind: 'taxi' }, { base: 200, kind: 'silver' }, { base: 280, kind: 'bus' },
  { base: 380, kind: 'police' }, { base: 460, kind: 'dark' }, { base: 540, kind: 'taxi' },
];
function paintRoadNear(o) {
  R(o, 0, BAR, P, 1, C.barrierHi); R(o, 0, BAR + 1, P, 4, C.barrier); R(o, 0, BAR + 5, P, 1, C.barrierSh);
  for (let x = 0; x < P; x += 32) { R(o, x, BAR + 1, 1, 4, C.barrierSh); R(o, x + 15, BAR + 2, 2, 2, C.bambaYel); }
  R(o, 0, BAR + 6, P, 1, C.lane);
  R(o, 0, BAR + 7, P, H + EXTRA - BAR - 7, C.road2);
  for (let x = 0; x < P; x += 20) R(o, x, BAR + 22, 10, 1, C.lane);
  R(o, 0, BAR + 6, P, 18, 'rgba(255,70,45,0.08)');
  // a cat on the barrier, static body (its tail is animated)
  blit(o, BITMAPS.cat0, CAT_PAL, 300, BAR - 7);
}
function drawBigCar(ctx, x, y, kind, t) {
  const pal = CAR_PALS[kind] || CAR_PALS.dark;
  if (kind === 'bus') { blit(ctx, BITMAPS.bus, pal, x, y); textLTR(ctx, 'DAN', x + 15, y + 5, C.taxi); return 40; }
  blit(ctx, BITMAPS.carL, pal, x, y);
  if (kind === 'taxi') { for (let k = 0; k < 20; k += 2) R(ctx, x + 1 + k, y + 5 + (k & 2 ? 1 : 0), 1, 1, C.taxiDk); R(ctx, x + 9, y - 2, 5, 2, C.taxi); R(ctx, x + 10, y - 2, 1, 2, C.taxiDk); R(ctx, x + 12, y - 2, 1, 2, C.taxiDk); }
  if (kind === 'police') { const b = Math.floor(t * 6) % 2; R(ctx, x + 8, y - 2, 3, 2, b ? C.blue : '#1a2a60'); R(ctx, x + 11, y - 2, 3, 2, b ? '#601a1a' : C.red); R(ctx, x + 4, y + 5, 14, 1, C.blue); if (b) R(ctx, x - 6, y - 8, 34, 18, 'rgba(70,110,255,0.10)'); else R(ctx, x - 6, y - 8, 34, 18, 'rgba(255,60,60,0.10)'); }
  return 22;
}
function dynRoadNear(ctx, t, bx) {
  ctx.save(); ctx.globalAlpha *= 0.62;
  const y = BAR + 8;
  for (const c of NEAR) {
    const x = Math.floor(jamX(c.base, 19, t, 4)); if (!vis(bx, x - 14, 70)) continue;
    const w = drawBigCar(ctx, x, y, c.kind, t);
    R(ctx, x + w, y + 3, 7, 2, C.tailGlow); R(ctx, x + w + 7, y + 3, 5, 2, 'rgba(255,60,50,0.16)');
    R(ctx, x - 12, y + 3, 12, 2, C.headGlow); R(ctx, x - 22, y + 4, 10, 1, 'rgba(255,240,190,0.12)');
    R(ctx, x + w - 4, y + 10, 5, 1, 'rgba(255,50,40,0.35)'); R(ctx, x - 3, y + 10, 6, 1, 'rgba(255,240,190,0.18)');
  }
  // the Wolt scooter weaving through the jam at full speed
  { const x = Math.floor(mod(700 - 125 * t, P)); const wy = y + 2 + Math.round(Math.sin(t * 6) * 1.5);
    if (vis(bx, x - 10, 40)) { blit(ctx, BITMAPS.scooter, { h: C.helmet, r: C.rider, b: C.wolt, k: C.wheel }, x, wy); R(ctx, x + 10, wy + 2, 2, 1, C.woltDk); R(ctx, x + 14, wy + 5, 8, 1, 'rgba(0,200,240,0.22)'); R(ctx, x - 3, wy + 5, 3, 1, C.head); } }
  // brake-light pulse over the jam
  R(ctx, -bx, BAR + 6, W, 18, `rgba(255,50,30,${(0.05 + 0.04 * Math.sin(t * 2.2)).toFixed(3)})`);
  // reflective markers blink as headlights sweep them
  const tk = Math.floor(t * 6);
  for (let x = 15; x < P; x += 32) if (vis(bx, x, 2)) { const v = hash(x + tk); R(ctx, x, BAR + 2, 2, 2, v > 0.8 ? '#ffffff' : v > 0.5 ? C.bambaYel : '#b08a20'); }
  // cat on barrier — tail flick
  if (vis(bx, 300, 10)) { blit(ctx, Math.floor(t * 1.7) % 2 ? BITMAPS.cat1 : BITMAPS.cat0, CAT_PAL, 300, BAR - 7); R(ctx, 301, BAR - 5, 1, 1, C.green); }
  ctx.restore();
}

// ───────────────────────────── fog · exhaust haze ─────────────────────────────
const HAZE = [[112, 6, 0.05], [118, 6, 0.08], [124, 6, 0.11], [130, 6, 0.12], [136, 6, 0.10], [142, 6, 0.08], [148, 6, 0.05]];
function fog(ctx, w, h, t) {
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.3);
  for (const [y, hh, a] of HAZE) R(ctx, 0, y, W, hh, `rgba(255,150,90,${(a * pulse).toFixed(3)})`);
  // a faint warm dusk tint on everything above the horizon (very subtle)
  R(ctx, 0, 0, W, 60, 'rgba(40,10,60,0.06)');
}

export default {
  sky,
  layers: [
    makeLayer(0.05, paintFar, dynFar),
    makeLayer(0.2, paintMid, dynMid),
    makeLayer(0.4, paintOverpass, dynOverpass),
    makeLayer(0.65, paintRoadFar, dynRoadFar),
    makeLayer(0.85, paintRoadNear, dynRoadNear),
  ],
  fog,
};

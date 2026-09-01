// SABRA! — UI layer (640×360 canvas, nearest-neighbor). See CONTRACT.md "UI".
//
// Text strategy
//   • Latin / digits / punctuation → custom 5×7 bitmap font drawn with fillRect (pixel-crisp, integer scale).
//   • Anything containing Hebrew   → ctx.fillText with a bold system font, after bidi() normalisation:
//     every run of Hebrew words (with the punctuation / digits / parens attached to it) is wrapped in a Unicode
//     RLI…PDI isolate, so it lays out right-to-left inside an LTR line. Strings are authored in NATURAL LOGICAL
//     ORDER ('יאללה!', 'שלב 1 · Level 1', 'סחתיין! · Sababa!') and the punctuation lands on the correct side —
//     trailing '!' / '?' / '.' on the left of the Hebrew, closing parens on the left, English part untouched.
//     Legacy strings from other modules that use the old visual trick ('!תאכל', '?שלום! איפה הים') still work:
//     leading sentence punctuation directly before a Hebrew letter is moved to the end of the first Hebrew run.
//   • drawText() auto-detects Hebrew (/[֐-׿]/) and picks the renderer.
//
// Palette: Israeli-flag blue accents, Tel-Aviv sand, falafel gold, cream, ink.

import { makeSprite } from '../engine/sprite.js';

// ------------------------------------------------------------------ palette
export const C = {
  blue: '#0038b8', blueDk: '#001f6b', blueLt: '#3b6ee0',
  sand: '#f0dfb0', sandDk: '#c9ab6b', sandLt: '#fff3d1',
  gold: '#f2b632', goldDk: '#b7791f', goldLt: '#ffd96b',
  cream: '#fff6e0', white: '#ffffff',
  ink: '#1a1424', inkSoft: '#2b2340', shadow: 'rgba(20,12,30,0.55)',
  red: '#e0342c', redDk: '#8c1d18', green: '#4fae4a', greenDk: '#2c6e2a', greenLt: '#8fd66a',
  pink: '#e55a8a', orange: '#f28c28', brown: '#7a4a1e', grey: '#8a8798',
};

const HEB = /[֐-׿]/;
const hebFont = (px) => `bold ${px}px "Arial Hebrew", Arial, "Noto Sans Hebrew", sans-serif`;
const R = Math.round;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// ------------------------------------------------------------------ 5×7 bitmap font
// Rows top→bottom, '#' = pixel. Glyphs are auto-trimmed horizontally (proportional). Some glyphs are wider than 5.
const RAW = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.####|#....|#....|#....|#....|#....|.####',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  a: '.....|.....|.###.|....#|.####|#...#|.####', b: '#....|#....|####.|#...#|#...#|#...#|####.', c: '.....|.....|.###.|#....|#....|#...#|.###.',
  d: '....#|....#|.####|#...#|#...#|#...#|.####', e: '.....|.....|.###.|#...#|#####|#....|.###.', f: '..##.|.#...|.#...|###..|.#...|.#...|.#...',
  g: '.....|.....|.####|#...#|.####|....#|.###.', h: '#....|#....|####.|#...#|#...#|#...#|#...#', i: '.#.|...|##.|.#.|.#.|.#.|###',
  j: '...#.|.....|...#.|...#.|...#.|#..#.|.##..', k: '#....|#....|#..#.|#.#..|##...|#.#..|#..#.', l: '##.|.#.|.#.|.#.|.#.|.#.|###',
  m: '.....|.....|##.#.|#.#.#|#.#.#|#...#|#...#', n: '.....|.....|####.|#...#|#...#|#...#|#...#', o: '.....|.....|.###.|#...#|#...#|#...#|.###.',
  p: '.....|.....|####.|#...#|####.|#....|#....', q: '.....|.....|.####|#...#|.####|....#|....#', r: '.....|.....|#.##.|##..#|#....|#....|#....',
  s: '.....|.....|.####|#....|.###.|....#|####.', t: '.#...|.#...|###..|.#...|.#...|.#..#|..##.', u: '.....|.....|#...#|#...#|#...#|#..##|.##.#',
  v: '.....|.....|#...#|#...#|#...#|.#.#.|..#..', w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.', x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  y: '.....|.....|#...#|#...#|.####|....#|.###.', z: '.....|.....|#####|...#.|..#..|.#...|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '.#.|##.|.#.|.#.|.#.|.#.|###', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '#####|...#.|..#..|...#.|....#|#...#|.###.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '!': '##|##|##|##|##|..|##', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..', '.': '..|..|..|..|..|##|##', ',': '...|...|...|...|.##|.##|#..',
  ':': '##|##|..|..|..|##|##', ';': '.##|.##|...|...|.##|.##|#..', '-': '.....|.....|.....|#####|.....|.....|.....', '_': '.....|.....|.....|.....|.....|.....|#####',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....', '\\': '#....|#....|.#...|..#..|...#.|....#|....#', '(': '..#|.#.|#..|#..|#..|.#.|..#', ')': '#..|.#.|..#|..#|..#|.#.|#..',
  '[': '###|#..|#..|#..|#..|#..|###', ']': '###|..#|..#|..#|..#|..#|###', "'": '##|##|#.|..|..|..|..', '"': '#.#|#.#|#.#|...|...|...|...',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....', '=': '.....|.....|#####|.....|#####|.....|.....', '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '>': '#...|.#..|..#.|...#|..#.|.#..|#...', '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##', '&': '.##..|#..#.|#..#.|.##..|#.#.#|#..#.|.##.#', '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.####',
  '~': '.....|.....|.#..#|#.#.#|#..#.|.....|.....', '·': '..|..|..|##|##|..|..', '—': '.......|.......|.......|#######|.......|.......|.......',
  '₪': '###....|#.#....|#.#...#|#.#.#.#|#.#.#.#|#...#.#|....###', '♥': '.#.#.|#####|#####|#####|.###.|..#..|.....', '←': '.....|..#..|.#...|#####|.#...|..#..|.....',
  '→': '.....|..#..|...#.|#####|...#.|..#..|.....', '★': '..#..|..#..|#####|.###.|.###.|#...#|.....', '…': '.......|.......|.......|.......|.......|#.#.#.#|#.#.#.#',
  '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '|': '#|#|#|#|#|#|#',
};
const GLYPH = new Map();
function glyph(ch) {
  let g = GLYPH.get(ch);
  if (g) return g;
  const raw = RAW[ch] ?? RAW[ch.toUpperCase()];
  if (!raw) { g = ch === ' ' ? { rows: null, w: 3 } : { rows: '#####|#...#|#...#|#...#|#...#|#...#|#####'.split('|'), w: 5 }; GLYPH.set(ch, g); return g; }
  const rows = raw.split('|');
  let min = 99, max = -1;
  rows.forEach((r) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { if (i < min) min = i; if (i > max) max = i; } });
  if (max < 0) { min = 0; max = 2; }
  g = { rows: rows.map((r) => r.slice(min, max + 1)), w: max - min + 1 };
  GLYPH.set(ch, g); return g;
}
export const FONT_H = 7;
export function measureBitmap(text, s = 1) {
  let w = 0; for (const ch of String(text)) w += (glyph(ch).w + 1) * s; return Math.max(0, w - s);
}
// Draw one glyph at (x,y) scale s with fillRect runs. Returns advance.
function blitGlyph(ctx, g, x, y, s) {
  if (g.rows) for (let r = 0; r < FONT_H; r++) {
    const row = g.rows[r]; let c = 0;
    while (c < row.length) { if (row[c] !== '#') { c++; continue; } let run = 1; while (row[c + run] === '#') run++; ctx.fillRect(x + c * s, y + r * s, run * s, s); c += run; }
  }
  return (g.w + 1) * s;
}
export function drawBitmap(ctx, text, x, y, { scale = 1, color = C.white, align = 'left', shadow = C.ink, outline = null } = {}) {
  text = String(text); const s = scale; const w = measureBitmap(text, s);
  let x0 = R(x); if (align === 'center') x0 -= Math.floor(w / 2); else if (align === 'right') x0 -= w;
  const y0 = R(y);
  const pass = (dx, dy, col) => { ctx.fillStyle = col; let cx = x0 + dx; for (const ch of text) cx += blitGlyph(ctx, glyph(ch), cx, y0 + dy, s); };
  if (outline) { for (const [dx, dy] of [[-s, 0], [s, 0], [0, -s], [0, s], [-s, -s], [s, -s], [-s, s], [s, s]]) pass(dx, dy, outline); }
  if (shadow) pass(s, s, shadow);
  pass(0, 0, color);
  return w;
}
// ------------------------------------------------------------------ bidi normalisation
// Wrap each Hebrew run in RLI…PDI (zero-width isolates, honoured by canvas fillText/measureText) so a logical-order
// string renders correctly under an LTR base direction. Tokens: H = has a Hebrew letter, L = has a Latin letter,
// N = neutral (digits / punctuation / '·'). Neutral tokens are absorbed into the Hebrew run unless the next word is
// Latin (so ' · ' between Hebrew and English stays outside). A LEGACY leading '!?.…' directly before a Hebrew letter
// ('!יאללה') is moved to the end of the first Hebrew run, so both authoring conventions draw identically.
const RLI = '\u2067', PDI = '\u2069';
const HEB_LETTER = /[א-ת]/, LAT_LETTER = /[A-Za-z]/;
const BIDI_CACHE = new Map();
export function bidi(text) {
  text = String(text);
  if (!HEB.test(text)) return text;
  let r = BIDI_CACHE.get(text); if (r !== undefined) return r;
  let src = text, lead = '';
  const m = src.match(/^([!?.…]+)(?=[א-ת])/); if (m) { lead = m[1]; src = src.slice(lead.length); }
  const toks = src.split(/(\s+)/);
  const cls = toks.map((t) => (/^\s+$/.test(t) ? 'S' : HEB_LETTER.test(t) ? 'H' : LAT_LETTER.test(t) ? 'L' : 'N'));
  let out = '', run = null, first = true;
  const close = () => {
    if (run === null) return;
    const tail = run.match(/\s+$/); if (tail) run = run.slice(0, -tail[0].length);
    out += RLI + run + (first ? lead : '') + PDI + (tail ? tail[0] : ''); first = false; run = null;
  };
  for (let i = 0; i < toks.length; i++) {
    const c = cls[i], t = toks[i];
    if (c === 'H') { run = (run ?? '') + t; continue; }
    if (run === null) { out += t; continue; }
    if (c === 'S') { run += t; continue; }
    let j = i + 1; while (j < toks.length && (cls[j] === 'N' || cls[j] === 'S')) j++;
    if (c === 'N' && (j >= toks.length || cls[j] === 'H')) { run += t; continue; }
    close(); out += t;
  }
  close();
  if (BIDI_CACHE.size > 512) BIDI_CACHE.clear();
  BIDI_CACHE.set(text, out);
  return out;
}
export function drawHebrew(ctx, text, x, y, { size = 14, color = C.white, align = 'right', shadow = C.ink, outline = null } = {}) {
  text = bidi(text);
  ctx.save();
  ctx.font = hebFont(size); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
  const w = Math.ceil(ctx.measureText(text).width);
  const yy = R(y + size / 2), xx = R(x); const d = size >= 22 ? 2 : 1;
  if (outline) { ctx.fillStyle = outline; for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) ctx.fillText(text, xx + dx, yy + dy); }
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(text, xx + d, yy + d); }
  ctx.fillStyle = color; ctx.fillText(text, xx, yy);
  ctx.restore();
  return w;
}
// Universal text: y = TOP of the text box. size ≈ pixel height (bitmap scale = round(size/8)). Returns drawn width.
export function drawText(ctx, text, x, y, o = {}) {
  text = String(text);
  if (HEB.test(text)) return drawHebrew(ctx, text, x, y, { size: o.size || 14, color: o.color, align: o.align || 'right', shadow: o.shadow === undefined ? C.ink : o.shadow, outline: o.outline });
  return drawBitmap(ctx, text, x, y, { scale: Math.max(1, R((o.size || 8) / 8)), color: o.color, align: o.align || 'left', shadow: o.shadow === undefined ? C.ink : o.shadow, outline: o.outline });
}
export function measureText(ctx, text, size = 8) {
  text = String(text);
  if (HEB.test(text)) { ctx.save(); ctx.font = hebFont(size); ctx.direction = 'ltr'; const w = Math.ceil(ctx.measureText(bidi(text)).width); ctx.restore(); return w; }
  return measureBitmap(text, Math.max(1, R(size / 8)));
}

// ------------------------------------------------------------------ panels
function rr(ctx, x, y, w, h, r = 2) { // pixel-rounded rect (corner pixels cut)
  ctx.fillRect(x + r, y, w - 2 * r, h); ctx.fillRect(x, y + r, w, h - 2 * r);
  if (r >= 2) { ctx.fillRect(x + 1, y + 1, w - 2, h - 2); }
}
export function panel(ctx, x, y, w, h, { fill = C.sand, border = C.ink, light = C.sandLt, dark = C.sandDk, shadow = C.shadow, r = 2 } = {}) {
  x = R(x); y = R(y); w = R(w); h = R(h);
  if (shadow) { ctx.fillStyle = shadow; rr(ctx, x + 2, y + 2, w, h, r); }
  ctx.fillStyle = border; rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (light) { ctx.fillStyle = light; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + 2, 1, h - 4); }
  if (dark) { ctx.fillStyle = dark; ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + w - 3, y + 2, 1, h - 4); }
}
function stripe(ctx, x, y, w, h, a = 'rgba(0,0,0,0.55)') { ctx.fillStyle = a; ctx.fillRect(R(x), R(y), R(w), R(h)); }
function dim(ctx, W, H, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); }
// diagonal-hatched dark overlay (chunky)
function hatch(ctx, W, H, col = 'rgba(0,0,0,0.25)', step = 8) { ctx.fillStyle = col; for (let y = 0; y < H; y += step) for (let x = ((y / step) % 2) * (step / 2); x < W; x += step) ctx.fillRect(x, y, step / 2, step); }

// ------------------------------------------------------------------ pixel-art icons (string-art → canvas via fillRect)
const ICON_DEFS = {
  TZABI: { w: 24, h: 24, palette: { k: '#1a1424', g: '#4fae4a', G: '#7fd35b', h: '#b7ec8a', d: '#2c6e2a', y: '#ffe36b', r: '#e0342c', R: '#ff7a5c', p: '#c2225a', b: '#2a3a8c', B: '#5a7cff', f: '#f28c28', F: '#ffc04a', w: '#ffffff' },
    frames: [[
      '........................',
      '..........kkk...........',
      '.........kRrrk..........',
      '........kRRrrpk.........',
      '.......kkRrrppk.........',
      '......kgGhGGGgdk........',
      '.....kgGhGGGGGgdk.......',
      '....kgGhGGyGGGGgdk......',
      '....kgGGGGGGGGyGgdk.....',
      '...kkkkkkkkkkkkkkkkk....',
      '...kbBBbkkkkkkbBBbkk....',
      '...kbBbbkkkkkkbBbbkk....',
      '...kkkkkkgGGGkkkkkkk....',
      '....kgGyGGGGGGGGGyGdk...',
      '....kgGGGGGGGGGGGGGdk...',
      '....kgGGGkGGGGGkGGGdk...',
      '....kgGGGGkkkkkGGGGdk...',
      '.....kgGGGGGGGGGGGdk....',
      '.....kgyGGGGGGGyGGdk....',
      '......kgGGGGGGGGGdk.....',
      '.......kkgGGGGGgkk......',
      '.........kkkkkkk........',
      '........kFfk.kFfk.......',
      '.......kffffkffffk......',
    ]] },
  TZABI_FACE: { w: 10, h: 10, palette: { k: '#1a1424', g: '#4fae4a', G: '#7fd35b', y: '#ffe36b', b: '#2a3a8c', B: '#5a7cff', r: '#e0342c' },
    frames: [[
      '....rr....',
      '..kkGGkk..',
      '.kGGyGGGk.',
      'kkkkkkkkkk',
      'kBbkkkkBbk',
      'kkkkGGkkkk',
      '.kGyGGGyk.',
      '.kGGkkGGk.',
      '..kGGGGk..',
      '...kkkk...',
    ]] },
  TZABI_SAD: { w: 10, h: 10, palette: { k: '#1a1424', g: '#4fae4a', G: '#7fd35b', y: '#ffe36b', b: '#2a3a8c', B: '#5a7cff', r: '#e0342c', w: '#8fd0ff' },
    frames: [[
      '....rr....',
      '..kkGGkk..',
      '.kGGyGGGk.',
      'kkkkkkkkkk',
      'kBbkkkkBbk',
      'kkkkGGkkkk',
      '.kGwGGGyk.',
      '.kGGGGGGk.',
      '..kGkkGk..',
      '...kkkk...',
    ]] },
  HEART: { w: 7, h: 6, palette: { k: '#1a1424', r: '#e0342c', R: '#ff8a7a', d: '#8c1d18' },
    frames: [[
      '.kk.kk.',
      'kRrkrrk',
      'kRrrrrk',
      'krrrrdk',
      '.krrdk.',
      '..kkk..',
    ]] },
  HEART_EMPTY: { w: 7, h: 6, palette: { k: '#1a1424', d: '#3a2030', e: '#5a3040' },
    frames: [[
      '.kk.kk.',
      'kedkddk',
      'kedddek',
      'kddddek',
      '.kddek.',
      '..kkk..',
    ]] },
  SHEKEL: { w: 8, h: 8, palette: { k: '#1a1424', g: '#f2b632', G: '#ffd96b', d: '#b7791f', w: '#fff3d1' },
    frames: [[
      '..kkkk..',
      '.kGGGgk.',
      'kGwGgdgk',
      'kGwgGdgk',
      'kGggdGgk',
      'kgdgdwgk',
      '.kgdddk.',
      '..kkkk..',
    ]] },
  FALAFEL: { w: 12, h: 12, palette: { k: '#1a1424', b: '#8a5a22', B: '#b8813a', d: '#5c3a12', s: '#ffe7b0', g: '#4fae4a', G: '#8fd66a' },
    frames: [[
      '....kGk.....',
      '...kgGgk....',
      '..kkkgkkk...',
      '.kBBsbBbbk..',
      'kBBbbbsbbdk.',
      'kBsbbbbbbdk.',
      'kBbbbsbbsdk.',
      'kbbbbbbbddk.',
      'kbsbbbdbddk.',
      '.kbbbdddddk.',
      '..kkddddkk..',
      '....kkkk....',
    ]] },
  BAMBA: { w: 14, h: 8, palette: { k: '#1a1424', o: '#f2a33a', O: '#ffcf6b', d: '#c9761e', s: '#fff0c0' },
    frames: [[
      '..kkkk...kkk..',
      '.kOOookkkOOok.',
      'kOOsooooOOoodk',
      'kOoooOoooosodk',
      'kooosoooddoodk',
      'kodoooddoodddk',
      '.kdddkkkkdddk.',
      '..kkk....kkk..',
    ]] },
  HUMMUS: { w: 14, h: 10, palette: { k: '#1a1424', h: '#e9d8a6', H: '#f8ecc0', o: '#8fb33b', O: '#d9c25a', p: '#c9543a', b: '#e3e3e8', B: '#ffffff', d: '#8e8e9a' },
    frames: [[
      '.....kkkkk....',
      '...kkhHHHhkk..',
      '..khHHOOOHhhk.',
      '.khHHOoOoOHhhk',
      'kbBhhOOpOOhhbk',
      'kbBBhhhhhhhBbk',
      'kbBBBBBBBBBbdk',
      '.kbBBBBBBbbdk.',
      '..kbbbbbbbdk..',
      '...kkkkkkkk...',
    ]] },
  SAVTA: { w: 12, h: 12, palette: { k: '#1a1424', h: '#d8d3e6', H: '#f4f1fa', s: '#f0c9a0', S: '#f8dcc0', g: '#3b3b3b', p: '#c2225a', r: '#b03a2e', w: '#ffffff' },
    frames: [[
      '....kkkk....',
      '..kkHhhHkk..',
      '.khHhhhhHhk.',
      '.khhhhhhhhk.',
      'kkkSSSSSSkkk',
      'khgggSSggghk',
      'khgwgSSgwghk',
      '.kSSSSSSSSk.',
      '.kSSrrrrSSk.',
      '..kSSSSSSk..',
      '..kkppppkk..',
      '.kpppppppk..',
    ]] },
  COFFEE: { w: 16, h: 14, palette: { k: '#1a1424', w: '#fff6e0', W: '#ffffff', c: '#5a3212', C: '#8a5a22', b: '#0038b8', s: '#cfd8ff' },
    frames: [[
      '.....s..s.......',
      '....s..s........',
      '.....s..s.......',
      '................',
      '.kkkkkkkkkkk....',
      'kwWWWWWWWWwkkk..',
      'kwcccCcccccwkbk.',
      'kwccccccccwkbbk.',
      '.kwwwwwwwwkbbk..',
      '.kwbbbbbbwk.k...',
      '.kwwwwwwwwk.....',
      '..kwwwwwwk......',
      '..kkkkkkkk......',
      'kkkkkkkkkkkkk...',
    ]] },
  KUBBEH: { w: 8, h: 8, palette: { k: '#1a1424', b: '#b8813a', B: '#d9a25c', d: '#7a4a1e' },
    frames: [[
      '...kk...',
      '..kBbk..',
      '.kBBbdk.',
      'kBBbbbdk',
      'kBbbbddk',
      '.kbbddk.',
      '..kddk..',
      '...kk...',
    ]] },
  MENORAH_STAR: { w: 9, h: 9, palette: { b: '#0038b8', B: '#3b6ee0' },
    frames: [[
      '....b....',
      '...bBb...',
      'bbbBBBbbb',
      '.bBBBBBb.',
      '..bBBBb..',
      '.bBBBBBb.',
      'bbbBBBbbb',
      '...bBb...',
      '....b....',
    ]] },
};
let ICONS = null;
function icons() {
  if (ICONS) return ICONS;
  ICONS = {};
  for (const [k, d] of Object.entries(ICON_DEFS)) ICONS[k] = makeSprite(d, k);
  return ICONS;
}
function icon(ctx, name, x, y, s = 1, frame = 0) {
  const sp = icons()[name]; if (!sp) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sp.frames[frame % sp.frames.length], R(x), R(y), sp.w * s, sp.h * s);
}
export const ICON_SIZES = Object.fromEntries(Object.entries(ICON_DEFS).map(([k, d]) => [k, { w: d.w, h: d.h }]));

// ------------------------------------------------------------------ big beveled logo
// Draw a bitmap-font string at scale s with a two-tone bevel (light top-left, dark bottom-right), outline and drop shadow.
function drawLogoText(ctx, text, x, y, s, { top = C.gold, bottom = C.goldDk, light = C.goldLt, outline = C.ink, shadow = C.blueDk, wobble = 0, t = 0 } = {}) {
  let cx = R(x); const y0 = R(y); let i = 0;
  for (const ch of text) {
    const g = glyph(ch); const dy = wobble ? R(Math.sin(t * 3 + i * 0.7) * wobble) : 0; const gy = y0 + dy;
    // shadow (offset) then outline
    ctx.fillStyle = shadow; for (let r = 0; r < FONT_H; r++) for (let c = 0; c < g.w; c++) if (g.rows[r][c] === '#') ctx.fillRect(cx + c * s + Math.floor(s / 2), gy + r * s + Math.floor(s / 2), s, s);
    ctx.fillStyle = outline; for (const [dx, dyy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let r = 0; r < FONT_H; r++) for (let c = 0; c < g.w; c++) if (g.rows[r][c] === '#') ctx.fillRect(cx + c * s + dx, gy + r * s + dyy, s, s);
    for (let r = 0; r < FONT_H; r++) for (let c = 0; c < g.w; c++) {
      if (g.rows[r][c] !== '#') continue;
      const px = cx + c * s, py = gy + r * s;
      const upper = r < 3 || (r === 3 && ch !== 'A');
      ctx.fillStyle = upper ? top : bottom; ctx.fillRect(px, py, s, s);
      const openTop = r === 0 || g.rows[r - 1][c] !== '#', openLeft = c === 0 || g.rows[r][c - 1] !== '#';
      const openBot = r === FONT_H - 1 || g.rows[r + 1][c] !== '#', openRight = c === g.w - 1 || g.rows[r][c + 1] !== '#';
      ctx.fillStyle = light; if (openTop) ctx.fillRect(px, py, s, 2); if (openLeft) ctx.fillRect(px, py, 2, s);
      ctx.fillStyle = outline === C.ink ? 'rgba(20,12,30,0.35)' : bottom; if (openBot) ctx.fillRect(px, py + s - 2, s, 2); if (openRight) ctx.fillRect(px + s - 2, py, 2, s);
    }
    cx += (g.w + 1) * s; i++;
  }
  return cx - R(x) - s;
}

// ------------------------------------------------------------------ module animation state (engine gives no timers for HUD/pause)
let frameN = 0;
const quipS = { shown: null, a: 0 };      // quip banner slide
const bossS = { lastHp: null, shake: 0 }; // boss bar shake
let lastLevelIndex = 0, lastLevelCount = 5;

const LEVEL_NO = { telaviv: 1, shuk: 2, ayalon: 3, negev: 4, jerusalem: 5 };
const HEB_NUM = ['', 'א', 'ב', 'ג', 'ד', 'ה'];

// ------------------------------------------------------------------ title ticker
const TICKER = [
  'TIP: Hummus = 5 seconds of invincibility. Also 5 hours of nap.',
  'טיפ: חומוס = 5 שניות של חסינות. וגם 5 שעות של שינה!',
  'TIP: Stomp cats? No. Cats stomp YOU.',
  'עצה: אל תתווכח עם סבתא. תאכל!',
  'TIP: Shift = Dash. Say "YALLA" out loud for +0 bonus.',
  'הפקק באיילון הוא לא באג, הוא פיצ׳ר',
  'TIP: Pigeons are harmless. Their opinions are not.',
  'טיפ: קרמבו = חיים נוספים. גם בחיים האמיתיים',
  'TIP: Down + Jump drops through platforms. Like a Tel Aviv landlord through your savings.',
  'שקלים לא נפגעו בהכנת המשחק. רק בוזבזו',
  'TIP: The Dead Sea has low gravity. Your mother-in-law has high gravity.',
];
const CONTROLS = [
  ['ARROWS / WASD', 'MOVE', 'תזוזה'],
  ['Z / SPACE', 'JUMP', 'קפיצה'],
  ['X', 'SPIT GARINIM', 'ירק גרעינים'],
  ['SHIFT', 'DASH  (YALLA!)', 'יאללה!'],
  ['P', 'PAUSE', 'הפסקה'],
  ['M', 'MUTE', 'השתק'],
];

const CREDITS = [
  ['SABRA!', 'צבר!', 'title'],
  ['', ''],
  ['Everyday life in Israel', 'חיי היום־יום בישראל'],
  ['', ''],
  ['STARRING', 'בהשתתפות', 'head'],
  ['Tzabi ......... himself, a prickly pear', 'צבי — בתפקיד עצמו, צבר עם משקפי שמש'],
  ['Savta Rivka ......... every savta ever', 'סבתא ריבקה — כל סבתא שאי פעם הכרתם'],
  ['The Cats ......... 4,127 cats consulted', 'החתולים — 4,127 חתולים נשאלו. אף אחד לא ענה'],
  ['', ''],
  ['DEPARTMENTS', 'מחלקות', 'head'],
  ['Head of Hummus ......... Abu Yossi', 'ראש מחלקת חומוס — אבו יוסי'],
  ['Chief Honking Officer ......... Ayalon, 5pm', 'קצין צפצופים ראשי — איילון, חמש אחה״צ'],
  ['Minister of Kubbeh ......... the freezer since 1994', 'שר הקובה — המקפיא, מאז 1994'],
  ['Parking Coordinator ......... position still open', 'רכז חניה — התפקיד עדיין פנוי'],
  ['Bureaucracy Dept. ......... now serving number 4', 'מחלקת פקידים — מספר 4 בבקשה'],
  ['Sunscreen Supervisor ......... applied once, 2009', 'אחראי קרם הגנה — נמרח פעם אחת, ב-2009'],
  ['Matkot balls lost at sea ......... 812', 'כדורי מטקות שאבדו בים — 812'],
  ['', ''],
  ['DISCLAIMERS', 'הבהרות', 'head'],
  ['No pigeons were harmed (they were fed)', 'אף יונה לא נפגעה (האכלנו אותן)'],
  ['No shekels were harmed (only spent)', 'אף שקל לא נפגע (רק בוזבז)'],
  ['Any resemblance to your family is intentional', 'כל דמיון למשפחה שלך הוא מכוון לחלוטין'],
  ['', ''],
  ['MUSIC', 'מוזיקה', 'head'],
  ['Chiptune hora in Hijaz ......... 8-bit Hava Nagila', 'הורה צ׳יפטיון בחיג׳אז — הבה נגילה ב-8 ביט'],
  ['', ''],
  ['SPECIAL THANKS', 'תודה מיוחדת', 'head'],
  ['The sea, the sun, and the guy who said', 'לים, לשמש, ולבחור שאמר'],
  ['"yalla, gam ani"', '״יאללה, גם אני״'],
  ['', ''],
  ['', ''],
  ['SHABBAT SHALOM!', 'שבת שלום!', 'end'],
];

// ------------------------------------------------------------------ pieces
function drawHearts(ctx, x, y, hearts, max, s = 2) {
  for (let i = 0; i < max; i++) icon(ctx, i < hearts ? 'HEART' : 'HEART_EMPTY', x + i * 9 * s, y, s);
}
function keyChip(ctx, x, y, label, s = 1) {
  const w = measureBitmap(label, s) + 8, h = 7 * s + 6;
  panel(ctx, x, y, w, h, { fill: C.cream, border: C.ink, light: C.white, dark: C.sandDk, shadow: null });
  drawBitmap(ctx, label, x + 4, y + 3, { scale: s, color: C.blue, shadow: null });
  return w;
}
function progressWipe(ctx, W, H, p, col) { // staircase wipe: p 0..1 covers screen from the left in 8 bands
  const bands = 9, bh = Math.ceil(H / bands);
  ctx.fillStyle = col;
  for (let i = 0; i < bands; i++) { const q = clamp(p * 1.6 - i * 0.07, 0, 1); ctx.fillRect(0, i * bh, R(W * ease(q)), bh); }
}

// ================================================================== UI
export const UI = {
  // -------------------------------------------------------------- TITLE
  drawTitle(ctx, W, H, t, state) {
    frameN++;
    ctx.imageSmoothingEnabled = false;
    // header band for legibility over the parallax
    stripe(ctx, 0, 0, W, 132, 'rgba(10,8,40,0.35)');
    ctx.fillStyle = C.gold; ctx.fillRect(0, 132, W, 2); ctx.fillStyle = C.blue; ctx.fillRect(0, 134, W, 2);

    // logo
    const S = 8, logoW = measureBitmap('SABRA!', S) + 6 * 1, iconW = 24 * 3, gap = 14;
    const totalW = iconW + gap + logoW; const x0 = R((W - totalW) / 2);
    const bob = R(Math.sin(t * 2) * 3);
    icon(ctx, 'TZABI', x0, 24 + bob, 3);
    drawLogoText(ctx, 'SABRA!', x0 + iconW + gap, 26, S, { wobble: 3, t });
    // Hebrew "!צבר" — on a blue ribbon
    const ribW = 128, ribX = R(W / 2 - ribW / 2) + 40, ribY = 92;
    panel(ctx, ribX, ribY, ribW, 30, { fill: C.blue, border: C.ink, light: C.blueLt, dark: C.blueDk });
    drawHebrew(ctx, 'צבר!', ribX + ribW / 2, ribY + 3, { size: 22, color: C.white, align: 'center', shadow: C.blueDk });
    // subtitle
    drawHebrew(ctx, 'חיי היום־יום בישראל · Everyday life in Israel', W / 2, 143, { size: 15, color: C.cream, align: 'center', shadow: C.ink, outline: C.ink });

    // floating snacks
    const fx = [40, 92, 560, 600], kinds = ['FALAFEL', 'BAMBA', 'BAMBA', 'FALAFEL'];
    fx.forEach((x, i) => icon(ctx, kinds[i], x, 168 + R(Math.sin(t * 1.7 + i * 1.3) * 6) + (i % 2) * 30, 3));

    // press start (blinking)
    if (Math.floor(t * 2.2) % 3 !== 2) {
      const lat = 'PRESS Z / SPACE  -', s = 2, lw = measureBitmap(lat, s), hw = measureText(ctx, 'יאללה!', 20);
      const tot = lw + 8 + hw, px = R(W / 2 - tot / 2), py = 176;
      stripe(ctx, px - 10, py - 5, tot + 20, 26, 'rgba(10,8,40,0.55)');
      drawBitmap(ctx, lat, px, py + 2, { scale: s, color: C.goldLt, shadow: C.ink });
      drawHebrew(ctx, 'יאללה!', px + lw + 8, py - 3, { size: 20, color: C.white, align: 'left', shadow: C.ink });
    }

    // controls legend panel
    const pw = 372, ph = 100, pxl = R(W / 2 - pw / 2), pyl = 214;
    panel(ctx, pxl, pyl, pw, ph, { fill: C.sand });
    drawBitmap(ctx, 'CONTROLS', pxl + 10, pyl + 7, { color: C.blue, shadow: C.sandDk });
    drawHebrew(ctx, 'שליטה', pxl + pw - 10, pyl + 3, { size: 13, color: C.blue, align: 'right', shadow: C.sandLt });
    ctx.fillStyle = C.sandDk; ctx.fillRect(pxl + 8, pyl + 18, pw - 16, 1);
    CONTROLS.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2); const cx = pxl + 10 + col * 182, cy = pyl + 24 + row * 25;
      const kw = keyChip(ctx, cx, cy, c[0]);
      drawBitmap(ctx, c[1], cx + kw + 6, cy + 3, { color: C.ink, shadow: null });
      drawHebrew(ctx, c[2], cx + 172, cy - 1, { size: 12, color: C.inkSoft, align: 'right', shadow: null });
    });

    // credits / tips ticker
    const ty = H - 22; stripe(ctx, 0, ty - 3, W, 25, 'rgba(10,8,40,0.75)'); ctx.fillStyle = C.gold; ctx.fillRect(0, ty - 4, W, 1);
    let tw = 0; const widths = TICKER.map((s) => { const w = (HEB.test(s) ? measureText(ctx, s, 14) : measureBitmap(s, 1)) + 46; tw += w; return w; });
    let xx = R(W - ((t * 42) % tw));
    for (let pass = 0; pass < 2; pass++) {
      TICKER.forEach((s, i) => {
        if (xx + widths[i] > 0 && xx < W) {
          if (HEB.test(s)) drawHebrew(ctx, s, xx, ty + 1, { size: 14, color: C.cream, align: 'left', shadow: C.ink });
          else drawBitmap(ctx, s, xx, ty + 5, { color: C.cream, shadow: C.ink });
          ctx.fillStyle = C.gold; ctx.fillRect(xx + widths[i] - 26, ty + 7, 4, 4);
        }
        xx += widths[i];
      });
    }
    if (state && state.muted) drawBitmap(ctx, 'MUTED [M]', W - 8, 6, { align: 'right', color: '#ff9a8a' });
  },

  // -------------------------------------------------------------- HUD
  drawHud(ctx, W, H, s) {
    frameN++;
    ctx.imageSmoothingEnabled = false;
    if (typeof s.levelIndex === 'number') { lastLevelIndex = s.levelIndex; lastLevelCount = s.levelCount || 5; }
    // left: hearts + lives
    const max = Math.max(1, s.maxHearts || 3), hearts = clamp(s.hearts | 0, 0, max);
    const lw = 18 * max + 16;
    panel(ctx, 6, 6, Math.max(lw, 112), 52, { fill: 'rgba(20,12,30,0.72)', border: C.ink, light: 'rgba(255,255,255,0.12)', dark: null });
    // heartbeat pulse when low
    const beat = hearts === 1 && Math.floor(frameN / 18) % 2 === 0 ? 1 : 0;
    drawHearts(ctx, 12, 11 - beat, hearts, max, 2);
    icon(ctx, 'TZABI_FACE', 12, 30, 2);
    drawBitmap(ctx, `x${s.lives ?? 0}`, 36, 33, { scale: 2, color: C.cream, shadow: C.ink });
    const ready = s.dashReady !== false;
    panel(ctx, 70, 32, 42, 17, { fill: ready ? C.gold : '#3a2a40', border: C.ink, light: ready ? C.goldLt : null, dark: ready ? C.goldDk : null, shadow: null });
    drawBitmap(ctx, 'YALLA', 91, 37, { align: 'center', color: ready ? C.ink : C.grey, shadow: null });

    // center: score + level name
    const score = String(s.score | 0).padStart(6, '0');
    stripe(ctx, W / 2 - 74, 6, 148, 36, 'rgba(20,12,30,0.72)');
    ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - 74, 6, 148, 1);
    drawBitmap(ctx, 'SCORE', W / 2 - 66, 11, { color: C.goldDk, shadow: null });
    drawBitmap(ctx, score, W / 2 + 66, 9, { scale: 2, color: C.goldLt, align: 'right', shadow: C.ink });
    if (s.levelName || s.levelNameEn) drawHebrew(ctx, `${s.levelName || ''} · ${s.levelNameEn || ''}`, W / 2, 26, { size: 11, color: C.cream, align: 'center', shadow: C.ink });

    // right: shekels
    panel(ctx, W - 96, 6, 90, 22, { fill: 'rgba(20,12,30,0.72)', border: C.ink, light: 'rgba(255,255,255,0.12)', dark: null });
    icon(ctx, 'SHEKEL', W - 90, 9, 2);
    drawBitmap(ctx, `₪ ${s.shekels | 0}`, W - 12, 10, { scale: 2, color: C.goldLt, align: 'right', shadow: C.ink });
    if (s.muted) drawBitmap(ctx, 'MUTED', W - 12, 32, { color: '#ff9a8a', align: 'right', shadow: C.ink });

    // hummus power bar
    const hz = s.hummusTimer | 0;
    if (hz > 0) {
      const bw = 160, bx = R(W / 2 - bw / 2), by = 46, frac = clamp(hz / 300, 0, 1);
      panel(ctx, bx, by, bw, 18, { fill: C.ink, border: C.ink, light: 'rgba(255,255,255,0.15)', dark: null });
      const hue = (frameN * 9) % 360;
      for (let i = 0; i < R((bw - 8) * frac); i += 4) { ctx.fillStyle = `hsl(${(hue + i * 3) % 360},95%,60%)`; ctx.fillRect(bx + 4 + i, by + 4, Math.min(4, R((bw - 8) * frac) - i), 10); }
      icon(ctx, 'HUMMUS', bx - 18, by + 3, 1);
      drawBitmap(ctx, 'HUMMUS POWER', bx + bw / 2, by + 6, { align: 'center', color: C.white, shadow: C.ink, outline: C.ink });
      if (hz < 90 && Math.floor(frameN / 6) % 2) drawHebrew(ctx, 'נגמר החומוס!', bx + bw + 6, by + 1, { size: 12, color: C.goldLt, align: 'left' });
    }

    // quip banner (slides in/out)
    if (s.quip && s.quip !== quipS.shown) { quipS.shown = s.quip; if (quipS.a > 0.5) quipS.a = 0.5; }
    const target = s.quip ? 1 : 0;
    quipS.a = clamp(quipS.a + (target > quipS.a ? 1 / 14 : -1 / 14), 0, 1);
    if (!s.quip && quipS.a === 0) quipS.shown = null;
    // Anchored top-centre under the score panel (drops below the hummus bar while it is up) so it never covers the
    // ground line, pits or sign bubbles near the bottom of the screen. Slides in from above.
    if (quipS.shown && quipS.a > 0) {
      const q = quipS.shown, he = q[0] || '', en = q[1] || '';
      const w = Math.max(measureText(ctx, he, 13), measureBitmap(en, 1)) + 46; const bw = clamp(w, 200, W - 20);
      const bh = 34, off = R((1 - ease(quipS.a)) * 60);
      const bx = R(W / 2 - bw / 2), by = (hz > 0 ? 70 : 46) - off;
      panel(ctx, bx, by, bw, bh, { fill: C.sand, border: C.ink, light: C.sandLt, dark: C.sandDk });
      ctx.fillStyle = C.blue; ctx.fillRect(bx + 2, by + 2, 4, bh - 4);
      icon(ctx, 'TZABI_FACE', bx + 10, by + 7, 2);
      drawHebrew(ctx, he, bx + bw - 10, by + 3, { size: 13, color: C.ink, align: 'right', shadow: null });
      drawBitmap(ctx, en, bx + 34, by + 22, { color: C.blueDk, shadow: null });
    }
  },

  // -------------------------------------------------------------- LEVEL CARD
  drawLevelCard(ctx, W, H, t, level, progress) {
    frameN++;
    const n = LEVEL_NO[level && level.id] || lastLevelIndex + 1;
    const p = clamp(progress, 0, 1);
    // wipe in (0..0.22): blue staircase covers screen; hold; wipe out (0.78..1) reveals from the right side
    const inP = clamp(p / 0.22, 0, 1), outP = clamp((p - 0.78) / 0.22, 0, 1);
    ctx.save();
    if (outP > 0) { ctx.beginPath(); ctx.rect(R(W * ease(outP)), 0, W, H); ctx.clip(); }
    progressWipe(ctx, W, H, inP, C.blueDk);
    if (inP >= 0.6) {
      hatch(ctx, W, H, 'rgba(0,56,184,0.35)', 8);
      const a = clamp((inP - 0.6) / 0.4, 0, 1); const slide = R((1 - ease(a)) * 40);
      // card
      const cw = 420, ch = 168, cx = R(W / 2 - cw / 2), cy = R(H / 2 - ch / 2) - 6 + slide;
      panel(ctx, cx, cy, cw, ch, { fill: C.sand });
      // header ribbon
      ctx.fillStyle = C.blue; ctx.fillRect(cx + 2, cy + 2, cw - 4, 26); ctx.fillStyle = C.blueDk; ctx.fillRect(cx + 2, cy + 27, cw - 4, 1);
      drawHebrew(ctx, `שלב ${n} · Level ${n}`, cx + cw / 2, cy + 6, { size: 14, color: C.white, align: 'center', shadow: C.blueDk });
      // name
      drawHebrew(ctx, level.name || '', cx + cw / 2, cy + 36, { size: 30, color: C.ink, align: 'center', shadow: C.sandDk });
      drawBitmap(ctx, String(level.nameEn || '').toUpperCase(), cx + cw / 2, cy + 74, { scale: 2, align: 'center', color: C.blue, shadow: C.sandDk });
      ctx.fillStyle = C.sandDk; ctx.fillRect(cx + 24, cy + 96, cw - 48, 1);
      const intro = level.intro || [];
      let iy = cy + 104;
      intro.forEach((line) => {
        if (HEB.test(line)) { drawHebrew(ctx, line, cx + cw / 2, iy, { size: 14, color: C.inkSoft, align: 'center', shadow: null }); iy += 20; }
        else { const sc = measureBitmap(line, 2) < cw - 32 ? 2 : 1; drawBitmap(ctx, line, cx + cw / 2, iy + 2, { scale: sc, align: 'center', color: C.inkSoft, shadow: null }); iy += 7 * sc + 8; }
      });
      // level dots
      for (let i = 0; i < lastLevelCount; i++) { ctx.fillStyle = i < n ? C.gold : C.sandDk; ctx.fillRect(cx + cw / 2 - lastLevelCount * 5 + i * 10, cy + ch - 10, 6, 4); }
      icon(ctx, 'TZABI', cx - 30, cy + ch - 62 + R(Math.sin(t * 6) * 2), 2);
      if (a >= 1 && Math.floor(t * 2) % 2 === 0) drawBitmap(ctx, 'Z / SPACE TO SKIP', W / 2, cy + ch + 12, { align: 'center', color: C.cream, shadow: C.ink });
    }
    ctx.restore();
  },

  // -------------------------------------------------------------- LEVEL CLEAR (optional, engine prefers it)
  drawLevelClear(ctx, W, H, t, level, progress, state) {
    frameN++;
    const p = clamp(progress, 0, 1), a = clamp(p / 0.15, 0, 1), out = clamp((p - 0.85) / 0.15, 0, 1);
    const last = state && typeof state.levelIndex === 'number' && state.levelIndex + 1 >= (state.levelCount || 5);
    ctx.save(); ctx.globalAlpha = 1 - out;
    dim(ctx, W, H, `rgba(10,8,40,${0.5 * a})`);
    const cw = 380, ch = 150, cx = R(W / 2 - cw / 2), cy = R(H / 2 - ch / 2) - R((1 - ease(a)) * 40);
    panel(ctx, cx, cy, cw, ch, { fill: C.sand });
    ctx.fillStyle = last ? C.blue : C.gold; ctx.fillRect(cx + 2, cy + 2, cw - 4, 30);
    drawHebrew(ctx, last ? 'שבת שלום! · Shabbat Shalom' : 'סחתיין! · Sababa!', cx + cw / 2, cy + 6, { size: 20, color: last ? C.white : C.ink, align: 'center', shadow: last ? C.blueDk : C.goldDk });
    if (last) { drawHebrew(ctx, 'הצפירה נשמעת... הכל נסגר', cx + cw / 2, cy + 36, { size: 13, color: C.inkSoft, align: 'center', shadow: null }); drawBitmap(ctx, 'THE SIREN SOUNDS. EVERYTHING CLOSES.', cx + cw / 2, cy + 54, { align: 'center', color: C.inkSoft, shadow: null }); }
    else drawHebrew(ctx, `${level.name || ''} · ${level.nameEn || ''}`, cx + cw / 2, cy + 40, { size: 13, color: C.inkSoft, align: 'center', shadow: null });
    const sc = state ? state.score | 0 : 0, shown = R(sc * clamp((p - 0.1) / 0.5, 0, 1));
    drawBitmap(ctx, 'SCORE', cx + 20, cy + 70, { color: C.goldDk, shadow: null });
    drawBitmap(ctx, String(shown).padStart(6, '0'), cx + 20, cy + 82, { scale: 3, color: C.blue, shadow: C.sandDk });
    drawBitmap(ctx, `₪ ${state ? state.shekels | 0 : 0}`, cx + cw - 20, cy + 82, { scale: 2, color: C.goldDk, align: 'right', shadow: C.sandDk });
    drawHearts(ctx, cx + cw - 20 - 9 * 2 * ((state && state.maxHearts) || 3), cy + 66, state ? state.hearts : 3, (state && state.maxHearts) || 3, 2);
    // dancing Tzabi
    icon(ctx, 'TZABI', cx + cw - 70 + R(Math.sin(t * 8) * 6), cy + ch - 54 - Math.abs(R(Math.sin(t * 10) * 8)), 2);
    drawHebrew(ctx, last ? 'שבוע טוב שיהיה!' : 'יאללה, הלאה!', cx + 20, cy + ch - 26, { size: 13, color: C.blue, align: 'left', shadow: null });
    if (p > 0.6 && Math.floor(t * 2) % 2 === 0) drawBitmap(ctx, last ? 'Z / SPACE  -  CREDITS' : 'Z / SPACE  -  NEXT LEVEL', W / 2, cy + ch + 14, { align: 'center', color: C.cream, shadow: C.ink });
    ctx.restore();
  },

  // -------------------------------------------------------------- PAUSE
  drawPause(ctx, W, H) {
    frameN++;
    dim(ctx, W, H, 'rgba(10,8,40,0.55)'); hatch(ctx, W, H, 'rgba(0,0,0,0.18)', 8);
    const cw = 300, ch = 120, cx = R(W / 2 - cw / 2), cy = R(H / 2 - ch / 2);
    panel(ctx, cx, cy, cw, ch, { fill: C.sand });
    ctx.fillStyle = C.blue; ctx.fillRect(cx + 2, cy + 2, cw - 4, 30);
    drawHebrew(ctx, 'הפסקה · Pause', cx + cw / 2, cy + 6, { size: 20, color: C.white, align: 'center', shadow: C.blueDk });
    // coffee with animated steam
    const sx = cx + 24, sy = cy + 46; icon(ctx, 'COFFEE', sx, sy + 3, 2);
    ctx.fillStyle = C.sandLt; // cover static steam and redraw animated
    ctx.fillRect(sx, sy, 32, 10); ctx.fillStyle = C.sand; ctx.fillRect(sx, sy, 32, 10);
    ctx.fillStyle = C.grey;
    for (let i = 0; i < 3; i++) { const ph = frameN / 10 + i * 2; const px = sx + 10 + i * 8 + R(Math.sin(ph) * 2), py = sy + 2 + ((frameN / 4 + i * 5) % 12 | 0) - 4; if (py >= sy - 6) ctx.fillRect(px, py, 2, 4); }
    drawHebrew(ctx, 'אולי קפה?', cx + cw - 20, cy + 42, { size: 20, color: C.ink, align: 'right', shadow: C.sandDk });
    drawBitmap(ctx, 'COFFEE BREAK?', cx + cw - 20, cy + 70, { align: 'right', color: C.blue, shadow: null, scale: 1 });
    ctx.fillStyle = C.sandDk; ctx.fillRect(cx + 16, cy + 88, cw - 32, 1);
    drawHebrew(ctx, 'P להמשך · P to resume', cx + cw / 2, cy + 94, { size: 12, color: C.inkSoft, align: 'center', shadow: null });
  },

  // -------------------------------------------------------------- GAME OVER
  drawGameOver(ctx, W, H, t, s) {
    frameN++;
    dim(ctx, W, H, 'rgba(40,6,10,0.72)'); hatch(ctx, W, H, 'rgba(0,0,0,0.2)', 8);
    const cw = 400, ch = 214, cx = R(W / 2 - cw / 2), cy = R(H / 2 - ch / 2);
    panel(ctx, cx, cy, cw, ch, { fill: C.sand, border: C.ink, light: C.sandLt, dark: C.sandDk });
    ctx.fillStyle = C.red; ctx.fillRect(cx + 2, cy + 2, cw - 4, 58); ctx.fillStyle = C.redDk; ctx.fillRect(cx + 2, cy + 59, cw - 4, 2);
    const sh = R(Math.sin(t * 12) * (t % 4 < 0.3 ? 2 : 0));
    drawHebrew(ctx, 'אוי ואבוי!', cx + cw / 2 + sh, cy + 4, { size: 26, color: C.white, align: 'center', shadow: C.redDk });
    drawBitmap(ctx, 'OY VAVOY', cx + cw / 2, cy + 38, { scale: 2, align: 'center', color: C.goldLt, shadow: C.redDk });
    icon(ctx, 'TZABI_SAD', cx + 24, cy + 76, 4);
    // tear drop
    ctx.fillStyle = '#8fd0ff'; ctx.fillRect(cx + 36, cy + 102 + ((frameN / 3) % 16 | 0), 3, 5);
    drawBitmap(ctx, 'SCORE', cx + 84, cy + 72, { color: C.goldDk, shadow: null });
    drawBitmap(ctx, String(s.score | 0).padStart(6, '0'), cx + 84, cy + 84, { scale: 3, color: C.blue, shadow: C.sandDk });
    drawBitmap(ctx, `₪ ${s.shekels | 0}`, cx + cw - 18, cy + 88, { scale: 2, color: C.goldDk, align: 'right', shadow: C.sandDk });
    ctx.fillStyle = C.sandDk; ctx.fillRect(cx + 84, cy + 116, cw - 102, 1);
    drawHebrew(ctx, 'סבתא מאמינה בך', cx + cw - 18, cy + 122, { size: 16, color: C.ink, align: 'right', shadow: null });
    drawBitmap(ctx, 'GRANDMA BELIEVES IN YOU', cx + 84, cy + 128, { color: C.inkSoft, shadow: null });
    drawHebrew(ctx, '(גם אם אתה רזה מדי)', cx + cw - 18, cy + 140, { size: 12, color: C.inkSoft, align: 'right', shadow: null });
    if (Math.floor(t * 2) % 2 === 0) drawBitmap(ctx, 'PRESS Z TO TRY AGAIN', cx + cw / 2, cy + ch - 26, { scale: 2, align: 'center', color: C.blue, shadow: C.sandDk });
    icon(ctx, 'KUBBEH', cx + cw - 30, cy + ch - 28 + R(Math.sin(t * 5) * 2), 2);
  },

  // -------------------------------------------------------------- CREDITS
  drawCredits(ctx, W, H, t) {
    frameN++;
    dim(ctx, W, H, 'rgba(10,8,40,0.78)');
    // side ribbons
    ctx.fillStyle = C.blue; ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H); ctx.fillStyle = C.gold; ctx.fillRect(6, 0, 2, H); ctx.fillRect(W - 8, 0, 2, H);
    const LH = 34, FLOOR = H - 56;
    const maxScroll = (CREDITS.length - 1) * LH + FLOOR / 2 - 12; // stop with the last line centred
    const scroll = Math.min(t * 30, maxScroll);
    const y0 = FLOOR - R(scroll);
    ctx.save(); ctx.beginPath(); ctx.rect(8, 0, W - 16, FLOOR); ctx.clip();
    CREDITS.forEach(([en, he, kind], i) => {
      const y = y0 + i * LH; if (y < -40 || y > H + 10) return;
      if (kind === 'title') { drawLogoText(ctx, en, W / 2 - measureBitmap(en, 5) / 2 - 24, y - 2, 5, { t }); drawHebrew(ctx, he, W / 2 + measureBitmap(en, 5) / 2 + 4, y + 4, { size: 26, color: C.goldLt, align: 'left', shadow: C.ink }); return; }
      if (kind === 'head') { ctx.fillStyle = C.gold; ctx.fillRect(R(W / 2 - 120), y + 15, 240, 1); drawBitmap(ctx, en, W / 2 - 4, y + 2, { align: 'right', color: C.gold, shadow: C.ink }); drawHebrew(ctx, he, W / 2 + 6, y - 2, { size: 13, color: C.gold, align: 'left', shadow: C.ink }); return; }
      if (kind === 'end') {
        drawHebrew(ctx, he, W / 2, y - 14, { size: 30, color: C.white, align: 'center', shadow: C.blueDk });
        drawBitmap(ctx, en, W / 2, y + 22, { scale: 2, align: 'center', color: C.goldLt, shadow: C.ink });
        icon(ctx, 'MENORAH_STAR', W / 2 - 100, y - 4, 3); icon(ctx, 'MENORAH_STAR', W / 2 + 74, y - 4, 3);
        if (Math.floor(t * 2) % 2 === 0) drawBitmap(ctx, 'Z / SPACE - BACK TO TITLE', W / 2, y + 60, { align: 'center', color: C.cream, shadow: C.ink });
        return;
      }
      if (!en && !he) return;
      drawBitmap(ctx, en, W / 2, y, { align: 'center', color: C.cream, shadow: C.ink });
      drawHebrew(ctx, he, W / 2, y + 10, { size: 13, color: C.sandDk, align: 'center', shadow: C.ink });
    });
    ctx.restore();
    // bottom walkway: Jerusalem stone strip + strolling Tzabi with a kubbeh escort
    ctx.fillStyle = 'rgba(10,8,40,0.9)'; ctx.fillRect(8, FLOOR, W - 16, H - FLOOR);
    ctx.fillStyle = C.gold; ctx.fillRect(8, FLOOR, W - 16, 1);
    for (let x = 8; x < W - 8; x += 24) { ctx.fillStyle = (x / 24) % 2 ? '#b9a27a' : '#a68f68'; ctx.fillRect(x, H - 10, 24, 10); ctx.fillStyle = '#7d6a4a'; ctx.fillRect(x, H - 10, 1, 10); }
    const wx = ((t * 40) % (W + 80)) - 40; icon(ctx, 'TZABI', wx, H - 58 - Math.abs(R(Math.sin(t * 9) * 3)), 2);
    icon(ctx, 'KUBBEH', wx - 30, H - 32 + R(Math.sin(t * 7) * 3), 2);
    drawHebrew(ctx, 'צביקה! חכה!', wx - 40, H - 52, { size: 11, color: C.cream, align: 'right', shadow: C.ink });
  },

  // -------------------------------------------------------------- SPEECH BUBBLE
  // (x, y) are UI-canvas pixels (= game coords × 2); the tail tip points at (x, y). lines = [hebrew, english, ...]
  drawBubble(ctx, x, y, lines) {
    ctx.imageSmoothingEnabled = false;
    lines = (lines || []).map(String).filter((l) => l.length);
    if (!lines.length) return;
    const isHe = lines.map((l) => HEB.test(l));
    const sizes = lines.map((l, i) => (isHe[i] ? 12 : 1));
    const widths = lines.map((l, i) => (isHe[i] ? measureText(ctx, l, 12) : measureBitmap(l, 1)));
    const heights = lines.map((l, i) => (isHe[i] ? 14 : 10));
    const w = Math.max(...widths) + 16, h = heights.reduce((a, b) => a + b, 0) + 10;
    const tail = 6;
    let bx = R(x - w / 2); bx = clamp(bx, 2, 640 - w - 2);
    let by = R(y - h - tail); let flip = false;
    if (by < 2) { by = R(y + tail); flip = true; }
    const tx = clamp(R(x), bx + 8, bx + w - 8);
    // shadow, border, fill (pixel-rounded)
    ctx.fillStyle = 'rgba(20,12,30,0.45)'; rr(ctx, bx + 2, by + 2, w, h, 2);
    ctx.fillStyle = C.ink; rr(ctx, bx, by, w, h, 2);
    ctx.fillStyle = C.white; ctx.fillRect(bx + 2, by + 2, w - 4, h - 4);
    // tail: stepped triangle
    for (let i = 0; i < tail; i++) {
      const ww = (tail - i) * 2 - 1, yy = flip ? by - 1 - i : by + h + i;
      ctx.fillStyle = C.ink; ctx.fillRect(tx - (ww + 1) / 2 - 1 + 1, yy, ww + 2, 1);
    }
    for (let i = 0; i < tail - 1; i++) { const ww = (tail - 1 - i) * 2 - 1, yy = flip ? by - i : by + h - 1 + i; ctx.fillStyle = C.white; ctx.fillRect(tx - (ww - 1) / 2, yy, ww, 1); }
    ctx.fillStyle = C.white; ctx.fillRect(bx + 2, flip ? by + 2 : by + h - 3, w - 4, 1);
    let ly = by + 5;
    lines.forEach((l, i) => {
      if (isHe[i]) drawHebrew(ctx, l, bx + w - 8, ly - 1, { size: 12, color: C.ink, align: 'right', shadow: null });
      else drawBitmap(ctx, l, bx + 8, ly + 1, { color: i === 0 ? C.ink : C.blueDk, shadow: null });
      ly += heights[i];
    });
  },

  // -------------------------------------------------------------- BOSS BAR
  drawBossBar(ctx, W, H, boss) {
    frameN++;
    const hp = Math.max(0, boss.hp | 0), max = Math.max(1, boss.maxHp | 0);
    if (bossS.lastHp !== null && hp < bossS.lastHp) bossS.shake = 14;
    bossS.lastHp = hp;
    const hit = (boss.hitTimer | 0) > 0 || (boss.hurtT | 0) > 0 || bossS.shake > 0;
    if (bossS.shake > 0) bossS.shake--;
    const amp = hit ? 3 : 0;
    const dx = amp ? R(Math.sin(frameN * 2.1) * amp) : 0, dy = amp ? R(Math.cos(frameN * 1.7) * amp) : 0;
    const bw = 300, bx = R(W / 2 - bw / 2) + dx, by = 50 + dy;
    const name = boss.name || 'סבתא ריבקה', nameEn = boss.nameEn || 'Savta Rivka';
    panel(ctx, bx, by, bw, 34, { fill: 'rgba(20,12,30,0.8)', border: hit ? C.red : C.ink, light: 'rgba(255,255,255,0.12)', dark: null });
    icon(ctx, 'SAVTA', bx + 6, by + 5, 2);
    drawHebrew(ctx, `${name} · ${nameEn}`, bx + bw - 10, by + 3, { size: 13, color: hit ? C.goldLt : C.cream, align: 'right', shadow: C.ink });
    // ticks
    const tx0 = bx + 36, tw = bw - 46, gap = 2, seg = Math.floor((tw - gap * (max - 1)) / max);
    const col = boss.phase >= 3 ? C.red : boss.phase === 2 ? C.orange : C.pink;
    for (let i = 0; i < max; i++) {
      const x = tx0 + i * (seg + gap);
      ctx.fillStyle = '#3a2a40'; ctx.fillRect(x, by + 20, seg, 8);
      if (i < hp) { ctx.fillStyle = col; ctx.fillRect(x, by + 20, seg, 8); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, by + 20, seg, 2); }
    }
    drawBitmap(ctx, `PHASE ${boss.phase || 1}`, bx + bw - 8, by + 36, { align: 'right', color: col, shadow: C.ink });
    if (hit) drawHebrew(ctx, 'איי!', bx + bw + 8 + dx, by + 6, { size: 14, color: C.goldLt, align: 'left', shadow: C.ink });
  },
};

export default UI;

// Sprite rasterizer — string-art definitions → canvases. DO NOT change this API.

export function validateSpriteDef(def, name = 'sprite') {
  if (!def || typeof def !== 'object') throw new Error(`${name}: not an object`);
  const { w, h, palette, frames } = def;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) throw new Error(`${name}: bad w/h`);
  if (!palette || typeof palette !== 'object') throw new Error(`${name}: missing palette`);
  if (!Array.isArray(frames) || frames.length === 0) throw new Error(`${name}: frames must be a non-empty array`);
  for (const [k, v] of Object.entries(palette)) {
    if (k.length !== 1 || k === '.') throw new Error(`${name}: palette key '${k}' must be a single char and not '.'`);
    if (typeof v !== 'string') throw new Error(`${name}: palette['${k}'] must be a CSS color string`);
  }
  frames.forEach((frame, fi) => {
    if (!Array.isArray(frame) || frame.length !== h) throw new Error(`${name}: frame ${fi} has ${frame && frame.length} rows, expected ${h}`);
    frame.forEach((row, ri) => {
      if (typeof row !== 'string' || row.length !== w) throw new Error(`${name}: frame ${fi} row ${ri} has length ${row && row.length}, expected ${w}`);
      for (const ch of row) if (ch !== '.' && !(ch in palette)) throw new Error(`${name}: frame ${fi} row ${ri} uses '${ch}' not in palette`);
    });
  });
  return true;
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

export function makeSprite(def, name = 'sprite') {
  validateSpriteDef(def, name);
  const { w, h, palette, frames } = def;
  const canvases = frames.map((frame) => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = frame[y];
      let x = 0;
      while (x < w) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let run = 1;
        while (x + run < w && row[x + run] === ch) run++;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x, y, run, 1);
        x += run;
      }
    }
    return c;
  });
  return { w, h, fps: def.fps || 8, frames: canvases, def };
}

export function drawSprite(ctx, sprite, x, y, frameIndex = 0, flipX = false) {
  const f = sprite.frames[((frameIndex % sprite.frames.length) + sprite.frames.length) % sprite.frames.length];
  const ix = Math.round(x), iy = Math.round(y);
  if (!flipX) { ctx.drawImage(f, ix, iy); return; }
  ctx.save();
  ctx.translate(ix + sprite.w, iy);
  ctx.scale(-1, 1);
  ctx.drawImage(f, 0, 0);
  ctx.restore();
}

// Build a {NAME: sprite} registry from {NAME: def}
export function makeSpriteSet(defs) {
  const out = {};
  for (const [k, d] of Object.entries(defs)) out[k] = makeSprite(d, k);
  return out;
}

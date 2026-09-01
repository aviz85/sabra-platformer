// Tile grid + AABB physics. All bodies: { x, y, w, h } with (x,y) = hitbox top-left in world px.

export const TILE = 16;

export const PHYS = Object.freeze({
  GRAVITY: 0.35,
  MAX_FALL: 6,
  RUN: 1.6,
  JUMP: -5.6,
  COYOTE: 6,
  BUFFER: 6,
  DASH_SPEED: 4,
  DASH_FRAMES: 10,
  DASH_CD: 40,
  WATER_GRAVITY: 0.08,
  WATER_MAX_FALL: 1.0,
  WATER_JUMP: -2.4,
});

export const KIND = Object.freeze({ EMPTY: 0, GROUND: 1, PLATFORM: 2, WALL: 3, HAZARD: 4, WATER: 5 });
const KIND_BY_NAME = { ground: KIND.GROUND, platform: KIND.PLATFORM, wall: KIND.WALL, hazard: KIND.HAZARD, water: KIND.WATER };

export class Tilemap {
  constructor(level) {
    const map = level.map || [];
    const legend = level.legend || {};
    this.rows = map.length;
    this.cols = map.reduce((m, r) => Math.max(m, r.length), 0);
    this.w = this.cols * TILE;
    this.h = this.rows * TILE;
    this.kinds = new Uint8Array(this.cols * this.rows);
    this.isTop = new Uint8Array(this.cols * this.rows); // ground tile with non-ground above → GROUND_TOP art
    const warned = new Set();
    for (let ty = 0; ty < this.rows; ty++) {
      const row = map[ty];
      for (let tx = 0; tx < this.cols; tx++) {
        const ch = row[tx] ?? '.';
        if (ch === '.' || ch === ' ') continue;
        const name = legend[ch];
        const k = KIND_BY_NAME[name];
        if (k === undefined) {
          if (!warned.has(ch)) { warned.add(ch); console.warn(`[tilemap] '${ch}' not in legend (row ${ty}) — treating as empty`); }
          continue;
        }
        this.kinds[ty * this.cols + tx] = k;
      }
    }
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      if (this.kinds[ty * this.cols + tx] !== KIND.GROUND) continue;
      const above = ty > 0 ? this.kinds[(ty - 1) * this.cols + tx] : KIND.EMPTY;
      if (above !== KIND.GROUND) this.isTop[ty * this.cols + tx] = 1;
    }
  }

  kindAt(tx, ty) {
    if (tx < 0 || tx >= this.cols) return KIND.WALL; // level edges are walls
    if (ty < 0 || ty >= this.rows) return KIND.EMPTY;
    return this.kinds[ty * this.cols + tx];
  }
  kindAtPx(px, py) { return this.kindAt(Math.floor(px / TILE), Math.floor(py / TILE)); }
  isSolid(k) { return k === KIND.GROUND || k === KIND.WALL || k === KIND.HAZARD; }
  isWaterAt(px, py) { return this.kindAtPx(px, py) === KIND.WATER; }

  // Any solid tile overlapping the rect?
  solidOverlap(x, y, w, h) {
    const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
    const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.isSolid(this.kindAt(tx, ty))) return true;
    return false;
  }
  hazardOverlap(x, y, w, h) {
    const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 0.01) / TILE);
    const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.kindAt(tx, ty) === KIND.HAZARD) return { tx, ty, cx: tx * TILE + 8, cy: ty * TILE + 8 };
    return null;
  }
  // Is there standing ground (solid or platform) directly under the point?
  groundBelow(px, py) {
    const k = this.kindAtPx(px, py);
    return this.isSolid(k) || k === KIND.PLATFORM;
  }
}

// Move body by (dx, dy) with tile collision. Sets b.onGround, b.hitWall (−1/0/1), b.hitCeil.
// opts.dropThrough: ignore one-way platforms. opts.ghost: no collision at all.
export function moveBody(map, b, dx, dy, opts = {}) {
  b.hitWall = 0; b.hitCeil = false;
  const wasBottom = b.y + b.h;
  if (opts.ghost) { b.x += dx; b.y += dy; b.onGround = false; return; }
  // --- X axis ---
  if (dx !== 0) {
    b.x += dx;
    const ty0 = Math.floor(b.y / TILE), ty1 = Math.floor((b.y + b.h - 0.01) / TILE);
    if (dx > 0) {
      const tx = Math.floor((b.x + b.w - 0.01) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) if (map.isSolid(map.kindAt(tx, ty))) { b.x = tx * TILE - b.w; b.hitWall = 1; break; }
    } else {
      const tx = Math.floor(b.x / TILE);
      for (let ty = ty0; ty <= ty1; ty++) if (map.isSolid(map.kindAt(tx, ty))) { b.x = (tx + 1) * TILE; b.hitWall = -1; break; }
    }
  }
  // --- Y axis ---
  b.onGround = false;
  b.y += dy;
  const tx0 = Math.floor(b.x / TILE), tx1 = Math.floor((b.x + b.w - 0.01) / TILE);
  if (dy > 0) {
    const ty = Math.floor((b.y + b.h - 0.01) / TILE);
    const top = ty * TILE;
    for (let tx = tx0; tx <= tx1; tx++) {
      const k = map.kindAt(tx, ty);
      if (map.isSolid(k) || (k === KIND.PLATFORM && !opts.dropThrough && wasBottom <= top + 0.01)) {
        b.y = top - b.h; b.onGround = true; break;
      }
    }
  } else if (dy < 0) {
    const ty = Math.floor(b.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) if (map.isSolid(map.kindAt(tx, ty))) { b.y = (ty + 1) * TILE; b.hitCeil = true; break; }
  } else {
    // resting check (dy == 0): still standing?
    const ty = Math.floor((b.y + b.h + 0.01) / TILE);
    const top = ty * TILE;
    if (Math.abs(b.y + b.h - top) < 0.02) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const k = map.kindAt(tx, ty);
        if (map.isSolid(k) || (k === KIND.PLATFORM && !opts.dropThrough)) { b.onGround = true; break; }
      }
    }
  }
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const lerp = (a, b, t) => a + (b - a) * t;

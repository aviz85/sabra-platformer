// Camera: lookahead follow, level clamp, screen shake, integer snap.
import { clamp, lerp } from './physics.js';

export class Camera {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.x = 0; this.y = 0;           // smooth (float) position
    this.ix = 0; this.iy = 0;         // integer-snapped, incl. shake — use for rendering
    this.look = 0;                    // current horizontal lookahead
    this.shakeMag = 0; this.shakeT = 0;
    this.sx = 0; this.sy = 0;
    this.boundsW = W; this.boundsH = H;
  }

  setBounds(w, h) { this.boundsW = w; this.boundsH = h; }

  snapTo(target) {
    const { cx, cy } = this._targetPoint(target);
    this.look = target.facing * 28;
    this.x = cx + this.look - this.W / 2;
    this.y = cy - this.H * 0.58;
    this._clamp();
    this.ix = Math.round(this.x); this.iy = Math.round(this.y);
  }

  _targetPoint(t) { return { cx: t.x + t.w / 2, cy: t.y + t.h / 2 }; }

  shake(mag, frames = 12) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, frames);
  }

  update(target) {
    const { cx, cy } = this._targetPoint(target);
    // Horizontal lookahead: lean where the player is heading.
    const wantLook = target.facing * 28 + clamp(target.vx * 6, -16, 16);
    this.look = lerp(this.look, wantLook, 0.06);
    const tx = cx + this.look - this.W / 2;
    this.x = lerp(this.x, tx, 0.14);
    // Vertical: dead-zone, snappier when falling fast.
    const ty = cy - this.H * 0.58;
    const dy = ty - this.y;
    const dead = 18;
    if (Math.abs(dy) > dead) this.y = lerp(this.y, ty - Math.sign(dy) * dead, target.vy > 3 ? 0.22 : 0.1);
    this._clamp();
    // Shake
    if (this.shakeT > 0) {
      this.shakeT--;
      const m = this.shakeMag * (this.shakeT / 12 + 0.2);
      this.sx = Math.round((Math.random() * 2 - 1) * m);
      this.sy = Math.round((Math.random() * 2 - 1) * m * 0.6);
      if (this.shakeT === 0) this.shakeMag = 0;
    } else { this.sx = 0; this.sy = 0; }
    this.ix = Math.round(this.x) + this.sx;
    this.iy = Math.round(this.y) + this.sy;
  }

  _clamp() {
    this.x = clamp(this.x, 0, Math.max(0, this.boundsW - this.W));
    this.y = clamp(this.y, 0, Math.max(0, this.boundsH - this.H));
  }

  // World → screen
  toScreen(x, y) { return { x: Math.round(x - this.ix), y: Math.round(y - this.iy) }; }
  visible(x, y, w, h, pad = 8) {
    return x + w >= this.ix - pad && x <= this.ix + this.W + pad && y + h >= this.iy - pad && y <= this.iy + this.H + pad;
  }
}

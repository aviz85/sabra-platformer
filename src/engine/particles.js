// Particles, dash ghosts (afterimages) and floating score/text popups. Pixel-crisp fillRects only.

const MAX = 600;

export class Particles {
  constructor() { this.list = []; this.ghosts = []; this.popups = []; }

  clear() { this.list.length = 0; this.ghosts.length = 0; this.popups.length = 0; }

  add(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push({ x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, g: p.g ?? 0.15, life: p.life || 30, max: p.life || 30,
      color: p.color || '#fff', size: p.size || 1, drag: p.drag ?? 0.98, bounce: p.bounce || 0, floorY: p.floorY, twinkle: !!p.twinkle, colors: p.colors });
  }

  // Generic radial burst
  burst(x, y, n, colors, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (o.speed || 2) * (0.4 + Math.random() * 0.8);
      this.add({ x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), g: o.g ?? 0.12,
        life: (o.life || 28) * (0.6 + Math.random() * 0.6), color: colors[(Math.random() * colors.length) | 0],
        size: o.size || (Math.random() < 0.3 ? 2 : 1), drag: o.drag ?? 0.97, bounce: o.bounce || 0, floorY: o.floorY });
    }
  }

  // Dust puff (landing / running / turning)
  dust(x, y, n = 4, dir = 0) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + (Math.random() * 6 - 3), y: y - Math.random() * 2, vx: (Math.random() - 0.5) * 1.2 + dir * 0.4, vy: -Math.random() * 0.8 - 0.2,
        g: 0.02, life: 14 + Math.random() * 10, color: Math.random() < 0.5 ? '#e8dcc0' : '#cbbf9f', size: Math.random() < 0.4 ? 2 : 1, drag: 0.92 });
    }
  }

  sparkle(x, y, color) {
    this.add({ x, y, vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 0.6, g: -0.005, life: 18 + Math.random() * 14, color, size: 1, twinkle: true, drag: 1 });
  }

  splash(x, y, n = 8) {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() * 10 - 5), y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2.2, g: 0.16, life: 24, color: Math.random() < 0.5 ? '#bfe9ff' : '#5fb4e8', size: 1 });
  }

  ghost(frame, x, y, flip, life = 14, w = 16, h = 24) {
    this.ghosts.push({ frame, x: Math.round(x), y: Math.round(y), flip, life, max: life, w, h });
  }

  popup(x, y, text, color = '#fff', life = 45) {
    this.popups.push({ x, y, text, color, life, max: life, vy: -0.45 });
  }

  update() {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life--;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx; p.y += p.vy;
      if (p.floorY !== undefined && p.y > p.floorY) { p.y = p.floorY; p.vy = -p.vy * p.bounce; p.vx *= 0.6; if (!p.bounce) { p.vx = 0; p.vy = 0; p.g = 0; } }
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) if (--this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
    for (let i = this.popups.length - 1; i >= 0; i--) { const p = this.popups[i]; p.life--; p.y += p.vy; p.vy *= 0.96; if (p.life <= 0) this.popups.splice(i, 1); }
  }

  drawGhosts(ctx) {
    for (const g of this.ghosts) {
      ctx.globalAlpha = 0.12 + 0.4 * (g.life / g.max);
      if (!g.flip) ctx.drawImage(g.frame, g.x, g.y);
      else { ctx.save(); ctx.translate(g.x + g.w, g.y); ctx.scale(-1, 1); ctx.drawImage(g.frame, 0, 0); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    for (const p of this.list) {
      if (p.twinkle && ((p.life >> 1) & 1)) continue;
      const a = p.life / p.max;
      ctx.globalAlpha = a < 0.35 ? a / 0.35 : 1;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  // Popups are drawn on the UI canvas (2× scale) for readable text.
  drawPopups(ctx, cam, scale = 2) {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const sx = Math.round((p.x - cam.ix) * scale), sy = Math.round((p.y - cam.iy) * scale);
      const a = p.life / p.max;
      ctx.globalAlpha = a < 0.4 ? a / 0.4 : 1;
      ctx.fillStyle = '#000';
      ctx.fillText(p.text, sx + 1, sy + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, sx, sy);
    }
    ctx.restore();
  }
}

// All game entities: Player, enemies, platforms, NPCs, pickups, projectiles.
// Coordinates: (x, y) = hitbox top-left in world px. Sprites are anchored bottom-center on the hitbox.
import { PHYS, TILE, KIND, moveBody, aabb, clamp, sign } from './physics.js';

const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);

// ---------------------------------------------------------------- Base
export class Entity {
  constructor(game, def, spriteKey) {
    this.game = game; this.def = def; this.type = def.type;
    this.spriteKey = spriteKey;
    const sp = game.sprite(spriteKey);
    this.sw = sp.w; this.sh = sp.h;
    this.w = Math.max(6, sp.w - 4); this.h = Math.max(6, sp.h - 2);
    this.x = def.x - this.w / 2; this.y = def.y - this.h;
    this.x0 = this.x; this.y0 = this.y;
    this.vx = 0; this.vy = 0; this.dx = 0; this.dy = 0; // dx/dy = last frame displacement (for carriers)
    this.facing = -1;
    this.hp = 1; this.maxHp = 1;
    this.remove = false; this.dying = 0;
    this.hurts = false;       // contact damages the player
    this.stompable = false;   // stomp kills
    this.stompSafe = true;    // landing on top is safe (false = hurts from every side)
    this.seedable = false;    // seeds damage
    this.isPlatform = false;  // roof is one-way platform
    this.pickup = false;
    this.layer = 'enemy';     // 'prop' | 'pickup' | 'enemy'
    this.score = 100;
    this.animT = Math.floor(Math.random() * 60);
    this.bubble = null;       // { lines, t }
    this.flash = 0;           // white flash frames after hit
    this.onGround = false;
    this.active = false;
    this.alwaysActive = false;
    this.name = def.type;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get top() { return this.y; }

  say(lines, frames = 100) { this.bubble = { lines, t: frames }; }
  sfx(n) { this.game.sfx(n); }
  get player() { return this.game.player; }
  playerDist() { return dist(this, this.player); }
  faceP() { this.facing = this.player.cx < this.cx ? -1 : 1; }
  playerNear(dx, dy = 48) { const p = this.player; return Math.abs(p.cx - this.cx) < dx && Math.abs(p.cy - this.cy) < dy; }

  tick() {
    this.animT++;
    if (this.bubble && --this.bubble.t <= 0) this.bubble = null;
    if (this.flash > 0) this.flash--;
    if (this.dying > 0) { this.dying--; if (this.dying === 0) this.remove = true; return false; }
    return true;
  }
  update() { this.tick(); }

  // gravity + tile movement for ground walkers
  fall(mult = 1) {
    this.vy = Math.min(this.vy + PHYS.GRAVITY * mult, PHYS.MAX_FALL);
    const px = this.x, py = this.y;
    moveBody(this.game.map, this, this.vx, this.vy);
    if (this.onGround && this.vy > 0) this.vy = 0;
    if (this.hitCeil) this.vy = 0;
    this.dx = this.x - px; this.dy = this.y - py;
  }
  // true if there's floor ahead at the leading edge
  floorAhead() {
    const px = this.facing > 0 ? this.x + this.w + 1 : this.x - 1;
    return this.game.map.groundBelow(px, this.feet + 2);
  }

  frameIndex(sp) { return Math.floor(this.animT * (sp.fps || 8) / 60); }

  drawSprite(ctx, key = this.spriteKey, flip = this.facing > 0, frame = null, ox = 0, oy = 0) {
    const sp = this.game.sprite(key);
    const fi = frame === null ? this.frameIndex(sp) : frame;
    const f = sp.frames[((fi % sp.frames.length) + sp.frames.length) % sp.frames.length];
    const sx = Math.round(this.cx - sp.w / 2 + ox), sy = Math.round(this.feet - sp.h + oy);
    if (this.flash > 0 && (this.flash & 2)) { this.game.drawTinted(ctx, f, sx, sy, flip, '#ffffff', 0.85); return; }
    if (this.dying > 0) {
      // pop: scale up & fade
      const k = 1 + (1 - this.dying / 8) * 0.6;
      ctx.save(); ctx.globalAlpha = this.dying / 8; ctx.translate(Math.round(this.cx), Math.round(this.feet));
      ctx.scale(flip ? -k : k, k); ctx.drawImage(f, -Math.round(sp.w / 2), -sp.h); ctx.restore();
      return;
    }
    if (!flip) ctx.drawImage(f, sx, sy);
    else { ctx.save(); ctx.translate(sx + sp.w, sy); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore(); }
  }
  draw(ctx) { this.drawSprite(ctx); }

  paletteColors() {
    const sp = this.game.sprite(this.spriteKey);
    const cols = sp.def && sp.def.palette ? Object.values(sp.def.palette) : ['#fff'];
    return cols.length ? cols : ['#fff'];
  }

  hit(dmg = 1, src = null) {
    if (this.dying) return false;
    this.hp -= dmg; this.flash = 12;
    if (this.hp <= 0) { this.die(src); return true; }
    this.sfx('hit');
    this.game.particles.burst(this.cx, this.cy, 5, this.paletteColors(), { speed: 1.5, life: 18 });
    return false;
  }
  die() {
    if (this.dying) return;
    this.dying = 8;
    this.hurts = false; this.isPlatform = false;
    this.game.particles.burst(this.cx, this.cy, 16, this.paletteColors(), { speed: 2.4, life: 34, g: 0.14, floorY: this.feet + 2, bounce: 0.4 });
    this.game.addScore(this.score, this.cx, this.top);
    this.game.cam.shake(1.5, 6);
    this.sfx(this.dieSfx || 'hit');
  }
  // Player landed on top. Return true if it counted as a stomp (player bounces either way).
  stomp() {
    if (this.stompable) { this.game.particles.dust(this.cx, this.top, 5); this.die(); this.sfx('stomp'); return true; }
    this.game.particles.dust(this.cx, this.top, 3);
    return false;
  }
  onSeed(seed) {
    if (this.seedable) { this.hit(1, seed); seed.pop(); return; }
    // bounces off
    this.game.particles.burst(seed.cx, seed.cy, 3, ['#fff', '#ffe37a'], { speed: 1, life: 10 });
    seed.vx = -seed.vx * 0.5; seed.vy = -2; seed.life = Math.min(seed.life, 12); seed.dead = false; seed.harmless = true;
  }
}

// ---------------------------------------------------------------- Player
export class Player extends Entity {
  constructor(game, x, y) {
    super(game, { type: 'player', x, y }, 'PLAYER_IDLE');
    this.w = 10; this.h = 22; this.x = x - 5; this.y = y - 22;
    this.facing = 1;
    this.hp = 3; this.maxHp = 3;
    this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.dashT = 0; this.dashCd = 0; this.dashDir = 1; this.airDash = 1;
    this.hurtT = 0; this.invT = 0; this.spitT = 0; this.hummusT = 0;
    this.sqx = 1; this.sqy = 1;          // squash & stretch scale
    this.carrier = null; this.dropT = 0;
    this.inWater = false; this.dead = false; this.deadT = 0;
    this.anim = 'idle'; this.animT = 0; this.prevAnim = 'idle';
    this.prevFeet = this.feet; this.wasGround = false;
    this.runDustT = 0; this.name = 'Tzabi';
    this.safeX = this.cx;                 // last cx while standing on solid tiles, clear of any hazard
    this.alwaysActive = true; this.layer = 'player';
  }
  get invincible() { return this.invT > 0 || this.hummusT > 0 || this.dead; }

  update(input) {
    this.animT++;
    const g = this.game, map = g.map;
    if (this.coyote > 0) this.coyote--; if (this.jumpBuf > 0) this.jumpBuf--; if (this.dashCd > 0) this.dashCd--;
    if (this.hurtT > 0) this.hurtT--; if (this.invT > 0) this.invT--; if (this.spitT > 0) this.spitT--;
    if (this.dropT > 0) this.dropT--;
    if (this.hummusT > 0) { this.hummusT--; if (this.hummusT % 3 === 0) g.particles.sparkle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, `hsl(${(this.animT * 23) % 360},100%,70%)`); if (this.hummusT === 0) g.sfx('ui'); }
    this.sqx += (1 - this.sqx) * 0.2; this.sqy += (1 - this.sqy) * 0.2;

    if (this.dead) { // death flip: no collision
      this.deadT++;
      this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
      this.x += this.vx; this.y += this.vy;
      this.anim = 'hurt';
      if (this.deadT > 80) g.respawn();
      return;
    }

    this.prevFeet = this.feet;
    const wasWater = this.inWater;
    this.inWater = map.isWaterAt(this.cx, this.cy);
    if (this.inWater && !wasWater && this.vy > 1) { g.particles.splash(this.cx, this.y + this.h * 0.5); g.sfx('pickup'); }
    if (this.onGround) { this.coyote = PHYS.COYOTE; this.airDash = 1; }

    const canControl = this.hurtT <= 0;
    const left = canControl && input.isDown('left'), right = canControl && input.isDown('right');
    const jumpHeld = input.isDown('jump');
    if (canControl && input.justPressed('jump')) this.jumpBuf = PHYS.BUFFER;
    if (canControl && (left !== right)) this.facing = left ? -1 : 1;

    // carried by moving platform (car/camel)
    if (this.carrier) {
      if (this.carrier.remove || !this._onCarrier(this.carrier)) this.carrier = null;
      else { this.x += this.carrier.dx; this.y = this.carrier.top - this.h; }
    }

    if (this.dashT > 0) {
      // ---- dashing: fixed velocity, no gravity, afterimages
      this.dashT--;
      this.vx = this.dashDir * PHYS.DASH_SPEED; this.vy = 0;
      if (this.dashT % 2 === 0) { const sp = g.sprite('PLAYER_DASH'); g.particles.ghost(sp.frames[this.frameIndex(sp) % sp.frames.length], this.cx - sp.w / 2, this.feet - sp.h, this.facing > 0, 14, sp.w, sp.h); }
      if (this.dashT === 0) this.vx = this.dashDir * PHYS.RUN;
      this.anim = 'dash';
    } else {
      // ---- horizontal control
      const target = (right ? 1 : 0) - (left ? 1 : 0);
      const accel = this.onGround ? 0.35 : 0.18;
      if (target !== 0) {
        if (this.onGround && sign(this.vx) === -target && Math.abs(this.vx) > 0.8) { g.particles.dust(this.cx, this.feet, 3, -target); }
        this.vx += (target * PHYS.RUN * (this.inWater ? 0.7 : 1) - this.vx) * accel;
      } else if (this.hurtT <= 0) {
        this.vx *= this.onGround ? 0.72 : 0.94;
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
      } else this.vx *= 0.96;

      // ---- gravity
      if (this.inWater) { this.vy = Math.min(this.vy + PHYS.WATER_GRAVITY, PHYS.WATER_MAX_FALL); if (this.vy > 0.6) this.vy -= 0.04; }
      else {
        let grav = PHYS.GRAVITY;
        if (this.vy < -1.5 && !jumpHeld && this.jumping) grav += 0.55;    // variable jump: let go early = shorter hop
        if (Math.abs(this.vy) < 0.8 && jumpHeld && this.jumping) grav *= 0.6; // float at the apex
        this.vy = Math.min(this.vy + grav, PHYS.MAX_FALL);
      }
      if (this.vy > 0) this.jumping = false;

      // ---- drop through one-way platform
      if (canControl && input.isDown('down') && this.jumpBuf > 0 && this.onGround && !this.carrier) {
        this.dropT = 10; this.jumpBuf = 0; this.coyote = 0; this.onGround = false; this.vy = 1;
      }
      // ---- jump (coyote + buffer)
      if (this.jumpBuf > 0 && canControl) {
        if (this.inWater) { this.vy = PHYS.WATER_JUMP; this.jumpBuf = 0; g.sfx('jump'); g.particles.splash(this.cx, this.cy, 3); }
        else if (this.onGround || this.coyote > 0 || this.carrier) {
          this.vy = PHYS.JUMP; this.jumpBuf = 0; this.coyote = 0; this.jumping = true; this.onGround = false;
          if (this.carrier) { this.vx += this.carrier.dx * 0.5; this.carrier = null; }
          this.sqx = 0.7; this.sqy = 1.35;
          g.particles.dust(this.cx, this.feet, 5);
          g.sfx('jump');
        }
      }
      // ---- dash
      if (canControl && input.justPressed('dash') && this.dashCd === 0 && (this.onGround || this.airDash > 0 || this.inWater)) {
        if (!this.onGround) this.airDash--;
        this.dashT = PHYS.DASH_FRAMES; this.dashCd = PHYS.DASH_CD; this.dashDir = this.facing;
        this.carrier = null;
        this.sqx = 1.4; this.sqy = 0.7;
        g.sfx('dash'); g.particles.dust(this.cx - this.facing * 4, this.feet, 6, -this.facing);
        g.particles.popup(this.cx, this.y - 6, '!יאללה', '#ffd447', 30);
      }
      // ---- spit garinim
      if (canControl && input.justPressed('spit') && g.countProjectiles('seed') < 3) {
        this.spitT = 12;
        g.spawnProjectile(new Projectile(g, 'seed', this.x + (this.facing > 0 ? this.w + 1 : -5), this.y + 8, this.facing * 4, -0.3, { owner: 'player', gravity: 0.02, life: 60, spriteKey: 'SEED' }));
        g.sfx('spit');
        this.vx -= this.facing * 0.3;
      }
      // anim selection
      if (this.hurtT > 0) this.anim = 'hurt';
      else if (this.spitT > 0) this.anim = 'spit';
      else if (!this.onGround && !this.carrier) this.anim = this.vy < 0 ? 'jump' : (this.inWater ? 'jump' : 'fall');
      else if (Math.abs(this.vx) > 0.25) this.anim = 'run';
      else this.anim = 'idle';
    }

    // ---- move & collide
    const wasGround = this.onGround || !!this.carrier;
    const prevFeet = this.prevFeet;
    moveBody(map, this, this.vx, this.vy, { dropThrough: this.dropT > 0 });
    if (this.onGround && this.vy > 0) this.vy = 0;
    if (this.hitCeil) { this.vy = 0; this.jumping = false; }
    if (this.hitWall && this.dashT > 0) { this.dashT = 0; this.vx = 0; g.cam.shake(1.5, 5); g.particles.burst(this.hitWall > 0 ? this.x + this.w : this.x, this.cy, 5, ['#fff', '#cde'], { speed: 1.2, life: 12 }); }

    // ---- moving platform landing
    if (!this.onGround && this.vy >= 0 && this.dropT <= 0) {
      for (const e of g.entities) {
        if (!e.isPlatform || e.remove) continue;
        if (this.x + this.w <= e.x || this.x >= e.x + e.w) continue;
        const topNow = e.top;
        if (prevFeet <= topNow - e.dy + 1.5 && this.feet >= topNow) {
          this.y = topNow - this.h; this.vy = 0; this.onGround = true; this.carrier = e; break;
        }
      }
    } else if (this.onGround && this.carrier && !this._onCarrier(this.carrier)) this.carrier = null;
    if (this.onGround && !this.carrier) { /* on tiles */ }

    // ---- landing juice
    if (this.onGround && !wasGround) {
      this.sqx = 1.3; this.sqy = 0.7; this.jumping = false;
      g.particles.dust(this.cx, this.feet, 6);
      this.airDash = 1;
    }
    if (this.anim === 'run' && this.onGround && ++this.runDustT % 9 === 0) g.particles.dust(this.cx - this.facing * 3, this.feet, 1, -this.facing);

    // ---- hazards: knock the player back OUT of the strip (toward the nearest safe edge), never deeper in
    const hz = map.hazardOverlap(this.x + 1, this.y + 1, this.w - 2, this.h);
    if (!hz && this.onGround && !this.carrier && this.hurtT <= 0) this.safeX = this.cx;
    if (hz && !this.invincible && this.hurtT <= 0) {
      const dir = this.hazardEscapeDir(hz);
      g.hurtPlayer(this.cx - dir * 8, 1, 'hazard');
    }
    // ---- fell off the world
    if (this.y > map.h + 24) g.fellOff();
    if (this.x < 0) this.x = 0;
    if (this.anim !== this.prevAnim) { this.animT = 0; this.prevAnim = this.anim; }
  }

  // Which way is out of the hazard strip the player is standing in? -1 = left, +1 = right.
  // Scans the hazard row for its edges and picks the nearer one; ties go toward the last safe ground,
  // then back the way the player was travelling.
  hazardEscapeDir(hz) {
    const map = this.game.map;
    let lx = hz.tx, rx = hz.tx;
    for (let n = 0; n < 40 && lx - 1 >= 0 && map.kindAt(lx - 1, hz.ty) === KIND.HAZARD; n++) lx--;
    for (let n = 0; n < 40 && rx + 1 < map.cols && map.kindAt(rx + 1, hz.ty) === KIND.HAZARD; n++) rx++;
    const dl = this.cx - lx * TILE, dr = (rx + 1) * TILE - this.cx;
    if (dl < dr - 4) return -1;
    if (dr < dl - 4) return 1;
    const toSafe = this.safeX - this.cx;
    if (Math.abs(toSafe) > 4) return toSafe < 0 ? -1 : 1;
    if (Math.abs(this.vx) > 0.2) return this.vx > 0 ? -1 : 1;
    return -this.facing || -1;
  }

  _onCarrier(e) {
    return this.x + this.w > e.x && this.x < e.x + e.w && Math.abs(this.feet - e.top) < 3;
  }

  spriteFor() {
    const k = { idle: 'PLAYER_IDLE', run: 'PLAYER_RUN', jump: 'PLAYER_JUMP', fall: 'PLAYER_FALL', spit: 'PLAYER_SPIT', hurt: 'PLAYER_HURT', dash: 'PLAYER_DASH' }[this.anim] || 'PLAYER_IDLE';
    return this.game.sprite(k);
  }

  draw(ctx) {
    const g = this.game;
    if (this.invT > 0 && !this.dead && ((this.invT >> 2) & 1)) return; // blink
    const sp = this.spriteFor();
    const fi = this.frameIndex(sp) % sp.frames.length;
    const f = sp.frames[fi];
    const flip = this.facing < 0;
    const cx = Math.round(this.cx), fy = Math.round(this.feet);
    ctx.save();
    ctx.translate(cx, fy);
    if (this.dead) ctx.scale(flip ? -1 : 1, -1); // flipped upside down, comedic death
    else ctx.scale((flip ? -1 : 1) * this.sqx, this.sqy);
    const dx = -Math.round(sp.w / 2), dy = this.dead ? 0 : -sp.h; // flipped death: image top sits on the feet line
    if (this.hummusT > 0) {
      const hue = (this.animT * 12) % 360;
      g.drawTinted(ctx, f, dx, dy, false, `hsl(${hue},100%,60%)`, 0.45 + 0.15 * Math.sin(this.animT / 3));
    } else if (this.hurtT > 0 && (this.hurtT & 2)) g.drawTinted(ctx, f, dx, dy, false, '#ffffff', 0.8);
    else ctx.drawImage(f, dx, dy);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Projectiles
export class Projectile {
  constructor(game, kind, x, y, vx, vy, o = {}) {
    this.game = game; this.kind = kind; this.owner = o.owner || 'enemy';
    this.spriteKey = o.spriteKey || 'SEED';
    const sp = game.sprite(this.spriteKey);
    this.sw = sp.w; this.sh = sp.h;
    this.w = Math.max(3, sp.w - 2); this.h = Math.max(3, sp.h - 2);
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.g = o.gravity ?? 0; this.life = o.life ?? 120; this.dead = false; this.harmless = false;
    this.spin = o.spin ?? true; this.t = 0; this.dmg = o.dmg || 1;
  }
  get cx() { return this.x + this.w / 2; } get cy() { return this.y + this.h / 2; }
  update() {
    this.t++; this.life--;
    this.vy += this.g; this.x += this.vx; this.y += this.vy;
    const map = this.game.map;
    if (this.life <= 0 || this.y > map.h + 32) { this.dead = true; return; }
    if (map.solidOverlap(this.x, this.y, this.w, this.h)) this.pop();
  }
  pop() {
    if (this.dead) return;
    this.dead = true;
    const sp = this.game.sprite(this.spriteKey);
    const cols = sp.def && sp.def.palette ? Object.values(sp.def.palette) : ['#fff'];
    this.game.particles.burst(this.cx, this.cy, this.kind === 'seed' ? 4 : 8, cols, { speed: 1.4, life: 16, g: 0.1 });
  }
  draw(ctx) {
    const sp = this.game.sprite(this.spriteKey);
    const fi = this.spin ? Math.floor(this.t / 4) : 0;
    const f = sp.frames[fi % sp.frames.length];
    const sx = Math.round(this.cx - sp.w / 2), sy = Math.round(this.cy - sp.h / 2);
    if (this.spin && sp.frames.length === 1 && (fi & 1)) { ctx.save(); ctx.translate(sx + sp.w, sy); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore(); }
    else ctx.drawImage(f, sx, sy);
  }
}

// ---------------------------------------------------------------- Enemies
export class Cat extends Entity {
  constructor(game, def) {
    super(game, def, 'CAT_IDLE');
    this.hurts = true; this.stompable = true; this.seedable = true; this.hp = 1; this.score = 100;
    this.state = 'patrol'; this.st = 0; this.speed = 0.55; this.dieSfx = 'meow';
    this.facing = Math.random() < 0.5 ? -1 : 1;
  }
  update() {
    if (!this.tick()) return;
    this.st--;
    if (this.state === 'patrol') {
      this.vx = this.facing * this.speed;
      if (this.onGround && (!this.floorAhead() || this.hitWall)) { this.facing *= -1; this.vx = this.facing * this.speed; }
      if (this.st <= 0 && this.playerNear(60, 28) && this.onGround) { this.state = 'hiss'; this.st = 30; this.faceP(); this.vx = 0; this.say(['!פסססס', 'Hsssss!'], 50); this.sfx('meow'); }
    } else if (this.state === 'hiss') {
      this.vx = 0;
      if (this.st <= 0) { this.state = 'lunge'; this.st = 28; this.faceP(); this.vx = this.facing * 2.4; this.vy = -2.6; this.onGround = false; this.game.particles.dust(this.cx, this.feet, 4, -this.facing); }
    } else if (this.state === 'lunge') {
      if (this.hitWall) this.vx = 0;
      if (this.st <= 0 || (this.onGround && this.st < 20)) { this.state = 'patrol'; this.st = 90; this.vx = this.facing * this.speed; }
    }
    this.fall();
  }
  draw(ctx) {
    const key = this.state === 'hiss' ? 'CAT_HISS' : (this.state === 'lunge' || Math.abs(this.vx) > 0.1) ? 'CAT_RUN' : 'CAT_IDLE';
    this.drawSprite(ctx, key);
  }
}

export class Savta extends Entity {
  constructor(game, def) {
    super(game, def, 'SAVTA_IDLE');
    this.hurts = true; this.seedable = true; this.hp = 2; this.maxHp = 2; this.score = 200;
    this.throwT = 60; this.animThrow = 0; this.lineI = 0; this.dieSfx = 'savta';
    this.lines = [['!תאכל', 'Eat!'], ['!אתה רזה מדי', "You're too thin!"], ['!עוד צלחת', 'One more plate!'], ['?למה לא התקשרת', "Why didn't you call?"]];
  }
  update() {
    if (!this.tick()) return;
    if (this.animThrow > 0) this.animThrow--;
    this.faceP();
    if (this.playerNear(160, 80)) {
      if (--this.throwT <= 0) {
        this.throwT = 120; this.animThrow = 20;
        const dx = this.player.cx - this.cx;
        const vx = clamp(dx / 55, -2.6, 2.6);
        this.game.spawnProjectile(new Projectile(this.game, 'plate', this.cx - 4, this.y + 2, vx, -4.2, { gravity: 0.18, life: 140, spriteKey: 'PLATE' }));
        this.say(this.lines[this.lineI++ % this.lines.length], 70);
        this.sfx('savta');
      }
    } else this.throwT = Math.min(this.throwT, 40);
    this.vx = 0; this.fall();
  }
  draw(ctx) { this.drawSprite(ctx, this.animThrow > 0 ? 'SAVTA_THROW' : 'SAVTA_IDLE'); }
}

export class Pakid extends Entity {
  constructor(game, def) {
    super(game, def, 'PAKID_IDLE');
    this.hurts = true; this.seedable = true; this.hp = 2; this.maxHp = 2; this.score = 200;
    this.throwT = 50; this.animThrow = 0; this.n = 847;
  }
  update() {
    if (!this.tick()) return;
    if (this.animThrow > 0) this.animThrow--;
    this.faceP();
    if (this.playerNear(140, 40)) {
      if (--this.throwT <= 0) {
        this.throwT = 100; this.animThrow = 18;
        this.game.spawnProjectile(new Projectile(this.game, 'ticket', this.cx + this.facing * 6, this.y + 4, this.facing * 2.2, 0, { gravity: 0, life: 90, spriteKey: 'TICKET', spin: false }));
        this.say([`מספר ${this.n++}`, 'Now serving 4'], 70);
        this.sfx('ui');
      }
    }
    this.vx = 0; this.fall();
  }
  draw(ctx) { this.drawSprite(ctx, this.animThrow > 0 ? 'PAKID_THROW' : 'PAKID_IDLE'); }
}

export class Matkot extends Entity {
  constructor(game, def) {
    super(game, def, 'MATKOT_IDLE');
    this.hurts = true; this.seedable = true; this.hp = 2; this.maxHp = 2; this.score = 150;
    this.hitT = 30 + Math.floor(Math.random() * 40); this.animHit = 0;
    this.facing = def.facing || -1;
  }
  update() {
    if (!this.tick()) return;
    if (this.animHit > 0) this.animHit--;
    if (this.playerNear(220, 60)) this.faceP();
    if (--this.hitT <= 0 && this.active) {
      this.hitT = 90; this.animHit = 15;
      this.game.spawnProjectile(new Projectile(this.game, 'ball', this.cx + this.facing * 8, this.y + 3, this.facing * 3, 0, { gravity: 0, life: 100, spriteKey: 'MATKOT_BALL' }));
      this.sfx('hit');
      if (Math.random() < 0.3) this.say(['!פוק', 'Pok!'], 30);
    }
    this.vx = 0; this.fall();
  }
  draw(ctx) { this.drawSprite(ctx, this.animHit > 0 ? 'MATKOT_HIT' : 'MATKOT_IDLE'); }
}

export class Jellyfish extends Entity {
  constructor(game, def) {
    super(game, def, 'JELLYFISH');
    this.hurts = true; this.seedable = false; this.stompable = false; this.stompSafe = false; this.hp = 99; this.score = 0;
    this.baseY = this.y; this.amp = def.amp || 10; this.phase = Math.random() * 6.28;
  }
  update() {
    if (!this.tick()) return;
    const py = this.y;
    this.y = this.baseY + Math.sin(this.animT / 40 + this.phase) * this.amp;
    this.x = this.x0 + Math.sin(this.animT / 90 + this.phase) * 4;
    this.dy = this.y - py;
  }
  stomp() { return false; } // hurts on all sides — handled by contact
  draw(ctx) { this.drawSprite(ctx, 'JELLYFISH', false); }
}

export class Mosquito extends Entity {
  constructor(game, def) {
    super(game, def, 'MOSQUITO');
    this.hurts = true; this.seedable = true; this.stompable = true; this.hp = 1; this.score = 50;
    this.baseY = this.y; this.buzzT = 60;
  }
  update() {
    if (!this.tick()) return;
    const p = this.player;
    const px = this.x, py = this.y;
    if (this.playerNear(200, 120)) {
      const tx = p.cx - this.cx, ty = (p.cy - 4) - this.cy;
      this.vx += sign(tx) * 0.04; this.vy += sign(ty) * 0.03;
      this.vx = clamp(this.vx, -0.8, 0.8); this.vy = clamp(this.vy, -0.6, 0.6);
      if (--this.buzzT <= 0) { this.buzzT = 150 + Math.random() * 100; this.say(['זזזזז', 'bzzzz'], 40); }
    } else { this.vx *= 0.95; this.vy = Math.sin(this.animT / 20) * 0.3; }
    this.x += this.vx + Math.sin(this.animT / 5) * 0.3; this.y += this.vy;
    this.facing = this.vx < 0 ? -1 : 1;
    if (this.y < 0) this.y = 0;
    this.dx = this.x - px; this.dy = this.y - py;
  }
}

export class Pigeon extends Entity {
  constructor(game, def) {
    super(game, def, 'PIGEON_IDLE');
    this.hurts = false; this.flying = false; this.layer = 'enemy'; this.peckT = 0;
  }
  update() {
    if (!this.tick()) return;
    if (!this.flying) {
      this.vx = 0; this.fall();
      if (this.playerNear(44, 32) || (this.player.dashT > 0 && this.playerNear(70, 40))) {
        this.flying = true; this.faceP(); this.facing *= -1; // away from player
        this.vx = this.facing * 1.4; this.vy = -1.8;
        this.game.particles.burst(this.cx, this.cy, 4, ['#d8d8e8', '#8a8aa0'], { speed: 0.8, life: 20, g: 0.05 });
        this.say(['!קורררר', 'Coo-oo!'], 40);
      }
    } else {
      this.vy -= 0.06; this.vy = Math.max(this.vy, -2.2);
      this.vx += this.facing * 0.03;
      this.x += this.vx + Math.sin(this.animT / 6) * 0.4; this.y += this.vy;
      if (this.y < -64 || Math.abs(this.cx - this.player.cx) > 420) this.remove = true;
    }
  }
  onSeed(seed) { seed.pop(); if (!this.flying) { this.flying = true; this.facing = seed.vx > 0 ? 1 : -1; this.vx = this.facing * 1.4; this.vy = -2; this.say(['!קורררר', 'Coo-oo!'], 40); } }
  draw(ctx) { this.drawSprite(ctx, this.flying ? 'PIGEON_FLY' : 'PIGEON_IDLE'); }
}

class MovingPlatform extends Entity {
  constructor(game, def, key, speed, patrol) {
    super(game, def, key);
    this.isPlatform = true; this.hurts = false; this.seedable = false; this.hp = 999; this.layer = 'enemy';
    this.patrol = def.patrol ?? patrol; this.speed = def.speed ?? speed;
    this.w = Math.max(8, this.sw - 2); this.h = Math.max(6, this.sh - 3);
    this.x = def.x - this.w / 2; this.y = def.y - this.h; this.x0 = this.x;
    this.dir = def.dir || 1; this.facing = this.dir; this.alwaysActive = true;
  }
  move() {
    const px = this.x;
    this.x += this.dir * this.speed;
    if (this.x > this.x0 + this.patrol) { this.x = this.x0 + this.patrol; this.dir = -1; }
    if (this.x < this.x0 - this.patrol) { this.x = this.x0 - this.patrol; this.dir = 1; }
    this.facing = this.dir;
    this.dx = this.x - px; this.dy = 0;
  }
  stomp() { return false; }
  onSeed(seed) { seed.pop(); }
}

export class Car extends MovingPlatform {
  constructor(game, def) {
    const variant = def.variant && game.hasSprite(def.variant) ? def.variant : ['CAR_RED', 'CAR_BLUE', 'CAR_TAXI', 'CAR_BUS'][Math.floor(Math.random() * 4)];
    super(game, def, variant, 0.8, 96);
    this.honk = def.honk !== false; this.honkT = 60 + Math.random() * 120; this.bounce = 0;
  }
  update() {
    if (!this.tick()) return;
    this.move();
    if (this.honk && this.playerNear(130, 60)) {
      if (--this.honkT <= 0) {
        this.honkT = 170 + Math.random() * 90;
        this.say(['!!!צפצוף', 'HONK!!!'], 45); this.sfx('honk'); this.bounce = 6;
        this.game.particles.burst(this.cx + this.facing * this.w / 2, this.y + 2, 3, ['#ffe9a8', '#fff'], { speed: 1, life: 10, g: 0 });
      }
    }
    if (this.bounce > 0) this.bounce--;
  }
  // CAR_* art faces LEFT (headlights on the left), so flip when driving right.
  draw(ctx) { this.drawSprite(ctx, this.spriteKey, this.facing > 0, null, 0, this.bounce > 0 && (this.bounce & 2) ? -1 : 0); }
}

export class Camel extends MovingPlatform {
  constructor(game, def) {
    super(game, def, 'CAMEL_WALK', 0.35, 100);
    this.spitT = 200;
  }
  update() {
    if (!this.tick()) return;
    this.move();
    if (--this.spitT <= 0) { this.spitT = 400 + Math.random() * 300; if (this.playerNear(120, 60)) this.say(['...', '...'], 40); }
  }
  draw(ctx) { this.drawSprite(ctx, 'CAMEL_WALK', this.facing < 0); }
}

export class Tourist extends Entity {
  constructor(game, def) {
    super(game, def, 'TOURIST');
    this.hurts = false; this.seedable = false; this.hp = 999; this.range = def.patrol ?? 60; this.talkT = 0;
    this.lines = [['?שלום! איפה הים', 'Shalom! Where is the beach?'], ['?זה כשר', 'Is this kosher?'], ['!שאלום! טודה', 'Shaloom! Toda!'], ['?כמה זה בדולרים', 'How much in dollars?']];
    this.lineI = 0; this.facing = 1;
  }
  update() {
    if (!this.tick()) return;
    if (this.talkT > 0) this.talkT--;
    const near = this.playerNear(48, 32);
    if (near) {
      this.vx = 0; this.faceP();
      if (this.talkT <= 0) { this.talkT = 150; this.say(this.lines[this.lineI++ % this.lines.length], 90); }
    } else {
      this.vx = this.facing * 0.4;
      if (this.x > this.x0 + this.range || this.x < this.x0 - this.range || (this.onGround && (!this.floorAhead() || this.hitWall))) { this.facing *= -1; this.vx = this.facing * 0.4; this.x = clamp(this.x, this.x0 - this.range, this.x0 + this.range); }
    }
    this.fall();
  }
  onSeed(seed) { seed.pop(); this.say(['!היי! לא יפה', 'Hey! Not nice!'], 50); this.flash = 6; }
}

export class BossSavta extends Entity {
  constructor(game, def) {
    super(game, def, 'BOSS_SAVTA_IDLE');
    this.hurts = true; this.seedable = true; this.stompable = false; this.hp = 9; this.maxHp = 9; this.score = 1000;
    this.name = 'סבתא רבקה'; this.nameEn = 'Savta Rivka';
    this.triggered = false; this.throwT = 80; this.hopT = 100; this.hurtT = 0; this.invT = 0; this.animThrow = 0;
    this.lineI = 0; this.dieSfx = 'boss_die'; this.deathT = 0;
    this.lines = [['!אתה רזה מדי', "You're too thin!"], ['!תאכל קובה', 'Eat kubbeh!'], ['?למה לא התקשרת', "Why didn't you call?"], ['!אני מתה מדאגה', "I'm dying of worry!"], ['!עוד קובה', 'More kubbeh!'], ['!סע לאט', 'Drive slowly!']];
    this.alwaysActive = true; this.facing = -1; this.dir = -1;
  }
  get phase() { return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3; }
  update() {
    if (this.deathT > 0) { // dramatic multi-burst death
      this.deathT--; this.animT++;
      if (this.deathT % 6 === 0) this.game.particles.burst(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 12, this.paletteColors().concat(['#fff', '#ffd447']), { speed: 2.5, life: 40, g: 0.1 });
      if (this.deathT % 8 === 0) this.game.cam.shake(3, 8);
      if (this.deathT === 0) { this.remove = true; this.game.onBossDefeated(this); }
      return;
    }
    if (!this.tick()) return;
    if (this.hurtT > 0) this.hurtT--; if (this.invT > 0) this.invT--; if (this.animThrow > 0) this.animThrow--;
    if (!this.triggered) {
      if (this.playerNear(170, 100)) { this.triggered = true; this.say(['!!!צביקה! בוא לאכול', 'Tzvika! Come eat!!!'], 90); this.sfx('savta'); this.game.cam.shake(2, 10); }
      this.vx = 0; this.fall(); return;
    }
    this.faceP();
    const ph = this.phase;
    const interval = ph === 1 ? 90 : ph === 2 ? 62 : 44;
    if (this.hurtT <= 0) {
      if (--this.throwT <= 0) {
        this.throwT = interval; this.animThrow = 18;
        const dx = this.player.cx - this.cx;
        const n = ph === 3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const vx = clamp(dx / (50 + i * 25), -3, 3) * (0.9 + Math.random() * 0.25);
          this.game.spawnProjectile(new Projectile(this.game, 'kubbeh', this.cx - 4, this.y + 4, vx, -4.6 - i * 0.6, { gravity: 0.19, life: 150, spriteKey: 'KUBBEH' }));
        }
        if (Math.random() < 0.7) this.say(this.lines[this.lineI++ % this.lines.length], 70);
        this.sfx('savta');
      }
      if (ph >= 2 && this.onGround && --this.hopT <= 0) {
        this.hopT = ph === 2 ? 110 : 70;
        this.vy = ph === 2 ? -4 : -5; this.vx = this.facing * (ph === 2 ? 1.2 : 1.8);
        this.game.particles.dust(this.cx, this.feet, 6);
      }
    }
    if (this.onGround) { this.vx *= 0.8; if (this.hurtT > 0) this.vx = 0; }
    this.fall();
    if (this.onGround && this.vy === 0 && this.hopT > 60 && this.hopT < 62) this.game.cam.shake(2, 6);
  }
  hit(dmg = 1, src = null) {
    if (this.invT > 0 || this.deathT > 0 || !this.triggered) { if (src && src.pop) src.pop(); return false; }
    this.hp -= dmg; this.flash = 16; this.hurtT = 22; this.invT = 40;
    this.game.particles.burst(this.cx, this.cy, 10, this.paletteColors(), { speed: 2, life: 24 });
    this.game.cam.shake(3, 10); this.game.hitStop = 5;
    this.sfx('boss_hit');
    this.say([['!איי', 'Oy!'], ['!חוצפה', 'Chutzpah!'], ['!!!ככה מדברים לסבתא', 'Is that how you talk to Savta?!']][Math.floor(Math.random() * 3)], 50);
    if (this.hp <= 0) { this.die(); return true; }
    if (this.hp === 6 || this.hp === 3) { this.say(this.hp === 6 ? ['!עכשיו אני כועסת', 'Now I am angry!'] : ['!!!אין יותר סבלנות', 'No more patience!!!'], 80); this.game.cam.shake(4, 14); }
    return false;
  }
  die() {
    if (this.deathT > 0) return;
    this.hurts = false; this.deathT = 70; this.hp = 0;
    this.game.addScore(this.score, this.cx, this.top);
    this.say(['...טוב, אז אני הולכת לנוח', '...Fine, I will go rest'], 70);
    this.sfx('boss_die');
  }
  stomp() { this.hit(1); return true; }
  draw(ctx) {
    const key = this.hurtT > 0 || this.deathT > 0 ? 'BOSS_SAVTA_HURT' : this.animThrow > 0 ? 'BOSS_SAVTA_THROW' : 'BOSS_SAVTA_IDLE';
    if (this.deathT > 0 && (this.deathT & 2)) return;
    this.drawSprite(ctx, key, this.facing > 0, null, this.hurtT > 0 ? ((this.hurtT & 1) ? 1 : -1) : 0);
  }
}

// ---------------------------------------------------------------- Pickups
const PICKUP_INFO = {
  bamba: { key: 'BAMBA', sfx: 'bamba', text: ['!במבה', 'Bamba!'], color: '#ffb347' },
  falafel: { key: 'FALAFEL', sfx: 'pickup', text: ['+50', '+50'], color: '#e6c76b' },
  hummus: { key: 'HUMMUS', sfx: 'hummus', text: ['!כוח חומוס', 'Hummus power!'], color: '#f4e5b8' },
  krembo: { key: 'KREMBO', sfx: 'krembo', text: ['1UP קרמבו', 'Krembo 1UP'], color: '#ff8ac2' },
  shekel: { key: 'SHEKEL', sfx: 'shekel', text: ['₪+1', '+1₪'], color: '#ffe066' },
};
export class Pickup extends Entity {
  constructor(game, def) {
    super(game, def, PICKUP_INFO[def.type].key);
    this.pickup = true; this.layer = 'pickup'; this.hurts = false; this.info = PICKUP_INFO[def.type];
    this.w = Math.max(6, this.sw - 2); this.h = Math.max(6, this.sh - 2); this.x = def.x - this.w / 2; this.y = def.y - this.h;
    this.baseY = this.y;
  }
  update() {
    if (!this.tick()) return;
    this.y = this.baseY + Math.round(Math.sin(this.animT / 12) * 2);
    if (this.type === 'shekel' && this.animT % 10 === 0 && this.active) this.game.particles.sparkle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, '#fff6b0');
    if (aabb(this, this.player) && !this.player.dead) this.collect();
  }
  collect() {
    const g = this.game, p = this.player;
    this.remove = true;
    g.sfx(this.info.sfx);
    switch (this.type) {
      case 'bamba': p.hp = Math.min(p.maxHp, p.hp + 1); g.addScore(100, this.cx, this.top, this.info.text[0]); break;
      case 'falafel': g.addScore(50, this.cx, this.top); break;
      case 'hummus': p.hummusT = 300; g.addScore(200, this.cx, this.top, this.info.text[0]); g.cam.shake(2, 8); break;
      case 'krembo': g.lives++; g.addScore(500, this.cx, this.top, this.info.text[0]); break;
      case 'shekel': g.shekels++; g.addScore(10, this.cx, this.top, '₪'); break;
    }
    g.particles.burst(this.cx, this.cy, 10, [this.info.color, '#fff', ...this.paletteColors()], { speed: 1.8, life: 24, g: 0.06 });
    if (this.type === 'hummus') for (let i = 0; i < 12; i++) g.particles.sparkle(this.cx + (Math.random() - 0.5) * 24, this.cy + (Math.random() - 0.5) * 16, `hsl(${i * 30},100%,70%)`);
  }
  draw(ctx) { this.drawSprite(ctx, this.spriteKey, false); }
}

// ---------------------------------------------------------------- Level furniture
export class Sign extends Entity {
  constructor(game, def) {
    super(game, def, 'ARROW_SIGN');
    this.layer = 'prop'; this.hurts = false; this.text = Array.isArray(def.text) ? def.text : [String(def.text || '')];
    this.flipSign = def.flip || false;
  }
  update() {
    if (!this.tick()) return;
    if (this.playerNear(40, 40)) this.game.requestBubble(this, this.text);
  }
  draw(ctx) { this.drawSprite(ctx, this.spriteKey, this.flipSign); }
}

export class Checkpoint extends Entity {
  constructor(game, def) {
    super(game, def, 'CHECKPOINT_FLAG');
    this.layer = 'pickup'; this.hurts = false; this.activated = false; this.raise = 0;
    this.w = Math.max(8, this.sw); this.h = this.sh; this.x = def.x - this.w / 2; this.y = def.y - this.h;
  }
  update() {
    if (!this.tick()) return;
    if (this.activated) { if (this.raise < 24) this.raise++; return; }
    if (aabb(this, this.player) && !this.player.dead) {
      this.activated = true; this.game.setCheckpoint(this.cx, this.feet);
      this.sfx('checkpoint');
      this.game.addScore(0, this.cx, this.top - 4, 'נקודת שמירה ✓');
      this.game.particles.burst(this.cx, this.top + 4, 12, ['#3b82f6', '#fff', '#ffd447'], { speed: 1.6, life: 30, g: 0.05 });
    }
  }
  draw(ctx) {
    const sp = this.game.sprite(this.spriteKey);
    const n = sp.frames.length;
    if (!this.activated) { this.drawSprite(ctx, this.spriteKey, false, 0); return; }
    // flag raises: play frames once, then wave
    const fi = this.raise < 24 ? Math.min(n - 1, Math.floor(this.raise / (24 / Math.max(1, n)))) : (n > 2 ? n - 1 - (Math.floor(this.animT / 8) % 2) : n - 1);
    const lift = n === 1 ? -Math.min(6, this.raise >> 2) : 0;
    this.drawSprite(ctx, this.spriteKey, false, fi, 0, lift);
  }
}

export class Prop extends Entity {
  constructor(game, def) {
    const key = def.sprite && game.hasSprite(def.sprite) ? def.sprite : (game.warnOnce(`prop sprite '${def.sprite}' missing`), def.sprite || 'MISSING');
    super(game, def, key);
    this.layer = 'prop'; this.hurts = false;
    this.w = this.sw; this.h = this.sh; this.x = def.x - this.w / 2; this.y = def.y - this.h;
  }
  update() { this.animT++; }
  draw(ctx) { this.drawSprite(ctx, this.spriteKey, !!this.def.flip); }
}

export class ExitDoor extends Entity {
  constructor(game, x, y) {
    super(game, { type: 'exit', x, y }, 'EXIT_DOOR');
    this.layer = 'pickup'; this.hurts = false; this.alwaysActive = true;
    this.w = Math.max(8, this.sw - 4); this.h = this.sh; this.x = x - this.w / 2; this.y = y - this.h;
  }
  get locked() { return this.game.bossAlive(); }
  update() {
    this.animT++;
    if (this.locked) return;
    if (this.animT % 12 === 0 && this.active) this.game.particles.sparkle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, '#fff3a0');
    if (aabb(this, this.player) && this.player.onGround && !this.player.dead) this.game.levelClear();
  }
  draw(ctx) {
    this.drawSprite(ctx, this.spriteKey, false);
    if (this.locked) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h); }
  }
}

// ---------------------------------------------------------------- Factory
const CTORS = {
  cat: Cat, savta: Savta, pakid: Pakid, matkot: Matkot, jellyfish: Jellyfish, mosquito: Mosquito, pigeon: Pigeon,
  car: Car, camel: Camel, tourist: Tourist, boss_savta: BossSavta,
  bamba: Pickup, falafel: Pickup, hummus: Pickup, krembo: Pickup, shekel: Pickup,
  sign: Sign, checkpoint: Checkpoint, prop: Prop,
};

export function createEntity(game, def) {
  const C = CTORS[def.type];
  if (!C) { game.warnOnce(`unknown entity type '${def.type}'`); return null; }
  try { return new C(game, def); }
  catch (e) { game.warnOnce(`entity '${def.type}' failed to construct: ${e.message}`); return null; }
}

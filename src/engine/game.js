// SABRA! game orchestrator: fixed-step loop, state machine, level loading, rendering, collisions, HUD glue.
import { Input } from './input.js';
import { Tilemap, TILE, KIND, aabb, clamp } from './physics.js';
import { Camera } from './camera.js';
import { Particles } from './particles.js';
import { Player, ExitDoor, createEntity } from './entities.js';

export const W = 320, H = 180, UW = 640, UH = 360;
const STEP = 1000 / 60;
const CARD_FRAMES = 170, CLEAR_FRAMES = 210, CREDITS_MIN = 120;

export class Game {
  constructor(o) {
    this.gameCanvas = o.gameCanvas; this.uiCanvas = o.uiCanvas;
    this.ctx = this.gameCanvas.getContext('2d', { alpha: false });
    this.uctx = this.uiCanvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; this.uctx.imageSmoothingEnabled = false;
    this.SPRITES = o.SPRITES; this.LEVELS = o.LEVELS; this.PARALLAX = o.PARALLAX; this.Audio = o.Audio; this.UI = o.UI;
    this.debug = !!o.debug;
    this.levelIndex = clamp(o.startLevel || 0, 0, Math.max(0, this.LEVELS.length - 1));
    this.state = 'title'; this.stateT = 0;
    this.frame = 0; this.acc = 0; this.last = 0; this.fps = 0; this._fpsN = 0; this._fpsT = 0;
    this.lives = 3; this.score = 0; this.shekels = 0;
    this.muted = false; this.audioReady = false;
    this.input = new Input().attach(window);
    this.input.onFirstGesture = () => this._audioUnlock();
    this.cam = new Camera(W, H);
    this.particles = new Particles();
    this.entities = []; this.projectiles = []; this.bubbles = []; this.player = null; this.map = null; this.level = null; this.checkpoint = null;
    this.quip = null; this.quipT = 0; this.quipI = 0;
    this.bossRef = null; this.bossDefeated = false; this.exitDoor = null;
    this._warned = new Set(); this._uiBroken = new Set(); this._decorBlock = new Set();
    this._scratch = document.createElement('canvas'); this._scratch.width = 96; this._scratch.height = 96;
    this._sctx = this._scratch.getContext('2d'); this._sctx.imageSmoothingEnabled = false;
    this._missing = {};
    this.paused = false; this.hitStop = 0;
    this.exposed = { state: 'title', levelIndex: 0, player: null, frame: 0, entities: [] };
    window.__GAME = this.exposed;
    this._fit(); window.addEventListener('resize', () => this._fit());
  }

  // ------------------------------------------------------------ infra
  warnOnce(msg) { if (this._warned.has(msg)) return; this._warned.add(msg); console.warn('[engine] ' + msg); }
  hasSprite(k) { return !!(k && this.SPRITES[k]); }
  sprite(key) {
    const s = this.SPRITES[key];
    if (s) return s;
    if (!this._missing[key]) {
      this.warnOnce(`missing sprite '${key}' — drawing magenta box`);
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#000'; x.fillRect(4, 4, 8, 8);
      this._missing[key] = { w: 16, h: 16, fps: 1, frames: [c], def: { palette: { m: '#ff00ff' } } };
    }
    return this._missing[key];
  }
  // draw a frame with a color tint (source-atop through scratch canvas)
  drawTinted(ctx, frame, x, y, flip, color, alpha) {
    const s = this._sctx, w = frame.width, h = frame.height;
    s.clearRect(0, 0, 96, 96);
    if (flip) { s.save(); s.translate(w, 0); s.scale(-1, 1); s.drawImage(frame, 0, 0); s.restore(); } else s.drawImage(frame, 0, 0);
    s.globalCompositeOperation = 'source-atop'; s.globalAlpha = alpha; s.fillStyle = color; s.fillRect(0, 0, w, h);
    s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    ctx.drawImage(this._scratch, 0, 0, w, h, Math.round(x), Math.round(y), w, h);
  }
  sfx(name) { if (!this.audioReady) return; try { this.Audio.playSfx(name); } catch (e) { this.warnOnce(`Audio.playSfx(${name}) failed: ${e.message}`); } }
  music(id) { if (!this.audioReady) { this._pendingMusic = id; return; } try { this.Audio.playMusic(id); } catch (e) { this.warnOnce(`Audio.playMusic failed: ${e.message}`); } }
  stopMusic() { this._pendingMusic = null; if (!this.audioReady) return; try { this.Audio.stopMusic(); } catch (e) { this.warnOnce(`Audio.stopMusic failed: ${e.message}`); } }
  _audioUnlock() {
    if (this.audioReady) return;
    try { this.Audio.init(); this.audioReady = true; this.Audio.setMuted(this.muted); } catch (e) { this.warnOnce(`Audio.init failed: ${e.message}`); this.audioReady = true; }
    const pend = this._pendingMusic || (this.state === 'title' ? 'title' : null);
    if (pend) this.music(pend);
  }
  ui(fn, ...args) {
    const f = this.UI && this.UI[fn];
    if (typeof f !== 'function') { if (!this._uiBroken.has(fn)) { this._uiBroken.add(fn); console.warn(`[engine] UI.${fn} missing`); } return false; }
    try { f.apply(this.UI, args); return true; }
    catch (e) { if (!this._uiBroken.has(fn)) { this._uiBroken.add(fn); console.warn(`[engine] UI.${fn} threw: ${e.message}`, e); } return false; }
  }
  _fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let scale = Math.floor(Math.min(vw / W, vh / H));
    if (scale < 1) scale = Math.min(vw / W, vh / H);
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    const left = Math.round((vw - cw) / 2), top = Math.round((vh - ch) / 2);
    for (const c of [this.gameCanvas, this.uiCanvas]) {
      c.style.width = cw + 'px'; c.style.height = ch + 'px'; c.style.left = left + 'px'; c.style.top = top + 'px'; c.style.position = 'absolute';
      c.style.imageRendering = 'pixelated';
    }
    this.scale = scale;
  }

  // ------------------------------------------------------------ state machine
  setState(s) {
    this.state = s; this.stateT = 0; this.input.clearEdges();
    if (s === 'title') { this.music('title'); this.levelIndex = clamp(this.levelIndex, 0, this.LEVELS.length - 1); }
  }
  start() {
    this.setState('title');
    this.last = performance.now();
    const loop = (now) => {
      let dt = now - this.last; this.last = now;
      if (dt > 250) dt = 250; // tab was hidden: don't spiral
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) { this.tick(); this.acc -= STEP; steps++; }
      if (steps === 5) this.acc = 0;
      this.render();
      this._fpsN++; if (now - this._fpsT > 500) { this.fps = Math.round(this._fpsN * 1000 / (now - this._fpsT)); this._fpsN = 0; this._fpsT = now; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  tick() {
    const inp = this.input;
    inp.beginTick();
    this.frame++; this.stateT++;
    if (inp.justPressed('mute')) { this.muted = !this.muted; if (this.audioReady) try { this.Audio.setMuted(this.muted); } catch (e) { /* stub */ } }
    switch (this.state) {
      case 'title':
        if (inp.justPressed('confirm') && this.stateT > 10) { this.sfx('ui'); this.loadLevel(this.levelIndex); }
        break;
      case 'levelcard':
        if ((inp.justPressed('confirm') && this.stateT > 15) || this.stateT >= CARD_FRAMES) { this.setState('playing'); this.music(this.level.id); }
        break;
      case 'playing':
        if (inp.justPressed('pause')) { this.setState('pause'); this.sfx('ui'); break; }
        if (this.hitStop > 0) { this.hitStop--; break; } // hit-stop: freeze a few frames for impact
        this.updatePlaying();
        break;
      case 'pause':
        if (inp.justPressed('pause') || inp.justPressed('confirm')) { this.setState('playing'); this.sfx('ui'); }
        break;
      case 'levelclear':
        this.particles.update(); this.cam.update(this.player);
        if (this.stateT === 1) { for (let i = 0; i < 30; i++) this.particles.sparkle(this.player.cx + (Math.random() - 0.5) * 60, this.player.y - Math.random() * 40, `hsl(${i * 12},100%,70%)`); }
        if (this.stateT % 10 === 0 && this.stateT < 120) this.particles.burst(this.cam.ix + Math.random() * W, this.cam.iy + Math.random() * H * 0.6, 8, ['#ffd447', '#ff6b6b', '#6bd3ff', '#fff'], { speed: 1.5, life: 40, g: 0.05 });
        if ((inp.justPressed('confirm') && this.stateT > 60) || this.stateT >= CLEAR_FRAMES) this.nextLevel();
        break;
      case 'gameover':
        this.particles.update();
        if (inp.justPressed('confirm') && this.stateT > 45) { this.lives = 3; this.sfx('ui'); this.loadLevel(this.levelIndex); }
        break;
      case 'credits':
        if (inp.justPressed('confirm') && this.stateT > CREDITS_MIN) { this.levelIndex = 0; this.score = 0; this.shekels = 0; this.lives = 3; this.setState('title'); }
        break;
    }
    // live references for the smoke test / debugging
    const ex = this.exposed;
    ex.state = this.state; ex.levelIndex = this.levelIndex; ex.player = this.player; ex.frame = this.frame; ex.entities = this.entities; ex.game = this;
  }

  // ------------------------------------------------------------ levels
  loadLevel(i) {
    const level = this.LEVELS[i];
    if (!level) { this.warnOnce(`no level ${i}`); this.setState('credits'); return; }
    this.levelIndex = i; this.level = level;
    if (level.tileSize && level.tileSize !== TILE) this.warnOnce(`level ${level.id} tileSize ${level.tileSize} ≠ 16 — using 16`);
    this.map = new Tilemap(level);
    this.theme = (level.theme || 'TELAVIV').toUpperCase();
    this.parallax = this.PARALLAX[this.theme] || this.PARALLAX[Object.keys(this.PARALLAX)[0]];
    if (!this.PARALLAX[this.theme]) this.warnOnce(`no parallax for theme ${this.theme} — using fallback`);
    this.entities = []; this.projectiles = []; this.bubbles = []; this.particles.clear();
    this.bossRef = null; this.bossDefeated = false;
    // ground-decor is skipped on columns that hold an entity's feet (plus a moving platform's whole patrol run)
    this._decorBlock = new Set();
    const blockCols = (x0, x1) => { for (let c = Math.floor(x0 / TILE); c <= Math.floor(x1 / TILE); c++) this._decorBlock.add(c); };
    for (const def of level.entities || []) {
      const e = createEntity(this, { ...def });
      if (!e) continue;
      this.entities.push(e);
      if (def.type === 'boss_savta') this.bossRef = e;
      const reach = e.isPlatform && e.patrol ? e.patrol : 0;
      blockCols(e.x - reach, e.x + e.w - 1 + reach);
    }
    // draw order within layers: props first, then pickups, enemies (keeps platforms under walkers)
    const spawn = level.spawn || { x: 32, y: this.map.h - 32 };
    this.checkpoint = { x: spawn.x, y: spawn.y };
    this.player = new Player(this, spawn.x, spawn.y);
    const ex = level.exit || { x: this.map.w - 40, y: spawn.y };
    this.exitDoor = new ExitDoor(this, ex.x, ex.y); this.entities.push(this.exitDoor);
    blockCols(this.exitDoor.x, this.exitDoor.x + this.exitDoor.w - 1); blockCols(this.player.x, this.player.x + this.player.w - 1);
    this.cam.setBounds(this.map.w, this.map.h); this.cam.snapTo(this.player);
    this.quip = null; this.quipT = 240; this.quipI = Math.floor(Math.random() * ((level.quips || []).length || 1));
    this.stopMusic();
    this.setState('levelcard');
  }
  nextLevel() {
    if (this.levelIndex + 1 < this.LEVELS.length) this.loadLevel(this.levelIndex + 1);
    else { this.stopMusic(); this.setState('credits'); this.music('title'); }
  }
  levelClear() {
    if (this.state !== 'playing') return;
    this.stopMusic();
    this.sfx('levelclear');
    if (this.levelIndex + 1 >= this.LEVELS.length) setTimeout(() => this.sfx('siren'), 900); // Shabbat siren → credits
    this.addScore(500 + this.player.hp * 100, this.player.cx, this.player.y - 8, '!סחתיין');
    this.player.vx = 0; this.player.anim = 'idle';
    this.setState('levelclear');
  }
  bossAlive() { return !!(this.bossRef && !this.bossRef.remove && this.bossRef.hp > 0); }
  onBossDefeated() { this.bossDefeated = true; this.particles.popup(this.exitDoor.cx, this.exitDoor.top - 10, '!הדלת נפתחה', '#ffd447', 90); this.sfx('checkpoint'); }
  setCheckpoint(x, y) { this.checkpoint = { x, y }; }

  // ------------------------------------------------------------ gameplay
  addScore(n, x, y, text) {
    this.score += n;
    const label = text !== undefined ? text : (n > 0 ? `+${n}` : '');
    if (label) this.particles.popup(x, y - 6, label, n >= 500 ? '#ffd447' : n >= 200 ? '#ffb347' : '#ffffff', n >= 500 ? 70 : 45);
  }
  spawnProjectile(p) { this.projectiles.push(p); }
  countProjectiles(kind) { let n = 0; for (const p of this.projectiles) if (p.kind === kind && !p.dead) n++; return n; }
  requestBubble(entity, lines) { this.bubbles.push({ x: entity.cx, y: entity.top, lines }); }

  hurtPlayer(srcX, amount = 1, why = 'enemy') {
    const p = this.player;
    if (p.invincible || p.hurtT > 0) return false;
    p.hp -= amount;
    this.cam.shake(3, 12); this.hitStop = 5;
    this.particles.burst(p.cx, p.cy, 8, ['#ff5c5c', '#fff', '#7dd87d'], { speed: 2, life: 22 });
    if (p.hp <= 0) { this.killPlayer(); return true; }
    this.sfx('hurt');
    p.hurtT = 22; p.invT = 90; p.dashT = 0; p.carrier = null; p.onGround = false; p.jumping = false;
    p.vx = (p.cx < srcX ? -1 : 1) * 2.6; p.vy = -3.6;
    p.sqx = 1.25; p.sqy = 0.8;
    this.particles.popup(p.cx, p.y - 8, why === 'hazard' ? '!איי' : '!אוי', '#ff8080', 35);
    return true;
  }
  killPlayer() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true; p.deadT = 0; p.hp = 0; p.vx = 0; p.vy = -5.5; p.dashT = 0; p.carrier = null; p.hummusT = 0;
    this.sfx('hurt'); this.cam.shake(5, 18);
    this.particles.burst(p.cx, p.cy, 14, ['#3fae4b', '#7dd87d', '#ff5c5c'], { speed: 2.5, life: 30, g: 0.1 });
    this.particles.popup(p.cx, p.y - 10, '!!!אמאל\'ה', '#ff8080', 70);
  }
  fellOff() {
    const p = this.player;
    if (p.dead) return;
    p.hp -= 1; this.cam.shake(3, 10); this.sfx('hurt');
    if (p.hp <= 0) { p.dead = true; p.deadT = 60; p.hp = 0; return; } // respawn() on next frames handles life loss
    this.respawnAt(this.checkpoint, false);
    this.particles.popup(p.cx, p.y - 8, '?לאן נפלת', '#ff8080', 50);
  }
  respawn() {
    // called after death animation
    this.lives--;
    if (this.lives <= 0) { this.stopMusic(); this.sfx('gameover'); this.setState('gameover'); return; }
    this.respawnAt(this.checkpoint, true);
  }
  respawnAt(cp, full) {
    const p = this.player;
    p.dead = false; p.deadT = 0; if (full) p.hp = p.maxHp; else p.hp = Math.max(1, p.hp);
    p.x = cp.x - p.w / 2; p.y = cp.y - p.h; p.vx = 0; p.vy = 0; p.invT = 100; p.hurtT = 0; p.dashT = 0; p.carrier = null; p.hummusT = 0; p.facing = 1;
    p.prevFeet = p.feet; p.sqx = 0.6; p.sqy = 1.4;
    this.projectiles.length = 0;
    this.cam.snapTo(p);
    this.particles.burst(p.cx, p.cy, 12, ['#fff', '#7dd87d', '#ffd447'], { speed: 1.5, life: 26, g: 0 });
  }

  updatePlaying() {
    const inp = this.input, p = this.player, cam = this.cam;
    this.bubbles.length = 0;
    // activation window around camera
    const ax0 = cam.x - 220, ax1 = cam.x + W + 220;
    for (const e of this.entities) {
      if (e.remove) continue;
      e.active = e.alwaysActive || (e.x + e.w > ax0 && e.x < ax1) || !!e.bubble || e.dying > 0;
      if (!e.active) continue;
      try { e.update(); } catch (err) { this.warnOnce(`entity ${e.type} update threw: ${err.message}`); e.remove = true; }
    }
    p.update(inp);
    // projectiles
    for (const pr of this.projectiles) { if (!pr.dead) pr.update(); }
    this._collide();
    // cleanup
    this.entities = this.entities.filter((e) => !e.remove);
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);
    this.particles.update();
    cam.update(p);
    // bubbles from entities
    for (const e of this.entities) if (e.bubble && cam.visible(e.x, e.y, e.w, e.h, 40)) this.bubbles.push({ x: e.cx, y: e.top, lines: e.bubble.lines });
    // quips
    const quips = this.level.quips || [];
    if (quips.length) {
      if (this.quip) { if (--this.quipT <= 0) { this.quip = null; this.quipT = 900 - 330; } }
      else if (--this.quipT <= 0) { this.quip = quips[this.quipI++ % quips.length]; this.quipT = 330; }
    }
  }

  _collide() {
    const p = this.player;
    if (p.dead) return;
    const pb = { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 2 };
    const jumpHeld = this.input.isDown('jump');
    for (const e of this.entities) {
      if (e.remove || e.dying > 0 || e.layer !== 'enemy' || !e.active) continue;
      if (!e.hurts && !e.stompable) continue;
      if (!aabb(pb, e)) continue;
      // hummus power: touch = kill
      if (p.hummusT > 0 && e.type !== 'boss_savta' && !e.isPlatform) { e.hit(99); this.particles.sparkle(e.cx, e.cy, '#fff'); continue; }
      const falling = p.vy >= -0.5 && !p.onGround;
      const fromAbove = p.prevFeet <= e.top + 5 && p.feet >= e.top;
      if (falling && fromAbove && e.stompSafe) {
        const killed = e.stomp();
        p.vy = jumpHeld ? -5.4 : -3.8; p.jumping = jumpHeld; p.y = e.top - p.h - 0.5; p.onGround = false; p.coyote = 0;
        p.sqx = 0.75; p.sqy = 1.3;
        this.sfx(killed ? 'stomp' : 'jump'); this.cam.shake(killed ? 2 : 1, 8); if (killed) this.hitStop = 3;
        if (!killed && e.type === 'boss_savta') { /* boss handles own hit */ }
        continue;
      }
      if (p.hummusT > 0 && e.type === 'boss_savta') { e.hit(1); p.vx = -p.facing * 2; continue; }
      if (e.hurts) this.hurtPlayer(e.cx);
    }
    // projectiles
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      if (pr.owner === 'player') {
        if (pr.harmless) continue;
        for (const e of this.entities) {
          if (e.remove || e.dying > 0 || e.layer !== 'enemy' || !e.active || e.type === 'exit') continue;
          if (aabb(pr, e)) { e.onSeed(pr); break; }
        }
        if (!pr.dead) for (const o of this.projectiles) { if (o !== pr && !o.dead && o.owner !== 'player' && aabb(pr, o)) { o.pop(); pr.pop(); this.addScore(25, o.cx, o.cy); this.sfx('hit'); break; } }
      } else if (aabb(pr, pb)) {
        if (p.hummusT > 0) { pr.pop(); this.addScore(10, pr.cx, pr.cy); continue; }
        if (!p.invincible && p.hurtT <= 0) { pr.pop(); this.hurtPlayer(pr.cx); }
      }
    }
  }

  hudState() {
    const p = this.player;
    return {
      hearts: p ? Math.max(0, p.hp) : 3, maxHearts: p ? p.maxHp : 3, lives: this.lives, score: this.score, shekels: this.shekels,
      levelName: this.level ? this.level.name : '', levelNameEn: this.level ? this.level.nameEn : '',
      quip: this.quip, hummusTimer: p ? p.hummusT : 0, seeds: Infinity, muted: this.muted, levelIndex: this.levelIndex, levelCount: this.LEVELS.length,
      dashReady: p ? p.dashCd === 0 : true, debug: this.debug, fps: this.fps,
    };
  }

  // ------------------------------------------------------------ rendering
  render() {
    const ctx = this.ctx, uctx = this.uctx, t = this.frame / 60;
    ctx.imageSmoothingEnabled = false; uctx.imageSmoothingEnabled = false;
    uctx.clearRect(0, 0, UW, UH);
    const hud = this.hudState();
    if (this.state === 'title' || this.state === 'credits') {
      const theme = this.state === 'credits' ? 'JERUSALEM' : 'TELAVIV';
      const px = this.PARALLAX[theme] || this.PARALLAX[Object.keys(this.PARALLAX)[0]];
      this._drawParallax(px, this.frame * 0.35, 0, t);
      if (px && px.fog) this._safe(px, 'fog', ctx, W, H, t);
      if (this.state === 'title') this.ui('drawTitle', uctx, UW, UH, t, hud);
      else this.ui('drawCredits', uctx, UW, UH, t);
      this._debugText(uctx);
      return;
    }
    if (!this.level) return;
    const cam = this.cam;
    this._drawParallax(this.parallax, cam.ix, cam.iy, t);
    ctx.save();
    ctx.translate(-cam.ix, -cam.iy);
    // props (behind tiles)
    for (const e of this.entities) if (e.layer === 'prop' && cam.visible(e.x, e.y, e.sw, e.sh, 16)) e.draw(ctx);
    this._drawTiles(ctx, cam);
    for (const e of this.entities) if (e.layer === 'pickup' && cam.visible(e.x, e.y, e.w, e.h, 16)) e.draw(ctx);
    this.particles.drawGhosts(ctx);
    for (const e of this.entities) if (e.layer === 'enemy' && cam.visible(e.x - 8, e.y - 8, e.sw + 16, e.sh + 16, 16)) e.draw(ctx);
    for (const pr of this.projectiles) if (!pr.dead) pr.draw(ctx);
    this.player.draw(ctx);
    this.particles.draw(ctx);
    this._drawWater(ctx, cam);
    if (this.debug) this._drawHitboxes(ctx);
    ctx.restore();
    if (this.parallax && this.parallax.fog) this._safe(this.parallax, 'fog', ctx, W, H, t);

    // ---- UI layer
    if (this.state === 'levelclear') { uctx.fillStyle = 'rgba(0,0,0,0.25)'; uctx.fillRect(0, 0, UW, UH); }
    this.ui('drawHud', uctx, UW, UH, hud);
    for (const b of this.bubbles) {
      const s = cam.toScreen(b.x, b.y);
      this.ui('drawBubble', uctx, s.x * 2, (s.y - 4) * 2, b.lines);
    }
    if (this.bossRef && this.bossRef.triggered && !this.bossRef.remove) this.ui('drawBossBar', uctx, UW, UH, { name: this.bossRef.name, nameEn: this.bossRef.nameEn, hp: Math.max(0, this.bossRef.hp), maxHp: this.bossRef.maxHp, phase: this.bossRef.phase });
    this.particles.drawPopups(uctx, cam, 2);
    if (this.state === 'levelcard') this.ui('drawLevelCard', uctx, UW, UH, t, this.level, clamp(this.stateT / CARD_FRAMES, 0, 1));
    else if (this.state === 'pause') this.ui('drawPause', uctx, UW, UH);
    else if (this.state === 'gameover') this.ui('drawGameOver', uctx, UW, UH, t, hud);
    else if (this.state === 'levelclear') this._drawLevelClear(uctx, t);
    this._debugText(uctx);
  }

  _drawLevelClear(uctx, t) {
    const prog = clamp(this.stateT / CLEAR_FRAMES, 0, 1);
    if (typeof this.UI.drawLevelClear === 'function') { this.ui('drawLevelClear', uctx, UW, UH, t, this.level, prog, this.hudState()); return; }
    const last = this.levelIndex + 1 >= this.LEVELS.length;
    const fake = { ...this.level, name: last ? '!שבת שלום' : '!סחתיין', nameEn: last ? 'Shabbat Shalom!' : 'Level clear!',
      intro: last ? ['הצפירה נשמעת... הכל נסגר', 'The siren sounds... everything closes'] : [`+${this.player.hp * 100 + 500} · ${this.level.name}`, `Score ${this.score}`] };
    this.ui('drawLevelCard', uctx, UW, UH, t, fake, prog);
  }

  _safe(obj, fn, ...args) {
    try { obj[fn](...args); } catch (e) { this.warnOnce(`parallax.${fn} threw: ${e.message}`); }
  }
  _drawParallax(px, camX, camY, t) {
    const ctx = this.ctx;
    if (!px) { ctx.fillStyle = '#4a90d9'; ctx.fillRect(0, 0, W, H); return; }
    ctx.save(); if (px.sky) this._safe(px, 'sky', ctx, W, H, t); else { ctx.fillStyle = '#7ec8ff'; ctx.fillRect(0, 0, W, H); } ctx.restore();
    for (const layer of px.layers || []) {
      ctx.save(); ctx.globalAlpha = 1;
      try { layer.draw(ctx, Math.round(camX), Math.round(camY), W, H, t); } catch (e) { this.warnOnce(`parallax layer threw: ${e.message}`); }
      ctx.restore();
    }
  }
  _tileKey(kind, top) {
    const T = this.theme;
    switch (kind) {
      case KIND.GROUND: return top ? `${T}_GROUND_TOP` : `${T}_GROUND`;
      case KIND.PLATFORM: return `${T}_PLATFORM`;
      case KIND.WALL: return `${T}_WALL`;
      case KIND.HAZARD: return `${T}_HAZARD`;
    }
    return null;
  }
  _drawTiles(ctx, cam) {
    const m = this.map;
    const tx0 = Math.max(0, Math.floor(cam.ix / TILE)), tx1 = Math.min(m.cols - 1, Math.floor((cam.ix + W) / TILE));
    const ty0 = Math.max(0, Math.floor(cam.iy / TILE)), ty1 = Math.min(m.rows - 1, Math.floor((cam.iy + H) / TILE));
    const decor = [1, 2, 3].map((i) => this.SPRITES[`${this.theme}_DECOR${i}`]).filter(Boolean);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * m.cols + tx, k = m.kinds[i];
      if (k === KIND.EMPTY || k === KIND.WATER) continue;
      let key = this._tileKey(k, m.isTop[i]);
      // Break up long hazard runs without making the base tile itself repetitive.
      // Themes can opt in by exporting a HAZARD2 sprite; Ayalon uses it for occasional manholes.
      if (k === KIND.HAZARD && this.SPRITES[`${this.theme}_HAZARD2`] && (((tx * 2654435761) >>> 0) % 4 === 0)) {
        key = `${this.theme}_HAZARD2`;
      }
      const sp = this.sprite(key);
      const fi = sp.frames.length > 1 ? Math.floor(this.frame * (sp.fps || 6) / 60) % sp.frames.length : 0;
      ctx.drawImage(sp.frames[fi], tx * TILE, ty * TILE + (sp.h > TILE ? TILE - sp.h : 0));
      // optional decor sprinkled on top of ground-top tiles: ~1 in 7 columns (deterministic per column),
      // never on a column where an entity stands, never two in a row
      if (decor.length && m.isTop[i] && ty > 0 && m.kinds[i - m.cols] === KIND.EMPTY && !this._decorBlock.has(tx)) {
        const h = ((tx * 2654435761) >>> 0) % 7, hp = (((tx - 1) * 2654435761) >>> 0) % 7;
        if (h === 0 && hp !== 0) { const d = decor[(tx >> 2) % decor.length]; ctx.drawImage(d.frames[Math.floor(this.frame * (d.fps || 4) / 60) % d.frames.length], tx * TILE, ty * TILE - d.h); }
      }
    }
    // Empty columns at the bottom are lethal pits. Darken only their lowest three tiles so foreground
    // parallax details cannot masquerade as walkable ground, while water/hazard inlets remain visible.
    const pitTop = Math.max(0, m.rows - 3);
    for (let ty = Math.max(ty0, pitTop); ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * m.cols + tx;
      if (m.kinds[i] !== KIND.EMPTY) continue;
      let floorBelow = false;
      for (let by = ty; by < m.rows; by++) {
        const below = m.kinds[by * m.cols + tx];
        if (below !== KIND.EMPTY && below !== KIND.WATER) { floorBelow = true; break; }
      }
      if (!floorBelow) {
        ctx.fillStyle = `rgba(8,6,20,${0.35 + 0.2 * (ty - pitTop)})`;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }
  _drawWater(ctx, cam) {
    const m = this.map;
    const tx0 = Math.max(0, Math.floor(cam.ix / TILE)), tx1 = Math.min(m.cols - 1, Math.floor((cam.ix + W) / TILE));
    const ty0 = Math.max(0, Math.floor(cam.iy / TILE)), ty1 = Math.min(m.rows - 1, Math.floor((cam.iy + H) / TILE));
    const wave = Math.floor(this.frame / 8) % 4;
    let any = false;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (m.kinds[ty * m.cols + tx] !== KIND.WATER) continue;
      any = true;
      const x = tx * TILE, y = ty * TILE;
      const surface = ty === 0 || m.kinds[(ty - 1) * m.cols + tx] !== KIND.WATER;
      ctx.fillStyle = 'rgba(70,150,230,0.42)'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(120,200,255,0.35)';
      for (let b = 0; b < 2; b++) { const by = y + ((b * 8 + wave * 2 + tx * 3) % 16); ctx.fillRect(x, by, TILE, 2); }
      if (surface) { ctx.fillStyle = 'rgba(230,250,255,0.85)'; const off = (Math.floor(this.frame / 10) + tx) % 2 ? 1 : 0; ctx.fillRect(x, y + off, TILE, 1); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + ((tx * 5 + wave * 3) % 12), y + 2 + off, 4, 1); }
    }
    return any;
  }
  _drawHitboxes(ctx) {
    ctx.lineWidth = 1;
    const box = (b, c) => { ctx.strokeStyle = c; ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.round(b.w) - 1, Math.round(b.h) - 1); };
    box(this.player, '#00ff00');
    for (const e of this.entities) if (this.cam.visible(e.x, e.y, e.w, e.h)) box(e, e.isPlatform ? '#00ffff' : e.hurts ? '#ff4040' : e.pickup ? '#ffff00' : '#8888ff');
    for (const p of this.projectiles) box(p, '#ff00ff');
    ctx.strokeStyle = '#ffffff'; ctx.strokeRect(Math.round(this.checkpoint.x) - 2.5, Math.round(this.checkpoint.y) - 2.5, 5, 5);
  }
  _debugText(uctx) {
    if (!this.debug) return;
    const p = this.player;
    uctx.save(); uctx.font = '10px monospace'; uctx.textAlign = 'left'; uctx.textBaseline = 'top'; uctx.fillStyle = '#0f0';
    const lines = [`fps ${this.fps} f${this.frame} ${this.state} L${this.levelIndex + 1}`,
      p ? `p ${p.x.toFixed(1)},${p.y.toFixed(1)} v ${p.vx.toFixed(2)},${p.vy.toFixed(2)} g${p.onGround ? 1 : 0} c${p.coyote} d${p.dashT}/${p.dashCd} ${p.anim}${p.carrier ? ' carried' : ''}${p.inWater ? ' water' : ''}` : '',
      `ent ${this.entities.length} proj ${this.projectiles.length} part ${this.particles.list.length} cam ${this.cam.ix},${this.cam.iy}`];
    lines.forEach((l, i) => { uctx.fillStyle = '#000'; uctx.fillText(l, 5, 301 + i * 11); uctx.fillStyle = '#0f0'; uctx.fillText(l, 4, 300 + i * 11); });
    uctx.restore();
  }
}

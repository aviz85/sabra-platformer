// Keyboard input — action-mapped, edge-detected per fixed tick.
// Actions: left, right, up, down, jump, spit, dash, pause, mute, confirm

const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up', 'jump'], KeyW: ['up', 'jump'],
  ArrowDown: ['down'], KeyS: ['down'],
  KeyZ: ['jump', 'confirm'], Space: ['jump', 'confirm'],
  KeyX: ['spit'], KeyC: ['spit'],
  ShiftLeft: ['dash'], ShiftRight: ['dash'],
  KeyP: ['pause'], Escape: ['pause'],
  KeyM: ['mute'],
  Enter: ['confirm'], NumpadEnter: ['confirm'],
};

const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

export class Input {
  constructor() {
    this.keys = new Set();        // physical codes currently held
    this.count = {};              // action → number of held keys mapping to it
    this.pressQueue = {};         // actions pressed since last tick
    this.releaseQueue = {};
    this.pressed = {};            // actions pressed during the current tick
    this.released = {};
    this.onFirstGesture = null;   // callback (audio unlock)
    this._gestured = false;
    this._onDown = (e) => this._keydown(e);
    this._onUp = (e) => this._keyup(e);
    this._onBlur = () => this.reset();
  }

  attach(target = window) {
    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);
    target.addEventListener('blur', this._onBlur);
    const gesture = () => this._gesture();
    target.addEventListener('pointerdown', gesture, { passive: true });
    target.addEventListener('touchstart', gesture, { passive: true });
    return this;
  }

  _gesture() {
    if (this._gestured) return;
    this._gestured = true;
    try { this.onFirstGesture && this.onFirstGesture(); } catch (e) { console.warn('[input] gesture handler failed', e); }
  }

  _keydown(e) {
    const actions = KEYMAP[e.code];
    if (PREVENT.has(e.code)) e.preventDefault();
    this._gesture();
    if (!actions || e.repeat || this.keys.has(e.code)) return;
    this.keys.add(e.code);
    for (const a of actions) {
      this.count[a] = (this.count[a] || 0) + 1;
      this.pressQueue[a] = true;
    }
  }

  _keyup(e) {
    const actions = KEYMAP[e.code];
    if (!actions || !this.keys.has(e.code)) return;
    this.keys.delete(e.code);
    for (const a of actions) {
      this.count[a] = Math.max(0, (this.count[a] || 0) - 1);
      this.releaseQueue[a] = true;
    }
  }

  // Called once at the start of every fixed tick: promote queued edges.
  beginTick() {
    this.pressed = this.pressQueue; this.pressQueue = {};
    this.released = this.releaseQueue; this.releaseQueue = {};
  }

  isDown(a) { return (this.count[a] || 0) > 0; }
  justPressed(a) { return !!this.pressed[a]; }
  justReleased(a) { return !!this.released[a]; }

  // Drop pending edges (used on state transitions so one key press doesn't leak into gameplay).
  clearEdges() { this.pressQueue = {}; this.releaseQueue = {}; this.pressed = {}; this.released = {}; }

  reset() { this.keys.clear(); this.count = {}; this.clearEdges(); }
}

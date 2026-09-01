// SABRA! audio — WebAudio-only chiptune synth. No files, no network, all procedural.
// export const Audio = { init(), playSfx(name), playMusic(themeId), stopMusic(), setMuted(bool) }
//
// Signal graph:  voices → sfxBus / musicBus → compressor → master (0.35) → destination
// Music: per-theme step sequencer (16th-note grid, lookahead 0.1 s, setInterval 25 ms), 3 voices
// (lead square/triangle w/ vibrato, triangle bass, noise+osc drums) + optional "honk stab" chord voice.
// Scales: D-hijaz style (0 1 4 5 7 8 10 12 …) — Middle-Eastern / Israeli folk flavor. All tunes original.

const MASTER_VOL = 0.35;
const LOOKAHEAD = 0.1;      // seconds scheduled ahead
const TICK_MS = 25;         // scheduler interval

let ac = null, master = null, comp = null, sfxBus = null, musicBus = null;
let noiseBuf = null;
let muted = false;
let current = null;         // active music track { id, gain, timer, ... }
let pendingTheme = null;    // playMusic() called before init()
let gestureHooked = false;
const stats = { sfx: 0, notes: 0, late: 0, steps: 0, themes: [] };

// ───────────────────────────── helpers ─────────────────────────────
const semi = (root, n) => root * Math.pow(2, n / 12);
const clampF = (f) => Math.max(20, Math.min(12000, f));

function makeNoise() {
  const len = ac.sampleRate; // 1 s
  const b = ac.createBuffer(1, len, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function resume() {
  if (ac && ac.state !== 'running') { try { ac.resume(); } catch (e) { /* ignore */ } }
}

function hookGestures() {
  if (gestureHooked || typeof window === 'undefined') return;
  gestureHooked = true;
  const g = () => resume();
  window.addEventListener('keydown', g, { passive: true });
  window.addEventListener('pointerdown', g, { passive: true });
  window.addEventListener('touchstart', g, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume(); });
}

// One oscillator with pitch ramp + gain envelope. Returns end time.
// o = { type, f0, f1, dur, vol, at=0, curve='exp', attack=0.004, detune=0, bus }
function tone(o) {
  const t0 = ac.currentTime + (o.at || 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = o.type || 'square';
  if (o.detune) osc.detune.value = o.detune;
  osc.frequency.setValueAtTime(clampF(o.f0), t0);
  if (o.f1 != null && o.f1 !== o.f0) {
    if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(clampF(o.f1), t0 + o.dur);
    else osc.frequency.exponentialRampToValueAtTime(clampF(o.f1), t0 + o.dur);
  }
  const a = o.attack != null ? o.attack : 0.004;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.vol, t0 + a);
  if (o.hold) g.gain.setValueAtTime(o.vol, t0 + o.dur - Math.min(o.release || 0.05, o.dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g); g.connect(o.bus || sfxBus);
  osc.start(t0); osc.stop(t0 + o.dur + 0.02);
  return t0 + o.dur;
}

// Noise burst through a filter. n = { dur, vol, at, type='highpass', f0, f1, q, bus }
function noise(n) {
  const t0 = ac.currentTime + (n.at || 0);
  const src = ac.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = n.type || 'highpass';
  f.frequency.setValueAtTime(clampF(n.f0 || 1000), t0);
  if (n.f1) f.frequency.exponentialRampToValueAtTime(clampF(n.f1), t0 + n.dur);
  if (n.q) f.Q.value = n.q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(n.vol, t0 + (n.attack || 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  src.connect(f); f.connect(g); g.connect(n.bus || sfxBus);
  src.start(t0); src.stop(t0 + n.dur + 0.02);
  return t0 + n.dur;
}

// Vibrato LFO → osc.detune (cents). Returns the lfo so caller can stop it.
function vibrato(osc, t0, t1, rate, depthCents, delay = 0.06) {
  const lfo = ac.createOscillator();
  const lg = ac.createGain();
  lfo.type = 'sine'; lfo.frequency.value = rate;
  lg.gain.setValueAtTime(0, t0);
  lg.gain.linearRampToValueAtTime(depthCents, t0 + delay);
  lfo.connect(lg); lg.connect(osc.detune);
  lfo.start(t0); lfo.stop(t1 + 0.02);
  return lfo;
}

// ───────────────────────────── SFX ─────────────────────────────
const SFX = {
  jump() { tone({ type: 'square', f0: 320, f1: 760, dur: 0.13, vol: 0.32 }); },
  spit() {
    noise({ dur: 0.05, vol: 0.35, f0: 2500, f1: 6000 });
    tone({ type: 'square', f0: 1400, f1: 500, dur: 0.07, vol: 0.22, at: 0.01 });
  },
  hit() {
    tone({ type: 'square', f0: 620, f1: 110, dur: 0.09, vol: 0.34 });
    noise({ dur: 0.07, vol: 0.3, type: 'bandpass', f0: 1800, q: 1.5 });
  },
  hurt() {
    tone({ type: 'sawtooth', f0: 420, f1: 300, dur: 0.1, vol: 0.3 });
    tone({ type: 'sawtooth', f0: 300, f1: 70, dur: 0.28, vol: 0.32, at: 0.1 });
    noise({ dur: 0.12, vol: 0.18, type: 'lowpass', f0: 900, f1: 200 });
  },
  pickup() {
    tone({ type: 'square', f0: 880, f1: 880, dur: 0.06, vol: 0.25 });
    tone({ type: 'square', f0: 1320, f1: 1320, dur: 0.1, vol: 0.25, at: 0.06 });
  },
  bamba() { // sweet peanut arpeggio
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f, dur: 0.12, vol: 0.34, at: i * 0.06 }));
    tone({ type: 'square', f0: 1046, f1: 1046, dur: 0.22, vol: 0.14, at: 0.24, hold: true });
  },
  hummus() { // power-up shimmer climbing the hijaz
    [0, 1, 4, 5, 7, 8, 11, 12, 16, 19].forEach((n, i) => tone({ type: 'square', f0: semi(440, n), f1: semi(440, n), dur: 0.09, vol: 0.22, at: i * 0.045 }));
    tone({ type: 'triangle', f0: 880, f1: 1760, dur: 0.5, vol: 0.2, at: 0.3, hold: true });
    tone({ type: 'square', f0: 1760, f1: 1760, dur: 0.35, vol: 0.12, at: 0.5, detune: 8 });
  },
  krembo() { // 1-up
    [659, 784, 1318, 1046].forEach((f, i) => tone({ type: 'square', f0: f, f1: f, dur: 0.11, vol: 0.28, at: i * 0.08 }));
    tone({ type: 'square', f0: 1568, f1: 1568, dur: 0.4, vol: 0.26, at: 0.32, hold: true });
    tone({ type: 'triangle', f0: 1568, f1: 1568, dur: 0.4, vol: 0.2, at: 0.32, detune: 6, hold: true });
  },
  shekel() { // coin ping
    tone({ type: 'square', f0: 1568, f1: 1568, dur: 0.05, vol: 0.24 });
    tone({ type: 'square', f0: 2093, f1: 2093, dur: 0.16, vol: 0.24, at: 0.05, hold: true });
  },
  stomp() {
    tone({ type: 'square', f0: 520, f1: 130, dur: 0.1, vol: 0.3 });
    noise({ dur: 0.1, vol: 0.32, type: 'lowpass', f0: 1200, f1: 150 });
    tone({ type: 'sine', f0: 150, f1: 45, dur: 0.12, vol: 0.4 });
  },
  honk() { // harsh Israeli traffic honk: detuned squares, two bursts
    for (let k = 0; k < 2; k++) {
      const at = k * 0.28;
      tone({ type: 'square', f0: 233, f1: 226, dur: 0.22, vol: 0.2, at, attack: 0.01, hold: true });
      tone({ type: 'square', f0: 233, f1: 226, dur: 0.22, vol: 0.2, at, attack: 0.01, hold: true, detune: 14 });
      tone({ type: 'sawtooth', f0: 349, f1: 340, dur: 0.22, vol: 0.13, at, attack: 0.01, hold: true, detune: -9 });
    }
  },
  savta() { // "?נו" — a rising, nagging two-tone question
    tone({ type: 'triangle', f0: 330, f1: 320, dur: 0.14, vol: 0.34, attack: 0.02, hold: true });
    const t0 = ac.currentTime + 0.16;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t0);
    osc.frequency.exponentialRampToValueAtTime(560, t0 + 0.26);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.34, t0 + 0.02);
    g.gain.setValueAtTime(0.34, t0 + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    vibrato(osc, t0, t0 + 0.3, 9, 30);
    osc.connect(g); g.connect(sfxBus); osc.start(t0); osc.stop(t0 + 0.32);
  },
  meow() { // squeaky two-note
    tone({ type: 'triangle', f0: 900, f1: 1400, dur: 0.11, vol: 0.3, attack: 0.02 });
    tone({ type: 'triangle', f0: 1350, f1: 700, dur: 0.16, vol: 0.3, at: 0.12, attack: 0.01 });
    tone({ type: 'square', f0: 1350, f1: 700, dur: 0.16, vol: 0.06, at: 0.12, detune: 12 });
  },
  checkpoint() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f0: f, f1: f, dur: 0.1, vol: 0.26, at: i * 0.07 }));
    tone({ type: 'square', f0: 1046, f1: 1046, dur: 0.3, vol: 0.22, at: 0.28, hold: true });
    tone({ type: 'triangle', f0: 1318, f1: 1318, dur: 0.3, vol: 0.16, at: 0.28, hold: true });
  },
  levelclear() { // hijaz fanfare
    const seq = [[0, 0.1], [4, 0.1], [7, 0.1], [12, 0.18], [8, 0.1], [7, 0.1], [12, 0.45]];
    let at = 0;
    seq.forEach(([n, d]) => {
      tone({ type: 'square', f0: semi(587.33, n), f1: semi(587.33, n), dur: d, vol: 0.26, at, hold: true });
      tone({ type: 'triangle', f0: semi(293.66, n), f1: semi(293.66, n), dur: d, vol: 0.22, at, hold: true });
      at += d;
    });
    tone({ type: 'square', f0: semi(587.33, 19), f1: semi(587.33, 19), dur: 0.45, vol: 0.12, at: at - 0.45, detune: 6, hold: true });
    noise({ dur: 0.35, vol: 0.12, f0: 5000, at: at - 0.45 });
  },
  gameover() { // sad descending hijaz, wobbly
    const seq = [[12, 0.22], [8, 0.22], [7, 0.22], [5, 0.22], [4, 0.3], [1, 0.3], [0, 0.7]];
    let at = 0;
    seq.forEach(([n, d], i) => {
      const f = semi(220, n);
      tone({ type: 'sawtooth', f0: f, f1: i === seq.length - 1 ? f * 0.5 : f * 0.985, dur: d, vol: 0.2, at, attack: 0.02, hold: true });
      tone({ type: 'triangle', f0: f * 0.5, f1: i === seq.length - 1 ? f * 0.25 : f * 0.5, dur: d, vol: 0.22, at, attack: 0.02, hold: true });
      at += d;
    });
  },
  dash() { // "!יאללה" whoosh
    noise({ dur: 0.16, vol: 0.28, type: 'bandpass', f0: 500, f1: 4000, q: 0.8 });
    tone({ type: 'square', f0: 300, f1: 1300, dur: 0.1, vol: 0.18 });
  },
  siren() { // Friday Shabbat siren: long rise → sustained tone → slow wind-down
    const t0 = ac.currentTime;
    const RISE = 1.6, HOLD = 2.6, FALL = 1.4;
    const F0 = 260, F1 = 690;
    const mk = (type, vol, det) => {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type; osc.detune.value = det;
      osc.frequency.setValueAtTime(F0, t0);
      osc.frequency.exponentialRampToValueAtTime(F1, t0 + RISE);
      osc.frequency.setValueAtTime(F1, t0 + RISE + HOLD);
      osc.frequency.exponentialRampToValueAtTime(F0 * 0.8, t0 + RISE + HOLD + FALL);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.35);
      g.gain.setValueAtTime(vol, t0 + RISE + HOLD);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + RISE + HOLD + FALL);
      osc.connect(g); g.connect(sfxBus); osc.start(t0); osc.stop(t0 + RISE + HOLD + FALL + 0.05);
    };
    mk('sawtooth', 0.16, 0);
    mk('sawtooth', 0.12, 7);
    mk('triangle', 0.2, -5);
    mk('square', 0.05, 1200); // faint octave harmonic, like a distant horn
  },
  boss_hit() {
    tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.22, vol: 0.32 });
    tone({ type: 'square', f0: 440, f1: 90, dur: 0.12, vol: 0.18 });
    noise({ dur: 0.14, vol: 0.3, type: 'lowpass', f0: 2500, f1: 200 });
  },
  boss_die() { // savta's last kubbeh — big slow collapse with tremolo
    const t0 = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + 1.3);
    g.gain.setValueAtTime(0.32, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.35);
    const trem = ac.createOscillator(), tg = ac.createGain();
    trem.type = 'square'; trem.frequency.setValueAtTime(14, t0); trem.frequency.linearRampToValueAtTime(5, t0 + 1.3);
    tg.gain.value = 0.16; trem.connect(tg); tg.connect(g.gain);
    osc.connect(g); g.connect(sfxBus);
    osc.start(t0); osc.stop(t0 + 1.4); trem.start(t0); trem.stop(t0 + 1.4);
    noise({ dur: 0.8, vol: 0.35, type: 'lowpass', f0: 3000, f1: 80, attack: 0.02 });
    for (let i = 0; i < 5; i++) noise({ dur: 0.08, vol: 0.2, type: 'bandpass', f0: 800 + i * 400, q: 2, at: 0.1 + i * 0.13 });
  },
  ui() { tone({ type: 'square', f0: 820, f1: 1000, dur: 0.05, vol: 0.18 }); },
};

// ───────────────────────────── MUSIC ─────────────────────────────
// Pattern grammar: strings of 16 tokens per bar (16th notes). Token = semitone offset from the voice root
// (may be negative), '.' = hold previous note, '-' = rest. Drums: per step a string of hits: k kick, s snare,
// h closed hat, o open hat, t tom; '-' = silence. Voices with different lengths loop independently (seamless).

function parseNotes(bars) {
  const tok = bars.join(' ').trim().split(/\s+/);
  const steps = [];
  for (let i = 0; i < tok.length; i++) {
    const t = tok[i];
    if (t === '.' || t === '-') { steps.push(null); continue; }
    let len = 1; while (tok[i + len] === '.') len++;
    steps.push({ n: parseInt(t, 10), len });
  }
  return steps;
}
const parseDrums = (bars) => bars.join(' ').trim().split(/\s+/).map((t) => (t === '-' ? '' : t));

const THEMES = {
  // ── TITLE: catchy hora anthem in D hijaz ────────────────────────────────
  title: {
    bpm: 132, leadRoot: 293.66, bassRoot: 73.42,
    lead: { type: 'square', vol: 0.16, vib: [6, 18] },
    bass: { type: 'triangle', vol: 0.24 },
    drumVol: 0.9,
    leadPat: parseNotes([
      '0 . 4 . 7 . . . 8 7 5 4 5 . . .',
      '4 . 5 . 7 . . . 5 4 1 0 1 . . .',
      '0 . 4 . 7 . . . 8 . 10 . 12 . . .',
      '13 . 12 . 10 . 8 . 7 . . . . . - -',
      '12 . . 12 13 . 12 . 10 . 8 . 7 . . .',
      '8 . . 8 10 . 8 . 7 . 5 . 4 . . .',
      '5 . 4 . 1 . 0 . -2 . 0 . 1 . 4 .',
      '0 . . . . . - - 0 4 7 12 . . . .',
    ]),
    bassPat: parseNotes([
      '0 - -5 - 0 - -5 - 0 - -5 - 0 - -5 -',
      '0 - -5 - 0 - -5 - 5 - 0 - 5 - 0 -',
      '0 - -5 - 0 - -5 - 8 - 3 - 8 - 3 -',
      '7 - 2 - 7 - 2 - 1 - -4 - 0 - -5 -',
      '0 - -5 - 0 - -5 - 8 - 3 - 8 - 3 -',
      '5 - 0 - 5 - 0 - 7 - 2 - 7 - 2 -',
      '1 - -4 - 1 - -4 - -2 - -7 - 1 - -4 -',
      '0 - -5 - 0 - -5 - 0 0 0 0 0 - - -',
    ]),
    drumPat: parseDrums([
      'k h s h k h s h k h s h k h s o',
      'k h s h k h s h k h s h k h s o',
      'k h s h k h s h k h s h k h s o',
      'k h s h k h s h k h s h s s s s',
    ]),
  },

  // ── TEL AVIV: breezy surf-hora, tremolo-picked lead ─────────────────────
  telaviv: {
    bpm: 128, leadRoot: 293.66, bassRoot: 73.42,
    lead: { type: 'square', vol: 0.13, vib: [7, 12], stacc: 0.6 },
    bass: { type: 'triangle', vol: 0.24 },
    drumVol: 0.8,
    leadPat: parseNotes([
      '0 0 0 0 4 4 4 4 7 7 7 7 8 8 7 7',
      '5 5 5 5 4 4 4 4 1 1 1 1 0 0 . .',
      '7 7 7 7 8 8 8 8 10 10 10 10 12 12 10 10',
      '8 8 8 8 7 7 7 7 5 5 5 5 4 4 . .',
      '12 . 13 . 12 . 10 . 8 . 7 . 5 . 4 .',
      '5 . 4 . 1 . 0 . -2 . 0 . 1 . 4 .',
      '7 . . . 8 7 5 4 5 . . . 4 . 1 .',
      '0 . . . . . . . - - - - 0 1 4 5',
    ]),
    bassPat: parseNotes([
      '0 - -5 - 0 - -5 - 0 - -5 - 1 - -2 -',
      '0 - -5 - 0 - -5 - 5 - 0 - 5 - 0 -',
      '7 - 2 - 7 - 2 - 8 - 3 - 8 - 3 -',
      '5 - 0 - 5 - 0 - 1 - -4 - 0 - -5 -',
    ]),
    drumPat: parseDrums([
      'k h h h s h h h k h k h s h h o',
      'k h h h s h h h k h k h s h s o',
    ]),
  },

  // ── SHUK: fast, hectic, dabke — everyone is shouting ────────────────────
  shuk: {
    bpm: 168, leadRoot: 329.63, bassRoot: 82.41,
    lead: { type: 'square', vol: 0.15, vib: [8, 10], stacc: 0.7 },
    bass: { type: 'triangle', vol: 0.26 },
    drumVol: 1.0,
    leadPat: parseNotes([
      '0 1 4 5 7 5 4 1 0 1 4 5 7 . . .',
      '8 7 5 4 5 4 1 0 1 . 0 . -2 . 0 .',
      '7 8 10 8 7 5 4 5 7 8 10 12 13 12 10 8',
      '7 . 5 . 4 . 1 . 0 . . . - - - -',
      '12 12 . 13 12 . 10 . 8 8 . 10 8 . 7 .',
      '5 5 . 7 5 . 4 . 1 1 . 4 1 . 0 .',
      '7 . 7 8 7 5 4 . 5 . 5 7 5 4 1 .',
      '0 . 4 . 7 . 12 . 13 12 10 8 7 5 4 1',
    ]),
    bassPat: parseNotes([
      '0 - - 0 - - 0 - 0 - - 0 - - -5 -',
      '0 - - 0 - - 0 - 1 - - 1 - - 0 -',
      '0 - - 0 - - 0 - 0 - - 0 - - -5 -',
      '5 - - 5 - - 5 - 1 - - 1 - - 0 -',
    ]),
    drumPat: parseDrums([
      'k h h k h h s h k h h k h s h h',
      'k h h k h h s h k h h k s h s o',
    ]),
  },

  // ── AYALON: lazy funk, swung, with honk stabs (you're not going anywhere) ──
  ayalon: {
    bpm: 92, leadRoot: 220, bassRoot: 110, swing: 0.18,
    lead: { type: 'square', vol: 0.13, vib: [5, 22] },
    bass: { type: 'triangle', vol: 0.3, stacc: 0.9 },
    stab: { vol: 0.09, chord: [0, 7, 12], detune: 12 },
    drumVol: 0.85,
    leadPat: parseNotes([
      '7 . . . - - 8 7 5 . . . - - 4 .',
      '5 . . . - - 4 5 1 . . . 0 . . .',
      '- - - - 0 . 1 . 4 . 5 . 7 . . .',
      '8 . 7 . 5 . . . - - - - - - - -',
      '12 . . . - - 13 12 10 . . . - - 8 .',
      '10 . . . - - 8 10 7 . . . 5 . . .',
      '- - - - 7 . 8 . 10 . 12 . 13 . . .',
      '12 . 10 . 8 . 7 . . . - - - - - -',
    ]),
    bassPat: parseNotes([
      '0 . - 0 . - -2 . 0 . - -4 - -2 . -',
      '0 . - 0 . - -2 . 1 . - 1 - -2 . -',
      '0 . - 0 . - -2 . 0 . - -4 - -2 . -',
      '5 . - 5 . - 4 . 1 . - 1 - -2 . -',
    ]),
    stabPat: parseNotes([
      '- - - - 0 . - - - - - - 0 . - -',
      '- - - - 0 . - - - - 1 . - - 0 .',
      '- - - - 0 . - - - - - - 0 . - -',
      '- - - - 5 . - - - - 1 . - - 0 .',
    ]),
    drumPat: parseDrums([
      'k - h - s - h h k - k h s - h o',
      'k - h - s - h h k - k h s h s o',
    ]),
  },

  // ── NEGEV: slow, spacious, ornamented triangle over a drone ─────────────
  negev: {
    bpm: 76, leadRoot: 196, bassRoot: 49,
    lead: { type: 'triangle', vol: 0.3, vib: [5.5, 28], orn: true, legato: 1.0 },
    bass: { type: 'triangle', vol: 0.22, legato: 1.0 },
    drumVol: 0.6,
    leadPat: parseNotes([
      '0 . . . . . . . 1 . . . 0 . . .',
      '4 . . . . . . . 5 . . . 4 . 1 .',
      '7 . . . . . . . 8 . 7 . 5 . . .',
      '4 . . . . . . . . . . . . . . .',
      '7 . . . 8 . 10 . 12 . . . . . . .',
      '13 . 12 . 10 . 8 . 7 . . . . . . .',
      '5 . . . 4 . . . 1 . . . 0 . . .',
      '-2 . . . 0 . . . . . . . . . . .',
    ]),
    bassPat: parseNotes([
      '0 . . . . . . . . . . . . . . .',
      '0 . . . . . . . . . . . 7 . . .',
      '0 . . . . . . . . . . . . . . .',
      '1 . . . . . . . 0 . . . . . . .',
    ]),
    drumPat: parseDrums([
      'k - - - h - t - - - h - k - - -',
      'k - - - h - t - - - h - - - t -',
    ]),
  },

  // ── JERUSALEM: majestic hijaz march ─────────────────────────────────────
  jerusalem: {
    bpm: 108, leadRoot: 293.66, bassRoot: 73.42,
    lead: { type: 'square', vol: 0.16, vib: [5, 16] },
    bass: { type: 'triangle', vol: 0.26 },
    stab: { vol: 0.05, chord: [0, 4, 7], detune: 5 },
    drumVol: 1.0,
    leadPat: parseNotes([
      '0 . . . 7 . . . 8 . 7 . 5 . 4 .',
      '1 . . . 0 . . . - - - - 0 . 1 .',
      '4 . . . 5 . . . 7 . . . 8 . 10 .',
      '12 . . . . . . . 13 . 12 . 10 . 8 .',
      '7 . . . 8 . 7 . 5 . 4 . 5 . . .',
      '4 . . . 5 . 4 . 1 . 0 . 1 . . .',
      '0 . . . -2 . 0 . 1 . . . 4 . . .',
      '0 . . . . . . . 0 . 7 . 12 . . .',
    ]),
    bassPat: parseNotes([
      '0 - - - 0 - - - 7 - - - 0 - - -',
      '1 - - - 1 - - - -2 - - - 0 - - -',
      '0 - - - 0 - - - 5 - - - 7 - - -',
      '8 - - - 7 - - - 1 - - - 0 - - -',
    ]),
    stabPat: parseNotes([
      '0 . - - - - - - 0 . - - - - - -',
      '1 . - - - - - - 0 . - - - - - -',
      '0 . - - - - - - 5 . - - 7 . - -',
      '8 . - - 7 . - - 1 . - - 0 . - -',
    ]),
    drumPat: parseDrums([
      'k h s h k h s h k h s h k h s s',
      'k h s h k h s h k h s h s s s o',
    ]),
  },
};

// ── voice renderers (all scheduled at absolute time t, duration d) ──
function playLead(track, spec, note, t, d, root) {
  const f = semi(root, note.n);
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = spec.type;
  const gate = d * (spec.legato || spec.stacc || 0.85);
  if (spec.orn) { // ornament: slide in from a tone below + quick mordent on long notes
    osc.frequency.setValueAtTime(semi(root, note.n - 2), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    if (note.len >= 6) {
      osc.frequency.setValueAtTime(semi(root, note.n + 1), t + 0.22);
      osc.frequency.setValueAtTime(f, t + 0.29);
    }
  } else osc.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(spec.vol, t + 0.006);
  g.gain.setValueAtTime(spec.vol, t + Math.max(0.006, gate - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + gate);
  if (spec.vib) vibrato(osc, t, t + gate, spec.vib[0], spec.vib[1], spec.orn ? 0.15 : 0.08);
  osc.connect(g); g.connect(track.gain);
  osc.start(t); osc.stop(t + gate + 0.02);
}

function playBass(track, spec, note, t, d, root) {
  const f = semi(root, note.n);
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(f, t);
  const gate = d * (spec.legato || spec.stacc || 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(spec.vol, t + 0.005);
  g.gain.setValueAtTime(spec.vol, t + Math.max(0.005, gate - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + gate);
  osc.connect(g); g.connect(track.gain);
  osc.start(t); osc.stop(t + gate + 0.02);
}

function playStab(track, spec, note, t, d, root) {
  const gate = Math.min(d, 0.14);
  spec.chord.forEach((c, i) => {
    const f = semi(root, note.n + c);
    [-spec.detune, spec.detune].forEach((det) => {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = i === 0 ? 'square' : 'sawtooth';
      osc.detune.value = det;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 0.985, t + gate);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(spec.vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + gate);
      osc.connect(g); g.connect(track.gain);
      osc.start(t); osc.stop(t + gate + 0.02);
    });
  });
}

function playDrums(track, hits, t, vol) {
  const bus = track.gain;
  for (const h of hits) {
    if (h === 'k') {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
      g.gain.setValueAtTime(0.5 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.15);
      noise({ dur: 0.03, vol: 0.12 * vol, type: 'lowpass', f0: 800, at: t - ac.currentTime, bus });
    } else if (h === 's') {
      noise({ dur: 0.11, vol: 0.28 * vol, type: 'bandpass', f0: 1900, q: 0.9, at: t - ac.currentTime, bus });
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      g.gain.setValueAtTime(0.22 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.1);
    } else if (h === 'h') {
      noise({ dur: 0.035, vol: 0.12 * vol, type: 'highpass', f0: 7000, at: t - ac.currentTime, bus });
    } else if (h === 'o') {
      noise({ dur: 0.16, vol: 0.11 * vol, type: 'highpass', f0: 6000, at: t - ac.currentTime, bus });
    } else if (h === 't') { // frame-drum "tek"
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.07);
      g.gain.setValueAtTime(0.3 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.1);
      noise({ dur: 0.03, vol: 0.08 * vol, type: 'bandpass', f0: 3000, q: 2, at: t - ac.currentTime, bus });
    }
  }
}

function scheduleStep(track, i, t, stepDur) {
  const th = track.theme;
  const lead = th.leadPat[i % th.leadPat.length];
  if (lead) { playLead(track, th.lead, lead, t, lead.len * stepDur, th.leadRoot); stats.notes++; }
  const bass = th.bassPat[i % th.bassPat.length];
  if (bass) { playBass(track, th.bass, bass, t, bass.len * stepDur, th.bassRoot); stats.notes++; }
  if (th.stab && th.stabPat) {
    const st = th.stabPat[i % th.stabPat.length];
    if (st) { playStab(track, th.stab, st, t, st.len * stepDur, th.bassRoot * 2); stats.notes++; }
  }
  const hits = th.drumPat[i % th.drumPat.length];
  if (hits) playDrums(track, hits, t, th.drumVol);
}

function startTrack(id) {
  const theme = THEMES[id];
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.35);
  gain.connect(musicBus);
  const stepDur = 60 / theme.bpm / 4;
  const track = { id, theme, gain, step: 0, nextTime: ac.currentTime + 0.05, stepDur, timer: null, stopped: false };
  const tick = () => {
    if (track.stopped) return;
    const horizon = ac.currentTime + LOOKAHEAD;
    if (track.nextTime < ac.currentTime - 0.02) stats.late++; // scheduler starved (tab throttled etc.)
    let guard = 0;
    while (track.nextTime < horizon && guard++ < 64) {
      const sw = theme.swing && (track.step & 1) ? theme.swing * stepDur : 0;
      try { scheduleStep(track, track.step, track.nextTime + sw, stepDur); } catch (e) { /* never break the loop */ }
      track.step++; stats.steps++;
      track.nextTime += stepDur;
    }
  };
  tick();
  track.timer = setInterval(tick, TICK_MS);
  return track;
}

function fadeOutTrack(track, secs) {
  if (!track || track.stopped) return;
  track.stopped = true;
  clearInterval(track.timer);
  const t = ac.currentTime;
  try {
    track.gain.gain.cancelScheduledValues(t);
    track.gain.gain.setValueAtTime(Math.max(0.0001, track.gain.gain.value), t);
    track.gain.gain.exponentialRampToValueAtTime(0.0001, t + secs);
  } catch (e) { /* ignore */ }
  setTimeout(() => { try { track.gain.disconnect(); } catch (e) { /* ignore */ } }, secs * 1000 + 250);
}

// ───────────────────────────── public API ─────────────────────────────
export const Audio = {
  init() {
    hookGestures();
    if (ac) { resume(); return; }
    const Ctor = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!Ctor) { console.warn('[audio] WebAudio unavailable — silent mode'); return; }
    try {
      ac = new Ctor();
      master = ac.createGain();
      master.gain.value = muted ? 0 : MASTER_VOL;
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
      sfxBus = ac.createGain(); sfxBus.gain.value = 1.0;
      musicBus = ac.createGain(); musicBus.gain.value = 0.8;
      sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ac.destination);
      noiseBuf = makeNoise();
      resume();
      if (pendingTheme) { const p = pendingTheme; pendingTheme = null; Audio.playMusic(p); }
    } catch (e) {
      console.warn('[audio] init failed', e);
      ac = null;
    }
  },

  playSfx(name) {
    if (!ac) return;
    resume();
    const fn = SFX[name] || SFX.ui;
    try { fn(); stats.sfx++; } catch (e) { console.warn(`[audio] sfx ${name} failed`, e); }
  },

  playMusic(themeId) {
    const id = THEMES[themeId] ? themeId : 'title';
    if (!ac) { pendingTheme = id; return; }
    resume();
    if (current && current.id === id && !current.stopped) return;
    const old = current;
    try {
      current = startTrack(id);
      if (!stats.themes.includes(id)) stats.themes.push(id);
    } catch (e) { console.warn('[audio] playMusic failed', e); current = null; }
    if (old) fadeOutTrack(old, 0.5);
  },

  stopMusic() {
    pendingTheme = null;
    if (!ac || !current) return;
    fadeOutTrack(current, 0.35);
    current = null;
  },

  setMuted(b) {
    muted = !!b;
    if (!ac || !master) return;
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, t + 0.06);
  },

  // diagnostics (not part of the CONTRACT surface; harmless extra)
  _stats() { return { state: ac ? ac.state : 'none', sfx: stats.sfx, notes: stats.notes, steps: stats.steps, late: stats.late, themes: stats.themes.slice(), current: current ? current.id : null, muted }; },
};

export const SFX_NAMES = Object.keys(SFX);
export const THEME_IDS = Object.keys(THEMES);

// SABRA! bootstrap: load art / levels / parallax / audio / ui, then start the engine.
import { makeSpriteSet, validateSpriteDef } from './engine/sprite.js';
import { Game } from './engine/game.js';
import { SPRITE_DEFS } from './art/index.js';
import { LEVELS as RAW_LEVELS } from './levels/index.js';
import { PARALLAX as RAW_PARALLAX } from './parallax/index.js';
import { Audio } from './audio/audio.js';
import { UI } from './ui/ui.js';

const params = new URLSearchParams(location.search);
const THEMES = ['TELAVIV', 'SHUK', 'AYALON', 'NEGEV', 'JERUSALEM'];

// ---- sprites (every def validated; an invalid def is a hard error — the art tools must have caught it)
const defs = {};
for (const [k, d] of Object.entries(SPRITE_DEFS)) { validateSpriteDef(d, k); defs[k] = d; }
const SPRITES = makeSpriteSet(defs);

// ---- levels
const LEVELS = RAW_LEVELS.filter((lv, i) => {
  const ok = lv && Array.isArray(lv.map) && lv.map.length > 0 && lv.map.every((r) => typeof r === 'string' && r.length === lv.map[0].length) && lv.legend && lv.spawn;
  if (!ok) console.error(`[sabra] level ${i + 1} malformed — skipped`);
  return ok;
});
if (!LEVELS.length) throw new Error('[sabra] no valid levels');

// ---- parallax
const PARALLAX = { ...RAW_PARALLAX };
for (const T of THEMES) {
  const p = PARALLAX[T];
  if (!p || typeof p.sky !== 'function' || !Array.isArray(p.layers)) console.error(`[sabra] parallax ${T} missing/invalid`);
}

// ---- canvases
const gameCanvas = document.getElementById('game') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'game', width: 320, height: 180 });
const uiCanvas = document.getElementById('ui') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'ui', width: 640, height: 360 });
gameCanvas.width = 320; gameCanvas.height = 180; uiCanvas.width = 640; uiCanvas.height = 360;

const startLevel = Math.max(0, (parseInt(params.get('level') || '1', 10) || 1) - 1);
const debug = params.get('debug') === '1';
const game = new Game({ gameCanvas, uiCanvas, SPRITES, LEVELS, PARALLAX, Audio, UI, startLevel, debug });
window.__SABRA = { game, SPRITES, LEVELS, PARALLAX, Audio, UI };
console.log(`[sabra] ready · ${Object.keys(SPRITES).length} sprites · ${LEVELS.length} levels`);
game.start();

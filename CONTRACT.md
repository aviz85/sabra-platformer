# SABRA! — חיי היום־יום בישראל · Pixel-art 2D platformer — MODULE CONTRACT

Every agent MUST follow this file exactly. Vanilla JS ES modules, no build step, no npm deps.
Run with `python3 -m http.server 8080` from repo root → http://localhost:8080/.

## Game concept (humor is mandatory)
Hero: **Tzabi (צבי)** — a walking sabra fruit (prickly pear): spiky green body, sunglasses, flip-flops (kaf-kaf).
Attack: spits **garinim** (sunflower seeds) — key X. Jump — key Z / Space / Up. Move — arrows / WASD. Dash ("Yalla!") — Shift.
Health = 3 hearts; Bamba restores a heart. Falafel = points. Hummus = 5 s invincibility ("hummus power").
Lives = 3. Krembo = extra life. Coins = shekel (₪).

Tone: loving, self-deprecating Israeli humor. Bilingual text: Hebrew first, English second, e.g. "!יאללה — Yalla!".
Hebrew is RTL: never use → in Hebrew strings; use ← if an arrow is needed.

## Levels (in order) — `src/levels/levelN.js`, default export
1. `telaviv`  — "חוף תל אביב" Tel Aviv beach at sunrise. Umbrellas, lifeguard tower, matkot players, jellyfish (meduzot), pigeons.
2. `shuk`     — "שוק מחנה יהודה" Market: awnings, crates, vendors shouting, savtas throwing food, cats.
3. `ayalon`   — "פקק באיילון" Traffic jam at sunset: car roofs are platforms, honking cars, Azrieli towers, mosquitoes.
4. `negev`    — "המדבר וים המלח" Desert/Dead Sea: camels as moving platforms, low-gravity float zones (Dead Sea water), heat.
5. `jerusalem`— "ירושלים העתיקה" Old City stone: cats everywhere, boss = **Savta Rivka** hurling kubbeh, ends with Shabbat siren + credits.

## Resolution & rendering
- Internal game canvas: **320×180** px, scaled to fit window with `imageSmoothingEnabled=false` (integer scale when possible).
- UI/text layer: a second canvas at **640×360** (2× the game) overlaid on top, also nearest-neighbor. Use `ctx.font = '8px monospace'` style small fonts; Hebrew via system font is fine (it pixelates when scaled).
- Tile size: **16 px**. Player sprite 16×24. Enemies 16×16 or 24×24. Y grows downward.

## Sprite format — `src/engine/sprite.js` (already written, DO NOT change its API)
```js
export const CAT_IDLE = {
  w: 16, h: 16, fps: 6,
  palette: { k: '#1a1a1a', o: '#e08a2e', w: '#f5f0e6' },   // char → CSS color; '.' is ALWAYS transparent
  frames: [
    [ '................', '....kk....kk....', /* 16 rows of exactly 16 chars */ ],
    [ /* frame 2 */ ],
  ],
};
```
Rules: every row is exactly `w` chars, every frame exactly `h` rows; chars only from palette or '.'.
`makeSprite(def)` → `{ w, h, fps, frames: [OffscreenCanvas|HTMLCanvasElement ...] }`.
`drawSprite(ctx, sprite, x, y, frameIndex, flipX=false)` draws at integer pixel coords.
`validateSpriteDef(def)` throws with a helpful message — art agents MUST run it in node (`node --input-type=module -e "..."`) to validate.

## Art registry — `src/art/index.js` (already written; imports fixed file names)
Each art file exports a plain object `{ NAME: spriteDef, ... }` as its default export:
- `src/art/player.js`     → keys: `PLAYER_IDLE, PLAYER_RUN, PLAYER_JUMP, PLAYER_FALL, PLAYER_SPIT, PLAYER_HURT, PLAYER_DASH, SEED` (SEED is 4×4 projectile)
- `src/art/enemies.js`    → `CAT_IDLE, CAT_RUN, CAT_HISS, SAVTA_IDLE, SAVTA_THROW, PLATE, PAKID_IDLE, PAKID_THROW, TICKET, MATKOT_IDLE, MATKOT_HIT, MATKOT_BALL, JELLYFISH, MOSQUITO, PIGEON_IDLE, PIGEON_FLY, CAR_RED, CAR_BLUE, CAR_TAXI, CAR_BUS, CAMEL_WALK, TOURIST, BOSS_SAVTA_IDLE, BOSS_SAVTA_THROW, BOSS_SAVTA_HURT, KUBBEH`
- `src/art/items.js`      → `BAMBA, FALAFEL, HUMMUS, KREMBO, SHEKEL, HEART_FULL, HEART_EMPTY, CHECKPOINT_FLAG, EXIT_DOOR, ARROW_SIGN` (+ any decorative props: `UMBRELLA, LIFEGUARD_TOWER, CRATE, AWNING, PALM, CACTUS, LAMP, TRAFFIC_CONE, TENT, MENORAH, OLIVE_TREE, BENCH, BARREL, SIGN_SHUK, SIGN_BEACH, SIGN_AYALON, SIGN_NEGEV, SIGN_JLM`)
- `src/art/tiles.js`      → per-theme 16×16 tiles: `${THEME}_GROUND, ${THEME}_GROUND_TOP, ${THEME}_PLATFORM, ${THEME}_WALL, ${THEME}_HAZARD` for THEME in `TELAVIV, SHUK, AYALON, NEGEV, JERUSALEM` (+ optional `${THEME}_DECOR1..3`)
  Hazard tiles: telaviv=jellyfish water, shuk=spilled oil/pickles, ayalon=hot asphalt / open manhole, negev=spikes/cactus, jerusalem=hot coals / broken glass.

## Level format — `src/levels/levelN.js`
```js
export default {
  id: 'telaviv', name: 'חוף תל אביב', nameEn: 'Tel Aviv Beach', theme: 'TELAVIV',
  intro: ['בוקר טוב תל אביב!', 'Good morning Tel Aviv!'],   // level card lines (Hebrew, English)
  tileSize: 16,
  // rows of chars; all rows same length; width ≥ 120 tiles (≥1920 px), height exactly 12 rows (=192px, but camera clamps to 180 — put ground on rows 10-11)
  // NOTE: height may be 12..20 rows; camera handles vertical scroll. Keep width 150-250 tiles for a 2-4 minute level.
  map: [
    '........................',
    '#######....==....#######',
  ],
  legend: {                       // char → tile kind (kinds are engine-wide, tiles art is per theme)
    '#': 'ground',                // solid, all sides. Rendered with ${THEME}_GROUND; top-most ground tile uses ${THEME}_GROUND_TOP
    '=': 'platform',              // one-way platform (can jump through from below, drop with Down+Jump)
    'W': 'wall',                  // solid decorative wall
    '^': 'hazard',                // hurts on touch
    '~': 'water',                 // negev only: low gravity float zone (Dead Sea). Non-solid.
  },
  spawn: { x: 32, y: 120 },            // pixel coords, player feet position
  exit:  { x: 2300, y: 144 },          // EXIT_DOOR position (feet)
  entities: [                          // pixel coords of feet/center; `type` from the entity list below
    { type: 'cat', x: 400, y: 144 },
    { type: 'savta', x: 700, y: 144 },
    { type: 'bamba', x: 500, y: 100 },
    { type: 'sign', x: 120, y: 144, text: ['זהירות: מדוזות', 'Careful: jellyfish'] },   // speech-bubble sign, shown when player is near
    { type: 'checkpoint', x: 1200, y: 144 },
    { type: 'prop', sprite: 'UMBRELLA', x: 200, y: 144 },    // decorative, drawn behind entities
    { type: 'camel', x: 900, y: 144, patrol: 200 },          // moving platform, patrols ±patrol px
    { type: 'car', x: 600, y: 144, variant: 'CAR_TAXI', honk: true },
    { type: 'boss_savta', x: 2000, y: 144 },                 // level 5 only
  ],
  quips: [                              // random one-liners shown in HUD every ~15s (Hebrew, English)
    ['!אין מצב, שמש בשבע בבוקר', 'No way, sun at 7am'],
  ],
};
```
Entity types the engine implements: `cat, savta, pakid, matkot, jellyfish, mosquito, pigeon, car, camel, tourist, boss_savta, bamba, falafel, hummus, krembo, shekel, sign, checkpoint, prop`.
Enemy behavior summary (engine agent implements): cat = patrol + hiss/lunge when near; savta = stationary, throws PLATE arcs every 2s while player within 160px, shouts "!תאכל"; pakid = stationary, throws TICKET straight; matkot = stationary, hits MATKOT_BALL horizontally at intervals; jellyfish = floats up/down (sine), hurts on touch, can't be killed by seeds; mosquito = flies toward player slowly, 1 hp; pigeon = sits, flies away in a panic when player is near (harmless, comedic); car = moving platform horizontally (roof is one-way platform), honks (speech bubble "!!!צפצוף"); camel = slow moving platform; tourist = harmless NPC walking, says "Shalom! Where is the beach?"; boss_savta = 3 phases, 9 hp, throws KUBBEH arcs, says lines like "!אתה רזה מדי" "You're too thin!".
Seeds kill cat/savta/pakid/matkot/mosquito (1-3 hp). Stomping (landing on top) also kills cat/mosquito.

## Parallax — `src/parallax/${theme}.js` (theme lowercase), default export:
```js
export default {
  sky: (ctx, W, H, t) => { /* fill gradient/sky, sun, clouds; W=320,H=180, t=seconds */ },
  layers: [   // back → front. speed = fraction of camera x applied (0 = static, 1 = moves with ground)
    { speed: 0.1, draw: (ctx, camX, camY, W, H, t) => { /* draw with x offsets of -camX*speed already applied by engine? NO: engine passes camX; layer computes ox = -(camX*speed) % period and tiles itself horizontally */ } },
    { speed: 0.4, draw: ... },
    { speed: 0.7, draw: ... },
  ],
  fog: (ctx, W, H, t) => {}, // optional overlay after tiles (heat haze, sea spray) — keep subtle
};
```
Parallax code draws with canvas primitives (fillRect at integer coords — keep everything pixel-crisp: NO anti-aliased arcs, NO gradients smaller than 8px bands; use banded gradient stripes). Each layer must be periodic and tile with period ≤ 640 so it can scroll forever. Animate (waves, clouds drift, flags) using `t`.

## Audio — `src/audio/audio.js` exports:
`export const Audio = { init(), playSfx(name), playMusic(themeId), stopMusic(), setMuted(bool) }`
SFX names: `jump, spit, hit, hurt, pickup, bamba, hummus, krembo, shekel, stomp, honk, savta, meow, checkpoint, levelclear, gameover, dash, siren, boss_hit, boss_die, ui`.
Music: WebAudio chiptune, one original looping tune per theme (`telaviv, shuk, ayalon, negev, jerusalem, title`) in Middle-Eastern / Israeli folk flavor (hijaz / phrygian-dominant scale, hora rhythm). Must init on first user gesture.

## UI — `src/ui/ui.js` exports:
`export const UI = { drawTitle(ctx, W, H, t, state), drawHud(ctx, W, H, state), drawLevelCard(ctx, W, H, t, level, progress), drawPause(ctx,W,H), drawGameOver(ctx,W,H,t,state), drawCredits(ctx,W,H,t), drawBubble(ctx, x, y, lines), drawBossBar(ctx, W, H, boss) }`
ctx here is the 640×360 UI canvas. `state` = `{ hearts, maxHearts, lives, score, shekels, levelName, levelNameEn, quip:[he,en]|null, hummusTimer, seeds:Infinity }`.
Title screen: big pixel logo "SABRA!" + Hebrew "!צבר", subtitle "חיי היום־יום בישראל · Everyday life in Israel", "Press Z / Space to start", blinking. Credits are funny.

## Engine — `src/engine/*.js` + `src/main.js` (engine agent). Public shape for integration:
- `src/main.js` boots: creates canvases, loads `SPRITES` from `src/art/index.js` (via `makeSprite` for each def), `LEVELS` from `src/levels/index.js`, `PARALLAX` from `src/parallax/index.js`, `Audio`, `UI`. Game state machine: `title → levelcard → playing → (pause) → levelclear → ... → credits`, `gameover`.
- Physics: gravity 0.35 px/frame², max fall 6, run speed 1.6, jump impulse -5.6, coyote time 6 frames, jump buffer 6 frames, variable jump height, dash 4 px/frame for 10 frames w/ 40-frame cooldown. Fixed 60 Hz timestep with accumulator.
- Camera: follows player with lookahead, clamped to level bounds, integer-snapped.
- Collision: AABB vs tile grid; one-way platforms; moving platforms carry the player.
- Debug: `?level=3` URL param jumps to a level; `?debug=1` shows hitboxes and FPS.

## Coding rules
- Only edit the files assigned to you. Do not touch `src/engine/sprite.js` or the `index.js` registries.
- All drawing at integer coordinates (`Math.round`). Never enable image smoothing.
- No external assets, no network, no npm. Everything procedural in JS.
- Validate your work: for art, run `validateSpriteDef` in node for every def. For levels, run `node --input-type=module -e` to assert equal row lengths and legend coverage. For engine/ui/audio, at least `node --check`-style import in node where possible.

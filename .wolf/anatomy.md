# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-09-02T11:04:22.070Z
> Files: 62 tracked | Anatomy hits: 0 | Misses: 0

## ../../../private/tmp/claude-501/-Users-aviz-fable-5-1/fbc2e8e9-a5f8-4a85-a91c-8b38b7c0cdb2/scratchpad/

- `behaviour.mjs` — Behaviour harness for the SABRA! engine (stub mode). Run from repo root: node <this file> (~2988 tok)
- `bidi.mjs` — Definitive bidi check: render Hebrew strings with the game's font under ctx.direction ltr vs rtl. (~479 tok)
- `gaps.mjs` — QA gap analyzer: for each level, find horizontal gaps between consecutive columns that have any (~1216 tok)
- `gen-level1.mjs` — Generator for src/levels/level1.js — builds the tile grid from section primitives, emits literal row (~2574 tok)
- `gen-level4.mjs` — Generator for src/levels/level4.js — designs the Negev/Dead Sea grid with primitives, emits literal (~3087 tok)
- `gen5.mjs` — Generator for src/levels/level5.js — Jerusalem Old City. Emits literal map rows + pixel entity coord (~2660 tok)
- `render.mjs` — Render all sprite defs (all frames) to a BMP sheet at 4x for eyeballing. (~596 tok)
- `tour.mjs` — Tour every loaded real level: start, screenshot, teleport near exit, walk in, verify level-clear cha (~1299 tok)
- `traffic.js` — ───────────────────────────── traffic helpers ───────────────────────────── (~2377 tok)

## ../curvy-hebrew-font/

- `build.mjs` — Render a glyph at pixel size `px`, with its baseline at (x,y) and left edge at x. (~2031 tok)
- `glyphs.js` — גומיה / Gumiya — a fun, curvy Hebrew display face. (~2452 tok)

## ./

- `.gitignore` — Git ignore rules (~37 tok)
- `.vercelignore` — Production deployment exclusions for tests, captures, and project-internal metadata (~8 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `CONTRACT.md` — SABRA! — חיי היום־יום בישראל · Pixel-art 2D platformer — MODULE CONTRACT (~2777 tok)
- `index.html` — SABRA! — !צבר · Everyday life in Israel (~238 tok)

## .claude/

- `settings.json` (~441 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## shots/

- `_audio-test.html` — SABRA! audio test (~517 tok)

## src/

- `main.js` — SABRA! bootstrap: load art / levels / parallax / audio / ui, then start the engine. (~655 tok)

## src/_stubs/

- `audio.js` — Stub Audio: tiny WebAudio beeps with the exact CONTRACT API. Only used when src/audio/audio.js is mi (~785 tok)
- `level.js` — Stub level exercising every entity type + every tile kind. Only used when src/levels/* is missing. (~1086 tok)
- `parallax.js` — Stub parallax (banded sky + hills). Only used when a theme's parallax module is missing. (~599 tok)
- `sprites.js` — Stub sprite defs: a colored, outlined box for every key the CONTRACT lists. Used only when real art (~1470 tok)
- `ui.js` — Stub UI with the exact CONTRACT API (640×360 canvas). Only used when src/ui/ui.js is missing. (~1486 tok)

## src/art/

- `enemies.js` — Enemy, vehicle, NPC, boss, and projectile sprite definitions (~8850 tok)
- `index.js` — Exports SPRITE_DEFS (~60 tok)
- `items.js` — SABRA! — src/art/items.js (~8299 tok)
- `player.js` — SABRA! — Tzabi (צבי) the walking sabra fruit. Player sprites, 16×24, facing RIGHT. (~2484 tok)
- `tiles.js` — SABRA! — אריחים · Tiles (16×16) for 5 themes. (~7204 tok)

## src/audio/

- `audio.js` — SABRA! audio — WebAudio-only chiptune synth. No files, no network, all procedural. (~8090 tok)

## src/engine/

- `camera.js` — Camera: lookahead follow, level clamp, screen shake, integer snap. (~715 tok)
- `entities.js` — All game entities: Player, enemies, platforms, NPCs, pickups, projectiles. (~10888 tok)
- `game.js` — SABRA! game orchestrator: fixed-step loop, state machine, level loading, rendering, collisions, HUD (~7460 tok)
- `input.js` — Keyboard input — action-mapped, edge-detected per fixed tick. (~884 tok)
- `particles.js` — Particles, dash ghosts (afterimages) and floating score/text popups. Pixel-crisp fillRects only. (~1242 tok)
- `physics.js` — Tile grid + AABB physics. All bodies: { x, y, w, h } with (x,y) = hitbox top-left in world px. (~1625 tok)
- `sprite.js` — Sprite rasterizer — string-art definitions → canvases. DO NOT change this API. (~830 tok)

## src/levels/

- `index.js` — Exports LEVELS (~56 tok)
- `level1.js` — SABRA! — Level 1: Tel Aviv beach at sunrise (~3000 tok)
- `level2.js` — SABRA! — Level 2: שוק מחנה יהודה / Mahane Yehuda Market. (~2387 tok)
- `level3.js` — SABRA! — Level 3: "פקק באיילון" / Ayalon Traffic Jam at sunset. (~2805 tok)
- `level4.js` — SABRA! — Level 4: Negev and Dead Sea (~3200 tok)
- `level5.js` — SABRA! — Level 5: Jerusalem Old City and Savta Rivka boss (~3400 tok)

## src/parallax/

- `ayalon.js` — SABRA! — parallax: "פקק באיילון" · Ayalon Highway at sunset. (~10040 tok)
- `index.js` — Exports PARALLAX (~81 tok)
- `jerusalem.js` — SABRA! — src/parallax/jerusalem.js (~10369 tok)
- `negev.js` — SABRA! — src/parallax/negev.js (~6666 tok)
- `shuk.js` — SABRA! — parallax: שוק מחנה יהודה / Mahane Yehuda market, high noon. (~11128 tok)
- `telaviv.js` — SABRA! — src/parallax/telaviv.js (~7305 tok)

## src/ui/

- `ui.js` — SABRA! — UI layer (640×360 canvas, nearest-neighbor). See CONTRACT.md "UI". (~12834 tok)

## tools/

- `check-art.mjs` — Usage: node tools/check-art.mjs src/art/enemies.js [REQUIRED,KEYS,...] (~171 tok)
- `check-level.mjs` — Usage: node tools/check-level.mjs src/levels/level1.js (~520 tok)
- `playtest.mjs` — Dumb-bot play-test. Usage: node tools/playtest.mjs [--levels 1,2,3] [--secs 40] [--shots] (~1706 tok)
- `preview-parallax-ayalon.mjs` — Preview the Ayalon parallax module. Usage: node tools/preview-parallax-ayalon.mjs (~1089 tok)
- `preview-parallax-jerusalem.mjs` — Renders src/parallax/jerusalem.js (sky + layers + fog) in headless Chrome at 3x and screenshots to s (~1067 tok)
- `preview-parallax-negev.mjs` — Renders src/parallax/negev.js (sky + layers + fog) in headless Chrome at 3x and screenshots to shots (~1046 tok)
- `preview-parallax-shuk.mjs` — Renders src/parallax/shuk.js (sky + layers + fog) at a few camX/t combos, scaled 3x to 960x540, into (~1036 tok)
- `preview-parallax-telaviv.mjs` — Renders src/parallax/telaviv.js (sky + layers + fog) in headless Chrome at 3x and screenshots to sho (~1011 tok)
- `smoke.mjs` — Headless-Chrome smoke test. Usage: node tools/smoke.mjs [--level N] [--shots] (~1146 tok)
- `test-audio.mjs` — Headless-Chrome audio test. Usage: node tools/test-audio.mjs (~921 tok)
- `test-ui.mjs` — Renders every UI function onto a 640×360 canvas (shown at 1.5×) with mock state and screenshots to s (~1886 tok)

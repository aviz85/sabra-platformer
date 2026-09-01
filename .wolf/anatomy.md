# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-09-01T18:40:24.608Z
> Files: 13 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.gitignore` — Git ignore rules (~37 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `CONTRACT.md` — SABRA! — חיי היום־יום בישראל · Pixel-art 2D platformer — MODULE CONTRACT (~2777 tok)
- `index.html` — SABRA! — !צבר · Everyday life in Israel (~238 tok)

## .claude/

- `settings.json` (~441 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## src/art/

- `index.js` — Exports SPRITE_DEFS (~60 tok)

## src/engine/

- `sprite.js` — Sprite rasterizer — string-art definitions → canvases. DO NOT change this API. (~830 tok)

## src/levels/

- `index.js` — Exports LEVELS (~56 tok)

## src/parallax/

- `index.js` — Exports PARALLAX (~81 tok)

## tools/

- `check-art.mjs` — Usage: node tools/check-art.mjs src/art/enemies.js [REQUIRED,KEYS,...] (~171 tok)
- `check-level.mjs` — Usage: node tools/check-level.mjs src/levels/level1.js (~520 tok)
- `smoke.mjs` — Headless-Chrome smoke test. Usage: node tools/smoke.mjs [--level N] [--shots] (~1146 tok)

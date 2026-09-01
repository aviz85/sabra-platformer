// Usage: node tools/check-art.mjs src/art/enemies.js [REQUIRED,KEYS,...]
import { validateSpriteDef } from '../src/engine/sprite.js';
const file = process.argv[2]; const required = (process.argv[3] || '').split(',').filter(Boolean);
const defs = (await import(`../${file}`)).default;
let bad = 0;
for (const [k, d] of Object.entries(defs)) { try { validateSpriteDef(d, k); } catch (e) { bad++; console.log('  ✗ ' + e.message); } }
for (const r of required) if (!(r in defs)) { bad++; console.log('  ✗ missing required key ' + r); }
console.log(`${file}: ${Object.keys(defs).length} sprites, ${bad} problems`);
process.exit(bad ? 1 : 0);

// Usage: node tools/check-level.mjs src/levels/level1.js
const file = process.argv[2];
const m = (await import(`../${file}`)).default;
const errs = [];
const need = ['id','name','nameEn','theme','intro','tileSize','map','legend','spawn','exit','entities','quips'];
for (const k of need) if (!(k in m)) errs.push(`missing field ${k}`);
const w = m.map?.[0]?.length ?? 0;
m.map?.forEach((r, i) => { if (r.length !== w) errs.push(`row ${i} length ${r.length} != ${w}`); for (const ch of r) if (ch !== '.' && !(ch in (m.legend||{}))) errs.push(`row ${i} has '${ch}' not in legend`); });
if (w < 120) errs.push(`width ${w} tiles < 120`);
if ((m.map?.length ?? 0) < 12) errs.push(`height ${m.map?.length} rows < 12`);
const KINDS = new Set(['ground','platform','wall','hazard','water']);
for (const [c,k] of Object.entries(m.legend||{})) if (!KINDS.has(k)) errs.push(`legend '${c}' → unknown kind ${k}`);
const TYPES = new Set('cat savta pakid matkot jellyfish mosquito pigeon car camel tourist boss_savta bamba falafel hummus krembo shekel sign checkpoint prop'.split(' '));
const W = w * 16, H = (m.map?.length ?? 0) * 16;
m.entities?.forEach((e, i) => { if (!TYPES.has(e.type)) errs.push(`entity ${i} unknown type ${e.type}`); if (e.x < 0 || e.x > W || e.y < 0 || e.y > H) errs.push(`entity ${i} (${e.type}) out of bounds ${e.x},${e.y}`); });
// spawn/exit must be above solid ground
const solidAt = (px, py) => { const c = m.map[Math.floor(py/16)]?.[Math.floor(px/16)]; return c && ['ground','platform','wall'].includes(m.legend[c]); };
if (!solidAt(m.spawn.x, m.spawn.y + 1)) errs.push(`spawn (${m.spawn.x},${m.spawn.y}) not standing on solid tile`);
if (!solidAt(m.exit.x, m.exit.y + 1)) errs.push(`exit (${m.exit.x},${m.exit.y}) not standing on solid tile`);
console.log(`${file}: ${w}x${m.map?.length} tiles, ${m.entities?.length} entities, ${errs.length} errors`);
errs.forEach((e) => console.log('  ✗ ' + e));
process.exit(errs.length ? 1 : 0);

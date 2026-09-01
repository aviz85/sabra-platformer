import player from './player.js';
import enemies from './enemies.js';
import items from './items.js';
import tiles from './tiles.js';
export const SPRITE_DEFS = { ...player, ...enemies, ...items, ...tiles };

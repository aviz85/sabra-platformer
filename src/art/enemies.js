// SABRA! — enemy & NPC sprites. All string-art, palette char maps to CSS color, '.' transparent.
// All characters face RIGHT. Cars/bus face LEFT (driving toward the player, see notes in report);
// use drawSprite(..., flipX=true) to face them right.

// ---------- Jerusalem street cat (16x16) — scrappy, torn right ear ----------
const CAT_PAL = { k: '#1a1a1a', o: '#e08a2e', d: '#b5601c', w: '#f5f0e6', p: '#e8788a', g: '#7ddc4a', r: '#c0272d' };

export const CAT_IDLE = {
  w: 16, h: 16, fps: 3, palette: CAT_PAL,
  frames: [
    [
      '................',
      '.........k...k..',
      '........kpk.kdk.',
      '........koooook.',
      '........kgkokgk.',
      '........koooook.',
      '.k......kowpwok.',
      'kok.kkkkkwwwwwk.',
      'kok.koooooookk..',
      'kokkoooooddok...',
      '.kkoooooooook...',
      '..kooddoooook...',
      '..kokkokkokk....',
      '..kok.kok.kok...',
      '..kk..kk..kk....',
      '................',
    ],
    [
      '................',
      '.........k...k..',
      '........kpk.kdk.',
      '........koooook.',
      '........kkkokkk.',
      '........koooook.',
      '........kowpwok.',
      '.k..kkkkkwwwwwk.',
      'kok.koooooookk..',
      'kokkoooooddok...',
      '.kkoooooooook...',
      '..kooddoooook...',
      '..kokkokkokk....',
      '..kok.kok.kok...',
      '..kk..kk..kk....',
      '................',
    ],
  ],
};

export const CAT_RUN = {
  w: 16, h: 16, fps: 10, palette: CAT_PAL,
  frames: [
    [
      '................',
      '................',
      '.........k...k..',
      '........kpk.kdk.',
      '........koooook.',
      '........kgkokgk.',
      'kk......koooook.',
      'kokkkkkkkowpwok.',
      '.kkoooooowwwwwk.',
      '..koooooooookk..',
      '..kooddooooook..',
      '.kokkoookkokk...',
      'kk..kk..kk.kk...',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '.........k...k..',
      '........kpk.kdk.',
      '........koooook.',
      '........kgkokgk.',
      '.kk.....koooook.',
      '.kokkkkkkowpwok.',
      '..koooooowwwwwk.',
      '..koooooooookk..',
      '...koddoooook...',
      '....kokkookk....',
      '....kk...kkk....',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '.........k...k..',
      '........kpk.kdk.',
      '........koooook.',
      '........kgkokgk.',
      '..kk....koooook.',
      '.kokkkkkkowpwok.',
      'kkkoooooowwwwwk.',
      '..koooooooookk..',
      '..kooddoooooook.',
      '.kokkoooookkokk.',
      'kk..kk.kk....kk.',
      '................',
      '................',
      '................',
    ],
  ],
};

export const CAT_HISS = {
  w: 16, h: 16, fps: 8, palette: CAT_PAL,
  frames: [
    [
      '................',
      '.......k.....k..',
      '......kpk...kdk.',
      '....k.koookkkok.',
      '...kk.kgkkokgkk.',
      '..kokkkoooooook.',
      '.kokoooowpwwwok.',
      '.kooooookrrrrk..',
      '.kooddoookwwwk..',
      '.koooooookkkk...',
      '.kkooddoook.....',
      '..kokkokkokk....',
      '..kok.kok.kok...',
      '..kk..kk..kk....',
      '................',
      '................',
    ],
    [
      '................',
      '.......k.....k..',
      '......kpk...kdk.',
      '.k..k.koookkkok.',
      '.kkkk.kgkkokgkk.',
      '..kokkkoooooook.',
      '.kokoooowpwwwok.',
      '.kooooookrrrrrk.',
      '.kooddoookwwwwk.',
      '.koooooookkkkk..',
      '.kkooddoook.....',
      '..kokkokkokk....',
      '..kok.kok.kok...',
      '..kk..kk..kk....',
      '................',
      '................',
    ],
  ],
};

// ---------- Savta (24x24) — floral housecoat, slippers, giant glasses, plate of food ----------
const SAVTA_PAL = { k: '#1a1a1a', h: '#cfcfdc', H: '#9b9bb0', s: '#f2c9a0', S: '#d9a273', v: '#8b4fa3', V: '#6a3a80', f: '#f28cb3', y: '#f5d442', w: '#f5f0e6', b: '#a8d8ea', l: '#d94b6a', r: '#b8324a', c: '#d9b36c', n: '#4e9a3a' };

export const SAVTA_IDLE = {
  w: 24, h: 24, fps: 3, palette: SAVTA_PAL,
  frames: [
    [
      '.........kkkkk..........',
      '.......kkhhhhhkk........',
      '......khhhHhhhhhk.......',
      '......khhhhhhhHhhk......',
      '.....kkhhkkkkkkhhk......',
      '.....khhksssssskhk......',
      '.....khkssssssssHk......',
      '......kskkkkskkkks......',
      '......kskbbksbbkks......',
      '......kskbkksbkkks......',
      '......kskkkkskkkks......',
      '......ksssssSsssSk......',
      '.......ksssrrrssSk......',
      '........kssssssSk.......',
      '.......kkkkvvvkkkk......',
      '.....kkvvvvvvvvvvvkk....',
      '....kvvfvvvvvfvvvvvk....',
      '....kvvyvvvvvyvvvvkssk..',
      '....kvfvvvfvvvvvkwwwwwk.',
      '....kvvyvvvyvvvvvkkkkkk.',
      '....kvvvvvvvvfvvVk......',
      '....kvfvvvfvvvyvVk......',
      '.....kkkkkkkkkkkk.......',
      '.....kllk....kllk.......',
    ],
    [
      '........kkkkk...........',
      '.......kkhhhhhkk........',
      '......khhhHhhhhhk.......',
      '......khhhhhhhHhhk......',
      '.....kkhhkkkkkkhhk......',
      '.....khhksssssskhk......',
      '.....khkssssssssHk......',
      '......kskkkkskkkks......',
      '......kskbbksbbkks......',
      '......kskbkksbkkks......',
      '......kskkkkskkkks......',
      '......ksssssSsssSk......',
      '.......ksssrrrssSk......',
      '........kssssssSk.......',
      '.......kkkkvvvkkkk......',
      '.....kkvvvvvvvvvvvkk....',
      '....kvvfvvvvvfvvvvvkk...',
      '....kvvyvvvvvyvvvvvkssk.',
      '....kvfvvvfvvvvvvkwwwwwk',
      '....kvvyvvvyvvvvvvkkkkkk',
      '....kvvvvvvvvfvvVk......',
      '....kvfvvvfvvvyvVk......',
      '.....kkkkkkkkkkkk.......',
      '.....kllk....kllk.......',
    ],
  ],
};

export const SAVTA_THROW = {
  w: 24, h: 24, fps: 8, palette: SAVTA_PAL,
  frames: [
    [
      '.........kkkkk....kwwwk.',
      '.......kkhhhhhkk..kkkkk.',
      '......khhhHhhhhhk.kssk..',
      '......khhhhhhhHhhkkvvk..',
      '.....kkhhkkkkkkhhkvvk...',
      '.....khhksssssskhkvvk...',
      '.....khkssssssssHkvk....',
      '......kskkkkskkkkskk....',
      '......kskbbksbbkksk.....',
      '......kskbkksbkkksk.....',
      '......kskkkkskkkkk......',
      '......ksssssSsssSk......',
      '.......ksskrrrkSk.......',
      '........kskrrkSk........',
      '.......kkkkvvvkkkk......',
      '.....kkvvvvvvvvvvvk.....',
      '....kvvfvvvvvfvvvvk.....',
      '....kvvyvvvvvyvvvvk.....',
      '....kvfvvvfvvvvvvVk.....',
      '....kvvyvvvyvvvvvVk.....',
      '....kvvvvvvvvfvvVk......',
      '....kvfvvvfvvvyvVk......',
      '.....kkkkkkkkkkkk.......',
      '.....kllk....kllk.......',
    ],
    [
      '.........kkkkk..........',
      '.......kkhhhhhkk........',
      '......khhhHhhhhhk.......',
      '......khhhhhhhHhhk......',
      '.....kkhhkkkkkkhhk......',
      '.....khhksssssskhk......',
      '.....khkssssssssHk......',
      '......kskkkkskkkks......',
      '......kskbbksbbkks......',
      '......kskbkksbkkks......',
      '......kskkkkskkkkk......',
      '......ksssssSsssSk......',
      '.......ksskrrrkSk.......',
      '........kskrrkSk........',
      '.......kkkkvvvkkkk......',
      '.....kkvvvvvvvvvvvkkkk..',
      '....kvvfvvvvvfvvvvvvvvkk',
      '....kvvyvvvvvyvvvvvvkssk',
      '....kvfvvvfvvvvvvkkkkkk.',
      '....kvvyvvvyvvvvVk......',
      '....kvvvvvvvvfvvVk......',
      '....kvfvvvfvvvyvVk......',
      '.....kkkkkkkkkkkk.......',
      '.....kllk....kllk.......',
    ],
  ],
};

// ---------- Plate of food (8x8) — hummus with parsley, spinning ----------
export const PLATE = {
  w: 8, h: 8, fps: 8,
  palette: { k: '#1a1a1a', w: '#f5f0e6', W: '#c9c4b8', c: '#d9b36c', C: '#b8933f', n: '#4e9a3a', r: '#c0272d' },
  frames: [
    [
      '........',
      '..kkkk..',
      '.kwccwk.',
      'kwcnrcwk',
      'kwcCccwk',
      '.kWWWWk.',
      '..kkkk..',
      '........',
    ],
    [
      '........',
      '........',
      '.kkkkkk.',
      'kwwccwwk',
      'kWWCCWWk',
      '.kkkkkk.',
      '........',
      '........',
    ],
  ],
};

// ---------- Pakid — bureaucrat (16x24): short-sleeve shirt, tie, glasses, coffee ----------
const PAKID_PAL = { k: '#1a1a1a', s: '#f2c9a0', S: '#d9a273', h: '#5a3b2a', w: '#f5f0e6', W: '#cfcac0', t: '#c0272d', n: '#2f3f6e', N: '#1e2a4a', b: '#a8d8ea', c: '#f5f0e6', o: '#6b3d1f', m: '#7a7a7a' };

export const PAKID_IDLE = {
  w: 16, h: 24, fps: 3, palette: PAKID_PAL,
  frames: [
    [
      '.....kkkkkk.....',
      '....khsssssk....',
      '....khsssssSk...',
      '....khsssssSk...',
      '....kkkkkkkkk...',
      '....kbbkkbbkk...',
      '....kbkkkbkkS...',
      '....kkkkskkkk...',
      '.....ksssSsSk...',
      '.....kssmmSk....',
      '......ksssk.....',
      '....kkkwtwkkk...',
      '...kwwwktwwwwk..',
      '...kwwwktwwwwk..',
      '...kwwwktwwwwkk.',
      '...kkwwktwwkkcck',
      '...kskwwtwwksock',
      '....kkwwWwwkkcck',
      '.....knnnnnk.kk.',
      '.....knnNnnk....',
      '.....knnknnk....',
      '.....kNnkNnk....',
      '.....kkkkkkk....',
      '.....kkk.kkk....',
    ],
    [
      '.....kkkkkk.....',
      '....khsssssk....',
      '....khsssssSk...',
      '....khsssssSk...',
      '....kkkkkkkkk...',
      '....kbbkkbbkk...',
      '....kbkkkbkkS...',
      '....kkkkskkkk...',
      '.....ksssSsSk...',
      '.....kssmmSk....',
      '......ksssk.....',
      '....kkkwtwkkk...',
      '...kwwwktwwwwk..',
      '...kwwwktwwwwk..',
      '...kwwwktwwwkk..',
      '...kkwwktwwkkcck',
      '...kskwwtwwksock',
      '....kkwwWwwkkcck',
      '.....knnnnnk.kk.',
      '.....knnNnnk....',
      '.....knnknnk....',
      '.....kNnkNnk....',
      '.....kkkkkkk....',
      '.....kkk.kkk....',
    ],
  ],
};

export const PAKID_THROW = {
  w: 16, h: 24, fps: 8, palette: PAKID_PAL,
  frames: [
    [
      '.....kkkkkk.....',
      '....khsssssk....',
      '....khsssssSk...',
      '....khsssssSk...',
      '....kkkkkkkkk...',
      '....kbbkkbbkk...',
      '....kbkkkbkkS...',
      '....kkkkskkkk...',
      '.....ksssSsSk...',
      '.....ksskkSk....',
      '......ksssk.....',
      '....kkkwtwkkk...',
      '...kwwwktwwwwk..',
      '...kwwwktwwwwkkk',
      '...kwwwktwwwwwwk',
      '...kkwwktwwkkssk',
      '...kskwwtwwk.kk.',
      '....kkwwWwwk....',
      '.....knnnnnk....',
      '.....knnNnnk....',
      '.....knnknnk....',
      '.....kNnkNnk....',
      '.....kkkkkkk....',
      '.....kkk.kkk....',
    ],
  ],
};

// ---------- Queue ticket (8x8) — "your number is 847, please wait" ----------
export const TICKET = {
  w: 8, h: 8, fps: 6,
  palette: { k: '#1a1a1a', w: '#f5f0e6', r: '#c0272d', g: '#9a9a9a' },
  frames: [
    [
      'kkkkkkk.',
      'krrrrrk.',
      'kwwwwwk.',
      'kwkwkwk.',
      'kwkkkwk.',
      'kwggggk.',
      'kkkkkkk.',
      '........',
    ],
    [
      '.kkkkkk.',
      '.krrrrk.',
      '.kwwwwk.',
      '.kwkkwk.',
      '.kwkkwk.',
      '.kwggwk.',
      '.kkkkkk.',
      '........',
    ],
  ],
};

// ---------- Matkot player (16x24) — tanned beach guy, speedo, wooden paddle, gold chain ----------
const MATKOT_PAL = { k: '#1a1a1a', t: '#c9803a', T: '#a2612a', b: '#1f5fd6', B: '#153f8f', d: '#c58a3c', D: '#8a5a22', y: '#f5d442', w: '#f5f0e6', r: '#d94b4b' };

export const MATKOT_IDLE = {
  w: 16, h: 24, fps: 4, palette: MATKOT_PAL,
  frames: [
    [
      '.....kkkkk......',
      '....kkkkkkk.....',
      '....kkttttk.....',
      '....kkttttTk....',
      '....kkkkkkkk....',
      '....kttttttk....',
      '....ktttTtTk....',
      '.....ktrrTk.....',
      '.....kkttk......',
      '....kkkyykkk....',
      '...kttkkkkttk...',
      '..kttttkkttttk..',
      '..ktkttttttkkkk.',
      '..ktkttttttkddDk',
      '..kkktttTtTkdDDk',
      '.....kbbbbk.kDk.',
      '.....kBbbBk.kk..',
      '.....kttkttk....',
      '.....kttkttk....',
      '.....kTtkTtk....',
      '.....kttkttk....',
      '.....kttkttk....',
      '....kkkkkkkkk...',
      '....kkkk.kkkk...',
    ],
    [
      '.....kkkkk......',
      '....kkkkkkk.....',
      '....kkttttk.....',
      '....kkttttTk....',
      '....kkkkkkkk....',
      '....kttttttk....',
      '....ktttTtTk....',
      '.....ktrrTk.....',
      '.....kkttk......',
      '....kkkyykkk....',
      '...kttkkkkttk...',
      '..kttttkkttttk..',
      '..ktkttttttkkkk.',
      '..ktkttttttkddDk',
      '..kkktttTtTkdDDk',
      '.....kbbbbk.kDk.',
      '.....kBbbBk.kk..',
      '.....kttkttk....',
      '.....kttkttk....',
      '.....kTtkTtk....',
      '.....kttkttk....',
      '.....kttkttk....',
      '....kkkkkkkkk...',
      '....kkkk.kkkk...',
    ],
  ],
};

export const MATKOT_HIT = {
  w: 16, h: 24, fps: 8, palette: MATKOT_PAL,
  frames: [
    [
      '.....kkkkk...kk.',
      '....kkkkkkk.kddk',
      '....kkttttk.kdDk',
      '....kkttttTkkDDk',
      '....kkkkkkkkkDk.',
      '....kttttttkkk..',
      '....ktttTtTktk..',
      '.....ktrrTktk...',
      '.....kkttkkk....',
      '....kkkyykkk....',
      '...kttkkkkttk...',
      '..kttttkkttttk..',
      '..ktkttttttkk...',
      '..ktkttttttk....',
      '..kkktttTtTk....',
      '.....kbbbbk.....',
      '.....kBbbBk.....',
      '.....kttkttk....',
      '.....kttkttk....',
      '.....kTtkTtk....',
      '.....kttkttk....',
      '.....kttkttk....',
      '....kkkkkkkkk...',
      '....kkkk.kkkk...',
    ],
    [
      '.....kkkkk......',
      '....kkkkkkk.....',
      '....kkttttk.....',
      '....kkttttTk....',
      '....kkkkkkkk....',
      '....kttttttk....',
      '....ktttTtTk....',
      '.....ktrrTk.....',
      '.....kkttk......',
      '....kkkyykkk....',
      '...kttkkkkttkkkk',
      '..kttttkktttkddk',
      '..ktktttttttkDDk',
      '..ktkttttttkkkk.',
      '..kkktttTtTk....',
      '.....kbbbbk.....',
      '.....kBbbBk.....',
      '.....kttkttk....',
      '.....kttkttk....',
      '.....kTtkTtk....',
      '.....kttkttk....',
      '.....kttkttk....',
      '....kkkkkkkkk...',
      '....kkkk.kkkk...',
    ],
  ],
};

export const MATKOT_BALL = {
  w: 4, h: 4, fps: 12,
  palette: { k: '#1a1a1a', g: '#3a3a3a', w: '#8a8a8a' },
  frames: [
    ['.kk.', 'kwgk', 'kggk', '.kk.'],
    ['.kk.', 'kggk', 'kgwk', '.kk.'],
  ],
};

// ---------- Jellyfish / meduza (16x16, 3 frames) — pastel, translucent look ----------
const JELLY_PAL = { k: '#6b4a8c', p: '#f7b9d4', l: '#fde2ee', v: '#c9b6e8', e: '#3b2a52', w: '#ffffff' };

export const JELLYFISH = {
  w: 16, h: 16, fps: 4, palette: JELLY_PAL,
  frames: [
    [
      '................',
      '.....kkkkkk.....',
      '...kkllplppkk...',
      '..klllpppppppk..',
      '..kllpppvppppk..',
      '.klpppvppppvppk.',
      '.kppevppppevppk.',
      '.kpppppvpppppvk.',
      '..kkvkvkvkvkkk..',
      '...kvk.kv.kvk...',
      '...kv..kv..kv...',
      '..kv...kv...vk..',
      '..kv..kv....kv..',
      '...v..kv....v...',
      '...v...v....v...',
      '................',
    ],
    [
      '................',
      '................',
      '....kkkkkkkk....',
      '..kkllplppppkk..',
      '.kllppppvppppvk.',
      '.kpppvppppppppk.',
      '.kppevppppevppk.',
      '.kppppvpppppvpk.',
      '..kkkvkvkvkvkk..',
      '....kv.kv.vk....',
      '...kv..kv..kv...',
      '...v...kv...v...',
      '...kv..kv..kv...',
      '....v..v...v....',
      '....v..v...v....',
      '................',
    ],
    [
      '................',
      '......kkkk......',
      '....kkllppkk....',
      '...kllpppppvk...',
      '..klppppvpppvk..',
      '..kppevpppevpk..',
      '..kppppvppppvk..',
      '..kkppppppppkk..',
      '...kkvkvkvkkk...',
      '....kv.kv.kv....',
      '...kv..kv..vk...',
      '...v...kv...v...',
      '..kv...kv...kv..',
      '..v....v.....v..',
      '..v....v.....v..',
      '................',
    ],
  ],
};

// ---------- Mosquito / yatush (8x8, 2 frames) — the true ruler of Ayalon at dusk ----------
export const MOSQUITO = {
  w: 8, h: 8, fps: 16,
  palette: { k: '#1a1a1a', w: '#c8d8e0', r: '#c0272d', g: '#4a4a4a' },
  frames: [
    [
      '.ww.ww..',
      '.wwww...',
      '..kgk...',
      '.kgkkk..',
      '.kgk.kkk',
      '..k.....',
      '.k.k....',
      '........',
    ],
    [
      '........',
      '.kwkw...',
      '..kgk...',
      'wwkgkkk.',
      '.wkgk.kk',
      '..k....k',
      '.k.k....',
      '........',
    ],
  ],
};

// ---------- Pigeon / yona (12x12 idle, 16x12 flying) — the Tel Aviv panic bird ----------
const PIGEON_PAL = { k: '#1a1a1a', g: '#9aa0ad', G: '#6e7482', d: '#4d5363', n: '#3fa06a', w: '#e8eaf0', y: '#f5d442', o: '#e07a3a', r: '#e04a2a' };

export const PIGEON_IDLE = {
  w: 12, h: 12, fps: 3, palette: PIGEON_PAL,
  frames: [
    [
      '........kk..',
      '.......kddk.',
      '.......kdrdy',
      '......kdnnk.',
      '....kkkgnGk.',
      '..kkgggggGk.',
      '.kGgggggGGk.',
      '.kGGGggGGk..',
      '..kkGGGGk...',
      '....kkkk....',
      '.....ko.o...',
      '....kkkkkk..',
    ],
    [
      '............',
      '........kk..',
      '.......kddk.',
      '.......kdrdy',
      '......kdnnk.',
      '....kkkgnGk.',
      '..kkgggggGk.',
      '.kGgggggGGk.',
      '.kGGGggGGk..',
      '..kkGGGGk...',
      '....kkkk....',
      '....ko.ok...',
    ],
  ],
};

export const PIGEON_FLY = {
  w: 16, h: 12, fps: 10, palette: PIGEON_PAL,
  frames: [
    [
      '....kk..........',
      '...kggk.........',
      '...kgggk....kk..',
      '....kgggk..kddk.',
      '.....kgggkkdrdy.',
      '......kgggdnnk..',
      '...kkkggggnGGk..',
      '.kkGGGgggGGGk...',
      'kGGGGGGGGGGk....',
      '.kkkkkGGGk......',
      '......kkk.......',
      '................',
    ],
    [
      '................',
      '................',
      '............kk..',
      '...........kddk.',
      '..kkkkkkkk.kdrdy',
      'kkggggggggkdnnk.',
      'kGGGGGGGGgggGGk.',
      '.kkkkkkGGGGGGk..',
      '......kGGGGk....',
      '.....kkGGkk.....',
      '....kk.kk.......',
      '................',
    ],
    [
      '................',
      '................',
      '............kk..',
      '...........kddk.',
      '...........kdrdy',
      '..........kdnnk.',
      '......kkkkgGGGk.',
      '...kkkGGGGGGGGk.',
      '.kkGGGGGGGGGk...',
      'kGGGGkkkGGGk....',
      '.kkkk..kkkk.....',
      '................',
    ],
  ],
};

// ---------- Vehicles — side view, FACING LEFT (front bumper on the left, driving toward the player) ----------
// Long runs are built with rep()/put() so the pixel rows stay exact; result is still plain string-art.
const rep = (c, n) => c.repeat(n);
const put = (row, col, s) => row.slice(0, col) + s + row.slice(col + s.length);

function carFrames(hub) {
  // 48x20 hatchback. c/C body, w/W glass, l headlight, r taillight, g bumper, t tire, h hubcap.
  const base = [
    rep('.', 48),
    rep('.', 48),
    rep('.', 18) + rep('k', 17) + rep('.', 13),
    rep('.', 17) + 'k' + rep('c', 16) + 'kk' + rep('.', 12),
    rep('.', 16) + 'kck' + 'WW' + rep('w', 5) + 'k' + rep('w', 7) + 'kck' + rep('.', 11),
    rep('.', 15) + 'kck' + rep('w', 8) + 'k' + rep('w', 8) + 'kcck' + rep('.', 9),
    rep('.', 14) + 'kck' + rep('w', 9) + 'k' + rep('w', 9) + 'kccck' + rep('.', 7),
    rep('.', 13) + 'kcc' + rep('k', 23) + 'ccccck' + rep('.', 3),
    rep('.', 10) + 'kkk' + rep('c', 32) + 'kk' + '.',
    rep('.', 8) + 'kk' + rep('c', 37) + 'k',
    rep('.', 7) + 'k' + rep('c', 39) + 'k',
    rep('.', 6) + 'kl' + rep('c', 38) + 'rk',
    rep('.', 6) + 'kl' + rep('C', 38) + 'rk',
    rep('.', 6) + 'k' + rep('C', 40) + 'k',
    rep('.', 6) + 'kg' + rep('k', 8) + rep('g', 16) + rep('k', 8) + rep('g', 7) + 'k',
    rep('.', 8) + 'kttttttk' + rep('.', 16) + 'kttttttk' + rep('.', 8),
    rep('.', 8) + 'kt' + hub[0] + 'tk' + rep('.', 16) + 'kt' + hub[0] + 'tk' + rep('.', 8),
    rep('.', 8) + 'kt' + hub[1] + 'tk' + rep('.', 16) + 'kt' + hub[1] + 'tk' + rep('.', 8),
    rep('.', 8) + 'kttttttk' + rep('.', 16) + 'kttttttk' + rep('.', 8),
    rep('.', 9) + 'kkkkkk' + rep('.', 18) + 'kkkkkk' + rep('.', 9),
  ];
  // door seam + handle, side mirror, wheel-arch shading
  base[8] = put(base[8], 26, 'k');
  base[9] = put(base[9], 26, 'k');
  base[10] = put(base[10], 26, 'k');
  base[11] = put(base[11], 26, 'k');
  base[10] = put(base[10], 22, 'kkk');
  base[6] = put(base[6], 12, 'kk');
  base[7] = put(base[7], 11, 'kk');
  return base;
}
const CAR_HUBS = [['hhhh', 'hkkh'], ['hkkh', 'hhhh']];
const carPal = (c, C) => ({ k: '#1a1a1a', c, C, w: '#a8d8ea', W: '#e0f4ff', l: '#f5e27a', r: '#e0302a', g: '#8a8f99', t: '#2a2a2a', h: '#b8bcc4' });

export const CAR_RED = { w: 48, h: 20, fps: 8, palette: carPal('#d6302c', '#9e1f1c'), frames: CAR_HUBS.map(carFrames) };
export const CAR_BLUE = { w: 48, h: 20, fps: 8, palette: carPal('#2f6fd6', '#1e478f'), frames: CAR_HUBS.map(carFrames) };

// Taxi: white body + yellow "מונית" roof sign (the classic monit look).
function taxiFrames(hub) {
  const f = carFrames(hub);
  f[0] = put(f[0], 22, 'kkkkkkkkkk');
  f[1] = put(f[1], 22, 'kyykykykyk');
  f[2] = put(f[2], 22, 'kyyyyyyyyk');
  // black checker stripe along the door line
  f[9] = put(f[9], 12, 'kckckckckckckckckckckckckckckck');
  return f;
}
export const CAR_TAXI = {
  w: 48, h: 20, fps: 8,
  palette: { ...carPal('#f5f0e6', '#c9c4b8'), y: '#f5d442' },
  frames: CAR_HUBS.map(taxiFrames),
};

// Egged-style bus (64x24), green/white, facing LEFT.
function busFrames(hub) {
  const win = (glass) => 'k' + glass.slice(0, 6) + 'k' + 'w' + rep('k' + glass.slice(0, 4) + 'k' + 'w', 7);
  const glassTop = 'BBbbbb', glassMid = 'bbbbbb';
  const f = [
    rep('.', 4) + rep('k', 57) + rep('.', 3),
    '...k' + rep('w', 57) + 'k..',
    '..k' + rep('w', 59) + 'k.',
    '.kw' + 'k' + rep('k', 6) + 'k' + 'w' + rep('kkkkkkw', 7) + 'wwk',
    '.kw' + win(glassTop) + 'wwk',
    '.kw' + win(glassMid) + 'wwk',
    '.kw' + win(glassMid) + 'wwk',
    '.kw' + win(glassMid) + 'wwk',
    '.kw' + 'k' + rep('k', 6) + 'k' + 'w' + rep('kkkkkkw', 7) + 'wwk',
    '.k' + rep('w', 60) + 'k.',
    'k' + rep('g', 62) + 'k',
    'kl' + rep('g', 60) + 'rk',
    'kl' + rep('g', 60) + 'rk',
    'k' + rep('w', 62) + 'k',
    'k' + rep('G', 62) + 'k',
    'k' + rep('G', 7) + rep('k', 10) + rep('G', 26) + rep('k', 10) + rep('G', 9) + 'k',
    rep('k', 64),
    rep('.', 8) + 'kttttttttk' + rep('.', 26) + 'kttttttttk' + rep('.', 10),
    rep('.', 8) + 'kt' + hub[0] + 'tk' + rep('.', 26) + 'kt' + hub[0] + 'tk' + rep('.', 10),
    rep('.', 8) + 'kt' + hub[1] + 'tk' + rep('.', 26) + 'kt' + hub[1] + 'tk' + rep('.', 10),
    rep('.', 8) + 'kt' + hub[2] + 'tk' + rep('.', 26) + 'kt' + hub[2] + 'tk' + rep('.', 10),
    rep('.', 8) + 'kt' + hub[3] + 'tk' + rep('.', 26) + 'kt' + hub[3] + 'tk' + rep('.', 10),
    rep('.', 8) + 'kttttttttk' + rep('.', 26) + 'kttttttttk' + rep('.', 10),
    rep('.', 9) + rep('k', 8) + rep('.', 28) + rep('k', 8) + rep('.', 11),
  ];
  // front door (cols 12-19), destination sign "ירושלים" as a dark strip above the windshield
  for (let r = 10; r <= 15; r++) { f[r] = put(f[r], 20, "k"); f[r] = put(f[r], 27, "k"); }
  f[1] = put(f[1], 5, 'kkkkkkkkkk');
  f[2] = put(f[2], 5, 'kyykyyykyk');
  // Egged emblem on the flank: white disc with green core
  f[10] = put(f[10], 40, 'kwwk');
  f[11] = put(f[11], 39, 'kwggwk');
  f[12] = put(f[12], 39, 'kwggwk');
  f[13] = put(f[13], 40, 'kwwk');
  return f;
}
const BUS_HUBS = [
  ['hhhhhh', 'hhkkhh', 'hhkkhh', 'hhhhhh'],
  ['hhkkhh', 'hkhhkh', 'hkhhkh', 'hhkkhh'],
];
export const CAR_BUS = {
  w: 64, h: 24, fps: 8,
  palette: { k: '#1a1a1a', w: '#f5f0e6', b: '#a8d8ea', B: '#e0f4ff', g: '#2e8b3a', G: '#1e5f27', l: '#f5e27a', r: '#e0302a', t: '#2a2a2a', h: '#b8bcc4', y: '#f5d442' },
  frames: BUS_HUBS.map(busFrames),
};

// ---------- Camel / gamal (40x32, 4-frame walk) — moving platform with a colorful Bedouin saddle blanket ----------
function camelFrame(legs) {
  const f = [
    rep('.', 40),
    rep('.', 32) + 'kk' + rep('.', 6),
    rep('.', 31) + 'kckkk' + rep('.', 4),
    rep('.', 30) + 'kccccckk' + '..',
    rep('.', 29) + 'kcwkcccccck',
    rep('.', 28) + 'kcccccccCCck',
    rep('.', 27) + 'kcccccCkkCCck',
    rep('.', 26) + 'kcccck..kkkk..',
    rep('.', 13) + 'kkkkkk' + rep('.', 6) + 'kcccck' + rep('.', 9),
    rep('.', 12) + 'kccccccck' + rep('.', 4) + 'kccccck' + rep('.', 8),
    rep('.', 11) + 'krbrbrbrbk' + '...' + 'kcccccck' + rep('.', 8),
    rep('.', 10) + 'kybybybybyk' + '..' + 'kcccccck' + rep('.', 9),
    rep('.', 9) + 'kgrgrgrgrgrgk' + '.' + 'kcccccck' + rep('.', 9),
    rep('.', 8) + 'kbybybybybybykkccccccck' + rep('.', 9),
    rep('.', 7) + 'kcccrgrgrgrgrgccccccccck' + rep('.', 9),
    rep('.', 5) + 'kkkcccccccccccccccccccccck' + rep('.', 9),
    '....kcccccccccccccccccccccccck' + rep('.', 10),
    '...kccccccccccccccccccccccccCk' + rep('.', 10),
    '...kcCCccccccccccccccccccCCCCk' + rep('.', 10),
    '...kkCCCCCCCCCCCCCCCCCCCCCCCCk' + rep('.', 10),
    '....' + rep('k', 26) + rep('.', 10),
    rep('.', 40), rep('.', 40), rep('.', 40), rep('.', 40), rep('.', 40),
    rep('.', 40), rep('.', 40), rep('.', 40), rep('.', 40), rep('.', 40), rep('.', 40),
  ];
  // tail with tassel
  f[16] = put(f[16], 2, 'kk'); f[17] = put(f[17], 2, 'k'); f[18] = put(f[18], 1, 'k'); f[19] = put(f[19], 1, 'k'); f[20] = put(f[20], 0, 'kCk'); f[21] = put(f[21], 0, 'kkk');
  // blanket tassels hanging off the hump
  f[15] = put(f[15], 7, 'rb'); f[15] = put(f[15], 22, 'yr');
  // legs: each = [x, lift]. Leg is 3 wide: kck column, hoof at bottom.
  for (const [x, lift] of legs) {
    const top = 21, bottom = 31 - lift;
    for (let r = top; r < bottom - 1; r++) f[r] = put(f[r], x, 'kck');
    f[bottom - 1] = put(f[bottom - 1], x, 'kCk');
    f[bottom] = put(f[bottom], x, 'kkk');
  }
  return f;
}
export const CAMEL_WALK = {
  w: 40, h: 32, fps: 6,
  palette: { k: '#1a1a1a', c: '#d4aa5e', C: '#a37b36', w: '#f5f0e6', r: '#d6302c', b: '#2f6fd6', y: '#f5d442', g: '#3fa06a' },
  frames: [
    camelFrame([[8, 0], [12, 0], [20, 0], [25, 0]]),
    camelFrame([[7, 1], [13, 0], [19, 1], [26, 0]]),
    camelFrame([[8, 0], [12, 0], [20, 0], [25, 0]]),
    camelFrame([[9, 0], [11, 1], [21, 0], [24, 1]]),
  ],
};

// ---------- Tourist (16x24) — sunburned, bucket hat, camera, socks + sandals. "Shalom! Where is the beach?" ----------
export const TOURIST = {
  w: 16, h: 24, fps: 4,
  palette: { k: '#1a1a1a', h: '#d9cf9c', H: '#b3a86f', r: '#ec8f78', R: '#cf6a55', w: '#f5f0e6', f: '#f2a541', F: '#3fa06a', n: '#c9bd8f', N: '#a69a6a', b: '#a8d8ea', d: '#8a5a2b', g: '#5a5a5a' },
  frames: [
    [
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '..kkkkkkkkkkkk..',
      '..kHHHHHHHHHHk..',
      '...krrrrrrrrk...',
      '...krkrrrkrRk...',
      '...krrrrwwrRk...',
      '....krrwwrRk....',
      '....kRRrrRRk....',
      '.....kkkkkk.....',
      '...kkfFffffkk...',
      '..kffffFfffffk..',
      '..krkfkkkkfkrk..',
      '..krkfkbbkfkrk..',
      '..kkkfkkkkfkkk..',
      '....kfFffffk....',
      '....knnnnnnk....',
      '....knnNnnNk....',
      '....knnknnnk....',
      '....kwwkkwwk....',
      '....kwwk.kwwk...',
      '....kddk.kddk...',
      '....kkkk.kkkk...',
    ],
    [
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '..kkkkkkkkkkkk..',
      '..kHHHHHHHHHHk..',
      '...krrrrrrrrk...',
      '...krkrrrkrRk...',
      '...krrrrwwrRk...',
      '....krrwwrRk....',
      '....kRRrrRRk....',
      '.....kkkkkk.....',
      '...kkfFffffkk...',
      '..kffffFfffffk..',
      '..krkfkkkkfkrk..',
      '..krkfkbbkfkrk..',
      '..kkkfkkkkfkkk..',
      '....kfFffffk....',
      '....knnnnnnk....',
      '....knnNnnNk....',
      '...kknnknnkk....',
      '..kwwk.kwwk.....',
      '..kwwk..kwwk....',
      '..kddk..kddk....',
      '..kkkk..kkkk....',
    ],
    [
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '..kkkkkkkkkkkk..',
      '..kHHHHHHHHHHk..',
      '...krrrrrrrrk...',
      '...krkrrrkrRk...',
      '...krrrrwwrRk...',
      '....krrwwrRk....',
      '....kRRrrRRk....',
      '.....kkkkkk.....',
      '...kkfFffffkk...',
      '..kffffFfffffk..',
      '..krkfkkkkfkrk..',
      '..krkfkbbkfkrk..',
      '..kkkfkkkkfkkk..',
      '....kfFffffk....',
      '....knnnnnnk....',
      '....knnNnnNk....',
      '....kknnknnkk...',
      '.....kwwk.kwwk..',
      '....kwwk...kwwk.',
      '....kddk...kddk.',
      '....kkkk...kkkk.',
    ],
  ],
};

// ---------- BOSS: Savta Rivka (48x48) — giant, terrifying, loving. "!אתה רזה מדי" ----------
const BOSS_PAL = { ...SAVTA_PAL, K: '#c9873c', G: '#7a7f8a', g: '#5a5e68', x: '#1a1a1a', o: '#ffffff' };

function bossBase({ eyes = 'bbkkbbb', mouth = 'closed', hurt = false } = {}) {
  const d = (n) => rep('.', n);
  const lens = (row) => 'k' + row + 'k';
  const glassesRow = (l, r) => d(12) + 'k' + 's' + lens(l) + 'ss' + lens(r) + 's' + 'k' + d(12);
  const eyeL = eyes, eyeR = eyes;
  const f = [
    d(18) + rep('k', 12) + d(18),
    d(16) + 'kk' + rep('h', 12) + 'kk' + d(16),
    d(15) + 'k' + rep('h', 16) + 'k' + d(15),
    d(14) + 'k' + 'hhhHhhhhhhhhhhhhhh' + 'k' + d(14),
    d(13) + 'k' + rep('h', 20) + 'k' + d(13),
    d(12) + 'k' + rep('h', 22) + 'k' + d(12),
    d(12) + 'khh' + rep('k', 18) + 'hhk' + d(12),
    d(11) + 'khhk' + rep('s', 18) + 'khhk' + d(11),
    d(11) + 'khk' + rep('s', 20) + 'khk' + d(11),
    d(11) + 'khk' + rep('s', 20) + 'kHk' + d(11),
    d(11) + 'kk' + rep('s', 22) + 'kk' + d(11),
    d(12) + 'k' + rep('s', 22) + 'k' + d(12),
    d(12) + 'k' + 's' + rep('k', 9) + 'ss' + rep('k', 9) + 's' + 'k' + d(12),
    d(12) + 'k' + 's' + lens('bbbbbbb') + 'kk' + lens('bbbbbbb') + 's' + 'k' + d(12),
    glassesRow(eyeL, eyeR),
    glassesRow(eyeL, eyeR),
    d(12) + 'k' + 's' + lens('bbbbbbb') + 'ss' + lens('bbbbbbb') + 's' + 'k' + d(12),
    d(12) + 'k' + 's' + rep('k', 9) + 'ss' + rep('k', 9) + 's' + 'k' + d(12),
    d(12) + 'k' + rep('s', 22) + 'k' + d(12),
    d(12) + 'k' + 'sss' + 'ff' + rep('s', 12) + 'ff' + 'sss' + 'k' + d(12),
    d(12) + 'k' + rep('s', 9) + 'SS' + rep('s', 11) + 'k' + d(12),
    d(13) + 'k' + rep('s', 20) + 'k' + d(13),
    d(13) + 'k' + rep('s', 20) + 'k' + d(13),
    d(14) + 'k' + rep('s', 18) + 'k' + d(14),
    d(15) + 'k' + rep('s', 16) + 'k' + d(15),
    d(16) + 'kk' + rep('s', 12) + 'kk' + d(16),
    d(14) + 'kkkk' + rep('v', 12) + 'kkkk' + d(14),
    d(10) + 'kkkk' + rep('v', 20) + 'kkkk' + d(10),
    d(8) + 'kk' + rep('v', 28) + 'kk' + d(8),
    d(7) + 'k' + rep('v', 32) + 'k' + d(7),
  ];
  for (let r = 30; r <= 43; r++) f.push(d(6) + 'k' + rep('v', 34) + 'k' + d(6));
  f.push(d(6) + rep('k', 36) + d(6));
  f.push(d(8) + 'kllllk' + d(20) + 'kllllk' + d(8));
  f.push(d(8) + 'kllllk' + d(20) + 'kllllk' + d(8));
  f.push(d(8) + 'kkkkkk' + d(20) + 'kkkkkk' + d(8));
  // mouth
  if (mouth === 'closed') {
    f[22] = put(f[22], 19, 'krrrrrrrrk');
  } else if (mouth === 'open') {
    f[21] = put(f[21], 19, 'kkkkkkkkkk');
    f[22] = put(f[22], 19, 'krwwwwwwrk');
    f[23] = put(f[23], 19, 'krrrrrrrrk');
    f[24] = put(f[24], 20, 'kkkkkkkk');
  } else if (mouth === 'yell') {
    f[20] = put(f[20], 18, 'kkkkkkkkkkkk');
    f[21] = put(f[21], 18, 'kwwrrrrrrwwk');
    f[22] = put(f[22], 18, 'krrrrrrrrrrk');
    f[23] = put(f[23], 18, 'krrrrrrrrrrk');
    f[24] = put(f[24], 19, 'kkrrrrrrkk');
  }
  // floral print on the housecoat (pink petals + yellow centres) and shade on the right flank
  const flowers = [[9, 31], [17, 33], [27, 30], [34, 36], [12, 38], [22, 40], [30, 42], [38, 34], [10, 36], [18, 41]];
  for (const [x, y] of flowers) {
    f[y] = put(f[y], x, 'fyf');
    f[y - 1] = put(f[y - 1], x + 1, 'f');
    f[y + 1] = put(f[y + 1], x + 1, 'f');
  }
  for (let r = 30; r <= 43; r++) f[r] = put(f[r], 39, 'VV');
  // left arm on hip (behind, on the far side)
  f[29] = put(f[29], 3, 'kkkk');
  for (let r = 30; r <= 33; r++) f[r] = put(f[r], 2, 'kvvvk');
  f[34] = put(f[34], 2, 'ksssk');
  f[35] = put(f[35], 3, 'kkkk');
  // hairpin + bun highlight
  f[2] = put(f[2], 18, 'H');
  f[1] = put(f[1], 21, 'k');
  if (hurt) {
    // glasses knocked askew, sweat drops
    f[13] = put(f[13], 24, 'kbbbbbbbk');
    f[17] = put(f[17], 24, 'kkkkkkkkk');
    f[10] = put(f[10], 38, 'b');
    f[11] = put(f[11], 38, 'b');
    f[8] = put(f[8], 8, 'b');
    f[9] = put(f[9], 7, 'b');
  }
  return f;
}
function bossArmIdle(f) {
  // right arm holding a pot of kubbeh at the hip
  f[29] = put(f[29], 41, 'kkkk');
  for (let r = 30; r <= 33; r++) f[r] = put(f[r], 41, 'kvvvk');
  f[34] = put(f[34], 41, 'kssk');
  f[35] = put(f[35], 38, 'kKKkKKkKKk');
  f[36] = put(f[36], 37, 'kkkkkkkkkkk');
  for (let r = 37; r <= 40; r++) f[r] = put(f[r], 37, 'kGGGGGGgGgk');
  f[41] = put(f[41], 37, 'kkkkkkkkkkk');
  return f;
}
function bossArmUp(f) {
  // right arm raised over the head, kubbeh in hand
  for (let r = 10; r <= 28; r++) f[r] = put(f[r], 41, 'kvvk');
  f[28] = put(f[28], 40, 'kkvvkk');
  f[29] = put(f[29], 39, 'kkkkkkk');
  f[8] = put(f[8], 40, 'kssssk');
  f[9] = put(f[9], 40, 'kssssk');
  f[3] = put(f[3], 41, 'kkkk');
  f[4] = put(f[4], 40, 'kKKKKk');
  f[5] = put(f[5], 40, 'kKKKKk');
  f[6] = put(f[6], 40, 'kkKKkk');
  f[7] = put(f[7], 41, 'kkkk');
  return f;
}
function bossArmThrown(f) {
  // arm flung forward, palm open, "!תאכל"
  f[27] = put(f[27], 38, 'kkkkkkkkkk');
  f[28] = put(f[28], 38, 'kvvvvvvssk');
  f[29] = put(f[29], 38, 'kvvvvvvssk');
  f[30] = put(f[30], 38, 'kkkkkkkkkk');
  return f;
}

export const BOSS_SAVTA_IDLE = {
  w: 48, h: 48, fps: 3, palette: BOSS_PAL,
  frames: [
    bossArmIdle(bossBase({ eyes: 'bbkkbbb', mouth: 'closed' })),
    bossArmIdle(bossBase({ eyes: 'bbbkkbb', mouth: 'closed' })),
  ],
};
export const BOSS_SAVTA_THROW = {
  w: 48, h: 48, fps: 6, palette: BOSS_PAL,
  frames: [
    bossArmUp(bossBase({ eyes: 'bkkbbbb', mouth: 'open' })),
    bossArmThrown(bossBase({ eyes: 'bkkbbbb', mouth: 'yell' })),
  ],
};
export const BOSS_SAVTA_HURT = {
  w: 48, h: 48, fps: 8, palette: BOSS_PAL,
  frames: [
    bossArmIdle(bossBase({ eyes: 'kbkbkbk', mouth: 'open', hurt: true })),
    bossArmIdle(bossBase({ eyes: 'ooooooo', mouth: 'open', hurt: true })),
  ],
};

// ---------- Kubbeh (8x8) — flying bulgur torpedo of love ----------
export const KUBBEH = {
  w: 8, h: 8, fps: 10,
  palette: { k: '#1a1a1a', K: '#c9873c', L: '#e0a85a', D: '#8f5a22' },
  frames: [
    [
      '........',
      '..kkkk..',
      '.kLLKKk.',
      'kLLKKKDk',
      'kLKKKDDk',
      '.kKKDDk.',
      '..kkkk..',
      '........',
    ],
    [
      '........',
      '...kk...',
      '..kLKk..',
      '.kLKKDk.',
      '.kLKKDk.',
      '..kKDk..',
      '...kk...',
      '........',
    ],
    [
      '........',
      '..kkkk..',
      '.kKKDDk.',
      'kLKKKDDk',
      'kLLKKKDk',
      '.kLLKKk.',
      '..kkkk..',
      '........',
    ],
    [
      '........',
      '...kk...',
      '..kDKk..',
      '.kDKKLk.',
      '.kDKKLk.',
      '..kKLk..',
      '...kk...',
      '........',
    ],
  ],
};

export default {
  CAT_IDLE, CAT_RUN, CAT_HISS,
  SAVTA_IDLE, SAVTA_THROW, PLATE,
  PAKID_IDLE, PAKID_THROW, TICKET,
  MATKOT_IDLE, MATKOT_HIT, MATKOT_BALL,
  JELLYFISH, MOSQUITO, PIGEON_IDLE, PIGEON_FLY,
  CAR_RED, CAR_BLUE, CAR_TAXI, CAR_BUS,
  CAMEL_WALK, TOURIST,
  BOSS_SAVTA_IDLE, BOSS_SAVTA_THROW, BOSS_SAVTA_HURT, KUBBEH,
};

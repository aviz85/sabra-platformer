// SABRA! — אריחים · Tiles (16×16) for 5 themes.
// Format: see src/engine/sprite.js. '.' = transparent. Every row exactly 16 chars.
// GROUND tiles tile seamlessly (edges wrap horizontally & vertically).
// GROUND_TOP = surface tile (detail on top), GROUND = filler underneath.
// Animated: TELAVIV_HAZARD (jellyfish water), AYALON_HAZARD (heat shimmer), AYALON_HAZARD2 (manhole steam), JERUSALEM_HAZARD (coals).

// ───────────────────────── TEL AVIV · חוף תל אביב ─────────────────────────
const TLV = {
  S: '#e9c97c', // sand
  s: '#d6ad5e', // sand shade
  d: '#b98f45', // dark grain
  L: '#f7e2a6', // sand light
  w: '#fbf5e6', // shell white
  p: '#efb0a6', // shell pink
  k: '#5a3d1c', // outline
  B: '#1f6fa8', // deep water
  b: '#3f9ad2', // water
  c: '#8fd4f0', // shallow water
  f: '#eaf8ff', // foam
  j: '#f0c0f4', // jellyfish body
  J: '#c078d4', // jellyfish dark
  o: '#c98a4c', // plank
  O: '#e3ab68', // plank light
  n: '#7f4f22', // plank dark
  t: '#3fb8ab', // beach-bar turquoise
  T: '#74d6c9', // turquoise light
  u: '#247f76', // turquoise dark
  r: '#e0453a', // red (flag / ball)
  y: '#f8d548', // yellow
  a: '#e07a3a', // starfish
  A: '#f4a866', // starfish light
};

const TELAVIV_GROUND = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    'SSSSsSSSSSSSSsSS',
    'SsSSSSSdSSSSSSSS',
    'SSSSSSSSSSsSSSSS',
    'SSSdSSSSSSSSSSdS',
    'SSSSSSsSSSsSSSSS',
    'SssSSSSSSSssSSSS',
    'SsSSSSdSSSSSSsSS',
    'SSSSSSSSSSdSSSSS',
    'SSSSsSSSSSSSSSSS',
    'SSSSSSSSSsSSSsSS',
    'SdSSSSsSSSSSSSSS',
    'SSSSSSSSSSSSdSSS',
    'SSSsSSSSSSSSSSSS',
    'SSSSSssSSSSSSssS',
    'SSSSSdSSSSSSSSSS',
    'SSSSSSSSSSSsSSSS',
  ]],
};

const TELAVIV_GROUND_TOP = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    'LLLLLLLLLLLLLLLL',
    'SLSSSSSSLLSSSSSL',
    'SSSSSSSSSSSSSSSS',
    'SSsSSSSSSSSSSsSS',
    'SSSSSSSSSSSSSsSS',
    'SSSSSSSSSsSSSSSS',
    'SSSsSSSSSSSSSSSS',
    'SSSSSSSSSSSdSSSS',
    'SSSSSsSSSSSSSSSS',
    'SssSSSSSSSSSsSSS',
    'SSSSSSSdSSSSSSSS',
    'SSSSSSSSSSSSSSsS',
    'SSdSSSsSSSSSSSSS',
    'SSSSSSSSSSSdSSSS',
    'SSSSsSSSSSSSSSSS',
    'SSSSSSSSSSsSSSSS',
  ]],
};

const TELAVIV_PLATFORM = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    'OOOOOOOkOOOOOOOk',
    'oooooookoooooook',
    'okoooookokoooook',
    'ooooonokooooonok',
    'nnnnnnnknnnnnnnk',
    'kkkkkkkkkkkkkkkk',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
    '..ok........ok..',
  ]],
};

const TELAVIV_WALL = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    'TTTTTTTTTTTTTTTT',
    'tttttTttttttttTt',
    'tttttttttttttttt',
    'uuuuuuuuuuuuuuuu',
    'TTTTTTTTTTTTTTTT',
    'tttttttttttttttt',
    'tttttttttssstttt',
    'uuuuuuuuuuuuuuuu',
    'TTTTTTTTTTTTTTTT',
    'ttTttttttttttttt',
    'tttttttttttttttt',
    'uuuuuuuuuuuuuuuu',
    'TTTTTTTTTTTTTTTT',
    'tttttttttttttktt',
    'tttttttttttttttt',
    'uuuuuuuuuuuuuuuu',
  ]],
};

const TELAVIV_HAZARD = {
  w: 16, h: 16, fps: 3, palette: TLV,
  frames: [
    [
      'cffccfffccfffccf',
      'cbccbbcccbbccbbc',
      'bbbbbbbbbbbbbbbb',
      'bbbbbjjjjjbbbbbb',
      'bbbbjjjjjjjbbbbb',
      'bbbbjJjjjJjbbbbb',
      'bbbbJJJJJJJbbbbb',
      'bbbbbJbJbJbbbbbb',
      'BbbbbJbJbJbbbbbB',
      'BBbbbbJbJbbbbbBB',
      'BBBbbbJbbJbbbBBB',
      'BBBBbbbJbbbbBBBB',
      'BBBBBBBBBBBBBBBB',
      'BBBBBbBBBBbBBBBB',
      'BBBBBBBBBBBBBBBB',
      'BBBBBBBBBBBBBBBB',
    ],
    [
      'ffccfffccfffccff',
      'bccbbcccbbccbbcc',
      'bbbbbjjjjjbbbbbb',
      'bbbbjjjjjjjbbbbb',
      'bbbbjJjjjJjbbbbb',
      'bbbbJJJJJJJbbbbb',
      'bbbbbJbJbJbbbbbb',
      'bbbbJbbJbbJbbbbb',
      'BbbbJbbJbbJbbbbB',
      'BBbbbJbJbJbbbbBB',
      'BBBbbJbbbJbbbBBB',
      'BBBBbbbbbbbbBBBB',
      'BBBBBBBBBBBBBBBB',
      'BBBBbBBBBBBbBBBB',
      'BBBBBBBBBBBBBBBB',
      'BBBBBBBBBBBBBBBB',
    ],
  ],
};

// כוכב ים · starfish
const TELAVIV_DECOR1 = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    '................',
    '.......k........',
    '......kak.......',
    '......kAk.......',
    '.....kaaak......',
    '.kkkkkaAaakkkkk.',
    '.kaaaAaaaaAaaak.',
    '..kaaaaaaaaaak..',
    '...kaaaAaaaak...',
    '....kaaaaaak....',
    '....kaAaaAak....',
    '...kaaakkaaak...',
    '..kaak....kaak..',
    '.kaak......kaak.',
    '.kkk........kkk.',
    '................',
  ]],
};

// כדור חוף + צדפה · beach ball with a scallop shell at its foot
const TELAVIV_DECOR2 = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    '................',
    '................',
    '.....kkkk.......',
    '...kkwwyykk.....',
    '..kwwwwyyyyk....',
    '.kwwwwwyyyyyk...',
    '.kbbwwwyyyrrk...',
    'kbbbbwwyyrrrrk..',
    'kbbbbbwyrrrrrk..',
    'kbbbbbwyrrrrrk..',
    '.kbbbbwyrrrrk...',
    '.kkbbbwyrrrkk...',
    '..kkkbwyrkkk....',
    '....kkkkkk.wwwww',
    '...........wpwpw',
    '............wkw.',
  ]],
};

// ארמון חול · sand castle
const TELAVIV_DECOR3 = {
  w: 16, h: 16, palette: TLV,
  frames: [[
    '.......rr.......',
    '.......krr......',
    '.......k........',
    '.......k........',
    '....s.sSs.s.....',
    '....sSsSsSs.....',
    '....sSSSSSs.....',
    '....sSSdSSs.....',
    '..s.sSSSSSs.s...',
    '..sSsSSSSSsSs...',
    '..sSSSSSSSSSs...',
    '..sSSSSSSSSSs...',
    '..sSSSSdSSSSs...',
    '..sSSSSdSSSSs...',
    '.dssssssssssd...',
    '................',
  ]],
};

// ───────────────────────── SHUK · שוק מחנה יהודה ─────────────────────────
const SHK = {
  d: '#4e4841', // mortar dark
  e: '#6f685b', // stone shadow
  g: '#8e867a', // stone
  h: '#9c9283', // stone warm
  G: '#b8afa0', // stone highlight
  o: '#c68a4c', // wood
  O: '#e2aa68', // wood light
  n: '#8a5a2b', // wood dark
  k: '#3a2a16', // outline
  w: '#f2ecdc', // poster paper
  r: '#d63a30', // red
  b: '#2f57a8', // blue
  y: '#f0c840', // yellow
  v: '#2f8a3f', // pickle green
  V: '#5cb85a', // pickle light
  p: '#1d4a26', // pickle dark
  x: '#4a3a12', // oil dark
  X: '#8a6a1a', // oil
  Y: '#c8a030', // oil shine
};

const SHUK_GROUND = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    'dGGGGGGddGGGGGed',
    'dGhhhheddGgggged',
    'dghhhheddggggged',
    'deeeeeeddeeeeedd',
    'GGGddGGGGGGddGGG',
    'hheddGggggeddGhh',
    'hheddgggggeddghh',
    'eeeddeeeeeeddeee',
    'dGGGGGeddGGGGGGd',
    'dGggggeddGhhhhed',
    'dgggggeddghhhhed',
    'deeeeedddeeeeeed',
    'GGeddGGGGGGddGGG',
    'ggeddGhhhheddGgg',
    'ggeddghhhheddggg',
    'eeeddeeeeeeddeee',
  ]],
};

const SHUK_GROUND_TOP = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    'GGGGGGGGGGGGGGGG',
    'dGhhhheddGrrrged',
    'dghhhheddgrrgged',
    'deeeeeeddeeeeedd',
    'GGGddGGGGGGddGGG',
    'hhVddGggggeddGhh',
    'hheddgggggeddghh',
    'eeeddeeeeeeddeee',
    'dGGGGGeddGGGGGGd',
    'dGggggeddGhhhhed',
    'dgggggeddghhhhed',
    'deeeeedddeeeeeed',
    'GGeddGGGGGGddGGG',
    'ggeddGhhhheddGgg',
    'ggeddghhhheddggg',
    'eeeddeeeeeeddeee',
  ]],
};

const SHUK_PLATFORM = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    'kkkkkkkkkkkkkkkk',
    'kOOOOOOOOOOOOOOk',
    'kOooooooooooooOk',
    'kOokoooooooookOk',
    'kOooooooooooooOk',
    'knnnnnnnnnnnnnnk',
    'kOooooooroooooOk',
    'kOoooooorrroooOk',
    'kOooooorrrrrooOk',
    'kOoooooorrroooOk',
    'kOooooooroooooOk',
    'knnnnnnnnnnnnnnk',
    'kOooooooooooooOk',
    'kOokoooooooookOk',
    'knnnnnnnnnnnnnnk',
    'kkkkkkkkkkkkkkkk',
  ]],
};

// אותו פוסטר בחירות עשרים פעם · the same election poster, 20 times
const SHUK_WALL = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    'gggggggdgggggggd',
    'gGgggggdggGggggd',
    'gggggggdgggggggd',
    'ddddddddwwwwwwwd',
    'gggdggggwrrrrrwg',
    'ggGdgggGwrrrrrwg',
    'gggdggggwwwwwwwg',
    'ddddddddwkkwkkwd',
    'gggggggdwwwwwwwd',
    'gGgggggdwkkkwkwd',
    'gggggggdwwwwwwwd',
    'ddddddddwbbbbbwd',
    'gggdgggggwwwwwgg',
    'ggGdgggGgggdgggg',
    'gggdgggggggdgggg',
    'dddddddddddddddd',
  ]],
};

// שמן ומלפפונים חמוצים · spilled oil & pickles
const SHUK_HAZARD = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......pp.......',
    '......pVvp.p....',
    '....XXXpvVpXX...',
    '..XXXYXXpvpXXXX.',
    '.XXYYXXXXXXXXXXX',
    'XXXXXXXxxxXXXXXX',
    'XxxXXXXxxxxXXxxX',
    'xxxxxxxxxxxxxxxx',
    'xxxxpVpxxxpVpxxx',
    'xxxxxxxxxxxxxxxx',
  ]],
};

// שרשרת פלפלים · pepper string
const SHUK_DECOR1 = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    '.......k........',
    '.......k........',
    '......kVk.......',
    '.....krrrk......',
    '....krryrrk.....',
    '....krrrrrk.....',
    '.....krrrk......',
    '......kkk.......',
    '......kVk.......',
    '.....krrrk......',
    '....krryrrk.....',
    '....krrrrrk.....',
    '.....krrrk......',
    '......kkk.......',
    '................',
    '................',
  ]],
};

// אבטיח · watermelon
const SHUK_DECOR2 = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkVvVvkk....',
    '...kVvVvVvVvk...',
    '..kvVvVvVvVvVk..',
    '..kVvVvVvVvVvk..',
    '..kvVvVvVvVvVk..',
    '..kVvVvVvVvVvk..',
    '...kvVvVvVvvk...',
    '....kkvVvvkk....',
    '......kkkk......',
    '................',
    '................',
  ]],
};

// שלט מחיר · price sign
const SHUK_DECOR3 = {
  w: 16, h: 16, palette: SHK,
  frames: [[
    '................',
    '..kkkkkkkkkkkk..',
    '..kOOOOOOOOOOk..',
    '..kOkkkOkOkOOk..',
    '..kOkOOOkOkOkk..',
    '..kOkkkOkOkOkk..',
    '..kOOOkOkOkOkk..',
    '..kOkkkOkkkOkk..',
    '..kOOOOOOOOOOk..',
    '..kkkkkkkkkkkk..',
    '.......nk.......',
    '.......nk.......',
    '.......nk.......',
    '.......nk.......',
    '.......nk.......',
    '................',
  ]],
};

// ───────────────────────── AYALON · פקק באיילון ─────────────────────────
const AYL = {
  a: '#2f2f35', // asphalt
  A: '#3c3c44', // asphalt light
  q: '#222227', // asphalt dark
  w: '#f2f2ea', // lane white
  y: '#f0c030', // reflector yellow
  c: '#a9a9a2', // concrete
  C: '#c8c8c0', // concrete light
  e: '#7b7b74', // concrete shadow
  k: '#141416', // hole / outline
  r: '#8a4a2a', // rust
  R: '#b06a3a', // rust light
  s: '#c8c8d0', // steam
  m: '#e040a0', // graffiti magenta
  b: '#30b0e0', // graffiti cyan
  p: '#9060c0', // oil-slick purple
  t: '#1e1e22', // tire
  T: '#4a4a50', // tire highlight
  f: '#f04a6a', // flip-flop pink
  h: '#ff7a1e', // heat glow (cracks)
  H: '#ffc04a', // heat shimmer (bright)
};

const AYALON_GROUND = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    'aaAaaaaaaqaaaaaa',
    'aaaaaqaaaaaaAaaa',
    'aAaaaaaaAaaaaaaq',
    'aaaaaaqaaaaaAqaa',
    'aaaAaaaaaaqaqaaa',
    'aqaaaaaAaaaqaaAa',
    'aaaaaAaaaaqaaaaa',
    'aaaqaaaaaAaaaaaa',
    'aAaaaaaqaaaaaaAa',
    'aaaaaAaaaaAaaqaa',
    'aaqaaaaaaaaaaaaa',
    'aaaaaaaAaqaaaAaa',
    'aAaaaqaaaaaaaaaa',
    'aaaaaaaaAaaaaqaa',
    'aaaqaaAaaaaaaaaa',
    'aaaaaaaaaaaAaaqa',
  ]],
};

const AYALON_GROUND_TOP = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    'AAAAAAAAAAAAAAAA',
    'wwwwwwwwwwaaaaaa',
    'wwwwwwwwwwaaqaaa',
    'aaaaaaqaaaaaAqaa',
    'aaaAaaaaaaqaqaaa',
    'aqaaaaaAaaaqaaAa',
    'aaaaaAaaaaqaaaaa',
    'aaaqaaaaaAaaaaaa',
    'aAaaaaaqaaaaaaAa',
    'aaaaaAaaaaAaaqaa',
    'aaqaaaaaaaaaaaaa',
    'aaaaaaaAaqaaaAaa',
    'aAaaaqaaaaaaaaaa',
    'aaaaaaaaAaaaaqaa',
    'aaaqaaAaaaaaaaaa',
    'aaaaaaaaaaaAaaqa',
  ]],
};

const AYALON_PLATFORM = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    '..CCCCCCCCCCCC..',
    '..Cccccccccccce.',
    '.CCccccccccccce.',
    'CCccccccccccccee',
    'Ccccccccccccccce',
    'Cyykkyykkyykkyye',
    'Ccccccccccccccce',
    'Ccccccccccccccce',
    'Cccccccrccccccce',
    'Cccccccrrcccccce',
    'Ccccccccccccccce',
    'Ccccccccccccccce',
    'Ccccccccccccccce',
    'Ccccccccccccccce',
    'eeeeeeeeeeeeeeee',
    'kkkkkkkkkkkkkkkk',
  ]],
};

const AYALON_WALL = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    'cccccccccccccccc',
    'cCcccccccccCcccc',
    'cccccccccccccccc',
    'ccccceccccccccce',
    'cccccccccccccccc',
    'ccccmmmccccccccc',
    'cccmcccmccbbbbcc',
    'cccmmmmmcbbccbbc',
    'cccmccccmcbbbbcc',
    'cccmcccmcccccbcc',
    'eeeeeeeeeeeeeeee',
    'cccccccccccccccc',
    'ccccccccccCccccc',
    'ccecccccccccccec',
    'cccccccccccccccc',
    'ccccccccccccccce',
  ]],
};

// ביוב פתוח + אדים · open manhole + steam
// אספלט לוהט · hot asphalt: dark tarmac, glowing cracks, 2-frame orange heat shimmer along the top
const AYALON_HAZARD = {
  w: 16, h: 16, fps: 4, palette: AYL,
  frames: [
    [
      'qHhhqqhHhqqqhhHq',
      'AAAAAAAAAAAAAAAA',
      'aaaaaaaqaaaaaaaa',
      'aaaaaaqaaaaaqaaa',
      'aaqaaqhaaaaqaaaa',
      'aqhqqhaaaaaqhaaa',
      'aaqhaaaaaaaaqaaa',
      'aaaqaaaaaaaaaqaa',
      'aaaaqaaaqqaaaaqa',
      'aaaaaqaqhaqaaaaa',
      'aaaaaaqhaaaqaaaa',
      'aaaaaaqaaaaaqaaa',
      'aaaaaqaaaaaaaaaa',
      'aaaaqaaaaaaaaaaa',
      'aaaqaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaa',
    ],
    [
      'hqqHhhqqhhHqqhhq',
      'AAAAAAAAAAAAAAAA',
      'aaaaaaaqaaaaaaaa',
      'aaaaaaqaaaaaqaaa',
      'aaqaaqHaaaaqaaaa',
      'aqHqqhaaaaaqHaaa',
      'aaqhaaaaaaaaqaaa',
      'aaaqaaaaaaaaaqaa',
      'aaaaqaaaqqaaaaqa',
      'aaaaaqaqHaqaaaaa',
      'aaaaaaqhaaaqaaaa',
      'aaaaaaqaaaaaqaaa',
      'aaaaaqaaaaaaaaaa',
      'aaaaqaaaaaaaaaaa',
      'aaaqaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaa',
    ],
  ],
};

// ביוב פתוח · open manhole with steam (variant; engine picks it for ~1 in 4 hazard columns when hooked up)
const AYALON_HAZARD2 = {
  w: 16, h: 16, fps: 4, palette: AYL,
  frames: [
    [
      'AAAAAAAAAAAAAAAA',
      'aaaaaasaaaaaaaaa',
      'aaaaassaaasaaaaa',
      'aaaaaasaassaaaaa',
      'aaaaassaaasaaaaa',
      'aaaassssassaaaaa',
      'aaaaasssassaaaaa',
      'aaaaaassssssaaaa',
      'aaaaasssssssaaaa',
      'aaaarRRRRRRRraaa',
      'aarRkkkkkkkkkRra',
      'arRkkkkkkkkkkkRr',
      'arkkkkkkkkkkkkkr',
      'arrkkkkkkkkkkkrr',
      'aarrkkkkkkkkkrra',
      'aaaarrrrrrrrraaa',
    ],
    [
      'AAAAAAAAAAAAAAAA',
      'aaaaaaaaaasaaaaa',
      'aaaaaasaaasaaaaa',
      'aaaaassaassaaaaa',
      'aaaaassasssaaaaa',
      'aaaaaasaassaaaaa',
      'aaaassssaassaaaa',
      'aaaaassssssaaaaa',
      'aaaaasssssssaaaa',
      'aaaarRRRRRRRraaa',
      'aarRkkkkkkkkkRra',
      'arRkkkkkkkkkkkRr',
      'arkkkkkkkkkkkkkr',
      'arrkkkkkkkkkkkrr',
      'aarrkkkkkkkkkrra',
      'aaaarrrrrrrrraaa',
    ],
  ],
};

// צמיג · tire
const AYALON_DECOR1 = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkttttttkk...',
    '..kttTttttTttk..',
    '..kttkkkkkkttk..',
    '.kttk......kttk.',
    '.kTtk......ktTk.',
    '.kttk......kttk.',
    '..kttkkkkkkttk..',
    '..kttttttttttk..',
    '...kkttttttkk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ]],
};

// כתם שמן בקשת · oil slick
const AYALON_DECOR2 = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......ppbb.....',
    '.....pbbbppbb...',
    '...pbbppbbbppb..',
    '..pbbbppbbbppbb.',
    '.ppbbbbppbbbbpp.',
    '..pppbbbppbbbp..',
  ]],
};

// כפכף אבוד · lost flip-flop (kaf-kaf)
const AYALON_DECOR3 = {
  w: 16, h: 16, palette: AYL,
  frames: [[
    '................',
    '................',
    '................',
    '......kkkk......',
    '.....kffffk.....',
    '....kffkkffk....',
    '....kfkffkfk....',
    '....kkffffkk....',
    '....kffffffk....',
    '....kffffffk....',
    '....kffffffk....',
    '....kffffffk....',
    '.....kffffk.....',
    '......kkkk......',
    '................',
    '................',
  ]],
};

// ───────────────────────── NEGEV · המדבר וים המלח ─────────────────────────
const NGV = {
  n: '#dcaa6a', // sandstone
  N: '#ecc38a', // sandstone light
  m: '#c48c4c', // sandstone dark
  o: '#a3703a', // deep
  L: '#f6dcaa', // highlight
  r: '#b8673a', // Timna red
  R: '#d68a58', // Timna light
  x: '#7c4222', // Timna dark
  k: '#3a2412', // outline
  g: '#3f8f3f', // cactus
  G: '#68b85c', // cactus light
  v: '#2a5f2a', // cactus dark
  w: '#fff8e0', // spine
  y: '#f0d060', // flower yellow
  p: '#e04a7a', // flower pink
  s: '#f4f4f8', // salt
  S: '#c8dce8', // salt shade
  b: '#8a6a3a', // tumbleweed
  B: '#b08a4a', // tumbleweed light
  c: '#8a5a2a', // copper
  C: '#d09040', // copper light
};

const NEGEV_GROUND = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    'nnnnnnnnnnnnnnnn',
    'nnNnnnnnnnnNnnnn',
    'nnnnnnnnnnnnnnnn',
    'mmnmmmmmnmmmmmmn',
    'nnnnnnmnnnnnnnnn',
    'nnnnnnnnnnnnnnnn',
    'nNnnnnnnnnNnnnnn',
    'nnnnnnnnnnnnnnnn',
    'nnnmnnnnnnnnnmnn',
    'mmmommmmmmommmmm',
    'nnnnnnnnnnnnnnnn',
    'nnnnnNnnnnnnnnNn',
    'nnnnnnnnnnnonnnn',
    'nnnnnnnnnmnnnnnn',
    'nnNnnnnnnnnnnnnn',
    'nnnnnnnnnnnnnnnn',
  ]],
};

const NEGEV_GROUND_TOP = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    'LLLLLLLLLLLLLLLL',
    'NNNNLNNNNNNNLNNN',
    'nNNnnnnNNNnnnnNN',
    'nnnnnnnnnnnnnnnn',
    'nnmmmnnnnnnnnnnn',
    'nnnnnnnnnnnnmmnn',
    'nnnnnnnnnnnnnnnn',
    'nnnnnnnmnnnnnnnn',
    'nnnmnnnnnnnnnnnn',
    'nnnnnnnmmmmnnnnn',
    'mmmnnnnnnnnnnnnn',
    'nnnnnNnnnnnnnnNn',
    'nnnnnnnnnnnmmnnn',
    'nnnnnnnnnmnnnnnn',
    'nnNnnnnnnnnnnnnn',
    'nnnnnnnnnnnnnnnn',
  ]],
};

const NEGEV_PLATFORM = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    'RRRRRRRRRRRRRRRR',
    'rrrRrrrrrrrRrrrr',
    'rrrrrrrrrrrrrrrr',
    'xrrrrrxrrrrrrxrr',
    'xxxrrxxxxrrxxxxx',
    '.xxxxxx.xxxxxxx.',
    '..xxxx..xxxxxx..',
    '..kxxk...kxxxk..',
    '...kk.....kxk...',
    '...........k....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ]],
};

const NEGEV_WALL = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    'RRrrrrrrRrrrrrrr',
    'rrrrrrrrrrrrrrrr',
    'rrrrxrrrrrrrrrrr',
    'xxxxxxxrxxxxxxxx',
    'RRRRRRRRRRRRRRRR',
    'RrRRRRRRRRRRrRRR',
    'RRRRRRRRRRRRRRRR',
    'rrrrrrrrrrrrxrrr',
    'rrrrrrrrrrrrrrrr',
    'xxrxxxxxxxxxxxrx',
    'rrrrrrrrrrrrrrrr',
    'rrrrrrRrrrrrrrrr',
    'rrxrrrrrrrrrrrrr',
    'rrrrrrrrrrrxrrrr',
    'RRRRRRRRRRRRRRRR',
    'xrrrrrrrxrrrrrrr',
  ]],
};

// קקטוס דוקרני — בן דוד רחוק של צבי · spiky cactus (Tzabi's distant cousin)
const NEGEV_HAZARD = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    '........py......',
    '......wgGgw.....',
    '......vgGgv.....',
    '...w..vgGgv..w..',
    '..vGv.wgGgw.vGv.',
    '..vGv.vgGgv.vGv.',
    '.wvGvwvgGgvwvGvw',
    '..vGvvvgGgvvvGv.',
    '..wvvvvgGgvvvvw.',
    '...wwvvgGgvvww..',
    '......wgGgw.....',
    '......vgGgv.....',
    '.....wvgGgvw....',
    '......vgGgv.....',
    '......vgGgv.....',
    '......vgggv.....',
  ]],
};

// שיח מתגלגל · tumbleweed
const NEGEV_DECOR1 = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '.....bBbbBb.....',
    '...bBb.b..bBb...',
    '..Bb.bBbbB.bbB..',
    '..b.bB.b.Bb..b..',
    '.bBb.b.BbB.bBbb.',
    '..b.Bb.b.b.Bb.b.',
    '..bB.b.Bb.Bb.B..',
    '...bBb.b.bB.b...',
    '.....bbBbbBb....',
    '......b..b......',
    '................',
    '................',
  ]],
};

// גבישי מלח · Dead Sea salt crystals
const NEGEV_DECOR2 = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......s........',
    '...s..sSs..s....',
    '..sSs.sSs.sSs...',
    '..sSs.sSs.sSs.s.',
    '.sSSs.sSSs.sSs.s',
    '.sSSsssSSssSSsss',
    'sSSSSsSSSSsSSSSs',
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSS',
  ]],
};

// פינג׳אן · Bedouin coffee pot
const NEGEV_DECOR3 = {
  w: 16, h: 16, palette: NGV,
  frames: [[
    '................',
    '................',
    '................',
    '.......s........',
    '......s.........',
    '....kkkkk.......',
    '.....kCck.......',
    '......kck..k....',
    '.....kCcck.kk...',
    '....kCcccckkck..',
    '....kCccccck.k..',
    '...kCcccccckk...',
    '...kccccccck....',
    '....kccccck.....',
    '.....kkkkk......',
    '................',
  ]],
};

// ───────────────────────── JERUSALEM · ירושלים העתיקה ─────────────────────────
const JLM = {
  J: '#e8d5aa', // Jerusalem stone
  j: '#d2b986', // stone shadow
  L: '#f6ebcc', // stone highlight
  t: '#c6a874', // stone dither
  u: '#a68c5c', // joint
  o: '#cdb88e', // old stone
  p: '#ab9468', // old stone dark
  g: '#3f8f5c', // shutter green
  G: '#5fb87a', // shutter light
  v: '#276040', // shutter dark
  k: '#2a1e10', // outline
  K: '#1c1210', // coal
  r: '#8c1e12', // coal red
  O: '#f26020', // ember
  y: '#ffd35a', // ember hot
  a: '#5c4c44', // ash
  w: '#fbf7ee', // note paper
  R: '#c83a3a', // pomegranate
  D: '#8a2222', // pomegranate dark
  c: '#b07040', // clay
  C: '#d09058', // clay light
};

const JERUSALEM_GROUND = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    'LLLLLLLLLLLLLLLu',
    'LJJJJJJJJJJJJJju',
    'LJJJJtJJJJJJJJju',
    'LJJJJJJJJJtJJJju',
    'LJJtJJJJJJJJJJju',
    'LJJJJJJJJtJJJJju',
    'Ljjjjjjjjjjjjjju',
    'uuuuuuuuuuuuuuuu',
    'LLLLLLLuLLLLLLLL',
    'JJJJJJjuLJJJJJJJ',
    'JJJJJJjuLJJJJtJJ',
    'JJtJJJjuLJJJJJJJ',
    'JJJJJJjuLJJtJJJJ',
    'JtJJJJjuLJJJJJJJ',
    'jjjjjjjuLjjjjjjj',
    'uuuuuuuuuuuuuuuu',
  ]],
};

const JERUSALEM_GROUND_TOP = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    'LLLLLLLLLLLLLLLL',
    'LJJJJJJJJJJJJJju',
    'LJJJJtJJJJJJJJju',
    'LJJJJJJJJJtJJJju',
    'LJJtJJJJJJJJJJju',
    'LJJJJJJJJtJJJJju',
    'Ljjjjjjjjjjjjjju',
    'uuuuGuuuuuuuuGuu',
    'LLLLLLLuLLLLLLLL',
    'JJJJJJjuLJJJJJJJ',
    'JJJJJJjuLJJJJtJJ',
    'JJtJJJjuLJJJJJJJ',
    'JJJJJJjuLJJtJJJJ',
    'JtJJJJjuLJJJJJJJ',
    'jjjjjjjuLjjjjjjj',
    'uuuuuuuuuuuuuuuu',
  ]],
};

const JERUSALEM_PLATFORM = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    'LLLLLLLLLLLLLLLL',
    'LJJJJJJJJJJJJJJj',
    'LJJJtJJJJJJtJJJj',
    'Ljjjjjjjjjjjjjjj',
    'uuuuuuuuuuuuuuuu',
    'JJJJJJjuujJJJJJJ',
    'JJJJJj....jJJJJJ',
    'JJJJj......jJJJJ',
    'JJJj........jJJJ',
    'JJj..........jJJ',
    'JJj..........jJJ',
    'uuj..........juu',
    'JJj..........jJJ',
    'JJj..........jJJ',
    'JJj..........jJJ',
    'JJj..........jJJ',
  ]],
};

const JERUSALEM_WALL = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    'ooooooouooooooou',
    'opoookkkkkkkpoou',
    'oooookGGGGGkooou',
    'uuuuukgggggkuuuu',
    'ooouokvvvvvkoooo',
    'ooouokGGGGGkoooo',
    'ooouokgggggkoooo',
    'uuuuukvvvvvkuuuu',
    'oooookGGGGGkooou',
    'opoookgggggkpoou',
    'oooookvvvvvkooou',
    'uuuuukGGGGGkuuuu',
    'ooouokgggggkoooo',
    'ooouokvvvvvkoooo',
    'ooouokkkkkkkoooo',
    'uuuuuuuuuuuuuuuu',
  ]],
};

// גחלים לוחשות — על האש בשבת · hot coals (al ha'esh)
const JERUSALEM_HAZARD = {
  w: 16, h: 16, fps: 4, palette: JLM,
  frames: [
    [
      '................',
      '......y.........',
      '.....OO....y....',
      '....OOOO..OO....',
      '..KKrOrKKKrOKK..',
      '.KKrOOrKKKKrrKKK',
      'KKKrrKKKrrKKKKKK',
      'KrKKKKKrOOrKKrKK',
      'KKKKrKKKrrKKKOrK',
      'KaKKrOrKKKKKrrKK',
      'KKKKKrKKKKaKKKKK',
      'KKrKKKKKrKKKKKrK',
      'KrOrKKaKKKKKKrKK',
      'KKrKKKKKKKrOrKKK',
      'KKKKKaKKKKKrKKKK',
      'KKKKKKKKKKKKKKKK',
    ],
    [
      '................',
      '..........y.....',
      '....y....OO.....',
      '...OO...OOOO....',
      '..KKrKKKrOOrKK..',
      '.KKrrKKKKrrKKKKK',
      'KKKrOrKKrKKKKrKK',
      'KrKKrKKrKKrKKOrK',
      'KKKKKKKKrOrKKrKK',
      'KaKKrrKKKrKKKKKK',
      'KKKKrOrKKKaKKrKK',
      'KKrKKrKKrKKKKOrK',
      'KrrKKKaKKKKKKrKK',
      'KKrOrKKKKKrrKKKK',
      'KKKrKaKKKKKrKKKK',
      'KKKKKKKKKKKKKKKK',
    ],
  ],
};

// פתק בכותל · a note tucked in the wall
const JERUSALEM_DECOR1 = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kwwwwwwk....',
    '....kwkkwkwk....',
    '....kwwwwwwk....',
    '....kwkwkkwk....',
    '.....kwwwwk.....',
    '......kkkk......',
    '................',
    '................',
    '................',
  ]],
};

// כד חרס · clay jug
const JERUSALEM_DECOR2 = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    '................',
    '................',
    '......kkkk......',
    '.....kCcck......',
    '......kcck......',
    '....kkkcckkk....',
    '...kCccccccck...',
    '..kCcccccccccck.',
    '..kCcccccccccck.',
    '..kCcccccccccck.',
    '..kccccccccccck.',
    '...kccccccccck..',
    '....kccccccck...',
    '.....kkkkkkk....',
    '................',
    '................',
  ]],
};

// רימון · pomegranate
const JERUSALEM_DECOR3 = {
  w: 16, h: 16, palette: JLM,
  frames: [[
    '................',
    '................',
    '................',
    '......kkk.......',
    '.....kDkDk......',
    '....kkRRRkk.....',
    '...kRRRRRRRk....',
    '..kRRRLRRRRRk...',
    '..kRRRRRRRRRk...',
    '..kRRRRRRRRRk...',
    '..kDRRRRRRRDk...',
    '...kDDRRRDDk....',
    '....kkDDDkk.....',
    '......kkk.......',
    '................',
    '................',
  ]],
};

export default {
  TELAVIV_GROUND, TELAVIV_GROUND_TOP, TELAVIV_PLATFORM, TELAVIV_WALL, TELAVIV_HAZARD,
  TELAVIV_DECOR1, TELAVIV_DECOR2, TELAVIV_DECOR3,
  SHUK_GROUND, SHUK_GROUND_TOP, SHUK_PLATFORM, SHUK_WALL, SHUK_HAZARD,
  SHUK_DECOR1, SHUK_DECOR2, SHUK_DECOR3,
  AYALON_GROUND, AYALON_GROUND_TOP, AYALON_PLATFORM, AYALON_WALL, AYALON_HAZARD, AYALON_HAZARD2,
  AYALON_DECOR1, AYALON_DECOR2, AYALON_DECOR3,
  NEGEV_GROUND, NEGEV_GROUND_TOP, NEGEV_PLATFORM, NEGEV_WALL, NEGEV_HAZARD,
  NEGEV_DECOR1, NEGEV_DECOR2, NEGEV_DECOR3,
  JERUSALEM_GROUND, JERUSALEM_GROUND_TOP, JERUSALEM_PLATFORM, JERUSALEM_WALL, JERUSALEM_HAZARD,
  JERUSALEM_DECOR1, JERUSALEM_DECOR2, JERUSALEM_DECOR3,
};

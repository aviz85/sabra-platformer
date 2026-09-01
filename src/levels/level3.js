// SABRA! — Level 3: "פקק באיילון" / Ayalon Traffic Jam at sunset.
// The floor is mostly hot asphalt (^ = hazard: solid, hurts) and open pits (lethal drop).
// You cross on car roofs (moving platforms), concrete barriers (= one-way platforms) and one overpass.
//
// Layout (tile columns, 16px each, 16 rows tall — floor top is row 14, feet y = 224):
//   0-25   Onramp: solid ground, teaching platform + shekel arc, first signs.
//  26-43   First cars: asphalt, RED car (quiet) -> barrier -> TAXI (honks) -> barrier.
//  44-85   Rest + overpass: stairs up to a concrete overpass with a pakid; under it, hazard patches + a stray cat.
//  86-96   Ayalon stream: lethal pit, three barriers, mosquito swarm.
//  97-112  Bus lane: BUS + barrier + BLUE car over asphalt.
// 113-126  Rest, "Exit 12: none".
// 127-131  Dash gap #1 (5 tiles) — jump + Shift.
// 132-140  Ground, hummus ledge, cat.
// 141-158  Honking gauntlet: RED -> barrier -> TAXI -> barrier, mosquitoes.
// 159-172  Rest + SECRET zig-zag stairs above (krembo at row 6).
// 173-182  BUS + barrier.
// 183-186  Ground, pigeons.
// 187-191  Dash gap #2 (5 tiles), shekel arc.
// 192-209  Parking-inspector pakid, exit.
//
// Physics budget used: max 2 tiles up per hop, ≤3-tile flat gaps, 5-tile gaps only where dash is expected,
// car-to-barrier reaches ≤ ~55px at the far end of a car's patrol (wait for the car = intended rhythm).

const COLS = 210, ROWS = 16;
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y][x] = c; };
const fill = (x0, x1, y0, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

const ground = (x0, x1) => fill(x0, x1, 14, 15, '#');          // solid road shoulder
const asphalt = (x0, x1) => { fill(x0, x1, 14, 14, '^'); fill(x0, x1, 15, 15, '#'); }; // hot asphalt on a base
const pit = (x0, x1) => fill(x0, x1, 14, 15, '.');             // lethal drop (nothing below)
const plat = (x0, x1, row) => fill(x0, x1, row, row, '=');     // concrete barrier / overpass slab
const wall = (x, y0, y1) => fill(x, x, y0, y1, 'W');

// ---- floor ----
ground(0, 25);
asphalt(26, 43);
ground(44, 85);
pit(86, 96);
asphalt(97, 112);
ground(113, 126);
pit(127, 131);
ground(132, 140);
asphalt(141, 158);
ground(159, 172);
asphalt(173, 182);
ground(183, 186);
pit(187, 191);
ground(192, 209);

// ---- barriers / platforms ----
plat(15, 17, 12);                    // teaching hop
plat(31, 32, 12); plat(40, 41, 12);  // car section barriers
plat(58, 59, 12); plat(61, 62, 10);  // stairs to the overpass
plat(64, 76, 8);                     // overpass slab
wall(66, 9, 11); wall(74, 9, 11);    // hanging pillars (decorative, 32px clearance under them)
asphalt(63, 64); asphalt(68, 69); asphalt(73, 74); // hazard patches under the overpass
plat(88, 89, 12); plat(92, 93, 11); plat(96, 97, 12); // stream barriers
plat(105, 106, 12);                  // bus-lane barrier
plat(134, 136, 12);                  // hummus ledge
plat(147, 148, 12); plat(156, 157, 12); // gauntlet barriers
plat(163, 164, 12); plat(167, 168, 10); plat(163, 164, 8); plat(167, 169, 6); // secret zig-zag (each hop: 32px up, 32px across)
plat(180, 181, 12);                  // last barrier

const map = grid.map((r) => r.join(''));

const G = 14 * 16;   // 224 — feet on the floor
const R = (row) => row * 16; // feet on top of a platform at `row`
const cx = (col) => col * 16 + 8; // tile-centre x

const E = [];
const add = (type, x, y, extra = {}) => E.push({ type, x, y, ...extra });
const prop = (sprite, col, extra = {}) => add('prop', cx(col), G, { sprite, ...extra });
const sign = (col, he, en, y = G) => add('sign', cx(col), y, { text: [he, en] });
const shekels = (pts) => pts.forEach(([x, y]) => add('shekel', x, y));

// ================= A. Onramp (0-25) =================
prop('LAMP', 3);
sign(6, 'פקק — 2 דקות (ווייז)', 'Traffic — 2 minutes (Waze)');
prop('TRAFFIC_CONE', 9); prop('TRAFFIC_CONE', 10);
prop('SIGN_AYALON', 12);
shekels([[232, 200], [248, 184], [264, 176], [280, 184], [296, 200]]);   // arc over the teaching hop
prop('LAMP', 20);
sign(24, 'גגות מכוניות = פלטפורמות. אל תספרו לביטוח', "Car roofs = platforms. Don't tell insurance");

// ================= B. First cars (26-43) =================
add('car', 456, G, { variant: 'CAR_RED', honk: false, patrol: 12 });     // quiet first car — teaching
shekels([[444, 188], [460, 188], [476, 188]]);
add('car', 584, G, { variant: 'CAR_TAXI', honk: true, patrol: 14 });
shekels([[572, 188], [588, 188], [604, 188]]);
prop('TRAFFIC_CONE', 44);

// ================= C. Rest + overpass (44-85) =================
add('checkpoint', cx(49), G);
sign(52, 'צפצוף לא עוזר, אבל מרגיע', "Honking doesn't help, but it soothes");
prop('BENCH', 54);
prop('LAMP', 56);
sign(60, 'הפקיד למעלה, הפקק למטה. תבחרו', 'Clerk above, jam below. Choose');
add('pakid', cx(70), R(8));                                              // on the overpass
shekels([[1048, 112], [1064, 112], [1080, 112], [1096, 112]]);
add('bamba', cx(75), 112);                                               // overpass reward
add('cat', cx(66), G);                                                   // stray under the bridge
add('falafel', cx(71), 208);
prop('BARREL', 78);
add('pigeon', cx(79), G);
prop('LAMP', 80);
add('checkpoint', cx(82), G);
add('tourist', cx(83), G, { patrol: 24 });
sign(84, 'תייר: "זו הדרך לנתב״ג?" — לא.', 'Tourist: "Is this the way to the airport?" — No.');

// ================= D. Stream + bus lane (86-112) =================
add('mosquito', 1400, 150);
add('mosquito', 1490, 120);
add('mosquito', 1560, 140);
shekels([[1416, 168], [1432, 168], [1480, 152], [1496, 152], [1544, 168], [1560, 168]]);
add('car', 1624, G, { variant: 'CAR_BUS', honk: true, patrol: 24, speed: 0.5 }); // the 5 bus, in the jam
shekels([[1616, 188], [1632, 188]]);
add('bamba', cx(105) + 8, 192);                                          // on the barrier
add('car', 1768, G, { variant: 'CAR_BLUE', honk: true, patrol: 24 });

// ================= E. Rest, Exit 12, dash gap, hummus (113-140) =================
prop('TRAFFIC_CONE', 114);
add('checkpoint', cx(116), G);
sign(118, 'יציאה 12: אין', 'Exit 12: none');
prop('SIGN_AYALON', 119);
prop('LAMP', 120);
prop('BENCH', 122);
sign(124, 'קפיצה לא מספיקה. שיפט = יאללה!', "A jump isn't enough. Shift = Yalla!");
shekels([[2048, 200], [2064, 192], [2080, 192], [2096, 200]]);           // arc over dash gap #1
prop('TRAFFIC_CONE', 133);
add('hummus', cx(135), R(12));                                           // on the ledge
add('cat', cx(138), G);
prop('LAMP', 139);

// ================= F. Honking gauntlet (141-158) =================
add('car', 2296, G, { variant: 'CAR_RED', honk: true, patrol: 24 });
add('mosquito', 2380, 150);
shekels([[2360, 168], [2376, 168]]);
add('car', 2440, G, { variant: 'CAR_TAXI', honk: true, patrol: 24 });
add('mosquito', 2470, 130);
add('falafel', cx(156) + 8, 192);                                        // on the barrier
prop('TRAFFIC_CONE', 159);

// ================= G. Rest + secret stairs (159-172) =================
add('checkpoint', cx(161), G);
prop('LAMP', 165);
sign(166, 'עוד 200 מטר לחניה. עוד 40 דקות', '200m to parking. 40 minutes');
shekels([[2632, 176], [2688, 144], [2624, 112], [2712, 80]]);            // breadcrumbs up the secret
add('krembo', cx(168), R(6));                                            // SECRET: extra life
prop('BARREL', 171);
prop('BENCH', 170);

// ================= H. Bus + pigeons + dash gap #2 + exit (173-209) =================
add('car', 2824, G, { variant: 'CAR_BUS', honk: true, patrol: 10, speed: 0.5 });
prop('TRAFFIC_CONE', 184);
add('pigeon', cx(185), G);
add('pigeon', cx(186), G);
prop('LAMP', 183);
shekels([[3000, 200], [3016, 190], [3032, 186], [3048, 190], [3064, 200]]); // arc over dash gap #2
sign(194, 'פקח: "רכב חונה על גג רכב אחר"', 'Inspector: "Vehicle parked on top of another vehicle"');
add('pakid', cx(197), G);                                                // the parking inspector
prop('TRAFFIC_CONE', 199);
sign(201, 'הגעתם! עכשיו תמצאו חניה', 'You arrived! Now find parking');
prop('LAMP', 202);
prop('SIGN_AYALON', 207);

export default {
  id: 'ayalon', name: 'פקק באיילון', nameEn: 'Ayalon Traffic Jam', theme: 'AYALON',
  intro: ['שקיעה באיילון. עוד 2 דקות (לפי ווייז)', 'Sunset on Ayalon. 2 more minutes (per Waze)'],
  tileSize: 16,
  map,
  legend: { '#': 'ground', '=': 'platform', 'W': 'wall', '^': 'hazard' },
  spawn: { x: 32, y: G },
  exit: { x: cx(204), y: G },
  entities: E,
  quips: [
    ['ווייז: "יש מסלול מהיר יותר". שקר', 'Waze: "There is a faster route." Lies'],
    ['אני חמש דקות משם. (אני לא)', "I'm 5 minutes away. (I'm not)"],
    ['הרכבת הקלה נפתחת עוד רגע. מ-2011', 'The light rail opens any minute. Since 2011'],
    ['נתיב פלוס: פלוס מה בדיוק?', 'Fast lane: fast compared to what?'],
    ['רדיו: "עומס כבד באיילון". תודה, לא שמתי לב', 'Radio: "Heavy traffic on Ayalon." Thanks, hadn\'t noticed'],
    ['הנהג לידך אוכל שווארמה. עם כפפות', 'The driver next to you is eating shawarma. With gloves'],
    ['שקיעה על עזריאלי. יפה. עדיין פקק', 'Sunset over Azrieli. Pretty. Still stuck'],
    ['מישהו צפצף. עכשיו כולם מצפצפים', 'Someone honked. Now everyone is honking'],
    ['הגעתי? לא. אבל יש לי פודקאסט', 'Arrived? No. But I have a podcast'],
    ['מזגן על מקסימום. עדיין 34 מעלות', 'AC on max. Still 34 degrees'],
    ['לפי ווייז, גם היתושים בפקק', 'According to Waze, the mosquitoes are also stuck'],
    ['"רק קופץ רגע לסופר". שעה וחצי', '"Just a quick stop at the supermarket." 90 minutes'],
    ['הגעה משוערת: 17:42. עכשיו 19:10', 'ETA: 17:42. It is now 19:10'],
    ['נחל איילון: היתושים פה משלמים ארנונה', 'Ayalon stream: the mosquitoes here pay property tax'],
  ],
};

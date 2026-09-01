// SABRA! — Level 2: שוק מחנה יהודה / Mahane Yehuda Market.
// Built procedurally on a tile grid so every coordinate is a crisp integer.
// Rows: 0..15 (16 rows = 256 px). Ground = rows 14-15. Feet y of anything standing ON row r = r*16.

const COLS = 210, ROWS = 16, T = 16;
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y][x] = c; };
const fill = (x0, x1, y0, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

// tile helpers → pixel coords
const px = (t) => t * T + 8;        // horizontal centre of tile column t
const py = (r) => r * T;            // feet y when standing on top of row r
const G = py(14);                   // main ground feet y = 224

// ---------------------------------------------------------------- terrain
fill(0, COLS - 1, 14, 15, '#');                                   // market floor

// A. teaching crates (1-high, 2-high, 3-high staircase)
fill(13, 13, 13, 13, 'W');
fill(15, 16, 12, 13, 'W');
fill(18, 19, 11, 13, 'W');

// B. first awning stall
fill(31, 33, 12, 12, '=');

// C. pit 1 — "the municipality is handling it"
fill(38, 40, 14, 15, '.');

// D. savta stall + high awning (only reachable via the crate after her)
fill(53, 53, 13, 13, 'W');
fill(50, 52, 11, 11, '=');

// E. crate towers with pickle spills between them
fill(59, 60, 12, 13, 'W');        // tower A (2)
fill(61, 62, 13, 13, '^');
fill(63, 64, 10, 13, 'W');        // tower B (4)
fill(65, 66, 13, 13, '^');
fill(67, 68, 8, 13, 'W');         // tower C (6)
fill(71, 73, 6, 6, '=');          // sky awning off tower C

// F. bank branch — raised floor, awning over the pakid, pit after
fill(78, 90, 13, 13, '#');
fill(86, 88, 11, 11, '=');
fill(91, 93, 14, 15, '.');        // pit 2

// G. awning hops over a long pickle spill
fill(98, 107, 13, 13, '^');
fill(97, 99, 12, 12, '=');
fill(102, 104, 10, 10, '=');
fill(107, 109, 12, 12, '=');

// H. Cat Alley — narrow corridor with a walkable roof (secret route)
fill(116, 116, 12, 13, 'W');      // gate step / roof access
fill(118, 139, 10, 10, 'W');      // alley ceiling = roof
fill(122, 122, 13, 13, 'W');
fill(128, 128, 13, 13, 'W');
fill(131, 131, 13, 13, '^');
fill(134, 134, 13, 13, 'W');
fill(124, 126, 8, 8, '=');        // roof awning
fill(129, 131, 6, 6, '=');        // krembo awning

// I. hummus square + gauntlet
fill(146, 148, 13, 13, 'W');      // hummus table
fill(161, 164, 13, 13, '^');
fill(161, 163, 12, 12, '=');
fill(169, 177, 13, 13, '#');      // bank #2 raised floor
fill(178, 180, 14, 15, '.');      // pit 3

// J. finale crate stairs
fill(184, 184, 13, 13, 'W');
fill(186, 187, 12, 13, 'W');
fill(189, 190, 11, 13, 'W');

const map = grid.map((r) => r.join(''));

// ---------------------------------------------------------------- entities
const E = [];
const add = (type, x, y, extra = {}) => E.push({ type, x, y, ...extra });
const prop = (sprite, x, y, extra = {}) => add('prop', x, y, { sprite, ...extra });
const sign = (x, y, he, en) => add('sign', x, y, { text: [he, en] });
const shekel = (x, y) => add('shekel', x, y);
const shekelRow = (t0, t1, y) => { for (let t = t0; t <= t1; t++) shekel(px(t), y); };
const awning = (t0, t1, r) => prop('AWNING', px(t0 + 1), py(r));   // 48 px wide canopy over 3 '=' tiles

// --- A. spawn & teaching
sign(px(4), G, 'ברוכים הבאים לשוק. יום חמישי. בהצלחה', 'Welcome to the shuk. On a Thursday. Good luck.');
prop('SIGN_SHUK', px(7), G);
prop('LAMP', px(10), G);
shekelRow(9, 12, G - 8);
shekel(px(13), py(13) - 8);
shekel(px(15), py(12) - 8); shekel(px(16), py(12) - 8);
shekel(px(18), py(11) - 8); shekel(px(19), py(11) - 8);

// --- B. first cat, first awning
add('cat', px(27), G);
prop('TENT', px(32), G);
awning(31, 33, 12);
shekel(px(31), py(12) - 16); shekel(px(32), py(12) - 20); shekel(px(33), py(12) - 16);
add('pigeon', px(33), py(12));
prop('BARREL', px(35), G);

// --- C. pit 1
sign(px(36), G, 'בור פתוח. העירייה מטפלת (מאז 2009)', 'Open pit. The city is on it (since 2009)');
add('falafel', px(41), 208); // reward on the far lip, not bait over the first lethal pit

// --- D. savta stall #1
sign(px(43), G, '!סבתא: תאכל, אתה רזה', "Grandma: eat, you're thin!");
prop('CRATE', px(46), G);
prop('TENT', px(49), G);
add('savta', px(49), G);
awning(50, 52, 11);
add('bamba', px(51), py(11) - 8);
shekelRow(54, 55, G - 8);
add('checkpoint', px(56), G);
prop('LAMP', px(57), G);

// --- E. crate towers
shekel(px(59), py(12) - 8); shekel(px(60), py(12) - 8);
add('cat', 63 * T + 16, py(10));
shekel(px(64), py(10) - 8);
add('bamba', px(67), py(8) - 8);
shekel(px(68), py(8) - 8);
awning(71, 73, 6);
shekel(px(71), py(6) - 8); shekel(px(72), py(6) - 12); shekel(px(73), py(6) - 8);
prop('BARREL', px(70), G);

// --- F. bank branch
prop('LAMP', px(79), py(13));
sign(px(80), py(13), 'מספר 847. עכשיו משרתים: 4', 'Now serving: 4. Your number: 847');
prop('BENCH', px(82), py(13));
add('pakid', px(85), py(13));
awning(86, 88, 11);
shekelRow(86, 88, py(11) - 8);
sign(px(89), py(13), 'אין עודף. אף פעם לא היה.', 'No change. There never was.');

// --- G. awning hops
awning(97, 99, 12);
awning(102, 104, 10);
awning(107, 109, 12);
shekel(px(100), py(12) - 24); shekel(px(101), py(10) - 8);
add('pigeon', px(103), py(10));
shekel(px(105), py(10) - 8); shekel(px(106), py(12) - 24);
prop('TENT', px(111), G);
add('savta', px(111), G);
sign(px(113), G, 'מחיר סופי 10 ₪ · לא, 15 ₪ · טוב, 8 ₪', 'Final price 10 · no, 15 · ok, 8');
add('checkpoint', px(115), G);

// --- H. Cat Alley (ground) + roof secret
sign(px(118), G, 'סמטת החתולים. לא ליצור קשר עין', "Cat Alley. Don't make eye contact.");
add('cat', px(120), G);
shekel(px(119), G - 8);
shekel(px(124), G - 8);
add('cat', px(125), G);
shekel(px(127), G - 8);
shekel(px(133), G - 8);
shekel(px(136), G - 8);
add('cat', px(137), G);
// roof
add('cat', px(127), py(10));
add('tourist', px(133), py(10), { patrol: 40 });
awning(124, 126, 8);
shekelRow(124, 126, py(8) - 8);
awning(129, 131, 6);
add('krembo', px(130), py(6) - 8);
sign(px(131), py(6), '?!קרמבו בקיץ', 'Krembo in summer?!');

// --- I. hummus square + gauntlet
sign(px(143), G, 'החומוס הכי טוב בעיר. כולם לא מסכימים', 'Best hummus in town. Everyone disagrees.');
prop('BENCH', px(144), G);
add('hummus', px(147), py(13) - 8);
prop('TENT', px(153), G);
add('savta', px(153), G);
add('cat', px(157), G);
prop('BARREL', px(159), G);
awning(161, 163, 12);
shekelRow(161, 163, py(12) - 8);
add('checkpoint', px(167), G);
prop('LAMP', px(170), py(13));
add('pakid', px(173), py(13));
prop('BENCH', px(175), py(13));

// --- J. finale
shekel(px(184), py(13) - 8);
shekel(px(186), py(12) - 8); shekel(px(187), py(12) - 8);
add('falafel', px(190), py(11) - 8);
prop('CRATE', px(193), G); prop('CRATE', px(193), G - 16);
add('cat', px(197), G);
sign(px(201), G, 'היציאה? ליד המכולת. לא, השנייה', 'The exit? By the makolet. No, the other one.');
prop('SIGN_SHUK', px(203), G);

export default {
  id: 'shuk', name: 'שוק מחנה יהודה', nameEn: 'Mahane Yehuda Market', theme: 'SHUK',
  intro: ['!שוק מחנה יהודה. יום חמישי. אלוהים ישמור', 'Mahane Yehuda market. Thursday. God help us.'],
  tileSize: T,
  map,
  legend: { '#': 'ground', '=': 'platform', 'W': 'wall', '^': 'hazard' },
  spawn: { x: 32, y: G },
  exit: { x: px(206), y: G },
  entities: E,
  quips: [
    ['!עשר שקל! עשר שקל! מה, אתה לא רואה שזה עשר שקל', 'Ten shekel! Ten shekel! What, can\'t you see it\'s ten shekel?!'],
    ['החומוס הכי טוב זה אצל הדוד שלי. תשאל את הדוד שלך.', 'Best hummus is at my uncle\'s. Ask your uncle.'],
    ['יום חמישי בשוק = אימון קרב מגע', 'Thursday at the shuk = Krav Maga training'],
    ['!להתמקח זה לא חוסר נימוס, זה תרבות', 'Haggling isn\'t rude, it\'s culture!'],
    ['החתול הזה שילם יותר ממך על העגבניות', 'That cat paid more than you for the tomatoes'],
    ['?סבתא, אכלתי. באמת. למה את בוכה', 'Grandma, I ate. Really. Why are you crying?'],
    ['אין עודף. יש חסה במקום.', 'No change. Have lettuce instead.'],
    ['!מלפפון חמוץ על הרצפה = שמן על הכביש', 'Pickle on the floor = oil on the road!'],
    ['הפקיד יצא להפסקה. ב-2019.', 'The clerk went on break. In 2019.'],
    ['!תיזהר מהצלחות. הן עפות עם אהבה', 'Watch the plates. They fly with love!'],
    ['?מי הזמין קרמבו בחום הזה', 'Who ordered Krembo in this heat?'],
    ['בסוף השוק יש יציאה. אומרים.', 'There\'s an exit at the end of the shuk. Allegedly.'],
  ],
};

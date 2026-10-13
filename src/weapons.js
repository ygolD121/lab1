// Weapons, the buy menu, the economy, and what the defenders carry on each difficulty.

// dmg: player damage per hit zone. pen: damage kept against an armored bot (legs are never armored).
// spread: [hip, aim-down-sights] in radians. punch: view kick per shot [hip, ADS].
// bot: how a defender uses it — fire-delay multiplier, accuracy multiplier, damage rolls, gun length.
export const WEAPONS = {
  glock: {
    name: 'Glock-19', slot: 'pistol', price: 200, mag: 15, reserve: 90, delay: 0.12, auto: false, reload: 2.2,
    dmg: { head: 110, body: 27, legs: 19 }, pen: 0.5, falloff: 0.88,
    spread: [0.0045, 0.0012], move: 0.0032, bloom: 0.011, bloomMax: 0.045, punch: [0.017, 0.011], kick: 0.7,
    adsFov: 58, speed: 1, reward: 300, sound: { freq: 170, len: 0.16, gain: 0.9 },
    bot: { fire: 1, acc: 1, body: [16, 24], head: [60, 75], len: 1 },
  },
  deagle: {
    name: 'Desert Eagle', slot: 'pistol', price: 700, mag: 7, reserve: 35, delay: 0.3, auto: false, reload: 2.3,
    dmg: { head: 220, body: 54, legs: 40 }, pen: 0.93, falloff: 0.92,
    spread: [0.006, 0.0015], move: 0.004, bloom: 0.03, bloomMax: 0.07, punch: [0.05, 0.035], kick: 1,
    adsFov: 56, speed: 0.98, reward: 300, sound: { freq: 105, len: 0.26, gain: 1.2 },
    bot: { fire: 1.7, acc: 0.9, body: [38, 48], head: [95, 110], len: 1.3 },
  },
  mp5: {
    name: 'MP5', slot: 'primary', price: 1500, mag: 30, reserve: 120, delay: 0.075, auto: true, reload: 2.6,
    dmg: { head: 92, body: 26, legs: 20 }, pen: 0.6, falloff: 0.75,
    spread: [0.006, 0.0022], move: 0.0024, bloom: 0.0045, bloomMax: 0.035, punch: [0.008, 0.006], kick: 0.35,
    adsFov: 60, speed: 1, reward: 600, sound: { freq: 220, len: 0.1, gain: 0.75 },
    bot: { fire: 0.45, acc: 0.85, body: [12, 18], head: [45, 60], len: 2.2 },
  },
  ak47: {
    name: 'AK-47', slot: 'primary', price: 2700, mag: 30, reserve: 90, delay: 0.1, auto: true, reload: 2.5,
    dmg: { head: 143, body: 36, legs: 27 }, pen: 0.78, falloff: 0.95,
    spread: [0.0065, 0.0012], move: 0.0045, bloom: 0.0065, bloomMax: 0.05, punch: [0.013, 0.01], kick: 0.5,
    adsFov: 54, speed: 0.92, reward: 300, sound: { freq: 125, len: 0.2, gain: 1.05 },
    bot: { fire: 0.6, acc: 1, body: [24, 32], head: [90, 105], len: 3 },
  },
  // Attackers' SMG in place of the MP5 (Israeli Uzi): fast, light, inaccurate.
  uzi: {
    name: 'Uzi', slot: 'primary', price: 1200, mag: 32, reserve: 128, delay: 0.07, auto: true, reload: 2.4,
    dmg: { head: 85, body: 24, legs: 18 }, pen: 0.55, falloff: 0.72,
    spread: [0.007, 0.0026], move: 0.0022, bloom: 0.005, bloomMax: 0.04, punch: [0.008, 0.006], kick: 0.35,
    adsFov: 60, speed: 1, reward: 600, sound: { freq: 230, len: 0.09, gain: 0.75 },
    bot: { fire: 0.42, acc: 0.8, body: [11, 17], head: [42, 56], len: 1.6 },
  },
  // Attackers' second rifle (Israeli Tavor bullpup with a red-dot sight).
  tavor: {
    name: 'Tavor TAR-21', slot: 'primary', price: 3000, mag: 30, reserve: 90, delay: 0.085, auto: true, reload: 2.7,
    dmg: { head: 135, body: 33, legs: 25 }, pen: 0.75, falloff: 0.95,
    spread: [0.0058, 0.001], move: 0.0042, bloom: 0.006, bloomMax: 0.048, punch: [0.012, 0.009], kick: 0.45,
    adsFov: 52, speed: 0.95, reward: 300, sound: { freq: 135, len: 0.18, gain: 1 },
    bot: { fire: 0.55, acc: 1.05, body: [23, 31], head: [88, 102], len: 2.4 },
  },
  // Defenders' rifle in place of the AK-47. With the suppressor on it plays as an M4A1-S (see SUPPRESSED).
  m4: {
    name: 'M4A1', slot: 'primary', price: 2900, mag: 30, reserve: 90, delay: 0.09, auto: true, reload: 3.1,
    dmg: { head: 130, body: 33, legs: 25 }, pen: 0.7, falloff: 0.95,
    spread: [0.006, 0.0011], move: 0.004, bloom: 0.0055, bloomMax: 0.045, punch: [0.011, 0.008], kick: 0.45,
    adsFov: 54, speed: 0.94, reward: 300, sound: { freq: 140, len: 0.18, gain: 1 },
    bot: { fire: 0.55, acc: 1.05, body: [22, 30], head: [85, 100], len: 2.9 },
  },
  awp: {
    name: 'AWP', slot: 'primary', price: 4750, mag: 5, reserve: 30, delay: 1.45, auto: false, reload: 3.6,
    dmg: { head: 300, body: 115, legs: 85 }, pen: 0.98, falloff: 1,
    spread: [0.07, 0.0002], move: 0.012, bloom: 0, bloomMax: 0, punch: [0.07, 0.05], kick: 1,
    adsFov: 16, scope: true, speed: 0.84, reward: 100, sound: { freq: 75, len: 0.45, gain: 1.4 },
    bot: { fire: 2.6, acc: 1.3, body: [80, 96], head: [150, 150], len: 3.8 },
  },
};

// What the M4's suppressor changes: a little less damage, recoil and spread, and bots only hear it up close.
export const SUPPRESSED = { name: 'M4A1-S', dmg: 0.92, spread: 0.85, punch: 0.8, hearing: 15 };

export const ARMOR_PRICE = 1000;
export const KIT_PRICE = 400; // defuse kit, defenders only
export const SHOP = ['glock', 'deagle', 'mp5', 'ak47', 'awp', 'armor'];
export const MAX_MONEY = 16000;

export const ECONOMY = {
  easy: {
    start: 2500, win: 3500, loss: 2500, lossBonus: 500, killMul: 1.5, plant: 600,
    note: 'You start with $2,500 and earn 50% more per kill. The bots stick to pistols and SMGs and never wear armor.',
  },
  normal: {
    start: 800, win: 3250, loss: 1400, lossBonus: 500, killMul: 1, plant: 300,
    note: 'You start with $800. The bots move up to SMGs from round 2 and rifles from round 3, and some wear armor.',
  },
  hard: {
    start: 800, win: 2700, loss: 1100, lossBonus: 400, killMul: 0.75, plant: 300,
    note: 'You start with $800 and earn less per kill. From round 2 the bots carry rifles and an AWP, all in armor.',
  },
};

// Per difficulty: weapon odds by round (the last entry repeats) and armor odds by round.
const LOADOUTS = {
  easy: {
    guns: [[['glock', 1]], [['glock', 0.7], ['mp5', 0.3]], [['glock', 0.4], ['deagle', 0.2], ['mp5', 0.4]]],
    armor: [0],
  },
  normal: {
    guns: [
      [['glock', 0.85], ['deagle', 0.15]],
      [['glock', 0.3], ['deagle', 0.2], ['mp5', 0.5]],
      [['deagle', 0.1], ['mp5', 0.35], ['ak47', 0.45], ['awp', 0.1]],
    ],
    armor: [0, 0.3, 0.7],
  },
  hard: {
    guns: [[['glock', 0.5], ['deagle', 0.5]], [['mp5', 0.2], ['ak47', 0.55], ['awp', 0.25]]],
    armor: [0.3, 1],
  },
};

const pick = (table) => {
  let r = Math.random();
  for (const [id, w] of table) if ((r -= w) <= 0) return id;
  return table[table.length - 1][0];
};
const byRound = (list, round) => list[Math.min(round - 1, list.length - 1)];

// One { weapon, armor } per bot. At most one AWP per round. Defenders carry the M4 instead of the AK-47;
// attackers carry the Uzi instead of the MP5, and the Tavor half the time instead of the AK-47.
export function botLoadouts(difficulty, round, n, team = 'CT') {
  const L = LOADOUTS[difficulty] || LOADOUTS.normal;
  const guns = byRound(L.guns, round), armor = byRound(L.armor, round);
  let awps = 0;
  return Array.from({ length: n }, () => {
    let weapon = pick(guns);
    if (weapon === 'awp' && awps++ > 0) weapon = 'ak47';
    if (weapon === 'ak47' && team === 'CT') weapon = 'm4';
    if (team === 'T' && weapon === 'mp5') weapon = 'uzi';
    if (team === 'T' && weapon === 'ak47' && Math.random() < 0.5) weapon = 'tavor';
    return { weapon, armor: Math.random() < armor };
  });
}

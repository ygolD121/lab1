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
  awp: {
    name: 'AWP', slot: 'primary', price: 4750, mag: 5, reserve: 30, delay: 1.45, auto: false, reload: 3.6,
    dmg: { head: 300, body: 115, legs: 85 }, pen: 0.98, falloff: 1,
    spread: [0.07, 0.0002], move: 0.012, bloom: 0, bloomMax: 0, punch: [0.07, 0.05], kick: 1,
    adsFov: 16, scope: true, speed: 0.84, reward: 100, sound: { freq: 75, len: 0.45, gain: 1.4 },
    bot: { fire: 2.6, acc: 1.3, body: [80, 96], head: [150, 150], len: 3.8 },
  },
};

export const ARMOR_PRICE = 1000;
export const SHOP = ['glock', 'deagle', 'mp5', 'ak47', 'awp', 'armor'];
export const MAX_MONEY = 16000;

export const ECONOMY = {
  easy: {
    start: 2500, win: 3500, loss: 2500, lossBonus: 500, killMul: 1.5, plant: 600,
    note: 'You start with $2,500 and earn 50% more per kill. Defenders stick to pistols and SMGs and never wear armor.',
  },
  normal: {
    start: 800, win: 3250, loss: 1400, lossBonus: 500, killMul: 1, plant: 300,
    note: 'You start with $800. Defenders move up to SMGs from round 2 and rifles from round 3, and some wear armor.',
  },
  hard: {
    start: 800, win: 2700, loss: 1100, lossBonus: 400, killMul: 0.75, plant: 300,
    note: 'You start with $800 and earn less per kill. From round 2 the defenders carry rifles and an AWP, all in armor.',
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

// One { weapon, armor } per defender. At most one AWP per round.
export function botLoadouts(difficulty, round, n) {
  const L = LOADOUTS[difficulty] || LOADOUTS.normal;
  const guns = byRound(L.guns, round), armor = byRound(L.armor, round);
  let awps = 0;
  return Array.from({ length: n }, () => {
    let weapon = pick(guns);
    if (weapon === 'awp' && awps++ > 0) weapon = 'ak47';
    return { weapon, armor: Math.random() < armor };
  });
}

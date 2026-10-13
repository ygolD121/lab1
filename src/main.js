// Just Shoot It — game loop, player, rounds, bomb and HUD.
import * as THREE from 'three';
import * as W from './world.js?v=6';
import { Bot, DIFFICULTY, NAMES } from './bots.js?v=6';
import { audio } from './audio.js?v=6';
import { voice, LINES } from './voice.js?v=6';
import { createViewModel } from './viewmodel.js?v=6';
import { createFx } from './fx.js?v=6';
import { createPickups } from './pickups.js?v=6';
import * as TX from './textures.js?v=6';
import { WEAPONS, SHOP, ECONOMY, ARMOR_PRICE, MAX_MONEY, botLoadouts } from './weapons.js?v=6';

const $ = (id) => document.getElementById(id);
const BASE_FOV = 78;
const ROUND_TIME = 115, FREEZE_TIME = 7, BOMB_TIME = 40, PLANT_TIME = 3.2, ROUNDS_TO_WIN = 5;
const BUY_TIME = 20, DRAW_TIME = 0.4;
const IDLE_TIME = 5;
const EYE = 1.68, CROUCH_EYE = 1.15;
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);
const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- Settings ----------
const settings = { map: 'timberline', difficulty: 'normal', bots: 5, sens: 1, volume: 0.7, voice: 'he' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('jsi-settings') || '{}')); } catch { /* storage unavailable */ }
const saveSettings = () => {
  try { localStorage.setItem('jsi-settings', JSON.stringify(settings)); } catch { /* storage unavailable */ }
};

try {
  await Promise.race([document.fonts.load('40px "Black Ops One"'), new Promise((r) => setTimeout(r, 2500))]);
} catch { /* fall back to Impact */ }

// ---------- Renderer & scene ----------
const canvas = $('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loading').textContent = 'WebGL is not available in this browser.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.05, 700);
camera.rotation.order = 'YXZ';
if (!W.MAPS[settings.map]) settings.map = 'timberline';
W.loadMap(settings.map);
let world = W.buildWorld(scene);
const vm = createViewModel();
const fx = createFx(scene);
const pickups = createPickups(scene);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  vm.resize(camera.aspect);
}
window.addEventListener('resize', resize);
resize();

// ---------- Bomb ----------
const bombLedMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2010, emissiveIntensity: 0.2 });
const bombMesh = (() => {
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 0.8 });
  const face = new THREE.MeshStandardMaterial({ map: TX.bombFace(), roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.26), [olive, olive, face, olive, olive, olive]);
  body.position.y = 0.07;
  body.castShadow = true;
  g.add(body);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), bombLedMat);
  led.position.set(0.17, 0.15, -0.08);
  g.add(led);
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xb02020 });
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6).rotateZ(Math.PI / 2), i === 1 ? new THREE.MeshStandardMaterial({ color: 0x2050b0 }) : wireMat);
    w.position.set(0, 0.03 + i * 0.03, 0.135);
    g.add(w);
  }
  g.visible = false;
  scene.add(g);
  return g;
})();

// ---------- Game state ----------
const player = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, punchP: 0, punchY: 0,
  hp: 100, alive: true, onGround: true, crouching: false, eyeH: EYE,
  slots: { primary: null, pistol: null }, cur: 'pistol', prev: 'primary', armor: 0, money: 0, drawT: 0,
  reloading: false, reloadT: 0, lastShot: -1, bloom: 0,
  hasBomb: true, planting: false, plantT: 0, keyT: 0, inSite: false, stepT: 0, deathT: 0, idleT: 0,
  eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z); },
  chestPos() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeH - 0.45, this.pos.z); },
  horizSpeed() { return Math.hypot(this.vel.x, this.vel.z); },
};

const game = {
  scene, player, fx, bots: [],
  bomb: { planted: false, pos: new THREE.Vector3(), timer: 0, beepT: 0, ledT: 0, defuser: null, defuseSoundT: 0, site: '' },
  state: 'menu', phase: 'freeze', phaseT: 0, roundTime: ROUND_TIME, round: 0, scoreT: 0, scoreCT: 0, time: 0,
  diff: DIFFICULTY.normal, econ: ECONOMY.normal, lossStreak: 0, lastCallout: -99, shake: 0,
  stats: { kills: 0, deaths: 0, hs: 0 }, botNames: [], botStats: {},
  damagePlayer, onBotDied, onBotSpotted, onDefuseStart, bombDefused, nearMiss, positionalSound,
};

// ---------- Weapons ----------
const newGun = (id) => ({ id, ammo: WEAPONS[id].mag, reserve: WEAPONS[id].reserve });
const held = () => player.slots[player.cur];
const heldDef = () => WEAPONS[held().id];
const money = (n) => `$${n.toLocaleString('en-US')}`;
player.slots.pistol = newGun('glock');

function equip(slot) {
  const p = player;
  if (slot !== p.cur) p.prev = p.cur;
  p.cur = slot;
  p.reloading = false;
  p.bloom = 0;
  p.drawT = DRAW_TIME;
  vm.setWeapon(held().id);
}

function switchTo(slot) {
  const p = player;
  if (!p.alive || p.planting || slot === p.cur || !p.slots[slot]) return;
  equip(slot);
}

// ---------- Money & buy menu ----------
function addMoney(n, why) {
  const p = player;
  const gained = Math.min(n, MAX_MONEY - p.money);
  p.money += gained;
  const el = document.createElement('div');
  el.className = 'money-pop';
  el.textContent = `+${money(gained)} ${why}`;
  $('money-pops').appendChild(el);
  setTimeout(() => el.remove(), 2600);
  if (shopOpen) renderShop();
}

function buyTimeLeft() {
  const p = player;
  if (game.state !== 'playing' || !p.alive || game.bomb.planted) return 0;
  if (game.phase === 'freeze') return BUY_TIME;
  if (game.phase !== 'live' || W.cellType(p.pos.x, p.pos.z) !== W.T_SPAWN) return 0;
  return Math.max(0, BUY_TIME - (ROUND_TIME - game.roundTime));
}

function toggleShop() {
  if (shopOpen) closeShop();
  else if (buyTimeLeft() > 0) {
    shopOpen = true;
    renderShop();
    $('shop').classList.remove('hidden');
    audio.ui();
  } else flashCenter(game.phase === 'live' ? 'You can only buy in spawn, in the first 20 seconds' : 'Buy time is over');
}

function closeShop() {
  shopOpen = false;
  $('shop').classList.add('hidden');
}

function renderShop() {
  const p = player;
  setText($('shop-money'), money(p.money));
  $('shop-items').innerHTML = SHOP.map((id, i) => {
    const armor = id === 'armor', w = WEAPONS[id];
    const price = armor ? ARMOR_PRICE : w.price;
    const owned = armor ? p.armor >= 100 : p.slots[w.slot]?.id === id;
    const stats = armor
      ? 'Halves incoming damage · lasts until you die'
      : `${w.dmg.body} dmg · ${w.mag}-round mag · ${w.auto ? 'full auto' : 'semi-auto'}${w.scope ? ' · scope' : ''}`;
    const cls = owned ? 'owned' : p.money < price ? 'poor' : '';
    return `<div class="shop-item ${cls}" data-id="${id}">
      <kbd>${i + 1}</kbd>
      <div class="si-name">${armor ? 'Kevlar + Helmet' : w.name}<small>${armor ? 'Equipment' : w.slot === 'pistol' ? 'Pistol · slot 2' : 'Primary · slot 1'}</small><span>${stats}</span></div>
      <div class="si-price">${owned ? 'OWNED' : money(price)}</div>
    </div>`;
  }).join('');
}

function buy(id) {
  if (!id || buyTimeLeft() <= 0) return;
  const p = player;
  const armor = id === 'armor', w = WEAPONS[id];
  const price = armor ? ARMOR_PRICE : w.price;
  const owned = armor ? p.armor >= 100 : p.slots[w.slot]?.id === id;
  const row = $('shop-items').querySelector(`[data-id="${id}"]`);
  if (owned || p.money < price) {
    audio.dryFire();
    row?.classList.remove('deny');
    void row?.offsetWidth;
    row?.classList.add('deny');
    return;
  }
  p.money -= price;
  if (armor) p.armor = 100;
  else {
    p.slots[w.slot] = newGun(id);
    equip(w.slot);
  }
  audio.buy();
  renderShop();
}

let flashT = 0, flashText = '';
function flashCenter(text) {
  flashText = text;
  flashT = 2;
}

// ---------- Input ----------
const keys = new Set();
let adsHeld = false, fireHeld = false, lookDX = 0, lookDY = 0, locked = false, lockedAt = 0, scoreboardOpen = false;
let shopOpen = false;

function lock() {
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch { /* the user can click the canvas to retry */ }
}

// Physical key for an event. e.code is the same on every layout (Hebrew, English…); when a browser or
// keyboard tool leaves it empty, fall back to the key code or the Hebrew letter printed on that key.
const HEBREW_KEYS = {
  'ש': 'KeyA', 'נ': 'KeyB', 'ב': 'KeyC', 'ג': 'KeyD', 'ק': 'KeyE', 'כ': 'KeyF', 'ע': 'KeyG', 'י': 'KeyH', 'ן': 'KeyI',
  'ח': 'KeyJ', 'ל': 'KeyK', 'ך': 'KeyL', 'צ': 'KeyM', 'מ': 'KeyN', 'ם': 'KeyO', 'פ': 'KeyP', '/': 'KeyQ', 'ר': 'KeyR',
  'ד': 'KeyS', 'א': 'KeyT', 'ו': 'KeyU', 'ה': 'KeyV', "'": 'KeyW', 'ס': 'KeyX', 'ט': 'KeyY', 'ז': 'KeyZ',
};
function physicalKey(e) {
  if (e.code && e.code !== 'Unidentified') return e.code;
  if (e.keyCode >= 65 && e.keyCode <= 90) return `Key${String.fromCharCode(e.keyCode)}`;
  if (e.keyCode >= 48 && e.keyCode <= 57) return `Digit${e.keyCode - 48}`;
  const k = e.key || '';
  if (HEBREW_KEYS[k]) return HEBREW_KEYS[k];
  if (/^[a-z]$/i.test(k)) return `Key${k.toUpperCase()}`;
  if (/^[0-9]$/.test(k)) return `Digit${k}`;
  if (k === ' ') return 'Space';
  if (k === 'Shift') return 'ShiftLeft';
  return k;
}

window.addEventListener('keydown', (e) => {
  if (game.state !== 'playing') return;
  const code = physicalKey(e);
  // Swallow the key so the browser doesn't act on the typed character. On a Hebrew layout W types ' and
  // Q types /, which open Firefox's Quick Find bar and steal every key after that.
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !/^F\d+$/.test(code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(code);
  if (code === 'KeyR') startReload();
  if (code === 'Tab') scoreboardOpen = true;
  if (code === 'KeyB') toggleShop();
  else if (shopOpen && /^Digit[1-9]$/.test(code)) buy(SHOP[Number(code.slice(5)) - 1]);
  else if (code === 'Digit1') switchTo('primary');
  else if (code === 'Digit2') switchTo('pistol');
  else if (code === 'KeyQ') switchTo(player.prev);
  else if (code === 'KeyF' && player.alive && player.nearPickup) pickUp(player.nearPickup);
});
window.addEventListener('keyup', (e) => {
  const code = physicalKey(e);
  keys.delete(code);
  if (code === 'Tab') scoreboardOpen = false;
});
window.addEventListener('blur', () => { keys.clear(); adsHeld = fireHeld = false; });
document.addEventListener('mousemove', (e) => {
  if (!locked || game.state !== 'playing') return;
  const mx = e.movementX, my = e.movementY;
  // Browsers sometimes report a huge jump right after locking, or as a one-off spike.
  if (performance.now() - lockedAt < 150 || Math.abs(mx) > 300 || Math.abs(my) > 300) return;
  const s = settings.sens * 0.0022 * (camera.fov / BASE_FOV);
  if (player.alive) {
    player.yaw -= mx * s;
    player.pitch = clamp(player.pitch - my * s, -1.5, 1.5);
  }
  lookDX += mx;
  lookDY += my;
});
document.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing') return;
  if (!locked) {
    if (e.target === canvas) lock();
    return;
  }
  if (e.button === 0 && shopOpen) closeShop();
  else if (e.button === 0) {
    fireHeld = true;
    tryShoot();
  }
  if (e.button === 2) adsHeld = true;
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) fireHeld = false;
  if (e.button === 2) adsHeld = false;
});
document.addEventListener('wheel', (e) => {
  if (game.state === 'playing' && locked && !shopOpen) switchTo(player.cur === 'pistol' ? 'primary' : 'pistol');
}, { passive: true });
document.addEventListener('contextmenu', (e) => { if (game.state === 'playing') e.preventDefault(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) lockedAt = performance.now();
  if (locked && game.state === 'paused') setState('playing');
  else if (!locked && game.state === 'playing') setState('paused');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') setState('paused');
});

// ---------- Screens ----------
function setState(s) {
  game.state = s;
  $('menu').classList.toggle('hidden', s !== 'menu');
  $('pause').classList.toggle('hidden', s !== 'paused');
  $('matchover').classList.toggle('hidden', s !== 'matchover');
  $('hud').classList.toggle('hidden', s !== 'playing' && s !== 'paused');
  if (s !== 'playing') {
    keys.clear();
    adsHeld = fireHeld = false;
    scoreboardOpen = false;
    closeShop();
  }
}

function bindSegment(id, key, parse = (v) => v) {
  const el = $(id);
  const sync = () => el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', parse(b.dataset.v) === settings[key]));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    settings[key] = parse(b.dataset.v);
    saveSettings();
    sync();
    audio.ui();
  });
  sync();
}
bindSegment('opt-difficulty', 'difficulty');
const syncDiffNote = () => { $('diff-note').textContent = (ECONOMY[settings.difficulty] || ECONOMY.normal).note; };
$('opt-difficulty').addEventListener('click', syncDiffNote);
syncDiffNote();
bindSegment('opt-bots', 'bots', Number);
bindSegment('opt-voice', 'voice');
bindSegment('opt-map', 'map');
$('opt-map').addEventListener('click', () => setMap(settings.map));
const syncVoice = () => {
  voice.setEnabled(settings.voice === 'he');
  voice.setVolume(settings.volume);
  $('voice-note').textContent = settings.voice === 'he' && !voice.available
    ? 'No Hebrew voice on this device, so the lines will only show on screen.' : '';
};
$('opt-voice').addEventListener('click', syncVoice);
syncVoice();
setTimeout(syncVoice, 1500); // voices load asynchronously in some browsers
window.speechSynthesis?.addEventListener?.('voiceschanged', syncVoice);
for (const [key, fmt] of [['sens', (v) => v.toFixed(2)], ['volume', (v) => `${Math.round(v * 100)}%`]]) {
  for (const el of document.querySelectorAll(`[data-setting="${key}"]`)) {
    el.value = settings[key];
    const out = el.parentElement.querySelector('output');
    if (out) out.textContent = fmt(settings[key]);
    el.addEventListener('input', () => {
      settings[key] = Number(el.value);
      document.querySelectorAll(`[data-setting="${key}"]`).forEach((o) => {
        o.value = el.value;
        const oo = o.parentElement.querySelector('output');
        if (oo) oo.textContent = fmt(settings[key]);
      });
      if (key === 'volume') {
        audio.setVolume(settings.volume);
        voice.setVolume(settings.volume);
      }
      saveSettings();
    });
  }
}

$('play').addEventListener('click', () => {
  audio.init();
  audio.setVolume(settings.volume);
  startMatch();
  lock();
});
$('resume').addEventListener('click', () => lock());
$('quit').addEventListener('click', () => toMenu());
$('again').addEventListener('click', () => {
  audio.init();
  startMatch();
  lock();
});
$('to-menu').addEventListener('click', () => toMenu());

function toMenu() {
  for (const b of game.bots) b.dispose();
  game.bots = [];
  bombMesh.visible = false;
  fx.clear();
  pickups.clear();
  voice.stop();
  setState('menu');
  if (document.pointerLockElement) document.exitPointerLock();
}

// ---------- Match & rounds ----------
function startMatch() {
  game.diff = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  game.econ = ECONOMY[settings.difficulty] || ECONOMY.normal;
  game.scoreT = game.scoreCT = game.round = game.lossStreak = 0;
  player.money = game.econ.start;
  player.alive = false; // so startRound hands out the starting loadout
  game.stats = { kills: 0, deaths: 0, hs: 0 };
  game.botNames = shuffle(NAMES.slice()).slice(0, settings.bots);
  game.botStats = Object.fromEntries(game.botNames.map((n) => [n, { kills: 0, deaths: 0 }]));
  $('killfeed').innerHTML = '';
  setState('playing');
  startRound();
}

function startRound() {
  game.round++;
  for (const b of game.bots) b.dispose();
  fx.clear();
  pickups.clear();
  const spawns = shuffle(W.cellsOfType(W.CT_SPAWN));
  const spots = shuffle(W.SPOTS.slice());
  const loadouts = botLoadouts(settings.difficulty, game.round, game.botNames.length);
  game.bots = game.botNames.map((name, i) => {
    const [cx, cz] = spawns[i % spawns.length];
    return new Bot(game, name, { x: W.C(cx) + (Math.random() - 0.5) * 1.5, z: W.C(cz) + (Math.random() - 0.5) * 1.5 }, spots[i % spots.length], loadouts[i]);
  });

  const p = player;
  // Survivors keep their guns and armor; the dead start over with a Glock. Ammo refills either way.
  if (!p.alive) {
    p.slots = { primary: null, pistol: newGun('glock') };
    p.armor = 0;
  }
  for (const g of Object.values(p.slots)) if (g) Object.assign(g, newGun(g.id));
  p.cur = p.slots.primary ? 'primary' : 'pistol';
  p.prev = p.cur === 'primary' ? 'pistol' : 'primary';
  const [ax, az, bx, bz] = W.currentMap().playerSpawn;
  const tCells = W.cellsOfType(W.T_SPAWN).filter(([x, z]) => x >= ax && x <= bx && z >= az && z <= bz);
  const [sx, sz] = tCells[(Math.random() * tCells.length) | 0];
  p.pos.set(W.C(sx), 0, W.C(sz));
  p.vel.set(0, 0, 0);
  Object.assign(p, {
    yaw: 0, pitch: 0, punchP: 0, punchY: 0, hp: 100, alive: true, onGround: true, crouching: false, eyeH: EYE,
    reloading: false, bloom: 0, drawT: 0, hasBomb: true, planting: false, plantT: 0, deathT: 0, idleT: 0,
  });
  Object.assign(game.bomb, { planted: false, defuser: null, timer: 0 });
  bombMesh.visible = false;
  game.phase = 'freeze';
  game.phaseT = FREEZE_TIME;
  game.roundTime = ROUND_TIME;
  game.shake = 0;
  vm.setWeapon(held().id);
  $('death-msg').classList.remove('show');
  banner(`ROUND ${game.round}`, 'Press B to buy weapons · plant the bomb at A or B, or eliminate every defender', 2.6);
  voice.say('roundStart', 'urgent');
  game.lowTimeSaid = false;
}

function endRound(winner, reason, line = winner === 'T' ? 'attackersWin' : 'defendersWin') {
  if (game.phase === 'over') return;
  game.phase = 'over';
  game.phaseT = 5;
  if (winner === 'T') {
    game.scoreT++;
    game.lossStreak = 0;
    addMoney(game.econ.win, 'round won');
  } else {
    game.scoreCT++;
    game.lossStreak++;
    addMoney(game.econ.loss + game.econ.lossBonus * Math.min(game.lossStreak - 1, 4), 'round lost');
  }
  player.planting = false;
  closeShop();
  banner(LINES[line], `${winner === 'T' ? 'Attackers win' : 'Defenders win'} · ${reason}`, 4.6, winner === 'T' ? 'win' : 'lose');
  audio.jingle(winner === 'T');
  voice.say(line, 'queue');
}

function matchOver() {
  const won = game.scoreT > game.scoreCT;
  $('mo-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('mo-title').className = won ? 'win' : 'lose';
  voice.say(won ? 'victory' : 'defeat', 'urgent');
  $('mo-score').textContent = `${game.scoreT} – ${game.scoreCT}`;
  const { kills, deaths, hs } = game.stats;
  $('mo-stats').innerHTML = `
    <div><b>${kills}</b><span>Kills</span></div>
    <div><b>${deaths}</b><span>Deaths</span></div>
    <div><b>${deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2)}</b><span>K/D</span></div>
    <div><b>${kills ? Math.round((hs / kills) * 100) : 0}%</b><span>Headshots</span></div>`;
  setState('matchover');
  if (document.pointerLockElement) document.exitPointerLock();
}

// ---------- Player actions ----------
function currentSpread() {
  const p = player, ads = vm.adsAmount;
  const w = heldDef();
  let s = lerp(w.spread[0], w.spread[1], ads) + p.horizSpeed() * w.move * (1 - ads * 0.4) + p.bloom;
  if (!p.onGround) s += 0.07;
  if (p.crouching) s *= 0.75;
  return s;
}

function startReload() {
  const p = player;
  const g = held(), w = WEAPONS[g.id];
  if (!p.alive || p.reloading || g.ammo >= w.mag || g.reserve <= 0 || p.planting) return;
  p.reloading = true;
  p.reloadT = w.reload;
  vm.reload(w.reload);
  audio.reload(w.reload);
}

function makeNoise(pos, radius) {
  for (const b of game.bots) if (b.alive && b.pos.distanceTo(pos) < radius) b.hear(pos);
}

function tryShoot() {
  const p = player;
  if (!p.alive || game.phase === 'freeze' || p.planting || p.reloading || shopOpen || p.drawT > 0) return;
  const g = held(), w = WEAPONS[g.id];
  if (game.time - p.lastShot < w.delay) return;
  if (g.ammo <= 0) {
    if (game.time - p.lastShot > 0.25) audio.dryFire();
    p.lastShot = game.time;
    startReload();
    return;
  }
  g.ammo--;
  p.lastShot = game.time;
  camera.updateMatrixWorld();
  const origin = camera.position.clone();
  const spread = currentSpread();
  const q = camera.quaternion;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q), up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
  dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
  p.bloom = Math.min(w.bloomMax, p.bloom + w.bloom);
  p.punchP += w.punch[vm.adsAmount > 0.5 ? 1 : 0];
  p.punchY += (Math.random() - 0.5) * w.punch[0] * 0.5;

  const hit = W.raycastWorld(origin, dir, 250);
  const O = [origin.x, origin.y, origin.z], D = [dir.x, dir.y, dir.z];
  let best = null;
  for (const b of game.bots) {
    const h = b.raycast(O, D, hit.t);
    if (h && (!best || h.t < best.t)) best = { ...h, bot: b };
  }
  const end = origin.clone().addScaledVector(dir, best ? best.t : hit.t);
  if (best) {
    const head = best.part === 'head';
    let dmg = w.dmg[best.part];
    if (best.t > 35) dmg *= w.falloff;
    if (best.bot.armor && best.part !== 'legs') dmg *= w.pen;
    dmg = Math.round(dmg);
    fx.blood(end, dir);
    const killed = best.bot.takeDamage(dmg, p.pos);
    showHitmarker(head, killed);
    if (killed && head) voice.say('headshot');
    audio.hit(head);
    if (killed) onBotKilled(best.bot, head, w);
  } else if (hit.t < 250) fx.impact(end, hit.n, hit.what);

  const ads = vm.adsAmount;
  const muzzle = camera.localToWorld(new THREE.Vector3(lerp(0.13, 0, ads), lerp(-0.1, -0.03, ads), -0.55));
  fx.tracer(muzzle, end, 0xffe8b0, 0.3);
  fx.flashLight(muzzle);
  audio.gunshot(0.85, 0, 0, w.sound, true);
  vm.shoot(w.kick);
  makeNoise(origin, 50);
}

function plantBomb(siteType) {
  const p = player, b = game.bomb;
  b.planted = true;
  b.pos.copy(p.pos);
  b.timer = BOMB_TIME;
  b.beepT = 0;
  b.defuser = null;
  b.site = siteType === W.SITE_A ? 'A' : 'B';
  p.hasBomb = false;
  p.planting = false;
  addMoney(game.econ.plant, 'bomb planted');
  bombMesh.position.copy(b.pos);
  bombMesh.rotation.y = p.yaw;
  bombMesh.visible = true;
  audio.armed();
  banner(LINES.planted, `Bomb planted at ${b.site}: defend it for ${BOMB_TIME} seconds`, 2.6, 'warn');
  voice.say('planted', 'urgent');
  for (const o of game.bots) {
    if (o.alive && o.state !== 'engage') {
      o.state = 'toBomb';
      o.path = null;
    }
  }
}

function explode() {
  const b = game.bomb;
  b.planted = false;
  bombMesh.visible = false;
  fx.explosion(b.pos);
  audio.explosion(1);
  voice.say('exploded', 'urgent');
  game.shake = 1.4;
  const p = player;
  const d = p.pos.distanceTo(b.pos);
  if (p.alive && d < 24) {
    p.hp -= d < 12 ? 999 : Math.round(110 * (1 - (d - 12) / 12));
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      p.deathT = 0;
      game.stats.deaths++;
      killfeed('The bomb', 'You', false);
      deathShout(true);
    }
  }
  for (const o of game.bots) {
    if (o.alive && o.pos.distanceTo(b.pos) < 20) {
      o.takeDamage(999, b.pos);
      killfeed('The bomb', o.name, false);
      game.botStats[o.name].deaths++;
    }
  }
  endRound('T', `Bombsite ${b.site} destroyed`);
}

// ---------- Callbacks used by bots ----------
function damagePlayer(dmg, bot, head) {
  const p = player;
  if (!p.alive) return;
  if (p.armor > 0) {
    const absorbed = Math.min(Math.round(dmg * 0.5), p.armor * 2);
    dmg -= absorbed;
    p.armor = Math.max(0, p.armor - Math.ceil(absorbed / 2));
  }
  p.hp -= dmg;
  audio.hurt();
  p.punchP += 0.025;
  p.punchY += (Math.random() - 0.5) * 0.02;
  const rel = angleDiff(yawTo(bot.pos.x - p.pos.x, bot.pos.z - p.pos.z), p.yaw);
  const ind = document.createElement('div');
  ind.className = 'dmg-dir';
  ind.style.transform = `rotate(${-rel}rad)`;
  $('dmg-dirs').appendChild(ind);
  setTimeout(() => ind.remove(), 1100);
  const v = $('dmg-vignette');
  v.classList.remove('hit');
  void v.offsetWidth;
  v.classList.add('hit');
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    p.deathT = 0;
    p.planting = false;
    p.reloading = false;
    game.stats.deaths++;
    deathShout(true);
    game.botStats[bot.name].kills++;
    killfeed(bot.name, 'You', head, bot.weapon.name);
    voice.say('died', 'urgent');
    const dm = $('death-msg');
    dm.innerHTML = `Killed by <b>${bot.name}</b> · ${bot.weapon.name}${head ? ' · headshot' : ''}<small>${bot.hp} HP left · you lose your guns and armor</small>`;
    dm.classList.add('show');
    if (!game.bomb.planted) endRound('CT', 'The attacker was eliminated');
  }
}

// Your death always plays one of the four shouts; a defender you kill gets one a third of the time.
// Either way each of the four is equally likely.
const SHOUTS = 4;
function deathShout(always = false) {
  if (always || Math.random() < 1 / 3) audio.shout(Math.floor(Math.random() * SHOUTS));
}

// A dead defender drops its gun with whatever was left in the magazine.
function onBotDied(bot) {
  bot.model.gun.visible = false;
  pickups.drop(bot.weaponId, Math.max(0, bot.ammo), WEAPONS[bot.weaponId].reserve, bot.pos);
}

// Takes a weapon off the ground. A gun already in that slot is dropped where you stand.
function pickUp(item) {
  const p = player, slot = WEAPONS[item.id].slot, old = p.slots[slot];
  pickups.take(item);
  if (old) pickups.drop(old.id, old.ammo, old.reserve, p.pos);
  p.slots[slot] = { id: item.id, ammo: item.ammo, reserve: item.reserve };
  equip(slot);
  audio.dryFire();
}

function onBotKilled(bot, head, w) {
  game.stats.kills++;
  if (head) game.stats.hs++;
  game.botStats[bot.name].deaths++;
  killfeed('You', bot.name, head, w.name);
  deathShout();
  addMoney(Math.round(w.reward * game.econ.killMul), `kill · ${w.name}`);
  if (game.phase === 'live' && game.bots.every((b) => !b.alive)) endRound('T', 'All defenders eliminated');
}

function onBotSpotted(bot) {
  if (game.time - game.lastCallout > 4) {
    game.lastCallout = game.time;
    const loc = W.locationName(player.pos.x, player.pos.z);
    radio(`${bot.name}: Enemy spotted${loc ? `, ${loc}` : ''}!`);
  }
  if (game.bomb.planted) return;
  for (const o of game.bots) {
    if (o !== bot && o.alive && (o.state === 'hold' || o.state === 'goto') && Math.random() < game.diff.rotate) o.investigate(player.pos, 4);
  }
}

function onDefuseStart(bot) {
  game.bomb.defuseSoundT = 0;
  void bot;
}

function bombDefused(bot) {
  if (game.phase !== 'live') return;
  game.bomb.planted = false;
  game.bomb.defuser = null;
  bombLedMat.emissiveIntensity = 0;
  endRound('CT', `${bot.name} defused the bomb`, 'defused');
}

function nearMiss(muzzle, dir) {
  if (!player.alive) return;
  const eye = player.eyePos();
  const v = eye.clone().sub(muzzle), t = v.dot(dir);
  if (t <= 0) return;
  const closest = muzzle.clone().addScaledVector(dir, t);
  if (closest.distanceTo(eye) < 1.6) audio.whiz(panFor(muzzle));
}

function panFor(pos) {
  const rel = angleDiff(yawTo(pos.x - camera.position.x, pos.z - camera.position.z), player.yaw);
  return -Math.sin(rel) * 0.8;
}

function positionalSound(type, pos, sound) {
  const d = Math.hypot(pos.x - camera.position.x, pos.z - camera.position.z);
  const pan = panFor(pos);
  if (type === 'gunshot') audio.gunshot(Math.pow(clamp(1 - d / 120, 0.06, 1), 1.3), pan, clamp(d / 60, 0, 1), sound);
  else if (type === 'step') {
    const v = clamp(1 - d / 24, 0, 1) * 0.35;
    if (v > 0.01) audio.step(v, pan);
  } else if (type === 'beep') audio.beep(clamp(1 - d / 90, 0.08, 1) * 0.4, pan);
  else if (type === 'defuse') audio.defusing(clamp(1 - d / 40, 0.05, 1) * 0.35, pan);
}

// ---------- HUD ----------
const hud = {
  hp: $('hp'), health: $('health'), mag: $('ammo-mag'), res: $('ammo-res'), ammo: $('ammo'), timer: $('timer'),
  scoreT: $('score-t'), scoreCT: $('score-ct'), aliveCT: $('alive-ct'), loc: $('loc'), center: $('center-msg'),
  progress: $('progress'), fill: $('progress-fill'), plabel: $('progress-label'), bombIcon: $('bomb-icon'),
  cross: $('crosshair'), low: $('low-hp'), board: $('scoreboard'), boardBody: $('sb-body'), round: $('round-no'),
  money: $('money'), armor: $('armor'), armorVal: $('armor-val'), wname: $('wname'), slots: $('slots'),
  scope: $('scope'), shopTime: $('shop-time'),
};
const setText = (el, v) => {
  if (el._v !== v) {
    el._v = v;
    el.textContent = v;
  }
};
const fmtTime = (t) => {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let bannerTimer = 0;
function banner(title, sub, dur, kind = '') {
  $('banner-title').textContent = title;
  $('banner-sub').textContent = sub;
  const b = $('banner');
  b.className = `show ${kind}`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { b.className = ''; }, dur * 1000);
}

function killfeed(killer, victim, head, gun = '') {
  const el = document.createElement('div');
  el.className = 'kf';
  const cls = (n) => (n === 'You' ? 'me' : n === 'The bomb' ? 'bomb' : 'ct');
  el.innerHTML = `<span class="${cls(killer)}">${killer}</span><span class="gun">${killer === 'The bomb' ? '💥' : gun.toUpperCase()}</span>${head ? '<span class="hs" title="Headshot">◉</span>' : ''}<span class="${cls(victim)}">${victim}</span>`;
  pushFeed(el);
}
function radio(text) {
  const el = document.createElement('div');
  el.className = 'kf radio';
  el.textContent = text;
  pushFeed(el);
}
function pushFeed(el) {
  const feed = $('killfeed');
  feed.appendChild(el);
  while (feed.children.length > 6) feed.firstChild.remove();
  setTimeout(() => el.remove(), 6500);
}

function showHitmarker(head, kill) {
  const h = $('hitmarker');
  h.className = '';
  void h.offsetWidth;
  h.className = `show${head ? ' head' : ''}${kill ? ' kill' : ''}`;
}

// Radar
const radar = $('radar'), rctx = radar.getContext('2d');
const RS = radar.width, rscale = RS / (W.GW * W.CELL);
const radarBg = document.createElement('canvas');
radarBg.width = radarBg.height = RS;
function drawRadarBg() {
  const g = radarBg.getContext('2d');
  g.fillStyle = '#16200f';
  g.fillRect(0, 0, RS, RS);
  const cs = W.CELL * rscale;
  for (let z = 0; z < W.GH; z++) {
    for (let x = 0; x < W.GW; x++) {
      const t = W.grid[z * W.GW + x];
      if (t === W.WALL) continue;
      g.fillStyle = t === W.SITE_A || t === W.SITE_B ? '#8a6a3c' : t === W.T_SPAWN ? '#6c5a3c' : t === W.CT_SPAWN ? '#4f5d6c' : '#6b624c';
      g.fillRect(x * cs, z * cs, cs + 0.5, cs + 0.5);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (const p of W.props) {
    if (p.min[1] > 1) continue;
    g.fillRect(p.min[0] * rscale, p.min[2] * rscale, (p.max[0] - p.min[0]) * rscale, (p.max[2] - p.min[2]) * rscale);
  }
  g.font = `bold ${Math.round(RS * 0.09)}px "Black Ops One", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffb347';
  const { A, B } = W.currentMap().radarLabels;
  g.fillText('A', A[0] * cs, A[1] * cs);
  g.fillText('B', B[0] * cs, B[1] * cs);
}
drawRadarBg();

// Swaps in another map: rebuilds the grid, the 3D world, the radar and the map name in the UI.
function setMap(id) {
  if (W.currentMap().id !== id) {
    world.dispose();
    W.loadMap(id);
    world = W.buildWorld(scene);
    drawRadarBg();
  }
  const m = W.currentMap();
  $('mapname-title').textContent = m.title;
  $('mapname-blurb').textContent = m.blurb;
  $('sb-title').textContent = `JUST SHOOT IT · ${m.title}`;
}
setMap(settings.map);

function drawRadar() {
  rctx.drawImage(radarBg, 0, 0);
  const p = player;
  for (const b of game.bots) {
    const x = b.pos.x * rscale, y = b.pos.z * rscale;
    if (!b.alive) {
      rctx.strokeStyle = 'rgba(255,255,255,0.5)';
      rctx.lineWidth = 1.5;
      rctx.beginPath();
      rctx.moveTo(x - 3, y - 3); rctx.lineTo(x + 3, y + 3);
      rctx.moveTo(x + 3, y - 3); rctx.lineTo(x - 3, y + 3);
      rctx.stroke();
    } else if (b.canSee || game.time - b.lastShotTime < 1.5) {
      rctx.fillStyle = '#ff3b30';
      rctx.beginPath();
      rctx.arc(x, y, 3.5, 0, Math.PI * 2);
      rctx.fill();
    }
  }
  if (game.bomb.planted && Math.sin(game.time * 10) > 0) {
    rctx.fillStyle = '#ff3b30';
    rctx.fillRect(game.bomb.pos.x * rscale - 3, game.bomb.pos.z * rscale - 3, 6, 6);
  }
  const x = p.pos.x * rscale, y = p.pos.z * rscale;
  rctx.save();
  rctx.translate(x, y);
  rctx.rotate(-p.yaw);
  rctx.fillStyle = p.alive ? '#ff7a18' : '#777';
  rctx.strokeStyle = '#000';
  rctx.lineWidth = 1;
  rctx.beginPath();
  rctx.moveTo(0, -7);
  rctx.lineTo(4.5, 5);
  rctx.lineTo(0, 2.5);
  rctx.lineTo(-4.5, 5);
  rctx.closePath();
  rctx.fill();
  rctx.stroke();
  rctx.restore();
}

let boardT = 0;
function updateHud(dt) {
  const p = player, b = game.bomb;
  setText(hud.hp, String(Math.max(0, Math.ceil(p.hp))));
  hud.health.classList.toggle('low', p.hp <= 30);
  hud.low.classList.toggle('on', p.alive && p.hp <= 30);
  const g = held(), w = WEAPONS[g.id];
  setText(hud.mag, String(g.ammo));
  setText(hud.res, String(g.reserve));
  setText(hud.wname, w.name.toUpperCase());
  hud.ammo.classList.toggle('low', g.ammo <= Math.ceil(w.mag / 5));
  setText(hud.money, money(p.money));
  hud.armor.classList.toggle('hidden', p.armor <= 0);
  setText(hud.armorVal, String(p.armor));
  const slotsKey = `${p.cur}|${p.slots.primary?.id}|${p.slots.pistol?.id}`;
  if (hud.slots._v !== slotsKey) {
    hud.slots._v = slotsKey;
    hud.slots.innerHTML = [['primary', 1], ['pistol', 2]]
      .filter(([slot]) => p.slots[slot])
      .map(([slot, n]) => `<div class="${slot === p.cur ? 'on' : ''}"><kbd>${n}</kbd>${WEAPONS[p.slots[slot].id].name}</div>`).join('');
  }
  const scoped = !!w.scope && vm.adsAmount > 0.85 && p.alive;
  hud.scope.classList.toggle('show', scoped);
  const buyLeft = buyTimeLeft();
  if (shopOpen) setText(hud.shopTime, game.phase === 'freeze' ? 'Buy time: round start' : `Buy time: ${Math.ceil(buyLeft)}s`);
  setText(hud.scoreT, String(game.scoreT));
  setText(hud.scoreCT, String(game.scoreCT));
  setText(hud.round, `ROUND ${game.round}`);

  if (b.planted) {
    setText(hud.timer, 'BOMB');
    hud.timer.className = 'bomb';
  } else if (game.phase === 'freeze') {
    setText(hud.timer, fmtTime(game.phaseT));
    hud.timer.className = 'freeze';
  } else {
    setText(hud.timer, fmtTime(game.roundTime));
    hud.timer.className = game.roundTime < 15 && game.phase === 'live' ? 'urgent' : '';
  }

  const pips = game.bots.map((o) => (o.alive ? '1' : '0')).join('');
  if (hud.aliveCT._v !== pips) {
    hud.aliveCT._v = pips;
    hud.aliveCT.innerHTML = [...pips].map((c) => `<i class="${c === '1' ? 'on' : ''}"></i>`).join('');
  }
  setText(hud.loc, W.locationName(p.pos.x, p.pos.z));

  let msg = '';
  flashT -= dt;
  if (!locked && game.state === 'playing') msg = 'Click to capture the mouse';
  else if (flashT > 0) msg = flashText;
  else if (game.phase === 'freeze') msg = `Round starts in ${Math.ceil(game.phaseT)}${shopOpen ? '' : ' · press B to buy'}`;
  else if (!p.alive && b.planted) msg = 'You are dead, but the bomb is still ticking…';
  else if (b.planted && b.defuser && b.defuser.alive) msg = 'The bomb is being defused!';
  else if (p.alive && p.hasBomb && p.inSite && !p.planting && game.phase === 'live') msg = 'Hold E to plant the bomb';
  else if (p.alive && p.nearPickup) msg = `Press F to pick up the ${WEAPONS[p.nearPickup.id].name}`;
  setText(hud.center, msg);
  hud.center.classList.toggle('alert', msg.startsWith('The bomb is being'));

  hud.progress.classList.toggle('show', p.planting);
  if (p.planting) {
    hud.fill.style.width = `${(p.plantT / PLANT_TIME) * 100}%`;
    setText(hud.plabel, 'PLANTING BOMB');
  }
  hud.bombIcon.classList.toggle('show', p.hasBomb && p.alive);
  hud.bombIcon.classList.toggle('pulse', p.hasBomb && p.inSite);

  const spread = currentSpread();
  const gap = 3 + (Math.tan(spread) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * (window.innerHeight / 2);
  hud.cross.style.setProperty('--gap', `${gap.toFixed(1)}px`);
  hud.cross.classList.toggle('ads', vm.adsAmount > 0.6);
  hud.cross.classList.toggle('hidden', !p.alive || scoped);

  drawRadar();

  hud.board.classList.toggle('show', scoreboardOpen);
  boardT -= dt;
  if (scoreboardOpen && boardT <= 0) {
    boardT = 0.25;
    const gear = (name, armor) => `${name}${armor ? ' + armor' : ''}`;
    const rows = [`<tr class="me"><td>You</td><td>${gear(w.name, p.armor > 0)}</td><td>${money(p.money)}</td><td>${game.stats.kills}</td><td>${game.stats.deaths}</td><td>${p.alive ? 'Alive' : 'Dead'}</td></tr>`];
    for (const o of game.bots) {
      const s = game.botStats[o.name];
      rows.push(`<tr class="${o.alive ? '' : 'dead'}"><td>${o.name}</td><td>${gear(o.weapon.name, o.armor)}</td><td></td><td>${s.kills}</td><td>${s.deaths}</td><td>${o.alive ? 'Alive' : 'Dead'}</td></tr>`);
    }
    hud.boardBody.innerHTML = rows.join('');
  }
}

// ---------- Simulation ----------
function updatePlayer(dt) {
  const p = player;
  if (!p.alive) {
    p.deathT += dt;
    p.eyeH = Math.max(0.3, p.eyeH - dt * 3);
    camera.position.set(p.pos.x, p.pos.y + p.eyeH, p.pos.z);
    camera.rotation.set(p.pitch * 0.5, p.yaw, Math.min(1, p.deathT * 2) * 0.6);
    return;
  }

  const site = W.cellType(p.pos.x, p.pos.z);
  p.inSite = site === W.SITE_A || site === W.SITE_B;
  if (keys.has('KeyE') && p.hasBomb && p.inSite && p.onGround && game.phase === 'live') {
    if (!p.planting) {
      p.planting = true;
      p.plantT = 0;
      p.keyT = 0;
      if (p.reloading) {
        p.reloading = false;
        vm.cancelReload();
      }
    }
    p.plantT += dt;
    p.keyT -= dt;
    if (p.keyT <= 0) {
      p.keyT = 0.3;
      audio.key();
    }
    if (p.plantT >= PLANT_TIME) plantBomb(site);
  } else if (p.planting) {
    p.planting = false;
    p.plantT = 0;
  }

  if (p.reloading) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) {
      const g = held();
      const take = Math.min(WEAPONS[g.id].mag - g.ammo, g.reserve);
      g.ammo += take;
      g.reserve -= take;
      p.reloading = false;
    }
  }

  const canMove = game.phase !== 'freeze' && !p.planting;
  const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const s = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  p.crouching = keys.has('KeyC');
  const walking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = (p.crouching ? 2.3 : walking ? 2.7 : vm.adsAmount > 0.5 ? 3.9 : 5.6) * heldDef().speed;
  p.drawT = Math.max(0, p.drawT - dt);

  // Walking over a gun picks it up if that slot is empty; otherwise F swaps (see the key handler).
  p.nearPickup = p.planting ? null : pickups.nearest(p.pos);
  if (p.nearPickup && !p.slots[WEAPONS[p.nearPickup.id].slot]) pickUp(p.nearPickup);
  let wx = 0, wz = 0;
  if (canMove && (f || s)) {
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    wx = -sy * f + cy * s;
    wz = -cy * f - sy * s;
    const l = Math.hypot(wx, wz);
    wx = (wx / l) * speed;
    wz = (wz / l) * speed;
  }
  const k = 1 - Math.exp(-(p.onGround ? 12 : 2) * dt);
  p.vel.x += (wx - p.vel.x) * k;
  p.vel.z += (wz - p.vel.z) * k;
  if (canMove && keys.has('Space') && p.onGround && !p.crouching) {
    p.vel.y = 6;
    p.onGround = false;
  }
  p.vel.y -= 18 * dt;
  const prevY = p.pos.y;
  p.pos.x += p.vel.x * dt;
  p.pos.z += p.vel.z * dt;
  W.collide(p.pos, 0.38, p.crouching ? 1.35 : 1.85);
  p.pos.y += p.vel.y * dt;
  const gnd = W.groundHeight(p.pos.x, p.pos.z, 0.3, prevY);
  if (p.pos.y <= gnd) {
    if (!p.onGround && p.vel.y < -5) audio.land();
    p.pos.y = gnd;
    p.vel.y = 0;
    p.onGround = true;
  } else p.onGround = false;

  p.eyeH += ((p.crouching ? CROUCH_EYE : EYE) - p.eyeH) * Math.min(1, dt * 12);
  p.bloom = Math.max(0, p.bloom - dt * 0.1);
  const decay = Math.exp(-dt * 9);
  p.punchP *= decay;
  p.punchY *= decay;

  const hs = p.horizSpeed();
  if (p.onGround && hs > 3.2) {
    p.stepT -= dt;
    if (p.stepT <= 0) {
      p.stepT = 0.38;
      audio.step(0.2);
      makeNoise(p.pos, 14);
    }
  } else p.stepT = Math.min(p.stepT, 0.1);

  // Standing still for 5 seconds during a live round plays the "move" clip (not while planting).
  if (game.phase === 'live' && !p.planting && hs < 0.3 && p.onGround) {
    p.idleT += dt;
    if (p.idleT >= IDLE_TIME) p.idleT = -audio.moveClip();
  } else p.idleT = Math.min(p.idleT, 0);

  game.shake = Math.max(0, game.shake - dt * 1.2);
  const sh = game.shake * game.shake * 0.03;
  camera.position.set(p.pos.x, p.pos.y + p.eyeH, p.pos.z);
  camera.rotation.set(
    clamp(p.pitch + p.punchP, -1.55, 1.55) + (Math.random() - 0.5) * sh,
    p.yaw + p.punchY + (Math.random() - 0.5) * sh,
    0,
  );
}

function updateBomb(dt) {
  const b = game.bomb;
  b.ledT -= dt;
  bombLedMat.emissiveIntensity = b.ledT > 0 ? 6 : 0.2;
  if (!b.planted || game.phase !== 'live') return;
  b.timer -= dt;
  b.beepT -= dt;
  if (b.beepT <= 0) {
    const frac = Math.max(0, b.timer / BOMB_TIME);
    b.beepT = 0.1 + 0.9 * Math.pow(frac, 1.4);
    b.ledT = 0.08;
    positionalSound('beep', b.pos);
  }
  if (b.defuser && b.defuser.alive) {
    b.defuseSoundT -= dt;
    if (b.defuseSoundT <= 0) {
      b.defuseSoundT = 0.7;
      positionalSound('defuse', b.pos);
    }
  }
  if (b.timer <= 0) explode();
}

function update(dt) {
  game.time += dt;
  if (game.phase === 'freeze') {
    game.phaseT -= dt;
    if (game.phaseT <= 0) game.phase = 'live';
  } else if (game.phase === 'live') {
    if (!game.bomb.planted) {
      game.roundTime -= dt;
      if (game.roundTime < 15 && !game.lowTimeSaid) {
        game.lowTimeSaid = true;
        voice.say('lowTime');
      }
      if (game.roundTime <= 0) {
        game.roundTime = 0;
        endRound('CT', 'Time ran out before the bomb was planted');
      }
    }
  } else if (game.phase === 'over') {
    game.phaseT -= dt;
    if (game.phaseT <= 0) {
      if (game.scoreT >= ROUNDS_TO_WIN || game.scoreCT >= ROUNDS_TO_WIN) matchOver();
      else startRound();
      return;
    }
  }
  if (shopOpen && buyTimeLeft() <= 0) closeShop();
  if (fireHeld && locked && heldDef().auto) tryShoot();
  updatePlayer(dt);
  for (const b of game.bots) b.update(dt);
  updateBomb(dt);
  fx.update(dt);
  pickups.update(dt);
  vm.update(dt, {
    ads: adsHeld && !player.reloading && !player.planting && player.alive,
    speed: player.horizSpeed(), onGround: player.onGround, lookDX, lookDY,
    lower: player.planting,
  });
  lookDX = lookDY = 0;
  camera.fov = lerp(BASE_FOV, heldDef().adsFov, vm.adsAmount);
  camera.updateProjectionMatrix();
  updateHud(dt);
}

// ---------- Main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing') update(dt);
  else if (game.state === 'menu' || game.state === 'matchover') {
    const t = now / 1000 * 0.04;
    camera.fov = BASE_FOV;
    camera.updateProjectionMatrix();
    camera.position.set(60 + Math.cos(t) * 58, 34, 60 + Math.sin(t) * 58);
    camera.lookAt(60, 0, 60);
    fx.update(dt);
  }
  world.update(dt, now / 1000, camera.position);
  renderer.clear();
  renderer.render(scene, camera);
  const scoped = !!heldDef().scope && vm.adsAmount > 0.85;
  if ((game.state === 'playing' || game.state === 'paused') && player.alive && !scoped) {
    renderer.clearDepth();
    renderer.render(vm.scene, vm.camera);
  }
}
setState('menu');
$('loading').classList.add('done');
$('build').textContent = `BUILD ${new URL(import.meta.url).searchParams.get('v') || 'dev'}`;
if (new URLSearchParams(location.search).has('debug')) {
  window.__jsi = { game, player, camera, vm, W, tryShoot, pickups, sim(secs) { for (let i = 0; i < secs * 30; i++) if (game.state === 'playing') update(1 / 30); } };
}
requestAnimationFrame(frame);

// Maps are grids of cells; walls are solid columns, props are axis-aligned boxes.
// Each map in MAPS carves its layout, places props, and names its zones and defender spots.
import * as THREE from 'three';
import * as TX from './textures.js?v=7';

export const CELL = 4, GW = 30, GH = 30;
export const WALL = 0, FLOOR = 1, SITE_A = 2, SITE_B = 3, T_SPAWN = 4, CT_SPAWN = 5;

export const grid = new Uint8Array(GW * GH);
export const wallH = new Float32Array(GW * GH);
export const blocked = new Uint8Array(GW * GH);
export const props = [];

const idx = (x, z) => z * GW + x;
const inB = (x, z) => x >= 0 && z >= 0 && x < GW && z < GH;
export const C = (g) => (g + 0.5) * CELL;

function carve(x0, z0, x1, z1, t) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[idx(x, z)] = t;
}

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function addProp(cx, cz, sx, sy, sz, kind, y0 = 0, block = true) {
  const p = { min: [cx - sx / 2, y0, cz - sz / 2], max: [cx + sx / 2, y0 + sy, cz + sz / 2], kind };
  props.push(p);
  if (block) {
    const e = 0.3;
    for (let z = Math.floor((p.min[2] - e) / CELL); z <= Math.floor((p.max[2] + e - 1e-6) / CELL); z++) {
      for (let x = Math.floor((p.min[0] - e) / CELL); x <= Math.floor((p.max[0] + e - 1e-6) / CELL); x++) {
        if (inB(x, z)) blocked[idx(x, z)] = 1;
      }
    }
  }
  return p;
}
const crate = (gx, gz, s = 2.3, stack = false) => {
  addProp(C(gx), C(gz), s, s, s, 'crate');
  if (stack) addProp(C(gx) + 0.2, C(gz) - 0.15, s * 0.65, s * 0.65, s * 0.65, 'crate', s, false);
};
const lowCrate = (gx, gz) => addProp(C(gx), C(gz), 1.3, 0.9, 1.3, 'crate');
const log = (gx, gz) => addProp(C(gx), C(gz), 3.2, 0.9, 0.9, 'log');
const rock = (gx, gz, s) => addProp(C(gx), C(gz), s, s * 0.75, s, 'rock');

// Decals are { text, color, w, h, at: [x, y, z], rotY, ground, font, size }.
// wallSign puts one on a face ('n' | 's' | 'e' | 'w') of wall cell (cx, cz).
const FACE = { s: [0, 1, 0], n: [0, -1, Math.PI], e: [1, 0, Math.PI / 2], w: [-1, 0, -Math.PI / 2] };
function wallSign(text, color, cx, cz, face, y, w, h, extra = {}) {
  const [dx, dz, rotY] = FACE[face];
  return { text, color, w, h, at: [C(cx) + dx * (CELL / 2 + 0.02), y, C(cz) + dz * (CELL / 2 + 0.02)], rotY, ...extra };
}

export const MAPS = {
  // de_timberline: a Dust 2–style layout carved into a forest.
  timberline: {
    id: 'timberline', title: 'de_timberline', theme: 'forest',
    blurb: 'a classic layout lost in the woods',
    layout() {
      // North (low z) is the defender side, south is the attacker side.
      carve(1, 1, 8, 8, SITE_B);
      carve(11, 1, 18, 5, CT_SPAWN);
      carve(21, 1, 28, 8, SITE_A);
      carve(9, 3, 10, 5, FLOOR);     // B doors
      carve(19, 3, 20, 5, FLOOR);    // CT ramp to A
      carve(14, 6, 14, 7, FLOOR);    // mid doors
      carve(13, 8, 15, 23, FLOOR);   // mid
      carve(16, 11, 22, 12, FLOOR);  // catwalk
      carve(21, 9, 22, 10, FLOOR);   // short A
      carve(25, 9, 28, 20, FLOOR);   // long A
      carve(25, 21, 26, 23, FLOOR);  // long doors
      carve(20, 24, 27, 26, FLOOR);  // outside long
      carve(10, 24, 19, 28, T_SPAWN);
      carve(2, 9, 4, 26, FLOOR);     // upper tunnels
      carve(5, 24, 9, 26, FLOOR);    // T spawn to tunnels
      carve(5, 16, 12, 17, FLOOR);   // lower tunnels to mid
    },
    wallHeight: (x, z, edge) => (edge ? 7.5 : 4.6 + hash(Math.floor(x / 3), Math.floor(z / 3)) * 2.0),
    props() {
      // Bombsite A
      crate(23, 3, 2.4, true); crate(24, 3, 2.4); crate(22, 6, 2.2); lowCrate(26, 6);
      // Bombsite B
      crate(3, 3, 2.4, true); crate(7, 2, 2.4); crate(6, 6, 2.2); lowCrate(2, 7);
      // Lanes
      crate(27, 13, 2.2); log(25, 17); lowCrate(14, 10); crate(12, 26, 2.2); lowCrate(17, 27);
      crate(13, 2, 2.2); lowCrate(17, 4); crate(22, 25, 2.2); rock(8, 17, 1.3); lowCrate(2, 14);
      rock(20, 12, 1.4);
      // Door frames, open doors and the tunnel roof (overhead, so they don't block paths).
      addProp(104, 90, 8, 1.6, 0.5, 'beam', 3.4, false);       // long doors lintel
      addProp(100.1, 91.6, 0.15, 3.2, 2.6, 'door', 0, false);  // long door left, swung open
      addProp(107.9, 91.6, 0.15, 3.2, 2.6, 'door', 0, false);  // long door right
      addProp(58, 28, 4, 1.4, 0.5, 'beam', 3.4, false);        // mid doors lintel
      addProp(40, 18, 0.5, 1.4, 12, 'beam', 3.4, false);       // B doors lintel
      addProp(14, 90, 12, 0.35, 36, 'roof', 3.9, false);        // upper tunnels roof
      addProp(30, 102, 20, 0.35, 12, 'roof', 3.9, false);
    },
    zones: [
      ['Mid Doors', 14, 6, 14, 7], ['Long Doors', 25, 21, 26, 23], ['B Doors', 9, 3, 10, 5], ['CT Ramp', 19, 3, 20, 5],
      ['Bombsite A', 21, 1, 28, 8], ['Bombsite B', 1, 1, 8, 8], ['CT Spawn', 11, 1, 18, 5], ['T Spawn', 10, 24, 19, 28],
      ['Long A', 25, 9, 28, 20], ['Outside Long', 20, 24, 27, 26], ['Short A', 16, 9, 22, 12],
      ['Lower Tunnels', 5, 16, 12, 17], ['Mid', 13, 8, 15, 23], ['Upper Tunnels', 2, 9, 9, 26],
    ],
    // Where defenders hold, and the cell each spot watches.
    spots: [
      { name: 'Bombsite A', cell: [24, 6], look: [27, 14] },
      { name: 'Bombsite B', cell: [6, 3], look: [3, 14] },
      { name: 'CT Spawn', cell: [14, 4], look: [14, 16] },
      { name: 'Bombsite A', cell: [22, 3], look: [21, 11] },
      { name: 'Bombsite B', cell: [8, 7], look: [3, 11] },
      { name: 'Bombsite A', cell: [27, 2], look: [26, 12] },
      { name: 'Bombsite B', cell: [2, 2], look: [3, 12] },
      { name: 'CT Ramp', cell: [19, 4], look: [26, 6] },
    ],
    playerSpawn: [10, 26, 19, 28],
    radarLabels: { A: [24.5, 4.5], B: [4.5, 4.5] },
    lamps: [[9.5, 84], [17.5, 101]],
    decals: [
      { text: 'A', color: '#ff7a18', w: 3.2, h: 3.2, at: [106, 2.6, 4.02], rotY: 0, square: true },
      { text: 'B', color: '#ff7a18', w: 3.2, h: 3.2, at: [22, 2.6, 4.02], rotY: 0, square: true },
      { text: 'A', color: '#ffffff', w: 3.4, h: 3.4, at: [106, 0.03, 18], rotY: 0, ground: true, square: true },
      { text: 'B', color: '#ffffff', w: 3.4, h: 3.4, at: [22, 0.03, 18], rotY: 0, ground: true, square: true },
      { text: '← B', color: '#f2efe4', w: 4, h: 2, at: [45, 2.2, 96.02], rotY: 0 },
      { text: 'A →', color: '#f2efe4', w: 4, h: 2, at: [70, 2.2, 96.02], rotY: 0 },
      { text: 'A ↑', color: '#f2efe4', w: 3, h: 1.5, at: [91.98, 2.2, 46], rotY: -Math.PI / 2 },
      { text: 'B ↑', color: '#f2efe4', w: 3, h: 1.5, at: [8.02, 2.2, 62], rotY: Math.PI / 2 },
      { text: 'JUST SHOOT IT', color: '#ff7a18', w: 9, h: 2.25, at: [60, 3, 115.98], rotY: Math.PI, wide: true },
      { text: 'JUST SHOOT IT', color: '#ff7a18', w: 7, h: 1.75, at: [60, 3, 4.02], rotY: 0, wide: true },
    ],
  },

  // de_jaffa: Mirage's layout in the old city of Jaffa. T spawn is east, CT spawn south-west by the sea,
  // A is south (reached by A Ramp, Palace, Jungle and CT), B is north-west (Apartments, Short, Market).
  jaffa: {
    id: 'jaffa', title: 'de_jaffa', theme: 'jaffa',
    blurb: 'a Mirage-style layout in the old port city',
    layout() {
      carve(24, 10, 28, 18, T_SPAWN);
      carve(18, 12, 23, 14, FLOOR);  // top mid
      carve(10, 11, 17, 14, FLOOR);  // mid
      carve(7, 12, 9, 14, FLOOR);    // window room
      carve(4, 13, 6, 13, FLOOR);    // window to CT alley
      carve(10, 15, 11, 18, FLOOR);  // connector
      carve(9, 19, 13, 20, FLOOR);   // jungle
      carve(10, 7, 12, 10, FLOOR);   // short, up from mid
      carve(6, 7, 11, 7, FLOOR);     // short, into B
      carve(15, 5, 16, 10, FLOOR);   // underpass
      carve(24, 5, 26, 9, FLOOR);    // apartments stairs from T spawn
      carve(13, 3, 25, 4, FLOOR);    // apartments
      carve(10, 2, 12, 4, FLOOR);    // apartments exit onto B
      carve(2, 1, 9, 6, SITE_B);
      carve(1, 7, 3, 21, FLOOR);     // market and CT alley
      carve(1, 22, 6, 27, CT_SPAWN);
      carve(7, 23, 8, 25, FLOOR);    // CT to A, past the ticket booth
      carve(24, 19, 27, 23, FLOOR);  // T ramp
      carve(18, 22, 24, 24, FLOOR);  // A ramp
      carve(25, 24, 26, 25, FLOOR);  // T ramp down into palace
      carve(18, 26, 27, 27, FLOOR);  // palace
      carve(9, 21, 17, 27, SITE_A);
    },
    wallHeight: (x, z, edge) => (edge ? 9 : 5.6 + hash(Math.floor(x / 2) + 3, Math.floor(z / 2) + 9) * 3.4),
    props() {
      // Bombsite A: triple boxes, firebox, sandwich, ninja, ticket booth, tetris
      crate(13, 24, 2.4, true); crate(14, 24, 2.2); lowCrate(13, 25);
      crate(16, 23, 2.3);
      lowCrate(11, 22);
      lowCrate(16, 27);
      addProp(C(9) - 0.4, C(26), 2.6, 2.8, 2.6, 'booth');
      lowCrate(19, 22); crate(19, 24, 2.2);
      // Bombsite B: van, bench, boxes
      addProp(C(6.5), C(2), 6.2, 2.4, 2.6, 'van');
      addProp(C(3), C(5), 2.4, 0.6, 0.9, 'stone');
      crate(8, 1, 2.3); lowCrate(9, 6);
      // Mid and the lanes
      crate(12, 12, 2.2); lowCrate(20, 13); lowCrate(16, 14);
      lowCrate(1, 9); lowCrate(3, 11);           // market stalls
      crate(27, 11, 2.3); crate(28, 16, 2.4, true); lowCrate(25, 17);
      crate(27, 20, 2.2); crate(2, 26, 2.3); lowCrate(5, 23);
      // Roofs over the indoor routes, arches over doorways, awnings over the market streets
      addProp(72, 16, 64, 0.4, 8, 'roof', 3.9, false);     // apartments
      addProp(64, 32, 8, 0.4, 24, 'roof', 3.9, false);     // underpass
      addProp(34, 54, 12, 0.4, 12, 'roof', 3.9, false);    // window room
      addProp(92, 108, 40, 0.4, 8, 'roof', 3.9, false);    // palace
      addProp(44, 60, 8, 1.2, 0.6, 'beam', 3.2, false);    // connector arch
      addProp(40, 14, 0.6, 1.2, 12, 'beam', 3.2, false);   // apartments exit arch
      addProp(72, 108, 0.6, 1.2, 8, 'beam', 3.2, false);   // palace exit arch
      addProp(36, 98, 0.6, 1.2, 12, 'beam', 3.2, false);   // CT arch
      addProp(10, 38, 11, 0.12, 8, 'awning', 3.3, false);  // market
      addProp(10, 70, 11, 0.12, 6, 'awning2', 3.3, false);
      addProp(52, 45.5, 8, 0.12, 3, 'awning', 3.4, false); // mid
      addProp(62, 58.5, 6, 0.12, 3, 'awning2', 3.4, false);
      addProp(84, 49.5, 5, 0.12, 3, 'awning', 3.4, false); // top mid
      addProp(114.5, 50, 3, 0.12, 6, 'awning2', 3.4, false);
      addProp(C(4), 4.08, 2.4, 3.2, 0.15, 'door', 0, false); // blue doors
      addProp(4.08, C(24), 0.15, 3.2, 2.4, 'door', 0, false);
    },
    zones: [
      ['Apartments', 10, 2, 25, 4], ['Apartments Stairs', 24, 5, 26, 9], ['Underpass', 15, 5, 16, 10],
      ['Short', 6, 7, 12, 10], ['Window', 4, 12, 9, 14], ['Market', 1, 7, 3, 13], ['CT Alley', 1, 14, 3, 21],
      ['CT Spawn', 1, 22, 6, 27], ['Ticket Booth', 7, 23, 8, 25], ['Connector', 10, 15, 11, 18], ['Jungle', 9, 19, 13, 20],
      ['Bombsite A', 9, 21, 17, 27], ['Bombsite B', 2, 1, 9, 6], ['A Ramp', 18, 22, 24, 24], ['Palace', 18, 24, 27, 27],
      ['T Ramp', 24, 19, 27, 23], ['Top Mid', 18, 12, 23, 14], ['Mid', 10, 11, 17, 14], ['T Spawn', 24, 10, 28, 18],
    ],
    spots: [
      { name: 'Bombsite A', cell: [16, 22], look: [22, 23] },
      { name: 'Bombsite B', cell: [4, 3], look: [11, 3] },
      { name: 'Window', cell: [8, 13], look: [20, 13] },
      { name: 'Bombsite A', cell: [15, 26], look: [22, 27] },
      { name: 'Bombsite B', cell: [7, 5], look: [11, 9] },
      { name: 'Jungle', cell: [11, 20], look: [11, 14] },
      { name: 'Bombsite A', cell: [10, 24], look: [17, 23] },
      { name: 'Bombsite B', cell: [3, 2], look: [10, 7] },
    ],
    playerSpawn: [25, 11, 28, 17],
    radarLabels: { A: [13, 24], B: [5.5, 3.5] },
    lamps: [[48, 16], [76, 16], [96, 16], [64, 32], [84, 108], [102, 108], [34, 54]],
    decals: [
      wallSign('A', '#ff7a18', 13, 28, 'n', 2.6, 3.2, 3.2, { square: true }),
      wallSign('B', '#ff7a18', 5, 0, 's', 2.6, 3.2, 3.2, { square: true }),
      { text: 'A', color: '#ffffff', w: 3.4, h: 3.4, at: [C(12), 0.03, C(22)], rotY: 0, ground: true, square: true },
      { text: 'B', color: '#ffffff', w: 3.4, h: 3.4, at: [C(5), 0.03, C(3)], rotY: 0, ground: true, square: true },
      wallSign('A ↓', '#f2efe4', 28, 19, 'n', 2.2, 3, 1.5),
      wallSign('B ↑', '#f2efe4', 27, 9, 's', 2.2, 3, 1.5),
      wallSign('← MID', '#f2efe4', 23, 11, 'e', 2.2, 3.6, 1.8),
      wallSign('A RAMP', '#f2efe4', 23, 21, 'e', 2.2, 3.6, 1.8),
      wallSign('B ←', '#f2efe4', 15, 2, 's', 2.2, 3, 1.5),
      wallSign('A ↓', '#f2efe4', 12, 16, 'w', 2.2, 3, 1.5),
      wallSign('יפו העתיקה', '#2f6a9e', 29, 14, 'w', 3.4, 7, 1.75, { wide: true }),
      wallSign('JAFFA', '#ff7a18', 3, 28, 'n', 3, 7, 1.75, { wide: true }),
      wallSign('JUST SHOOT IT', '#ff7a18', 20, 11, 's', 3.4, 7, 1.75, { wide: true }),
    ],
  },
};

let current = MAPS.timberline;
let ZONES = [];
export let SPOTS = [];
export const currentMap = () => current;

// Resets the grid and props, then builds the chosen map. Call buildWorld afterwards for the visuals.
export function loadMap(id) {
  current = MAPS[id] || MAPS.timberline;
  grid.fill(WALL);
  wallH.fill(0);
  blocked.fill(0);
  props.length = 0;
  current.layout();
  for (let z = 0; z < GH; z++) {
    for (let x = 0; x < GW; x++) {
      if (grid[idx(x, z)] !== WALL) continue;
      const edge = x === 0 || z === 0 || x === GW - 1 || z === GH - 1;
      wallH[idx(x, z)] = current.wallHeight(x, z, edge);
    }
  }
  current.props();
  ZONES = current.zones;
  SPOTS = current.spots;
  return current;
}
loadMap('timberline');

export function cellOf(x, z) { return [Math.floor(x / CELL), Math.floor(z / CELL)]; }
export function cellType(x, z) {
  const [cx, cz] = cellOf(x, z);
  return inB(cx, cz) ? grid[idx(cx, cz)] : WALL;
}
export function isWalkable(cx, cz) { return inB(cx, cz) && grid[idx(cx, cz)] !== WALL && !blocked[idx(cx, cz)]; }

export function locationName(x, z) {
  const [cx, cz] = cellOf(x, z);
  for (const [name, x0, z0, x1, z1] of ZONES) if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) return name;
  return '';
}

export function cellsOfType(type) {
  const out = [];
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) if (grid[idx(x, z)] === type && !blocked[idx(x, z)]) out.push([x, z]);
  return out;
}

function solidHeight(cx, cz) {
  if (!inB(cx, cz)) return 60;
  return grid[idx(cx, cz)] === WALL ? wallH[idx(cx, cz)] : 0;
}

// ---------- Ray casting ----------
export function rayAABB(O, D, mn, mx, maxT) {
  let t0 = 0, t1 = maxT, axis = -1, sign = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(D[i]) < 1e-9) {
      if (O[i] < mn[i] || O[i] > mx[i]) return null;
      continue;
    }
    const inv = 1 / D[i];
    let ta = (mn[i] - O[i]) * inv, tb = (mx[i] - O[i]) * inv, s = -1;
    if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; s = 1; }
    if (ta > t0) { t0 = ta; axis = i; sign = s; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  return { t: t0, axis, sign };
}

// Returns the distance to the first solid surface along a normalized ray, its normal and what was hit.
export function raycastWorld(o, d, maxDist = 250) {
  let best = maxDist, n = [0, 1, 0], what = 'none';
  if (d.y < -1e-6) {
    const t = -o.y / d.y;
    if (t >= 0 && t < best) { best = t; n = [0, 1, 0]; what = 'ground'; }
  }
  let cx = Math.floor(o.x / CELL), cz = Math.floor(o.z / CELL);
  const sx = d.x > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const tdx = d.x !== 0 ? Math.abs(CELL / d.x) : Infinity;
  const tdz = d.z !== 0 ? Math.abs(CELL / d.z) : Infinity;
  let tmx = d.x !== 0 ? ((cx + (sx > 0 ? 1 : 0)) * CELL - o.x) / d.x : Infinity;
  let tmz = d.z !== 0 ? ((cz + (sz > 0 ? 1 : 0)) * CELL - o.z) / d.z : Infinity;
  let tEnter = 0, side = -1;
  for (let i = 0; i < 128 && tEnter < best; i++) {
    const h = solidHeight(cx, cz);
    const tExit = Math.min(tmx, tmz);
    if (h > 0) {
      const yIn = o.y + d.y * tEnter;
      if (yIn <= h) {
        best = tEnter;
        n = side === 0 ? [-sx, 0, 0] : side === 1 ? [0, 0, -sz] : [0, 1, 0];
        what = 'wall';
        break;
      }
      if (d.y < 0) {
        const tTop = (h - o.y) / d.y;
        if (tTop <= tExit && tTop < best) { best = tTop; n = [0, 1, 0]; what = 'wall'; break; }
      }
    }
    if (tmx < tmz) { tEnter = tmx; tmx += tdx; cx += sx; side = 0; }
    else { tEnter = tmz; tmz += tdz; cz += sz; side = 1; }
  }
  const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
  for (const p of props) {
    const h = rayAABB(O, D, p.min, p.max, best);
    if (h && h.t < best) {
      best = h.t;
      n = [0, 0, 0];
      if (h.axis >= 0) n[h.axis] = h.sign;
      else n = [0, 1, 0];
      what = p.kind;
    }
  }
  return { t: best, n, what };
}

export function hasLineOfSight(a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  d.divideScalar(len);
  return raycastWorld(a, d, len).t >= len - 0.05;
}

// ---------- Movement collision ----------
const STEP = 0.45;
const nearby = [];
function gatherBoxes(x, z, r) {
  nearby.length = 0;
  for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      const h = solidHeight(cx, cz);
      if (h > 0) nearby.push({ min: [cx * CELL, 0, cz * CELL], max: [(cx + 1) * CELL, h, (cz + 1) * CELL] });
    }
  }
  for (const p of props) {
    if (p.max[0] > x - r && p.min[0] < x + r && p.max[2] > z - r && p.min[2] < z + r) nearby.push(p);
  }
  return nearby;
}

// Pushes a vertical cylinder (feet at pos.y) out of anything it overlaps horizontally.
export function collide(pos, r, height) {
  for (let iter = 0; iter < 2; iter++) {
    for (const b of gatherBoxes(pos.x, pos.z, r + 0.1)) {
      if (b.max[1] <= pos.y + STEP || b.min[1] >= pos.y + height) continue;
      const nx = Math.max(b.min[0], Math.min(pos.x, b.max[0]));
      const nz = Math.max(b.min[2], Math.min(pos.z, b.max[2]));
      const dx = pos.x - nx, dz = pos.z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r;
        pos.z = nz + (dz / d) * r;
      } else {
        const l = pos.x - b.min[0], rr = b.max[0] - pos.x, f = pos.z - b.min[2], bk = b.max[2] - pos.z;
        const m = Math.min(l, rr, f, bk);
        if (m === l) pos.x = b.min[0] - r;
        else if (m === rr) pos.x = b.max[0] + r;
        else if (m === f) pos.z = b.min[2] - r;
        else pos.z = b.max[2] + r;
      }
    }
  }
}

// Highest surface under the cylinder that can be stood on from feet height `feetY`.
export function groundHeight(x, z, r, feetY) {
  let g = 0;
  for (const p of props) {
    if (p.max[0] > x - r && p.min[0] < x + r && p.max[2] > z - r && p.min[2] < z + r) {
      if (p.max[1] <= feetY + STEP && p.max[1] > g) g = p.max[1];
    }
  }
  return g;
}

// ---------- Path finding (A* on the cell grid) ----------
function nearestWalkable(cx, cz) {
  if (isWalkable(cx, cz)) return [cx, cz];
  for (let r = 1; r < 6; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (isWalkable(cx + dx, cz + dz)) return [cx + dx, cz + dz];
    }
  }
  return [cx, cz];
}

function segmentClear(ax, az, bx, bz, r = 0.5) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  if (len < 1e-3) return true;
  const px = -dz / len * r, pz = dx / len * r;
  const steps = Math.ceil(len / 0.4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = ax + dx * t, z = az + dz * t;
    for (const s of [-1, 0, 1]) {
      const [cx, cz] = cellOf(x + px * s, z + pz * s);
      if (!isWalkable(cx, cz)) return false;
    }
  }
  return true;
}

export function findPath(from, to) {
  const [sx, sz] = nearestWalkable(...cellOf(from.x, from.z));
  const [gx, gz] = nearestWalkable(...cellOf(to.x, to.z));
  const N = GW * GH, start = idx(sx, sz), goal = idx(gx, gz);
  const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [start];
  const hDist = (i) => Math.hypot((i % GW) - gx, Math.floor(i / GW) - gz);
  const fs = new Float32Array(N).fill(Infinity);
  gs[start] = 0;
  fs[start] = hDist(start);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (fs[open[i]] < fs[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GW, cz = Math.floor(cur / GW);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (!isWalkable(nx, nz)) continue;
        if (dx && dz && (!isWalkable(cx + dx, cz) || !isWalkable(cx, cz + dz))) continue;
        const ni = idx(nx, nz), ng = gs[cur] + (dx && dz ? 1.414 : 1);
        if (ng < gs[ni]) {
          gs[ni] = ng;
          fs[ni] = ng + hDist(ni);
          came[ni] = cur;
          open.push(ni);
        }
      }
    }
  }
  if (start !== goal && came[goal] === -1) return null;
  const cells = [];
  for (let c = goal; c !== -1 && c !== start; c = came[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map((c) => ({ x: C(c % GW), z: C(Math.floor(c / GW)) }));
  const [tcx, tcz] = cellOf(to.x, to.z);
  if (tcx === gx && tcz === gz) {
    if (pts.length) pts[pts.length - 1] = { x: to.x, z: to.z };
    else pts.push({ x: to.x, z: to.z });
  }
  // String-pull: skip waypoints that can be reached in a straight line.
  const out = [];
  let ax = from.x, az = from.z, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !segmentClear(ax, az, pts[j].x, pts[j].z)) j--;
    out.push(pts[j]);
    ax = pts[j].x;
    az = pts[j].z;
    i = j + 1;
  }
  return out;
}

// ---------- Visuals ----------
const M = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, ...o });
const isWallCell = (x, z) => !inB(x, z) || grid[idx(x, z)] === WALL;

// Per-theme look: sky, light, ground, floors, walls, prop materials, and scenery outside the playable area.
const THEMES = {
  forest: {
    sky: [[0.36, 0.58, 0.82], [0.78, 0.85, 0.8]], fog: [0xb4c8b6, 45, 210],
    hemi: [0xd6e6ff, 0x3b4a2a, 0.9], sun: [0xfff0d4, 2.6], motes: 0xffefb0,
    materials() {
      const top = M(TX.wallTop()), stone = M(TX.stoneWall()), logs = M(TX.logWall());
      return {
        ground: M(TX.grass()), floor: M(TX.dirt()), site: M(TX.flagstone()),
        walls: [[stone, stone, top, top, stone, stone], [logs, logs, top, top, logs, logs]],
        wallPick: (x, z) => (hash(Math.floor(x / 4) + 7, Math.floor(z / 4) + 3) < 0.33 ? 1 : 0),
        props: { crate: M(TX.crate()), door: M(TX.planks()), beam: logs, roof: logs, bark: M(TX.bark()) },
      };
    },
    scenery: forestScenery,
  },
  jaffa: {
    sky: [[0.3, 0.55, 0.88], [0.96, 0.88, 0.74]], fog: [0xe9dcc0, 60, 260],
    hemi: [0xfff3dc, 0x8a6a40, 1.0], sun: [0xffe8c4, 3.1], motes: 0xfff2d0,
    materials() {
      const top = M(TX.roofTop()), lime = M(TX.limestone()), house = M(TX.jaffaHouse());
      return {
        ground: M(TX.sand()), floor: M(TX.cobbles()), site: M(TX.pavers()),
        walls: [[lime, lime, top, top, lime, lime], [house, house, top, top, house, house]],
        wallPick: (x, z) => (hash(Math.floor(x / 2) + 11, Math.floor(z / 2) + 5) < 0.45 ? 1 : 0),
        props: {
          crate: M(TX.crate()), door: M(TX.blueWood()), beam: lime, roof: lime, booth: lime, stone: lime,
          awning: M(TX.awning('#c8452c', '#efe3c8'), { side: THREE.DoubleSide }),
          awning2: M(TX.awning('#2f6a9e', '#efe3c8'), { side: THREE.DoubleSide }),
        },
      };
    },
    scenery: jaffaScenery,
  },
};

export function buildWorld(scene) {
  const map = current, theme = THEMES[map.theme];
  const root = new THREE.Group();
  scene.add(root);
  const r = TX.rng(42);
  const mats = theme.materials();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  // Sky, fog, light
  const sunDir = new THREE.Vector3(0.55, 0.78, 0.3).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Vector3(...theme.sky[0]) },
        bottom: { value: new THREE.Vector3(...theme.sky[1]) },
        sunDir: { value: sunDir },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, bottom, sunDir; varying vec3 vP;
        void main(){ float h = clamp(vP.y * 1.3, 0.0, 1.0); vec3 c = mix(bottom, top, pow(h, 0.65));
        float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0, 0.92, 0.75) * (pow(s, 700.0) * 2.5 + pow(s, 10.0) * 0.22);
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  sky.renderOrder = -1;
  root.add(sky);
  scene.fog = new THREE.Fog(...theme.fog);
  root.add(new THREE.HemisphereLight(...theme.hemi));
  const sun = new THREE.DirectionalLight(...theme.sun);
  const center = new THREE.Vector3(60, 0, 60);
  sun.position.copy(center).addScaledVector(sunDir, 140);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 320 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  root.add(sun, sun.target);

  // Ground outside the playable area
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(60, -0.02, 60);
  ground.receiveShadow = true;
  root.add(ground);

  // Floors
  const floorCells = [], siteCells = [];
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    const t = grid[idx(x, z)];
    if (t === SITE_A || t === SITE_B) siteCells.push([x, z]);
    else if (t !== WALL) floorCells.push([x, z]);
  }
  const fgeo = new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  for (const [cells, mat] of [[floorCells, mats.floor], [siteCells, mats.site]]) {
    const mesh = new THREE.InstancedMesh(fgeo, mat, cells.length);
    cells.forEach(([x, z], i) => {
      dummy.position.set(C(x), 0, C(z));
      dummy.rotation.set(0, ((r() * 4) | 0) * Math.PI / 2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, col.setScalar(0.86 + r() * 0.14));
    });
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // Walls
  const wgeo = new THREE.BoxGeometry(CELL, 1, CELL).translate(0, 0.5, 0);
  const wallSets = mats.walls.map(() => []);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (grid[idx(x, z)] === WALL) wallSets[mats.wallPick(x, z)].push([x, z]);
  }
  wallSets.forEach((cells, k) => {
    const mesh = new THREE.InstancedMesh(wgeo, mats.walls[k], cells.length);
    cells.forEach(([x, z], i) => {
      dummy.position.set(C(x), 0, C(z));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, wallH[idx(x, z)], 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  });
  dummy.scale.set(1, 1, 1);

  const scenery = theme.scenery(root, { r, dummy, col, mats });

  // Props
  const pm = mats.props;
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xb48c5c, roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7c8070, roughness: 1, flatShading: true });
  for (const p of props) {
    const sx = p.max[0] - p.min[0], sy = p.max[1] - p.min[1], sz = p.max[2] - p.min[2];
    let mesh;
    if (p.kind === 'log') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(sy / 2, sy / 2, sx, 12).rotateZ(Math.PI / 2), [pm.bark, ringMat, ringMat]);
    } else if (p.kind === 'rock') {
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
      mesh.scale.set(sx * 1.05, sy * 1.25, sz * 1.05);
    } else if (p.kind === 'van') {
      mesh = buildVan(sx, sy, sz);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), pm[p.kind] || pm.crate);
    }
    mesh.position.set((p.min[0] + p.max[0]) / 2, (p.min[1] + p.max[1]) / 2, (p.min[2] + p.max[2]) / 2);
    if (p.kind === 'rock') mesh.position.y = p.min[1] + sy * 0.45;
    if (p.kind === 'van') mesh.position.y = p.min[1];
    mesh.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    root.add(mesh);
  }

  // Lamps in tunnels and indoor routes
  for (const [x, z] of map.lamps) {
    const light = new THREE.PointLight(0xffb060, 14, 16, 1.6);
    light.position.set(x, 3.1, z);
    root.add(light);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffa040, emissiveIntensity: 3 }));
    lamp.position.copy(light.position);
    root.add(lamp);
  }

  // Spray-painted signs
  map.decals.forEach((d, i) => {
    const opts = d.square ? { w: 256, h: 256, font: 220 } : d.wide ? { w: 1024, h: 256, font: 150 } : {};
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(d.w, d.h),
      new THREE.MeshStandardMaterial({
        map: TX.spray(d.text, d.color, { ...opts, seed: i + 1 }), transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, roughness: 1,
      }),
    );
    m.position.set(...d.at);
    if (d.ground) m.rotation.set(-Math.PI / 2, 0, d.rotY);
    else m.rotation.y = d.rotY;
    m.receiveShadow = true;
    root.add(m);
  });

  // Drifting pollen / dust in the sun beams
  const moteN = 700;
  const pp = new Float32Array(moteN * 3);
  for (let i = 0; i < moteN; i++) {
    pp[i * 3] = r() * 120;
    pp[i * 3 + 1] = 0.3 + r() * 7;
    pp[i * 3 + 2] = r() * 120;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  root.add(new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: theme.motes, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
  })));

  return {
    update(dt, t, camPos) {
      sky.position.copy(camPos);
      for (let i = 0; i < moteN; i++) {
        pp[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.15;
        pp[i * 3 + 1] += Math.cos(t * 0.5 + i * 1.7) * dt * 0.08;
      }
      moteGeo.attributes.position.needsUpdate = true;
      scenery?.update?.(dt, t);
    },
    dispose() {
      scene.remove(root);
      const seen = new Set();
      root.traverse((o) => {
        o.geometry?.dispose();
        for (const m of [o.material].flat()) {
          if (!m || seen.has(m)) continue;
          seen.add(m);
          m.map?.dispose();
          m.dispose();
        }
      });
      sun.dispose();
    },
  };
}

function buildVan(sx, sy, sz) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.55, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x24323c, roughness: 0.15, metalness: 0.4 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0x2f6a9e, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy - 0.35, sz), paint);
  body.position.y = 0.35 + (sy - 0.35) / 2;
  g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.02, 0.25, sz + 0.02), stripe);
  band.position.y = 1.05;
  g.add(band);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, sz * 0.85), glass);
  shield.position.set(-sx / 2 - 0.01, sy - 0.6, 0);
  g.add(shield);
  for (const side of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.3, 0.6, 0.05), glass);
    win.position.set(-sx * 0.28, sy - 0.62, side * (sz / 2 + 0.01));
    g.add(win);
    for (const end of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14).rotateX(Math.PI / 2), tire);
      w.position.set(end * sx * 0.32, 0.38, side * (sz / 2 - 0.1));
      g.add(w);
    }
  }
  return g;
}

function forestScenery(root, { r, dummy, col }) {
  // Trees: on top of the wall blocks and in a ring around the map
  const trees = [];
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (grid[idx(x, z)] !== WALL) continue;
    const interior = isWallCell(x + 1, z) && isWallCell(x - 1, z) && isWallCell(x, z + 1) && isWallCell(x, z - 1);
    const n = interior ? 1 + (r() < 0.4 ? 1 : 0) : r() < 0.35 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      let ox = (r() - 0.5) * 2.6, oz = (r() - 0.5) * 2.6;
      if (!interior) {
        // Keep edge trees toward the back of the wall, away from the walkway.
        if (!isWallCell(x + 1, z)) ox = -1.3;
        if (!isWallCell(x - 1, z)) ox = 1.3;
        if (!isWallCell(x, z + 1)) oz = -1.3;
        if (!isWallCell(x, z - 1)) oz = 1.3;
      }
      trees.push({ x: C(x) + ox, y: wallH[idx(x, z)], z: C(z) + oz, s: 0.75 + r() * 0.6, pine: r() < 0.72 });
    }
  }
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2, d = 90 + r() * 70;
    trees.push({ x: 60 + Math.cos(a) * d, y: 0, z: 60 + Math.sin(a) * d, s: 0.9 + r() * 0.7, pine: r() < 0.75 });
  }
  const pines = trees.filter((t) => t.pine), rounds = trees.filter((t) => !t.pine);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 1, 6).translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
  const blobGeo = new THREE.IcosahedronGeometry(1, 0);
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeo, M(TX.bark()), trees.length);
  const cones = new THREE.InstancedMesh(coneGeo, foliageMat, pines.length * 3);
  const blobs = new THREE.InstancedMesh(blobGeo, foliageMat, rounds.length * 2);
  trees.forEach((t, i) => {
    const H = (t.pine ? 9 : 6.5) * t.s;
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, r() * 6, 0);
    dummy.scale.set(t.s, H * (t.pine ? 0.45 : 0.6), t.s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  pines.forEach((t, i) => {
    const H = 9 * t.s, hue = 0.27 + r() * 0.08, lit = 0.16 + r() * 0.08;
    for (let k = 0; k < 3; k++) {
      const rad = (2.4 - k * 0.6) * t.s;
      dummy.position.set(t.x, t.y + H * (0.22 + k * 0.2), t.z);
      dummy.rotation.set(0, r() * 6, 0);
      dummy.scale.set(rad, H * 0.42, rad);
      dummy.updateMatrix();
      cones.setMatrixAt(i * 3 + k, dummy.matrix);
      cones.setColorAt(i * 3 + k, col.setHSL(hue, 0.45, lit + k * 0.03));
    }
  });
  rounds.forEach((t, i) => {
    const H = 6.5 * t.s, hue = 0.18 + r() * 0.1;
    for (let k = 0; k < 2; k++) {
      const rad = (2.3 - k * 0.7) * t.s;
      dummy.position.set(t.x + (r() - 0.5) * t.s, t.y + H * (0.7 + k * 0.2), t.z + (r() - 0.5) * t.s);
      dummy.rotation.set(r() * 3, r() * 3, 0);
      dummy.scale.set(rad, rad * 0.85, rad);
      dummy.updateMatrix();
      blobs.setMatrixAt(i * 2 + k, dummy.matrix);
      blobs.setColorAt(i * 2 + k, col.setHSL(hue, 0.5, 0.2 + r() * 0.1));
    }
  });
  for (const m of [trunks, cones, blobs]) {
    m.castShadow = true;
    root.add(m);
  }

  // Bushes at the foot of walls
  const bushes = [];
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (grid[idx(x, z)] === WALL) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!isWallCell(x + dx, z + dz) || r() > 0.35) continue;
      const along = (r() - 0.5) * 3;
      bushes.push({
        x: C(x) + dx * 2.6 + (dz ? along : 0),
        z: C(z) + dz * 2.6 + (dx ? along : 0),
        s: 0.35 + r() * 0.35,
      });
    }
  }
  const bushMesh = new THREE.InstancedMesh(blobGeo, foliageMat, bushes.length);
  bushes.forEach((b, i) => {
    dummy.position.set(b.x, b.s * 0.45, b.z);
    dummy.rotation.set(r() * 3, r() * 3, 0);
    dummy.scale.set(b.s * 1.2, b.s * 0.85, b.s * 1.2);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(i, dummy.matrix);
    bushMesh.setColorAt(i, col.setHSL(0.22 + r() * 0.08, 0.5, 0.18 + r() * 0.1));
  });
  bushMesh.receiveShadow = true;
  root.add(bushMesh);
}

function jaffaScenery(root, { r, dummy, col, mats }) {
  const lime = mats.props.stone;

  // The Mediterranean along the west side, beyond a strip of beach
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x2f86b3, roughness: 0.18, metalness: 0.25 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 420), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-152, 0.05, 60);
  root.add(sea);

  // Palm trees: along the promenade and scattered around the city
  const palms = [];
  for (let z = -40; z < 170; z += 9 + r() * 6) palms.push({ x: -14 - r() * 6, z, s: 0.9 + r() * 0.4 });
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 95 + r() * 60;
    const x = 60 + Math.cos(a) * d, z = 60 + Math.sin(a) * d;
    if (x < -10) continue;
    palms.push({ x, z, s: 0.85 + r() * 0.5 });
  }
  const FRONDS = 8;
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 7).translate(0, 0.5, 0);
  const frondGeo = new THREE.BoxGeometry(0.6, 0.05, 1).translate(0, 0, 0.5);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 1 }), palms.length);
  const fronds = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), palms.length * FRONDS);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  palms.forEach((p, i) => {
    const H = 8 * p.s, lean = 0.08 + r() * 0.18, la = r() * Math.PI * 2;
    dir.set(Math.sin(lean) * Math.cos(la), Math.cos(lean), Math.sin(lean) * Math.sin(la));
    dummy.position.set(p.x, 0, p.z);
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.set(p.s, H, p.s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    const tx = p.x + dir.x * H, ty = dir.y * H, tz = p.z + dir.z * H;
    for (let k = 0; k < FRONDS; k++) {
      dummy.position.set(tx, ty, tz);
      dummy.rotation.set(0, 0, 0, 'YXZ');
      dummy.rotation.y = (k / FRONDS) * Math.PI * 2 + r() * 0.4;
      dummy.rotation.x = 0.25 + r() * 0.35;
      dummy.scale.set(p.s, p.s, 3.4 * p.s);
      dummy.updateMatrix();
      fronds.setMatrixAt(i * FRONDS + k, dummy.matrix);
      fronds.setColorAt(i * FRONDS + k, col.setHSL(0.24 + r() * 0.06, 0.45, 0.24 + r() * 0.08));
    }
  });
  dummy.rotation.order = 'XYZ';
  for (const m of [trunks, fronds]) {
    m.castShadow = true;
    root.add(m);
  }

  // Rooftops: solar water heaters (a horizontal tank and a tilted panel) and the odd small dome
  const roofCells = [];
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (grid[idx(x, z)] === WALL && r() < 0.3) roofCells.push([x, z]);
  }
  const tankGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.6, 10).rotateZ(Math.PI / 2);
  const panelGeo = new THREE.BoxGeometry(1.6, 0.06, 1.1);
  const domeGeo = new THREE.SphereGeometry(1.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const heaters = roofCells.filter(() => r() < 0.75), domes = roofCells.filter((c) => !heaters.includes(c));
  const tanks = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.5, metalness: 0.3 }), heaters.length);
  const panels = new THREE.InstancedMesh(panelGeo, new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.25, metalness: 0.5 }), heaters.length);
  heaters.forEach(([x, z], i) => {
    const h = wallH[idx(x, z)], rot = ((r() * 4) | 0) * Math.PI / 2;
    dummy.position.set(C(x), h + 0.75, C(z));
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    tanks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(C(x) - Math.sin(rot) * 1.1, h + 0.5, C(z) - Math.cos(rot) * 1.1);
    dummy.rotation.set(0.5, rot, 0, 'YXZ');
    dummy.updateMatrix();
    panels.setMatrixAt(i, dummy.matrix);
    dummy.rotation.order = 'XYZ';
  });
  const domeMesh = new THREE.InstancedMesh(domeGeo, lime, domes.length);
  domes.forEach(([x, z], i) => {
    dummy.position.set(C(x), wallH[idx(x, z)], C(z));
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    domeMesh.setMatrixAt(i, dummy.matrix);
  });
  for (const m of [tanks, panels, domeMesh]) {
    m.castShadow = true;
    root.add(m);
  }

  // The Jaffa clock tower, standing over the rooftops north-east of the map
  const tower = new THREE.Group();
  const face = M(TX.clockFace());
  const block = (w, h, d, y, mat = lime) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = y + h / 2;
    m.castShadow = true;
    tower.add(m);
    return m;
  };
  block(7, 14, 7, 0);
  block(7.6, 0.6, 7.6, 14);
  block(5.6, 6, 5.6, 14.6);
  for (let k = 0; k < 4; k++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), face);
    const a = (k * Math.PI) / 2;
    p.position.set(Math.sin(a) * 2.82, 17.6, Math.cos(a) * 2.82);
    p.rotation.y = a;
    tower.add(p);
  }
  block(6.2, 0.5, 6.2, 20.6);
  block(3.6, 3, 3.6, 21.1);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 4).rotateY(Math.PI / 4), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 }));
  cap.position.y = 25.7;
  tower.add(cap);
  tower.position.set(128, 0, -18);
  tower.rotation.y = -0.5;
  root.add(tower);

  // Low houses outside the walls fill the skyline
  const houseGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const outside = [];
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, d = 78 + r() * 50;
    const x = 60 + Math.cos(a) * d, z = 60 + Math.sin(a) * d;
    if (x < -6) continue;
    outside.push({ x, z, w: 5 + r() * 7, d: 5 + r() * 7, h: 4 + r() * 8 });
  }
  const houses = new THREE.InstancedMesh(houseGeo, mats.walls[1][0], outside.length);
  outside.forEach((h, i) => {
    dummy.position.set(h.x, 0, h.z);
    dummy.rotation.set(0, r() * 0.4, 0);
    dummy.scale.set(h.w, h.h, h.d);
    dummy.updateMatrix();
    houses.setMatrixAt(i, dummy.matrix);
    houses.setColorAt(i, col.setScalar(0.85 + r() * 0.15));
  });
  dummy.scale.set(1, 1, 1);
  houses.castShadow = houses.receiveShadow = true;
  root.add(houses);

  return {
    update(dt, t) {
      seaMat.color.setHSL(0.55, 0.58, 0.44 + Math.sin(t * 0.4) * 0.02);
    },
  };
}

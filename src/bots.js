// Defender bots: hold sites, react to sightings and gunfire, fight, and defuse the bomb.
import * as THREE from 'three';
import * as W from './world.js?v=7';
import { WEAPONS } from './weapons.js?v=7';

export const NAMES = ['Ash', 'Birch', 'Cedar', 'Elm', 'Fir', 'Hazel', 'Maple', 'Oak', 'Pine', 'Rowan', 'Willow', 'Yew', 'Alder', 'Larch', 'Spruce'];

export const DIFFICULTY = {
  easy: { react: [0.6, 0.95], acc: 0.3, hs: 0.05, turn: 4.5, fire: [0.45, 0.7], see: 65, investigate: 0.3, rotate: 0.25, defuse: 8 },
  normal: { react: [0.38, 0.62], acc: 0.45, hs: 0.1, turn: 7, fire: [0.32, 0.5], see: 85, investigate: 0.45, rotate: 0.35, defuse: 7 },
  hard: { react: [0.2, 0.36], acc: 0.6, hs: 0.16, turn: 10, fire: [0.24, 0.38], see: 110, investigate: 0.6, rotate: 0.5, defuse: 5.5 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);
const UP = new THREE.Vector3(0, 1, 0);

let shared = null;
function sharedMats() {
  if (shared) return shared;
  const S = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  shared = {
    pants: S(0x2c3a4d), boots: S(0x1c1c1c), helmet: S(0x2a3340, { roughness: 0.6 }),
    goggle: S(0x111111, { roughness: 0.2, metalness: 0.5 }), gun: S(0x161616, { roughness: 0.5, metalness: 0.5 }),
    glove: S(0x222222),
  };
  return shared;
}

function buildModel() {
  const m = sharedMats();
  const uniform = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.85 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x6b6a4e, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89b78, roughness: 0.8 });
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const B = (w, h, d, mat, x, y, z, parent = root) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const body = new THREE.Group();
  root.add(body);
  const leg = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 0.92, 0);
    body.add(g);
    B(0.18, 0.86, 0.2, m.pants, 0, -0.43, 0, g);
    B(0.2, 0.12, 0.3, m.boots, 0, -0.86, -0.04, g);
    return g;
  };
  const legL = leg(-0.12), legR = leg(0.12);
  B(0.46, 0.62, 0.27, uniform, 0, 1.23, 0, body);
  B(0.5, 0.44, 0.31, vest, 0, 1.29, 0, body);
  B(0.48, 0.06, 0.29, m.boots, 0, 0.94, 0, body);
  B(0.12, 0.12, 0.06, vest, -0.13, 1.18, -0.17, body);
  B(0.12, 0.12, 0.06, vest, 0.13, 1.18, -0.17, body);
  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  body.add(head);
  B(0.24, 0.26, 0.25, skin, 0, 0.14, 0, head);
  B(0.29, 0.13, 0.3, m.helmet, 0, 0.29, 0.01, head);
  B(0.22, 0.05, 0.02, m.goggle, 0, 0.19, -0.13, head);
  const arm = (x, rz) => {
    const g = new THREE.Group();
    g.position.set(x, 1.45, 0);
    g.rotation.set(1.35, 0, rz);
    body.add(g);
    B(0.12, 0.5, 0.12, uniform, 0, -0.22, 0, g);
    B(0.11, 0.1, 0.11, m.glove, 0, -0.48, 0, g);
    return g;
  };
  arm(0.3, -0.38);
  arm(-0.3, 0.45);
  const gun = B(0.05, 0.11, 0.22, m.gun, 0.04, 1.4, -0.6, body);
  return { root, body, legL, legR, head, gun, flashMats: [uniform, vest, skin] };
}

export class Bot {
  constructor(game, name, spawn, spot, loadout = { weapon: 'glock', armor: false }) {
    this.game = game;
    this.name = name;
    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.weaponId = loadout.weapon;
    this.weapon = WEAPONS[loadout.weapon];
    this.armor = loadout.armor;
    this.model = buildModel();
    // Stretch the gun forward from the hands to match the weapon's length.
    const len = this.weapon.bot.len, m = this.model;
    m.gunZ = -0.49 - 0.11 * len;
    m.gun.scale.z = len;
    m.gun.position.z = m.gunZ;
    this.muzzleZ = m.gunZ - 0.11 * len - 0.03;
    game.scene.add(m.root);
    this.spot = spot;
    this.watchYaw = yawTo(W.C(spot.look[0]) - W.C(spot.cell[0]), W.C(spot.look[1]) - W.C(spot.cell[1]));
    this.hp = 100;
    this.alive = true;
    this.state = 'goto';
    this.path = null;
    this.pathIdx = 0;
    this.canSee = false;
    this.spotted = false;
    this.reaction = 0;
    this.fireCd = 0;
    this.ammo = this.weapon.mag;
    this.reloadT = 0;
    this.lastKnown = new THREE.Vector3();
    this.lastSeen = -99;
    this.perceiveT = Math.random() * 0.1;
    this.strafeDir = 0;
    this.strafeT = 0;
    this.walkPhase = 0;
    this.lookYaw = null;
    this.lookT = 0;
    this.searchT = 0;
    this.defuseT = 0;
    this.deadT = 0;
    this.stuckT = 0;
    this.hitFlash = 0;
    this.shotsAt = 0;
    this.recoil = 0;
    this.stepT = 0;
    this.seed = Math.random();
    this.lastShotTime = -99;
  }

  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.68, this.pos.z); }
  muzzle() {
    return new THREE.Vector3(0.04, 1.43, this.muzzleZ).applyAxisAngle(UP, this.yaw).add(this.pos);
  }
  spotPos() { return { x: W.C(this.spot.cell[0]), z: W.C(this.spot.cell[1]) }; }

  setPath(to) {
    this.path = W.findPath(this.pos, to) || [{ x: to.x, z: to.z }];
    this.pathIdx = 0;
  }
  follow() {
    if (!this.path) return null;
    while (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.5) return { x: dx / d, z: dz / d };
      this.pathIdx++;
    }
    this.path = null;
    return null;
  }

  // Ray against head/body/legs boxes. Returns { t, part } or null.
  raycast(O, D, maxT) {
    if (!this.alive) return null;
    const p = this.pos, y = p.y - (this.state === 'defuse' ? 0.35 : 0);
    let best = null;
    const boxes = [
      ['head', [p.x - 0.16, y + 1.55, p.z - 0.16], [p.x + 0.16, y + 1.93, p.z + 0.16]],
      ['body', [p.x - 0.27, y + 0.9, p.z - 0.27], [p.x + 0.27, y + 1.55, p.z + 0.27]],
      ['legs', [p.x - 0.22, y, p.z - 0.22], [p.x + 0.22, y + 0.9, p.z + 0.22]],
    ];
    for (const [part, mn, mx] of boxes) {
      const h = W.rayAABB(O, D, mn, mx, maxT);
      if (h && (!best || h.t < best.t)) best = { t: h.t, part };
    }
    return best;
  }

  checkSight() {
    const p = this.game.player;
    if (!p.alive) return false;
    const eye = this.eye(), head = p.eyePos(), chest = p.chestPos();
    const dx = head.x - eye.x, dz = head.z - eye.z, d = Math.hypot(dx, dz);
    if (d > this.game.diff.see) return false;
    if (d > 3) {
      const cos = (-Math.sin(this.yaw) * dx - Math.cos(this.yaw) * dz) / d;
      if (cos < (this.spotted ? 0 : 0.34)) return false;
    }
    return W.hasLineOfSight(eye, head) || W.hasLineOfSight(eye, chest);
  }

  hear(pos) {
    if (!this.alive || this.state === 'engage' || this.state === 'defuse') return;
    this.lookYaw = yawTo(pos.x - this.pos.x, pos.z - this.pos.z);
    this.lookT = 2.5;
    if (this.game.bomb.planted) return;
    if (this.state !== 'investigate' && Math.random() < this.game.diff.investigate) this.investigate(pos);
  }

  investigate(pos, searchTime = 2.5) {
    this.lastKnown.set(pos.x, 0, pos.z);
    this.state = 'investigate';
    this.setPath(this.lastKnown);
    this.searchT = searchTime;
  }

  takeDamage(dmg, from) {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.hitFlash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (this.game.bomb.defuser === this) this.game.bomb.defuser = null;
      this.game.onBotDied(this);
      return true;
    }
    if (this.state !== 'engage' && this.state !== 'defuse') {
      const toward = yawTo(from.x - this.pos.x, from.z - this.pos.z);
      this.yaw += angleDiff(toward, this.yaw) * 0.6;
      this.investigate(from, 3);
      this.perceiveT = 0;
    }
    return false;
  }

  shoot() {
    const g = this.game, p = g.player, diff = g.diff, wb = this.weapon.bot;
    this.ammo--;
    this.fireCd = rand(...diff.fire) * wb.fire;
    this.shotsAt++;
    this.recoil = 1;
    this.lastShotTime = g.time;
    const muzzle = this.muzzle(), chest = p.chestPos(), dist = muzzle.distanceTo(chest);
    let chance = Math.min(0.95, diff.acc * wb.acc) * THREE.MathUtils.clamp(1.2 - dist / 55, 0.12, 1);
    const ps = p.horizSpeed();
    if (ps > 3.5) chance *= 0.6;
    else if (ps > 1.2) chance *= 0.8;
    if (!p.onGround) chance *= 0.5;
    if (p.crouching) chance *= 0.85;
    if (this.strafeDir) chance *= 0.85;
    if (this.shotsAt === 1) chance *= 0.7;
    let end;
    if (Math.random() < chance) {
      const head = Math.random() < diff.hs;
      end = head ? p.eyePos() : chest.clone().add(new THREE.Vector3(rand(-0.15, 0.15), rand(-0.2, 0.2), rand(-0.15, 0.15)));
      g.damagePlayer(Math.round(head ? rand(...wb.head) : rand(...wb.body)), this, head);
    } else {
      const off = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.5, 1.7));
      const dir = chest.clone().add(off).sub(muzzle).normalize();
      const h = W.raycastWorld(muzzle, dir, 150);
      end = muzzle.clone().addScaledVector(dir, h.t);
      if (h.t < 150) g.fx.impact(end, h.n, h.what);
      g.nearMiss(muzzle, dir);
    }
    g.fx.tracer(muzzle, end, 0xffd890, 0.55);
    g.fx.muzzle(muzzle);
    g.positionalSound('gunshot', muzzle, this.weapon.sound);
  }

  update(dt) {
    const g = this.game, p = g.player, m = this.model;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
    for (const mt of m.flashMats) mt.emissive.setRGB(this.hitFlash * 0.7, 0, 0);

    if (!this.alive) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.5);
      m.root.rotation.set(k * k * Math.PI / 2, this.yaw, 0);
      m.root.position.set(this.pos.x, 0.1 * k, this.pos.z);
      return;
    }
    if (g.phase === 'freeze') {
      this.pose(dt, 0);
      return;
    }

    this.perceiveT -= dt;
    if (this.perceiveT <= 0) {
      this.perceiveT = 0.1 + Math.random() * 0.06;
      this.canSee = this.checkSight();
    }
    if (this.canSee) {
      if (!this.spotted) {
        this.spotted = true;
        this.reaction = rand(...g.diff.react);
        this.shotsAt = 0;
        g.onBotSpotted(this);
      }
      this.lastKnown.copy(p.pos);
      this.lastSeen = g.time;
      if (this.state !== 'engage') {
        if (this.state === 'defuse') g.bomb.defuser = null;
        this.state = 'engage';
        this.path = null;
      }
    } else if (this.spotted && g.time - this.lastSeen > 0.5) this.spotted = false;

    this.fireCd -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.ammo = this.weapon.mag;
    }

    let mvx = 0, mvz = 0, run = 4.4, faceYaw = null;
    const walk = (dir) => {
      mvx = dir.x;
      mvz = dir.z;
      faceYaw = yawTo(dir.x, dir.z);
    };
    switch (this.state) {
      case 'goto': {
        if (!this.path) this.setPath(this.spotPos());
        const dir = this.follow();
        if (dir) walk(dir);
        else this.state = 'hold';
        break;
      }
      case 'hold':
      case 'guard': {
        if (this.lookYaw !== null) {
          faceYaw = this.lookYaw;
          this.lookT -= dt;
          if (this.lookT <= 0) this.lookYaw = null;
        } else faceYaw = this.watchYaw + Math.sin(g.time * 0.6 + this.seed * 10) * 0.45;
        if (this.state === 'guard' && g.bomb.planted && (!g.bomb.defuser || !g.bomb.defuser.alive)) {
          this.state = 'toBomb';
          this.path = null;
        }
        break;
      }
      case 'engage': {
        const eye = this.eye(), target = p.eyePos();
        faceYaw = yawTo(target.x - eye.x, target.z - eye.z);
        if (this.canSee) {
          this.reaction -= dt;
          this.strafeT -= dt;
          if (this.strafeT <= 0) {
            this.strafeT = rand(0.35, 1.1);
            this.strafeDir = [-1, 0, 1][(Math.random() * 3) | 0];
          }
          if (this.strafeDir) {
            mvx = Math.cos(this.yaw) * this.strafeDir;
            mvz = -Math.sin(this.yaw) * this.strafeDir;
            run = 2.2;
          }
          const err = Math.abs(angleDiff(faceYaw, this.yaw));
          if (this.ammo <= 0 && this.reloadT <= 0) this.reloadT = this.weapon.reload * 1.1;
          else if (this.reaction <= 0 && err < 0.12 && this.fireCd <= 0 && this.reloadT <= 0) this.shoot();
        } else if (g.time - this.lastSeen > 1.2) {
          this.strafeDir = 0;
          if (g.bomb.planted) {
            this.state = 'toBomb';
            this.path = null;
          } else this.investigate(this.lastKnown, 3);
        }
        break;
      }
      case 'investigate': {
        const dir = this.follow();
        if (dir) {
          walk(dir);
          run = 3.8;
        } else {
          this.searchT -= dt;
          faceYaw = this.yaw + 1.2 * dt * 8;
          if (this.searchT <= 0) {
            this.state = g.bomb.planted ? 'toBomb' : 'goto';
            this.path = null;
          }
        }
        break;
      }
      case 'toBomb': {
        if (!g.bomb.planted) {
          this.state = 'hold';
          break;
        }
        const b = g.bomb.pos, dx = b.x - this.pos.x, dz = b.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 1.2) {
          if (!g.bomb.defuser || !g.bomb.defuser.alive) {
            g.bomb.defuser = this;
            this.state = 'defuse';
            this.defuseT = 0;
            g.onDefuseStart(this);
          } else {
            this.state = 'guard';
            this.watchYaw = Math.random() * Math.PI * 2;
          }
          break;
        }
        if (!this.path) this.setPath(b);
        const dir = this.follow();
        if (dir) walk(dir);
        else walk({ x: dx / d, z: dz / d });
        break;
      }
      case 'defuse': {
        if (!g.bomb.planted) {
          this.state = 'hold';
          break;
        }
        const b = g.bomb.pos;
        faceYaw = yawTo(b.x - this.pos.x, b.z - this.pos.z);
        this.defuseT += dt;
        if (this.defuseT >= g.diff.defuse) g.bombDefused(this);
        break;
      }
    }

    if (faceYaw !== null) {
      const max = (this.state === 'engage' ? g.diff.turn : 6) * dt;
      this.yaw += THREE.MathUtils.clamp(angleDiff(faceYaw, this.yaw), -max, max);
    }

    const len = Math.hypot(mvx, mvz);
    if (len > 0) {
      mvx = (mvx / len) * run;
      mvz = (mvz / len) * run;
    }
    const k = Math.min(1, dt * 10);
    this.vel.x += (mvx - this.vel.x) * k;
    this.vel.z += (mvz - this.vel.z) * k;
    const before = this.pos.clone();
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    for (const o of g.bots) {
      if (o === this || !o.alive) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.75 && d > 1e-4) {
        this.pos.x += (dx / d) * (0.75 - d) * 0.5;
        this.pos.z += (dz / d) * (0.75 - d) * 0.5;
      }
    }
    if (p.alive) {
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.8 && d > 1e-4) {
        this.pos.x += (dx / d) * (0.8 - d);
        this.pos.z += (dz / d) * (0.8 - d);
      }
    }
    W.collide(this.pos, 0.35, 1.8);

    const moved = this.pos.distanceTo(before);
    if (len > 0 && this.state !== 'engage') {
      this.stuckT = moved < run * dt * 0.25 ? this.stuckT + dt : 0;
      if (this.stuckT > 0.8) {
        this.stuckT = 0;
        this.path = null;
        this.pos.x += rand(-0.3, 0.3);
        this.pos.z += rand(-0.3, 0.3);
        W.collide(this.pos, 0.35, 1.8);
        if (this.state === 'investigate') this.setPath(this.lastKnown);
      }
    }
    const speed = moved / Math.max(dt, 1e-4);
    if (speed > 3) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.4;
        g.positionalSound('step', this.pos);
      }
    }
    this.pose(dt, speed);
  }

  pose(dt, speed) {
    const m = this.model;
    this.recoil = Math.max(0, this.recoil - dt * 8);
    this.walkPhase += dt * speed * 2.4;
    const swing = Math.sin(this.walkPhase) * 0.6 * Math.min(1, speed / 4);
    const kneel = this.state === 'defuse';
    m.legL.rotation.x = kneel ? -1.3 : swing;
    m.legR.rotation.x = kneel ? 0.2 : -swing;
    m.body.position.y = kneel ? -0.35 : Math.abs(Math.sin(this.walkPhase)) * 0.04 * Math.min(1, speed / 4);
    m.gun.position.z = m.gunZ + this.recoil * 0.06;
    m.root.position.copy(this.pos);
    m.root.rotation.set(0, this.yaw, 0);
  }

  dispose() {
    this.game.scene.remove(this.model.root);
    this.model.root.traverse((o) => o.geometry?.dispose());
    for (const mt of this.model.flashMats) mt.dispose();
  }
}

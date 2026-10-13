// Short-lived world effects: tracers, bullet holes, dust, blood, flashes, the bomb explosion.
import * as THREE from 'three';
import * as TX from './textures.js?v=9';

const SURFACE_COLOR = { ground: 0x8a7356, wall: 0xb5ab90, crate: 0x9b7347, log: 0x6b4d30, rock: 0x8a8d80, beam: 0x6b4d30, door: 0x5c4128, roof: 0x6b4d30 };

export function createFx(scene) {
  const softTex = TX.soft(), flashTex = TX.flash(), holeTex = TX.hole();
  const particles = [], tracers = [], holes = [], lights = [];
  const tracerGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
  const holeGeo = new THREE.PlaneGeometry(0.13, 0.13);
  const holeMat = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const tmp = new THREE.Vector3();

  function sprite(pos, { color = 0xffffff, size = 0.3, life = 0.6, vel = null, grow = 1.5, gravity = 0, opacity = 0.8, additive = false, map = softTex }) {
    const mat = new THREE.SpriteMaterial({
      map, color, transparent: true, depthWrite: false, opacity,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(size);
    scene.add(s);
    particles.push({ s, v: vel || new THREE.Vector3(), life, max: life, size, grow, gravity, opacity });
  }

  function randDir(spread = 1) {
    return new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 - 0.5, (Math.random() - 0.5) * 2).normalize().multiplyScalar(spread);
  }

  // A fixed pool: changing the number of lights in the scene would recompile every shader.
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 10, 2);
    scene.add(l);
    lights.push({ l, life: 0, max: 1, intensity: 0 });
  }
  function light(pos, color, intensity, distance, life) {
    const slot = lights.reduce((a, b) => (b.life < a.life ? b : a));
    slot.l.position.copy(pos);
    slot.l.color.set(color);
    slot.l.distance = distance;
    Object.assign(slot, { life, max: life, intensity });
  }

  return {
    tracer(from, to, color = 0xffe2a0, opacity = 0.7) {
      const len = from.distanceTo(to);
      if (len < 1) return;
      const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.position.copy(from);
      m.lookAt(to);
      m.scale.set(0.018, 0.018, len);
      scene.add(m);
      tracers.push({ m, life: 0.07, opacity });
    },

    impact(point, normal, what) {
      const n = tmp.set(normal[0], normal[1], normal[2]);
      const h = new THREE.Mesh(holeGeo, holeMat);
      h.position.copy(point).addScaledVector(n, 0.012);
      h.lookAt(point.clone().add(n));
      h.rotation.z = Math.random() * 6;
      scene.add(h);
      holes.push(h);
      if (holes.length > 80) scene.remove(holes.shift());
      const color = SURFACE_COLOR[what] ?? 0x9a9078;
      for (let i = 0; i < 5; i++) {
        const v = randDir(0.6).addScaledVector(n, 1.3);
        sprite(point.clone().addScaledVector(n, 0.05), { color, size: 0.12, life: 0.5 + Math.random() * 0.3, vel: v, grow: 3, gravity: -1.5, opacity: 0.7 });
      }
      sprite(point.clone().addScaledVector(n, 0.03), { color: 0xffd28a, size: 0.12, life: 0.06, additive: true, grow: 0.5, map: flashTex, opacity: 1 });
    },

    blood(point, dir) {
      for (let i = 0; i < 8; i++) {
        const v = randDir(1.2).addScaledVector(dir, 1.5);
        sprite(point, { color: 0x7a0b0b, size: 0.14, life: 0.45, vel: v, grow: 2.2, gravity: -6, opacity: 0.85 });
      }
    },

    flashLight(pos) {
      light(pos, 0xffaa55, 5, 8, 0.06);
    },

    muzzle(pos) {
      sprite(pos, { color: 0xffffff, size: 0.45, life: 0.05, additive: true, grow: 0.3, map: flashTex, opacity: 1 });
      light(pos, 0xffaa55, 6, 7, 0.06);
    },

    explosion(pos) {
      const c = pos.clone().setY(pos.y + 1);
      sprite(c, { color: 0xffffff, size: 4, life: 0.45, additive: true, grow: 6, map: flashTex, opacity: 1 });
      for (let i = 0; i < 26; i++) {
        sprite(c, { color: i % 2 ? 0xff8a2a : 0xffc860, size: 2.5, life: 0.7 + Math.random() * 0.5, vel: randDir(9), grow: 3, gravity: 1, additive: true, opacity: 0.9 });
      }
      for (let i = 0; i < 30; i++) {
        sprite(c, { color: 0x3a3631, size: 3, life: 2.5 + Math.random() * 2, vel: randDir(4).setY(2 + Math.random() * 3), grow: 3.5, gravity: 0.4, opacity: 0.65 });
      }
      for (let i = 0; i < 20; i++) {
        sprite(c, { color: 0x5a4a30, size: 0.3, life: 1.2, vel: randDir(12).setY(6 + Math.random() * 6), grow: 1, gravity: -14, opacity: 0.9 });
      }
      light(c, 0xffa040, 400, 70, 1.2);
    },

    update(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.s);
          p.s.material.dispose();
          particles.splice(i, 1);
          continue;
        }
        const k = 1 - p.life / p.max;
        p.v.y += p.gravity * dt;
        p.v.multiplyScalar(Math.max(0, 1 - dt * 1.5));
        p.s.position.addScaledVector(p.v, dt);
        p.s.scale.setScalar(p.size * (1 + k * p.grow));
        p.s.material.opacity = p.opacity * (1 - k);
      }
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= dt;
        t.m.material.opacity = Math.max(0, t.life / 0.07) * t.opacity;
        if (t.life <= 0) {
          scene.remove(t.m);
          t.m.material.dispose();
          tracers.splice(i, 1);
        }
      }
      for (const l of lights) {
        l.life = Math.max(0, l.life - dt);
        l.l.intensity = (l.life / l.max) * l.intensity;
      }
    },

    clear() {
      for (const p of particles) { scene.remove(p.s); p.s.material.dispose(); }
      for (const t of tracers) { scene.remove(t.m); t.m.material.dispose(); }
      for (const h of holes) scene.remove(h);
      for (const l of lights) { l.life = 0; l.l.intensity = 0; }
      particles.length = tracers.length = holes.length = 0;
    },
  };
}

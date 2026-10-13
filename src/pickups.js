// Weapons lying on the ground: dropped by dead defenders (or by the player when swapping) and picked up again.
import * as THREE from 'three';
import { WEAPONS } from './weapons.js?v=7';

const steel = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.5, metalness: 0.3 });
const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.8 });
const olive = new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 0.8 });
const ringGeo = new THREE.RingGeometry(0.38, 0.5, 32).rotateX(-Math.PI / 2);

// Low-poly world model, sized like the gun the bots carry. The barrel points along -z.
function gunMesh(id) {
  const w = WEAPONS[id], L = 0.22 * w.bot.len, g = new THREE.Group();
  const B = (sx, sy, sz, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };
  B(0.05, 0.08, L, steel, 0, 0, 0);
  B(0.035, 0.11, 0.05, steel, 0, -0.08, L / 2 - 0.05);
  if (w.slot === 'primary') {
    const furniture = id === 'awp' ? olive : id === 'ak47' ? wood : steel;
    B(0.04, 0.13, 0.05, steel, 0, -0.09, -L * 0.05);
    B(0.045, 0.09, L * 0.35, furniture, 0, -0.01, L / 2 + L * 0.17);
  }
  if (w.scope) {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L * 0.4, 10).rotateX(Math.PI / 2), steel);
    scope.position.set(0, 0.07, 0);
    g.add(scope);
  }
  return g;
}

export function createPickups(scene) {
  const items = [];

  function remove(item) {
    scene.remove(item.root);
    item.root.traverse((o) => {
      if (o.geometry && o.geometry !== ringGeo) o.geometry.dispose();
    });
    item.ring.material.dispose();
  }

  return {
    items,

    drop(id, ammo, reserve, pos) {
      const root = new THREE.Group();
      root.position.set(pos.x, pos.y, pos.z);
      const gun = gunMesh(id);
      gun.rotation.set(0, Math.random() * Math.PI * 2, Math.PI / 2); // lying on its side
      gun.position.y = 0.06;
      root.add(gun);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xff7a18, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      ring.position.y = 0.02;
      root.add(ring);
      scene.add(root);
      items.push({ id, ammo, reserve, pos: root.position, root, ring, t: Math.random() * 6 });
    },

    take(item) {
      const i = items.indexOf(item);
      if (i >= 0) items.splice(i, 1);
      remove(item);
    },

    // Closest weapon within reach of someone standing at pos.
    nearest(pos, reach = 1.4) {
      let best = null, bestD = reach;
      for (const it of items) {
        if (Math.abs(it.pos.y - pos.y) > 1.2) continue;
        const d = Math.hypot(it.pos.x - pos.x, it.pos.z - pos.z);
        if (d < bestD) { best = it; bestD = d; }
      }
      return best;
    },

    update(dt) {
      for (const it of items) {
        it.t += dt;
        it.ring.material.opacity = 0.25 + Math.sin(it.t * 3) * 0.15;
      }
    },

    clear() {
      for (const it of items) remove(it);
      items.length = 0;
    },
  };
}

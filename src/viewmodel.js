// First-person Glock-19 and hands, rendered in their own scene so it never clips into walls.
import * as THREE from 'three';
import * as TX from './textures.js';

const HIP = new THREE.Vector3(0.12, -0.105, -0.3);
const ADS = new THREE.Vector3(0, -0.034, -0.32);

export function createViewModel() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
  scene.add(new THREE.HemisphereLight(0xe6efff, 0x4a5030, 2.2));
  const key = new THREE.DirectionalLight(0xfff0d8, 3);
  key.position.set(1, 2, 1.5);
  scene.add(key);

  const root = new THREE.Group();
  const gun = new THREE.Group();
  scene.add(root);
  root.add(gun);

  const polymer = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.75, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x34363b, roughness: 0.4, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.6 });
  const dot = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x47503a, roughness: 0.9 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x5d6942, roughness: 0.95 });
  const box = (w, h, d, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Slide (moves back when firing)
  const slide = new THREE.Group();
  gun.add(slide);
  box(0.028, 0.032, 0.186, steel, 0, 0.012, 0, slide);
  for (let i = 0; i < 6; i++) box(0.0285, 0.024, 0.003, dark, 0, 0.012, 0.062 + i * 0.006, slide);
  box(0.012, 0.004, 0.04, dark, 0.008, 0.0285, -0.005, slide); // ejection port
  box(0.004, 0.006, 0.006, steel, 0, 0.031, -0.084, slide);   // front sight
  box(0.0015, 0.0015, 0.001, dot, 0, 0.032, -0.0874, slide);
  box(0.0065, 0.006, 0.006, steel, -0.0058, 0.031, 0.083, slide); // rear sight halves
  box(0.0065, 0.006, 0.006, steel, 0.0058, 0.031, 0.083, slide);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 10).rotateX(Math.PI / 2), dark);
  muzzle.position.set(0, 0.014, -0.0935);
  slide.add(muzzle);

  // Frame, trigger guard, grip and magazine
  box(0.026, 0.02, 0.17, polymer, 0, -0.013, -0.008, gun);
  box(0.02, 0.008, 0.05, polymer, 0, -0.026, -0.06, gun);
  box(0.006, 0.005, 0.052, polymer, 0, -0.05, -0.026, gun);
  box(0.006, 0.03, 0.005, polymer, 0, -0.036, -0.05, gun);
  const trigger = box(0.004, 0.02, 0.004, dark, 0, -0.032, -0.02, gun);
  trigger.rotation.x = 0.25;
  const grip = new THREE.Group();
  grip.position.set(0, -0.022, 0.058);
  grip.rotation.x = -0.32;
  gun.add(grip);
  box(0.03, 0.11, 0.05, polymer, 0, -0.055, 0, grip);
  for (let i = 0; i < 4; i++) box(0.031, 0.004, 0.044, dark, 0, -0.03 - i * 0.02, 0, grip);
  const mag = new THREE.Group();
  grip.add(mag);
  box(0.024, 0.11, 0.04, polymer, 0, -0.055, 0, mag);
  box(0.032, 0.008, 0.054, polymer, 0, -0.114, 0, mag);

  // Hands
  const rightHand = box(0.048, 0.07, 0.07, glove, 0.006, -0.065, 0.065, gun);
  rightHand.rotation.x = -0.32;
  const rArm = box(0.065, 0.065, 0.36, sleeve, 0.05, -0.13, 0.25, gun);
  rArm.rotation.set(0.4, -0.18, 0);
  const leftHand = box(0.05, 0.06, 0.075, glove, -0.024, -0.072, 0.055, gun);
  leftHand.rotation.set(-0.3, 0, 0.15);
  const lArm = box(0.065, 0.065, 0.36, sleeve, -0.1, -0.15, 0.22, gun);
  lArm.rotation.set(0.35, 0.55, 0);

  // Muzzle flash
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TX.flash(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  flash.position.set(0, 0.014, -0.13);
  flash.visible = false;
  gun.add(flash);
  const flashLight = new THREE.PointLight(0xffaa55, 0, 1.5);
  flashLight.position.set(0, 0.02, -0.15);
  gun.add(flashLight);

  // Ejected shell casings
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8b04f, metalness: 0.2, roughness: 0.35 });
  const shellGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.019, 8);
  const shells = [];

  const s = {
    ads: 0, bob: 0, recoil: 0, slide: 0, swayX: 0, swayY: 0, flashT: 0,
    reloadT: -1, reloadDur: 2.2, drawT: 1, lower: 0,
  };

  return {
    scene, camera, root,
    get adsAmount() { return s.ads; },

    shoot() {
      s.recoil = Math.min(1, s.recoil + 0.7);
      s.slide = 0.028;
      s.flashT = 0.045;
      flash.material.rotation = Math.random() * Math.PI;
      flash.scale.setScalar(0.09 + Math.random() * 0.05);
      const shell = new THREE.Mesh(shellGeo, brass);
      gun.localToWorld(shell.position.set(0.012, 0.03, -0.005));
      root.parent.worldToLocal(shell.position);
      shell.userData = {
        v: new THREE.Vector3(0.6 + Math.random() * 0.3, 0.8 + Math.random() * 0.3, 0.15),
        spin: new THREE.Vector3(Math.random() * 20, Math.random() * 20, 0),
        life: 0.7,
      };
      scene.add(shell);
      shells.push(shell);
    },
    reload(duration) {
      s.reloadT = 0;
      s.reloadDur = duration;
    },
    cancelReload() { s.reloadT = -1; mag.position.set(0, 0, 0); mag.visible = true; },
    draw() { s.drawT = 0; this.cancelReload(); },
    resize(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    update(dt, { ads, speed, onGround, lookDX, lookDY, lower }) {
      s.ads += ((ads ? 1 : 0) - s.ads) * Math.min(1, dt * 14);
      s.lower += ((lower ? 1 : 0) - s.lower) * Math.min(1, dt * 8);
      const move = Math.min(1, speed / 5.6) * (onGround ? 1 : 0.3);
      s.bob += dt * (4 + move * 6);
      const bobAmt = move * (1 - s.ads * 0.85);
      s.swayX += (THREE.MathUtils.clamp(-lookDX * 0.0006, -0.03, 0.03) - s.swayX) * Math.min(1, dt * 10);
      s.swayY += (THREE.MathUtils.clamp(lookDY * 0.0006, -0.03, 0.03) - s.swayY) * Math.min(1, dt * 10);
      s.recoil = Math.max(0, s.recoil - dt * 7);
      s.slide = Math.max(0, s.slide - dt * 0.35);
      s.drawT = Math.min(1, s.drawT + dt * 2.5);

      root.position.lerpVectors(HIP, ADS, s.ads);
      root.position.x += Math.sin(s.bob) * 0.009 * bobAmt + s.swayX * (1 - s.ads * 0.7);
      root.position.y += -Math.abs(Math.cos(s.bob)) * 0.008 * bobAmt + s.swayY * (1 - s.ads * 0.7)
        + Math.sin(s.bob * 0.5) * 0.0015 * (1 - move);
      root.position.z += s.recoil * 0.035;
      const draw = 1 - Math.pow(1 - s.drawT, 3);
      root.position.y -= (1 - draw) * 0.25 + s.lower * 0.22;
      root.rotation.set(s.recoil * 0.22 + (1 - draw) * -0.6, 0.05 * (1 - s.ads), 0);
      slide.position.z = s.slide;

      // Reload: tilt the gun, drop the mag, insert a new one, rack the slide.
      gun.rotation.set(0, 0, 0);
      gun.position.set(0, 0, 0);
      if (s.reloadT >= 0) {
        s.reloadT += dt / s.reloadDur;
        const p = s.reloadT;
        const tilt = Math.sin(Math.min(1, p / 0.95) * Math.PI);
        gun.rotation.set(tilt * 0.35, 0, tilt * 0.55);
        gun.position.y = -tilt * 0.03;
        if (p < 0.2) { mag.position.y = 0; mag.visible = true; }
        else if (p < 0.4) { mag.position.y = -(p - 0.2) * 1.5; }
        else if (p < 0.5) { mag.visible = false; }
        else if (p < 0.68) { mag.visible = true; mag.position.y = -(0.68 - p) * 1.2; }
        else { mag.position.y = 0; }
        if (p > 0.76 && p < 0.9) slide.position.z = Math.sin(((p - 0.76) / 0.14) * Math.PI) * 0.03;
        if (p >= 1) { s.reloadT = -1; mag.position.y = 0; mag.visible = true; }
      }

      s.flashT -= dt;
      flash.visible = s.flashT > 0;
      flashLight.intensity = s.flashT > 0 ? 0.08 : 0;

      for (let i = shells.length - 1; i >= 0; i--) {
        const sh = shells[i], u = sh.userData;
        u.v.y -= 4 * dt;
        sh.position.addScaledVector(u.v, dt);
        sh.rotation.x += u.spin.x * dt;
        sh.rotation.y += u.spin.y * dt;
        u.life -= dt;
        if (u.life <= 0) {
          scene.remove(sh);
          shells.splice(i, 1);
        }
      }
    },
  };
}

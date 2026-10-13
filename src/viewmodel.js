// First-person weapons and hands, rendered in their own scene so they never clip into walls.
import * as THREE from 'three';
import * as TX from './textures.js?v=9';

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

  const M = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mat = {
    polymer: M(0x3a3c40, 0.75), steel: M(0x34363b, 0.4, 0.15), dark: M(0x0b0b0c, 0.6),
    glove: M(0x47503a, 0.9), sleeve: M(0x5d6942, 0.95), silver: M(0xa7a9ae, 0.3, 0.6),
    wood: M(0x7a4524, 0.7), olive: M(0x4f5b3c, 0.8), black: M(0x1d1e20, 0.55, 0.1),
  };
  const dot = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
  const box = (w, h, d, m, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cyl = (r, len, m, x, y, z, parent) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12).rotateX(Math.PI / 2), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // Pistols: the Glock-19, and a bigger, silver Desert Eagle built from the same parts.
  function buildPistol({ slideMat, frameMat, scale }) {
    const g = new THREE.Group();
    g.scale.setScalar(scale);
    const slide = new THREE.Group();
    g.add(slide);
    box(0.028, 0.032, 0.186, slideMat, 0, 0.012, 0, slide);
    for (let i = 0; i < 6; i++) box(0.0285, 0.024, 0.003, mat.dark, 0, 0.012, 0.062 + i * 0.006, slide);
    box(0.012, 0.004, 0.04, mat.dark, 0.008, 0.0285, -0.005, slide); // ejection port
    box(0.004, 0.006, 0.006, slideMat, 0, 0.031, -0.084, slide);    // front sight
    box(0.0015, 0.0015, 0.001, dot, 0, 0.032, -0.0874, slide);
    box(0.0065, 0.006, 0.006, slideMat, -0.0058, 0.031, 0.083, slide); // rear sight halves
    box(0.0065, 0.006, 0.006, slideMat, 0.0058, 0.031, 0.083, slide);
    cyl(0.0055, 0.004, mat.dark, 0, 0.014, -0.0935, slide);

    box(0.026, 0.02, 0.17, frameMat, 0, -0.013, -0.008, g);
    box(0.02, 0.008, 0.05, frameMat, 0, -0.026, -0.06, g);
    box(0.006, 0.005, 0.052, frameMat, 0, -0.05, -0.026, g);
    box(0.006, 0.03, 0.005, frameMat, 0, -0.036, -0.05, g);
    box(0.004, 0.02, 0.004, mat.dark, 0, -0.032, -0.02, g).rotation.x = 0.25;
    const grip = new THREE.Group();
    grip.position.set(0, -0.022, 0.058);
    grip.rotation.x = -0.32;
    g.add(grip);
    box(0.03, 0.11, 0.05, frameMat, 0, -0.055, 0, grip);
    for (let i = 0; i < 4; i++) box(0.031, 0.004, 0.044, mat.dark, 0, -0.03 - i * 0.02, 0, grip);
    const mag = new THREE.Group();
    grip.add(mag);
    box(0.024, 0.11, 0.04, frameMat, 0, -0.055, 0, mag);
    box(0.032, 0.008, 0.054, frameMat, 0, -0.114, 0, mag);

    box(0.048, 0.07, 0.07, mat.glove, 0.006, -0.065, 0.065, g).rotation.x = -0.32;
    box(0.065, 0.065, 0.36, mat.sleeve, 0.05, -0.13, 0.25, g).rotation.set(0.4, -0.18, 0);
    const support = []; // the left hand and arm, hidden for a one-handed grip
    support.push(box(0.05, 0.06, 0.075, mat.glove, -0.024, -0.072, 0.055, g)); support.at(-1).rotation.set(-0.3, 0, 0.15);
    support.push(box(0.065, 0.065, 0.36, mat.sleeve, -0.1, -0.15, 0.22, g)); support.at(-1).rotation.set(0.35, 0.55, 0);

    return {
      group: g, slide, mag, support, flash: [0, 0.014, -0.13], eject: [0.012, 0.03, -0.005],
      hip: new THREE.Vector3(0.12, -0.105, -0.3), ads: new THREE.Vector3(0, -0.034 * scale, -0.32),
    };
  }

  // Long guns share a layout: receiver, barrel, handguard, grip, magazine, stock.
  function buildRifle(kind) {
    const ak = kind === 'ak47', awp = kind === 'awp', m4 = kind === 'm4';
    const g = new THREE.Group();
    const k = 0.7;
    g.scale.setScalar(k);
    const body = awp ? mat.olive : mat.black;
    const furn = ak ? mat.wood : awp ? mat.olive : mat.polymer;
    const blen = awp ? 0.5 : ak ? 0.34 : m4 ? 0.3 : 0.2;
    const hlen = awp ? 0.22 : ak ? 0.16 : m4 ? 0.18 : 0.14;

    box(0.036, 0.05, 0.24, body, 0, 0, 0.03, g);                 // receiver
    box(0.03, 0.012, 0.2, mat.steel, 0, 0.031, 0.03, g);          // dust cover
    cyl(0.008, blen, mat.dark, 0, 0.008, -0.09 - blen / 2, g);     // barrel
    box(0.04, 0.042, hlen, furn, 0, -0.002, -0.09 - hlen / 2, g); // handguard
    if (ak) cyl(0.006, 0.2, mat.steel, 0, 0.027, -0.19, g);       // gas tube
    let suppressor = null;
    if (m4) {
      box(0.022, 0.008, 0.3, mat.dark, 0, 0.036, -0.04, g);        // top rail
      cyl(0.011, 0.03, mat.dark, 0, 0.008, -0.105 - blen, g);      // flash hider
      suppressor = cyl(0.017, 0.17, mat.dark, 0, 0.008, -0.09 - blen - 0.085, g);
      suppressor.visible = false;
    }
    if (!awp) {
      box(0.004, 0.03, 0.006, mat.steel, 0, 0.03, -0.07 - blen, g); // front sight post
      box(0.0015, 0.0015, 0.001, dot, 0, 0.0445, -0.0735 - blen, g);
      box(0.006, 0.01, 0.008, mat.steel, -0.005, 0.042, 0.1, g);     // rear sight halves
      box(0.006, 0.01, 0.008, mat.steel, 0.005, 0.042, 0.1, g);
    } else {
      cyl(0.018, 0.2, mat.dark, 0, 0.068, 0.02, g);                 // scope tube
      cyl(0.025, 0.05, mat.dark, 0, 0.068, -0.1, g);                // objective bell
      cyl(0.022, 0.04, mat.dark, 0, 0.068, 0.13, g);                // eyepiece
      box(0.014, 0.03, 0.014, mat.steel, 0, 0.042, -0.04, g);       // mounts
      box(0.014, 0.03, 0.014, mat.steel, 0, 0.042, 0.08, g);
    }

    const grip = new THREE.Group();
    grip.position.set(0, -0.025, 0.1);
    grip.rotation.x = -0.35;
    g.add(grip);
    box(0.028, 0.08, 0.035, ak ? mat.wood : furn, 0, -0.04, 0, grip);
    box(0.004, 0.02, 0.004, mat.dark, 0, -0.032, 0.06, g);         // trigger
    box(0.006, 0.005, 0.05, body, 0, -0.045, 0.065, g);            // trigger guard

    const mag = new THREE.Group();
    mag.position.set(0, -0.025, -0.02);
    g.add(mag);
    if (ak) {
      box(0.022, 0.07, 0.045, mat.steel, 0, -0.035, 0, mag).rotation.x = 0.15;
      box(0.022, 0.07, 0.045, mat.steel, 0, -0.095, -0.025, mag).rotation.x = 0.55;
    } else if (m4) {
      box(0.022, 0.12, 0.04, mat.dark, 0, -0.06, -0.005, mag).rotation.x = 0.12;
    } else if (awp) {
      box(0.028, 0.05, 0.07, mat.dark, 0, -0.025, 0, mag);
    } else {
      box(0.018, 0.11, 0.03, mat.dark, 0, -0.055, -0.01, mag).rotation.x = 0.2;
    }

    if (ak) box(0.032, 0.055, 0.15, mat.wood, 0, -0.012, 0.22, g);
    else if (awp) box(0.034, 0.07, 0.15, mat.olive, 0, -0.018, 0.22, g);
    else if (m4) {
      cyl(0.014, 0.12, mat.dark, 0, 0.005, 0.2, g);                 // buffer tube
      box(0.034, 0.06, 0.08, mat.black, 0, -0.008, 0.27, g);       // stock
    } else {
      box(0.006, 0.006, 0.12, mat.steel, -0.012, 0.005, 0.2, g);    // collapsible stock rods
      box(0.006, 0.006, 0.12, mat.steel, 0.012, 0.005, 0.2, g);
      box(0.036, 0.05, 0.012, mat.black, 0, -0.005, 0.26, g);
    }

    const slide = new THREE.Group();                               // charging handle / bolt
    g.add(slide);
    if (awp) {
      box(0.04, 0.006, 0.006, mat.steel, 0.026, 0.012, 0.09, slide);
      cyl(0.008, 0.016, mat.steel, 0.048, 0.012, 0.09, slide);
    } else box(0.02, 0.01, 0.012, mat.steel, 0.026, 0.012, ak ? 0.06 : -0.06, slide);

    box(0.048, 0.07, 0.07, mat.glove, 0.004, -0.06, 0.11, g).rotation.x = -0.35;
    box(0.065, 0.065, 0.37, mat.sleeve, 0.06, -0.155, 0.255, g).rotation.set(0.55, 0.38, 0);
    const support = []; // the left hand and arm, hidden for a one-handed grip
    support.push(box(0.05, 0.05, 0.09, mat.glove, -0.004, -0.04, -0.06 - hlen / 2, g));
    support.push(box(0.065, 0.065, 0.42, mat.sleeve, -0.09, -0.14, 0.03 - hlen / 2, g)); support.at(-1).rotation.set(0.46, -0.5, 0);

    return {
      group: g, slide, mag, support, suppressor, flash: [0, 0.008, -0.13 - blen], eject: [0.03, 0.02, 0.03],
      hip: new THREE.Vector3(0.13, -0.125, -0.4),
      ads: new THREE.Vector3(0, -(awp ? 0.068 : 0.045) * k, -0.34),
    };
  }

  // Uzi: compact, boxy SMG; the magazine goes up through the pistol grip.
  function buildUzi() {
    const g = new THREE.Group();
    const k = 0.75;
    g.scale.setScalar(k);
    box(0.042, 0.055, 0.25, mat.black, 0, 0, 0, g);                 // receiver
    box(0.044, 0.012, 0.25, mat.dark, 0, 0.03, 0, g);               // top cover
    cyl(0.009, 0.07, mat.dark, 0, 0.004, -0.16, g);                 // barrel
    cyl(0.012, 0.02, mat.steel, 0, 0.004, -0.13, g);                // barrel nut
    box(0.004, 0.012, 0.006, mat.steel, 0, 0.042, -0.11, g);        // front sight post
    box(0.0015, 0.0015, 0.001, dot, 0, 0.0475, -0.1135, g);
    box(0.005, 0.012, 0.006, mat.steel, -0.005, 0.042, 0.11, g);    // rear sight halves
    box(0.005, 0.012, 0.006, mat.steel, 0.005, 0.042, 0.11, g);
    const grip = new THREE.Group();
    grip.position.set(0, -0.028, 0.02);
    grip.rotation.x = -0.12;
    g.add(grip);
    box(0.032, 0.1, 0.042, mat.polymer, 0, -0.05, 0, grip);
    const mag = new THREE.Group();
    grip.add(mag);
    box(0.022, 0.07, 0.03, mat.steel, 0, -0.12, 0, mag);
    box(0.004, 0.02, 0.004, mat.dark, 0, -0.04, -0.03, g);          // trigger
    box(0.006, 0.005, 0.05, mat.black, 0, -0.06, -0.025, g);        // trigger guard
    box(0.006, 0.01, 0.16, mat.steel, 0.024, -0.01, 0.06, g);       // folded stock
    box(0.006, 0.03, 0.006, mat.steel, 0.024, -0.02, 0.14, g);
    const slide = new THREE.Group();                                // cocking knob on top
    g.add(slide);
    box(0.012, 0.012, 0.016, mat.steel, 0, 0.038, 0.03, slide);

    box(0.048, 0.07, 0.06, mat.glove, 0.004, -0.075, 0.02, g).rotation.x = -0.12;
    box(0.065, 0.065, 0.37, mat.sleeve, 0.06, -0.155, 0.2, g).rotation.set(0.55, 0.38, 0);
    const support = []; // the left hand and arm, hidden for a one-handed grip
    support.push(box(0.05, 0.05, 0.08, mat.glove, -0.004, -0.04, -0.1, g));
    support.push(box(0.065, 0.065, 0.42, mat.sleeve, -0.09, -0.14, -0.03, g)); support.at(-1).rotation.set(0.46, -0.5, 0);
    return {
      group: g, slide, mag, support, suppressor: null, flash: [0, 0.004, -0.21], eject: [0.03, 0.02, 0],
      hip: new THREE.Vector3(0.13, -0.12, -0.36), ads: new THREE.Vector3(0, -0.046 * k, -0.3),
    };
  }

  // Tavor TAR-21: bullpup (the magazine sits behind the grip) with a red-dot sight.
  function buildTavor() {
    const g = new THREE.Group();
    const k = 0.7;
    g.scale.setScalar(k);
    box(0.046, 0.075, 0.5, mat.olive, 0, -0.008, 0.06, g);          // body, stock included
    box(0.048, 0.085, 0.015, mat.dark, 0, -0.01, 0.31, g);          // butt pad
    box(0.03, 0.012, 0.3, mat.dark, 0, 0.034, -0.03, g);            // top rail
    cyl(0.009, 0.14, mat.dark, 0, 0.005, -0.25, g);                 // barrel
    cyl(0.012, 0.03, mat.dark, 0, 0.005, -0.33, g);                 // flash hider
    // Red-dot sight: an open frame with the dot in the middle.
    box(0.03, 0.008, 0.06, mat.dark, 0, 0.044, -0.02, g);
    box(0.004, 0.036, 0.06, mat.dark, -0.013, 0.066, -0.02, g);
    box(0.004, 0.036, 0.06, mat.dark, 0.013, 0.066, -0.02, g);
    box(0.03, 0.006, 0.06, mat.dark, 0, 0.087, -0.02, g);
    box(0.002, 0.002, 0.001, new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0, 0.066, -0.05, g);
    // Full-hand trigger guard running forward from the grip.
    box(0.03, 0.008, 0.14, mat.olive, 0, -0.1, -0.09, g);
    box(0.03, 0.06, 0.01, mat.olive, 0, -0.07, -0.16, g);
    const grip = new THREE.Group();
    grip.position.set(0, -0.045, -0.04);
    grip.rotation.x = -0.3;
    g.add(grip);
    box(0.03, 0.09, 0.04, mat.polymer, 0, -0.045, 0, grip);
    const mag = new THREE.Group();
    mag.position.set(0, -0.045, 0.07);
    g.add(mag);
    box(0.024, 0.1, 0.05, mat.dark, 0, -0.05, 0, mag).rotation.x = 0.1;
    const slide = new THREE.Group();                                // charging handle
    g.add(slide);
    box(0.01, 0.012, 0.02, mat.steel, -0.026, 0.01, -0.12, slide);

    box(0.048, 0.07, 0.06, mat.glove, 0.004, -0.085, -0.03, g).rotation.x = -0.3;
    box(0.065, 0.065, 0.37, mat.sleeve, 0.06, -0.17, 0.13, g).rotation.set(0.55, 0.38, 0);
    const support = []; // the left hand and arm, hidden for a one-handed grip
    support.push(box(0.05, 0.05, 0.08, mat.glove, -0.004, -0.03, -0.17, g));
    support.push(box(0.065, 0.065, 0.42, mat.sleeve, -0.09, -0.12, -0.1, g)); support.at(-1).rotation.set(0.46, -0.5, 0);
    return {
      group: g, slide, mag, support, suppressor: null, flash: [0, 0.005, -0.36], eject: [0.03, 0.01, 0.1],
      hip: new THREE.Vector3(0.13, -0.125, -0.38), ads: new THREE.Vector3(0, -0.066 * k, -0.47), // bullpup: held further out so the stock stays out of view
    };
  }

  const models = {
    glock: buildPistol({ slideMat: mat.steel, frameMat: mat.polymer, scale: 1 }),
    deagle: buildPistol({ slideMat: mat.silver, frameMat: mat.black, scale: 1.12 }),
    mp5: buildRifle('mp5'),
    ak47: buildRifle('ak47'),
    m4: buildRifle('m4'),
    uzi: buildUzi(),
    tavor: buildTavor(),
    awp: buildRifle('awp'),
  };
  for (const m of Object.values(models)) {
    m.group.visible = false;
    gun.add(m.group);
  }
  let active = models.glock;
  active.group.visible = true;

  // Muzzle flash, moved to whichever gun is out
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TX.flash(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  flash.visible = false;
  const flashLight = new THREE.PointLight(0xffaa55, 0, 1.5);
  const placeFlash = () => {
    active.group.add(flash, flashLight);
    flash.position.set(...active.flash);
    flashLight.position.set(active.flash[0], active.flash[1] + 0.006, active.flash[2] - 0.02);
  };
  placeFlash();

  // Ejected shell casings
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8b04f, metalness: 0.2, roughness: 0.35 });
  const shellGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.019, 8);
  const shells = [];

  const s = {
    ads: 0, bob: 0, recoil: 0, slide: 0, swayX: 0, swayY: 0, flashT: 0,
    reloadT: -1, reloadDur: 2.2, drawT: 1, lower: 0, attachT: 0, sloppy: false,
  };

  return {
    scene, camera, root,
    get adsAmount() { return s.ads; },

    setWeapon(id) {
      active.group.visible = false;
      active = models[id] || models.glock;
      active.group.visible = true;
      placeFlash();
      this.draw();
    },
    // Attackers' grip: one hand, gun tipped on its side and held off to the right, loose and wobbly.
    setSloppy(on) {
      s.sloppy = on;
      for (const m of Object.values(models)) for (const part of m.support) part.visible = !on;
    },
    // Shows or hides the M4's suppressor; animate tilts the gun while it's screwed on or off.
    setSuppressor(on, animate = false) {
      if (models.m4.suppressor) models.m4.suppressor.visible = on;
      if (animate) s.attachT = 1;
    },
    shoot(kick = 0.7, silent = false) {
      s.recoil = Math.min(1, s.recoil + kick);
      s.slide = 0.028;
      s.flashT = silent ? 0 : 0.045;
      flash.material.rotation = Math.random() * Math.PI;
      flash.scale.setScalar(0.09 + Math.random() * 0.05);
      const shell = new THREE.Mesh(shellGeo, brass);
      active.group.localToWorld(shell.position.set(...active.eject));
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
    cancelReload() { s.reloadT = -1; active.mag.position.set(0, 0, 0); active.mag.visible = true; },
    draw() { s.drawT = 0; this.cancelReload(); },
    resize(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    update(dt, { ads, speed, onGround, lookDX, lookDY, lower }) {
      const { slide, mag } = active;
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

      root.position.lerpVectors(active.hip, active.ads, s.ads);
      root.position.x += Math.sin(s.bob) * 0.009 * bobAmt + s.swayX * (1 - s.ads * 0.7);
      root.position.y += -Math.abs(Math.cos(s.bob)) * 0.008 * bobAmt + s.swayY * (1 - s.ads * 0.7)
        + Math.sin(s.bob * 0.5) * 0.0015 * (1 - move);
      root.position.z += s.recoil * 0.035;
      const draw = 1 - Math.pow(1 - s.drawT, 3);
      root.position.y -= (1 - draw) * 0.25 + s.lower * 0.22;
      root.rotation.set(s.recoil * 0.22 + (1 - draw) * -0.6, 0.05 * (1 - s.ads), 0);
      slide.position.z = s.slide;
      if (s.sloppy) {
        // Even when aiming the gun stays tipped over, so the sights never quite line up.
        const loose = 1 - s.ads * 0.4;
        // Aiming only raises the gun a little; it stays off to the right instead of lining up with your eye.
        root.position.x += 0.05 * loose + 0.07 * s.ads;
        root.position.y -= 0.035 * loose + 0.025 * s.ads;
        root.position.z -= 0.06 * s.ads;
        root.rotation.z -= 1.0 * (1 - s.ads * 0.35);
        root.rotation.y += 0.1 * loose;
        root.rotation.x += s.recoil * 0.15 + Math.sin(s.bob * 0.7) * 0.02;
        root.rotation.z += Math.sin(s.bob * 0.9) * 0.03;
      }
      if (s.attachT > 0) {
        s.attachT = Math.max(0, s.attachT - dt / 1.2);
        const a = Math.sin((1 - s.attachT) * Math.PI);
        root.rotation.z += a * 0.5;
        root.rotation.y -= a * 0.35;
        root.position.y -= a * 0.03;
      }

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

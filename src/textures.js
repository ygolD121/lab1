// Procedural canvas textures, so the game ships without any image assets.
import * as THREE from 'three';

export function rng(seed = 1) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(size, draw, { repeat = 1, w, h, clamp = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w || size;
  c.height = h || size;
  draw(c.getContext('2d', { willReadFrequently: true }), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  const wrap = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapS = t.wrapT = wrap;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Draws a shape at (x, y) plus its wrapped copies so the tile has no seams.
function wrapDraw(s, x, y, rad, fn) {
  for (const ox of [-s, 0, s]) {
    for (const oy of [-s, 0, s]) {
      const px = x + ox, py = y + oy;
      if (px + rad < 0 || px - rad > s || py + rad < 0 || py - rad > s) continue;
      fn(px, py);
    }
  }
}

function speckle(g, s, r, n, colors, min, max, alpha = 1) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.35 + r() * 0.65);
    g.fillStyle = colors[(r() * colors.length) | 0];
    const rad = min + r() * (max - min);
    const x = r() * s, y = r() * s;
    wrapDraw(s, x, y, rad, (px, py) => {
      g.beginPath();
      g.arc(px, py, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.globalAlpha = 1;
}

function leaves(g, s, r, n, colors) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rx = 3 + r() * 4, rot = r() * Math.PI;
    const col = colors[(r() * colors.length) | 0];
    g.globalAlpha = 0.65 + r() * 0.35;
    wrapDraw(s, x, y, rx, (px, py) => {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(px, py, rx, rx * 0.45, rot, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.globalAlpha = 1;
}

function needles(g, s, r, n, colors) {
  g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, a = r() * Math.PI, l = 4 + r() * 7;
    g.strokeStyle = colors[(r() * colors.length) | 0];
    g.globalAlpha = 0.5 + r() * 0.4;
    wrapDraw(s, x, y, l, (px, py) => {
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      g.stroke();
    });
  }
  g.globalAlpha = 1;
}

export const dirt = () => make(512, (g, s) => {
  const r = rng(7);
  g.fillStyle = '#76603f';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 900, ['#6a5337', '#86704d', '#5b4830', '#8f7b58'], 4, 16, 0.45);
  speckle(g, s, r, 6000, ['#4c3c29', '#9c8764', '#6c583e', '#3e3122'], 0.6, 2, 0.8);
  for (let i = 0; i < 80; i++) {
    const x = r() * s, y = r() * s, rx = 2 + r() * 5, ry = rx * (0.6 + r() * 0.4), rot = r() * 3;
    const c = (110 + r() * 60) | 0;
    wrapDraw(s, x, y, rx, (px, py) => {
      g.fillStyle = `rgb(${c},${c - 6},${c - 16})`;
      g.beginPath();
      g.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.beginPath();
      g.ellipse(px - rx * 0.25, py - ry * 0.3, rx * 0.4, ry * 0.3, rot, 0, Math.PI * 2);
      g.fill();
    });
  }
  leaves(g, s, r, 110, ['#a4621f', '#c08a2c', '#7e8a2c', '#8b4419', '#6b3a17']);
  needles(g, s, r, 260, ['#5a4026', '#6e5230', '#3f2d1a']);
});

export const grass = () => make(512, (g, s) => {
  const r = rng(3);
  g.fillStyle = '#3b5425';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 400, ['#466330', '#34501f', '#52703a', '#2f4520'], 8, 24, 0.4);
  g.lineWidth = 1.2;
  for (let i = 0; i < 9000; i++) {
    const x = r() * s, y = r() * s, l = 3 + r() * 7, dx = (r() - 0.5) * 3;
    const v = r();
    g.strokeStyle = v < 0.3 ? '#5f8540' : v < 0.6 ? '#2e4a1c' : v < 0.9 ? '#4a6d2f' : '#7d9a4f';
    g.globalAlpha = 0.6 + r() * 0.4;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + dx, y - l);
    g.stroke();
  }
  g.globalAlpha = 1;
}, { repeat: 70 });

export const flagstone = () => make(512, (g, s) => {
  const r = rng(21);
  g.fillStyle = '#3c4234';
  g.fillRect(0, 0, s, s);
  const n = 4, cs = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const inset = 3 + r() * 4, v = (92 + r() * 38) | 0;
      g.fillStyle = `rgb(${v},${v + 3},${v - 8})`;
      g.beginPath();
      g.roundRect(i * cs + inset, j * cs + inset, cs - inset * 2, cs - inset * 2, 10 + r() * 8);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 1.5;
      g.beginPath();
      const cx = i * cs + cs * (0.2 + r() * 0.6), cy = j * cs + cs * (0.2 + r() * 0.6);
      g.moveTo(cx, cy);
      g.lineTo(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 50);
      g.stroke();
    }
  }
  speckle(g, s, r, 4000, ['#2a2d25', '#a8aa98', '#5d6150'], 0.6, 2, 0.35);
  for (let i = 0; i < 160; i++) {
    const seamX = Math.round(r() * n) * cs + (r() - 0.5) * 10;
    const y = r() * s, horizontal = r() < 0.5, rad = 3 + r() * 9;
    g.fillStyle = r() < 0.5 ? '#4b6b2c' : '#3d5a24';
    g.globalAlpha = 0.5;
    g.beginPath();
    if (horizontal) g.arc(y, seamX, rad, 0, Math.PI * 2);
    else g.arc(seamX, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  leaves(g, s, r, 30, ['#a4621f', '#c08a2c', '#8b4419']);
});

export const stoneWall = () => make(512, (g, s) => {
  const r = rng(5);
  g.fillStyle = '#5f5847';
  g.fillRect(0, 0, s, s);
  const rows = 8, cols = 4, rh = s / rows, bw = s / cols;
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * bw / 2;
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + off, y = row * rh;
      g.fillStyle = `hsl(${36 + r() * 10},${18 + r() * 12}%,${44 + r() * 12}%)`;
      g.fillRect(x + 2, y + 2, bw - 4, rh - 4);
      g.fillStyle = 'rgba(255,255,255,0.09)';
      g.fillRect(x + 2, y + 2, bw - 4, 4);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x + 2, y + rh - 7, bw - 4, 5);
    }
  }
  speckle(g, s, r, 5000, ['#3e3a2e', '#b9ad8d', '#7a705a'], 0.6, 2, 0.3);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(30,30,20,${0.04 + r() * 0.08})`;
    g.fillRect(r() * s, r() * s * 0.6, 2 + r() * 5, 30 + r() * 140);
  }
  let grad = g.createLinearGradient(0, s * 0.5, 0, s);
  grad.addColorStop(0, 'rgba(52,78,34,0)');
  grad.addColorStop(1, 'rgba(46,72,28,0.85)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  grad = g.createLinearGradient(0, 0, 0, s * 0.14);
  grad.addColorStop(0, 'rgba(58,84,38,0.6)');
  grad.addColorStop(1, 'rgba(58,84,38,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 120; i++) {
    const y = s * (0.55 + r() * 0.45), x = r() * s, rad = 4 + r() * 16;
    g.fillStyle = r() < 0.5 ? 'rgba(70,104,42,0.35)' : 'rgba(40,62,24,0.35)';
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
});

export const logWall = () => make(512, (g, s) => {
  const r = rng(9);
  const rows = 9, rh = s / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * rh, tone = r() * 14 - 7;
    const grad = g.createLinearGradient(0, y, 0, y + rh);
    grad.addColorStop(0, '#2b1c10');
    grad.addColorStop(0.18, `hsl(26,38%,${30 + tone}%)`);
    grad.addColorStop(0.5, `hsl(28,36%,${38 + tone}%)`);
    grad.addColorStop(0.82, `hsl(25,38%,${27 + tone}%)`);
    grad.addColorStop(1, '#22160c');
    g.fillStyle = grad;
    g.fillRect(0, y, s, rh);
    for (let k = 0; k < 70; k++) {
      g.strokeStyle = `rgba(28,16,6,${0.15 + r() * 0.3})`;
      g.lineWidth = 1 + r() * 2;
      const x = r() * s, yy = y + rh * (0.15 + r() * 0.7), len = 20 + r() * 90;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x + len, yy + (r() - 0.5) * 3);
      g.stroke();
    }
    if (r() < 0.6) {
      g.fillStyle = 'rgba(25,14,6,0.6)';
      g.beginPath();
      g.ellipse(r() * s, y + rh / 2, 6 + r() * 6, 4 + r() * 3, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const grad = g.createLinearGradient(0, s * 0.65, 0, s);
  grad.addColorStop(0, 'rgba(52,78,34,0)');
  grad.addColorStop(1, 'rgba(46,72,28,0.7)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
});

export const wallTop = () => make(256, (g, s) => {
  const r = rng(13);
  g.fillStyle = '#2d3a22';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 900, ['#3b4d2a', '#24301a', '#4a3a24', '#55683a'], 1, 5, 0.6);
  needles(g, s, r, 200, ['#5a4026', '#6e5230']);
});

export const crate = () => make(512, (g, s) => {
  const r = rng(17);
  g.fillStyle = '#9b7347';
  g.fillRect(0, 0, s, s);
  const planks = 6, ph = s / planks;
  for (let i = 0; i < planks; i++) {
    g.fillStyle = `hsl(31,${38 + r() * 8}%,${40 + r() * 8}%)`;
    g.fillRect(0, i * ph + 2, s, ph - 4);
    g.fillStyle = '#5e4024';
    g.fillRect(0, i * ph, s, 3);
    for (let k = 0; k < 25; k++) {
      g.fillStyle = `rgba(60,38,18,${0.1 + r() * 0.15})`;
      g.fillRect(r() * s, i * ph + 4 + r() * (ph - 8), 30 + r() * 120, 1.5);
    }
  }
  g.strokeStyle = '#6b4a29';
  g.lineWidth = 40;
  g.strokeRect(20, 20, s - 40, s - 40);
  g.strokeStyle = 'rgba(30,18,8,0.5)';
  g.lineWidth = 3;
  g.strokeRect(41, 41, s - 82, s - 82);
  g.save();
  g.translate(s / 2, s / 2);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#7a5530';
  g.fillRect(-s * 0.62, -20, s * 1.24, 40);
  g.fillStyle = 'rgba(30,18,8,0.35)';
  g.fillRect(-s * 0.62, 18, s * 1.24, 3);
  g.restore();
  g.fillStyle = '#3a3a3a';
  for (const [x, y] of [[20, 20], [s - 20, 20], [20, s - 20], [s - 20, s - 20]]) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  g.textAlign = 'center';
  g.fillStyle = 'rgba(25,16,8,0.6)';
  g.font = `${s * 0.12}px "Black Ops One", Impact, sans-serif`;
  g.fillText('JUST', s / 2, s * 0.44);
  g.fillText('SHOOT IT', s / 2, s * 0.58);
  g.font = `${s * 0.05}px "Black Ops One", Impact, sans-serif`;
  g.fillStyle = 'rgba(200,80,20,0.6)';
  g.fillText('9×19 · HANDLE WITH CARE', s / 2, s * 0.68);
});

export const bark = () => make(256, (g, s) => {
  const r = rng(19);
  g.fillStyle = '#4b3725';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(25,15,8,${0.2 + r() * 0.4})` : `rgba(120,95,70,${0.1 + r() * 0.2})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 4, 10 + r() * 60);
  }
});

export const planks = () => make(256, (g, s) => {
  const r = rng(23);
  const n = 5, w = s / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = `hsl(27,${30 + r() * 10}%,${26 + r() * 8}%)`;
    g.fillRect(i * w, 0, w, s);
    g.fillStyle = 'rgba(15,8,3,0.7)';
    g.fillRect(i * w, 0, 3, s);
    for (let k = 0; k < 18; k++) {
      g.fillStyle = `rgba(20,10,4,${0.1 + r() * 0.2})`;
      g.fillRect(i * w + 4 + r() * (w - 8), r() * s, 1.5, 20 + r() * 80);
    }
  }
});

// Spray-paint text (bombsite letters, arrows, branding) on a transparent canvas.
export function spray(text, color = '#ff7a18', { w = 512, h = 256, font = 170, seed = 1 } = {}) {
  return make(0, (g, W, H) => {
    const r = rng(seed);
    g.font = `${font}px "Black Ops One", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 16;
    g.globalAlpha = 0.92;
    g.fillText(text, W / 2, H / 2);
    g.shadowBlur = 3;
    let drips = 0;
    for (let i = 0; i < 400 && drips < 9; i++) {
      const x = (W * (0.1 + r() * 0.8)) | 0, y = (H * (0.5 + r() * 0.25)) | 0;
      if (g.getImageData(x, y, 1, 1).data[3] > 200) {
        g.fillRect(x, y, 2 + r() * 2, 12 + r() * 50);
        drips++;
      }
    }
    g.globalAlpha = 0.35;
    for (let i = 0; i < 500; i++) {
      g.beginPath();
      g.arc(W / 2 + (r() - 0.5) * W * 0.85, H / 2 + (r() - 0.5) * H * 0.8, r() * 1.4, 0, Math.PI * 2);
      g.fill();
    }
  }, { w, h, clamp: true });
}

export const soft = () => make(64, (g, s) => {
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
}, { clamp: true });

export const flash = () => make(128, (g, s) => {
  const c = s / 2;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    g.save();
    g.translate(c, c);
    g.rotate((i / 6) * Math.PI * 2 + 0.3);
    const grad = g.createLinearGradient(0, 0, c, 0);
    grad.addColorStop(0, 'rgba(255,240,200,1)');
    grad.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -6);
    g.lineTo(c * (0.7 + (i % 2) * 0.3), 0);
    g.lineTo(0, 6);
    g.fill();
    g.restore();
  }
  const grad = g.createRadialGradient(c, c, 0, c, c, c * 0.55);
  grad.addColorStop(0, 'rgba(255,255,235,1)');
  grad.addColorStop(0.4, 'rgba(255,190,90,0.8)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
}, { clamp: true });

export const hole = () => make(64, (g, s) => {
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(10,8,5,1)');
  grad.addColorStop(0.35, 'rgba(20,15,10,0.9)');
  grad.addColorStop(0.6, 'rgba(40,30,20,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
}, { clamp: true });

export const bombFace = () => make(0, (g, W, H) => {
  g.fillStyle = '#3d4530';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#141612';
  g.fillRect(14, 14, W * 0.55, H * 0.42);
  g.fillStyle = '#ff3b2a';
  g.font = `bold ${H * 0.3}px monospace`;
  g.textBaseline = 'middle';
  g.fillText('7355608', 22, 14 + H * 0.21);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = '#20231b';
    g.fillRect(W * 0.62 + (i % 3) * 28, 14 + ((i / 3) | 0) * 26, 22, 20);
  }
  g.fillStyle = '#ff7a18';
  g.font = `${H * 0.17}px "Black Ops One", Impact, sans-serif`;
  g.fillText('JUST SHOOT IT', 16, H * 0.8);
}, { w: 256, h: 128, clamp: true });

// ---------- Jaffa ----------
export const limestone = () => make(512, (g, s) => {
  const r = rng(31);
  g.fillStyle = '#b9a07a';
  g.fillRect(0, 0, s, s);
  const rows = 7, rh = s / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * 120;
    while (x < s) {
      const bw = 90 + r() * 110, y = row * rh;
      g.fillStyle = `hsl(${34 + r() * 8},${28 + r() * 14}%,${60 + r() * 14}%)`;
      g.beginPath();
      g.roundRect(x + 3, y + 3, bw - 6, rh - 6, 6);
      g.fill();
      g.fillStyle = 'rgba(255,248,230,0.18)';
      g.fillRect(x + 4, y + 4, bw - 8, 5);
      g.fillStyle = 'rgba(90,64,34,0.18)';
      g.fillRect(x + 4, y + rh - 10, bw - 8, 6);
      x += bw;
    }
  }
  speckle(g, s, r, 6000, ['#8c7452', '#e8d8b8', '#a88c64', '#6e5a40'], 0.6, 2.2, 0.35);
  for (let i = 0; i < 50; i++) {
    g.fillStyle = `rgba(90,70,45,${0.04 + r() * 0.08})`;
    g.fillRect(r() * s, r() * s * 0.5, 2 + r() * 6, 40 + r() * 160);
  }
  const grad = g.createLinearGradient(0, s * 0.7, 0, s);
  grad.addColorStop(0, 'rgba(110,80,45,0)');
  grad.addColorStop(1, 'rgba(110,80,45,0.45)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
});

// Whitewashed plaster with an arched window and blue shutters.
export const jaffaHouse = () => make(512, (g, s) => {
  const r = rng(37);
  g.fillStyle = '#e6d6b8';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 500, ['#d9c6a2', '#efe3cb', '#cdb894'], 8, 30, 0.35);
  speckle(g, s, r, 4000, ['#b8a27c', '#f6eedc'], 0.6, 2, 0.3);
  // patches where the plaster fell off and the stone shows
  for (let i = 0; i < 6; i++) {
    const x = r() * s, y = s * (0.55 + r() * 0.4), w = 30 + r() * 70, h = 20 + r() * 40;
    g.fillStyle = '#c4a678';
    g.beginPath();
    g.ellipse(x, y, w / 2, h / 2, r(), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(120,95,60,0.5)';
    g.lineWidth = 1.5;
    g.stroke();
  }
  const win = (cx, top, w, h) => {
    g.fillStyle = '#b29a72';
    g.beginPath();
    g.moveTo(cx - w / 2 - 10, top + h + 10);
    g.lineTo(cx - w / 2 - 10, top + w / 2);
    g.arc(cx, top + w / 2, w / 2 + 10, Math.PI, 0);
    g.lineTo(cx + w / 2 + 10, top + h + 10);
    g.fill();
    g.fillStyle = '#2f6a9e';
    g.beginPath();
    g.moveTo(cx - w / 2, top + h);
    g.lineTo(cx - w / 2, top + w / 2);
    g.arc(cx, top + w / 2, w / 2, Math.PI, 0);
    g.lineTo(cx + w / 2, top + h);
    g.fill();
    g.strokeStyle = '#1d4466';
    g.lineWidth = 2;
    for (let y = top + w / 2; y < top + h; y += 9) {
      g.beginPath();
      g.moveTo(cx - w / 2, y);
      g.lineTo(cx + w / 2, y);
      g.stroke();
    }
    g.fillStyle = '#1d4466';
    g.fillRect(cx - 1.5, top, 3, h);
    g.fillStyle = '#a58c64';
    g.fillRect(cx - w / 2 - 16, top + h + 8, w + 32, 10);
  };
  win(s * 0.3, s * 0.1, 70, 120);
  win(s * 0.72, s * 0.1, 70, 120);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(110,85,50,${0.03 + r() * 0.06})`;
    g.fillRect(r() * s, s * 0.35 + r() * s * 0.2, 2 + r() * 4, 40 + r() * 120);
  }
  const grad = g.createLinearGradient(0, s * 0.72, 0, s);
  grad.addColorStop(0, 'rgba(120,90,55,0)');
  grad.addColorStop(1, 'rgba(120,90,55,0.4)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
});

export const cobbles = () => make(512, (g, s) => {
  const r = rng(41);
  g.fillStyle = '#6f6150';
  g.fillRect(0, 0, s, s);
  const n = 10, cs = s / n;
  for (let row = 0; row < n; row++) {
    for (let c = 0; c <= n; c++) {
      const x = c * cs + (row % 2) * cs / 2, y = row * cs, v = 150 + r() * 50;
      wrapDraw(s, x + cs / 2, y + cs / 2, cs, (px, py) => {
        g.fillStyle = `rgb(${v | 0},${(v - 12) | 0},${(v - 34) | 0})`;
        g.beginPath();
        g.roundRect(px - cs / 2 + 3, py - cs / 2 + 3, cs - 6, cs - 6, 12);
        g.fill();
        g.fillStyle = 'rgba(255,250,235,0.12)';
        g.beginPath();
        g.roundRect(px - cs / 2 + 6, py - cs / 2 + 5, cs - 14, 6, 3);
        g.fill();
      });
    }
  }
  speckle(g, s, r, 5000, ['#4f4436', '#d8c8a8', '#8e7c62'], 0.6, 2, 0.35);
  speckle(g, s, r, 200, ['#c9b38a', '#a68f6a'], 6, 22, 0.25);
});

export const pavers = () => make(512, (g, s) => {
  const r = rng(43);
  g.fillStyle = '#8c7a5e';
  g.fillRect(0, 0, s, s);
  const n = 4, cs = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = 178 + r() * 40;
      g.fillStyle = `rgb(${v | 0},${(v - 16) | 0},${(v - 42) | 0})`;
      g.fillRect(i * cs + 3, j * cs + 3, cs - 6, cs - 6);
      g.strokeStyle = 'rgba(110,80,45,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(i * cs + cs / 2, j * cs + cs / 2, cs * 0.3, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(i * cs + cs / 2, j * cs + cs * 0.2);
      g.lineTo(i * cs + cs * 0.8, j * cs + cs / 2);
      g.lineTo(i * cs + cs / 2, j * cs + cs * 0.8);
      g.lineTo(i * cs + cs * 0.2, j * cs + cs / 2);
      g.closePath();
      g.stroke();
    }
  }
  speckle(g, s, r, 6000, ['#6e5c44', '#efe2c6', '#a48e6c'], 0.6, 2, 0.3);
});

export const sand = () => make(512, (g, s) => {
  const r = rng(47);
  g.fillStyle = '#d6c094';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 600, ['#cbb284', '#e2cfa6', '#c2a878'], 10, 30, 0.35);
  speckle(g, s, r, 9000, ['#a8905f', '#f0e2c2', '#b89e70'], 0.5, 1.6, 0.5);
}, { repeat: 60 });

export const roofTop = () => make(256, (g, s) => {
  const r = rng(53);
  g.fillStyle = '#cbbb9c';
  g.fillRect(0, 0, s, s);
  speckle(g, s, r, 300, ['#bba98a', '#d9cbaf', '#a99779'], 4, 18, 0.4);
  speckle(g, s, r, 3000, ['#8f7f62', '#e6dac2'], 0.5, 1.5, 0.4);
});

export function awning(c1, c2) {
  return make(256, (g, s) => {
    const r = rng(59);
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? c1 : c2;
      g.fillRect(i * w, 0, w, s);
    }
    speckle(g, s, r, 1500, ['rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)'], 0.6, 2, 0.15);
  });
}

export const blueWood = () => make(256, (g, s) => {
  const r = rng(61);
  const n = 6, w = s / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = `hsl(${205 + r() * 8},${45 + r() * 10}%,${36 + r() * 6}%)`;
    g.fillRect(i * w, 0, w, s);
    g.fillStyle = 'rgba(10,25,40,0.6)';
    g.fillRect(i * w, 0, 2, s);
    for (let k = 0; k < 10; k++) {
      g.fillStyle = 'rgba(200,180,140,0.35)';
      g.fillRect(i * w + r() * w, r() * s, 2 + r() * 6, 3 + r() * 14);
    }
  }
});

export const clockFace = () => make(256, (g, s) => {
  g.fillStyle = '#d8c7a3';
  g.fillRect(0, 0, s, s);
  const c = s / 2;
  g.fillStyle = '#f6f1e4';
  g.beginPath();
  g.arc(c, c, s * 0.42, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2b2b2b';
  g.lineWidth = 6;
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 ? 3 : 7;
    g.beginPath();
    g.moveTo(c + Math.sin(a) * s * 0.33, c - Math.cos(a) * s * 0.33);
    g.lineTo(c + Math.sin(a) * s * 0.39, c - Math.cos(a) * s * 0.39);
    g.stroke();
  }
  g.lineCap = 'round';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(c, c);
  g.lineTo(c + s * 0.17, c - s * 0.1);
  g.stroke();
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(c, c);
  g.lineTo(c - s * 0.05, c - s * 0.3);
  g.stroke();
});

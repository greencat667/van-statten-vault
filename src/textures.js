// Procedural textures: everything is painted on canvases at start-up, so the
// single HTML file needs no image assets.
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable value noise on a grid, summed over octaves.
function makeNoise(size, seed) {
  const r = rng(seed);
  const grids = {};
  const grid = (n) => grids[n] || (grids[n] = Float32Array.from({ length: n * n }, r));
  const sample = (g, n, x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i = (a, b) => g[((b % n + n) % n) * n + ((a % n + n) % n)];
    const a = i(xi, yi), b = i(xi + 1, yi), c = i(xi, yi + 1), d = i(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  return (x, y, base = 4, oct = 4) => {
    let v = 0, amp = 0.5, n = base, tot = 0;
    for (let o = 0; o < oct; o++) {
      v += sample(grid(n), n, (x / size) * n, (y / size) * n) * amp;
      tot += amp; amp *= 0.5; n *= 2;
    }
    return v / tot;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Fill a canvas from a per-pixel function returning [r,g,b].
function paint(size, fn) {
  const [c, g] = canvas(size);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, gg, b] = fn(x, y);
    const k = (y * size + x) * 4;
    img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const cache = {};
const once = (key, fn) => cache[key] || (cache[key] = fn());

// Carpet: fine loop pile with low-frequency shading. base is [r,g,b].
export function carpet(key, base, seed = 3) {
  return once('carpet' + key, () => {
    const n = makeNoise(256, seed), r = rng(seed + 9);
    const c = paint(256, (x, y) => {
      const lo = n(x, y, 4, 3) - 0.5;
      const fibre = (r() - 0.5) * 0.22 + ((x + y) % 2 ? 0.03 : -0.03);
      const k = 1 + lo * 0.18 + fibre;
      return base.map((v) => Math.max(0, Math.min(255, v * k)));
    });
    return toTex(c);
  });
}

export function carpetBump(seed = 5) {
  return once('carpetBump' + seed, () => {
    const r = rng(seed);
    const c = paint(128, (x, y) => { const v = 110 + r() * 120 + ((x ^ y) & 1) * 20; return [v, v, v]; });
    return toTex(c, [1, 1], false);
  });
}

// Matt painted plaster with soft mottling.
export function plaster(key, base, seed = 7, amt = 0.12) {
  return once('plaster' + key, () => {
    const n = makeNoise(512, seed), r = rng(seed);
    const c = paint(512, (x, y) => {
      const k = 1 + (n(x, y, 3, 5) - 0.5) * amt * 2 + (r() - 0.5) * 0.03;
      return base.map((v) => Math.max(0, Math.min(255, v * k)));
    });
    return toTex(c);
  });
}

// Terracotta wall bay with thin panel joints (V2/V4: dark red-brown panelling).
export function panelWall(seed = 11) {
  return once('panelWall', () => {
    const size = 512, n = makeNoise(size, seed);
    const c = paint(size, (x, y) => {
      const k = 1 + (n(x, y, 4, 4) - 0.5) * 0.22;
      let base = [62, 28, 20];
      if (y % 128 < 2 || x % 256 < 2) base = [34, 16, 11];
      else if (y % 128 < 4) base = [80, 40, 28];
      return base.map((v) => v * k);
    });
    return toTex(c);
  });
}

// Pale beech veneer for case frames.
export function wood(seed = 13) {
  return once('wood', () => {
    const n = makeNoise(256, seed);
    const c = paint(256, (x, y) => {
      const g = Math.sin((x + n(x, y, 2, 3) * 40) * 0.35) * 0.5 + 0.5;
      const k = 0.9 + g * 0.08 + (n(x, y * 0.2, 8, 2) - 0.5) * 0.1;
      return [196 * k, 158 * k, 112 * k];
    });
    return toTex(c);
  });
}

// Board-marked concrete for the Cage.
export function concrete(seed = 17) {
  // Grimy board-marked concrete (Cage walls, V6): green-grey, with run-down
  // water stains under the shuttering joints, soot patches and pitting.
  return once('concrete', () => {
    const size = 512, n = makeNoise(size, seed), m = makeNoise(size, seed + 3), r = rng(seed);
    const streak = Float32Array.from({ length: size }, (_, x) => 0.5 + 0.5 * Math.sin(x * 0.21) * Math.sin(x * 0.047 + 1.3));
    const c = paint(size, (x, y) => {
      const board = Math.floor(y / 42), yb = y % 42;
      const stain = n(x, y, 3, 5), soot = m(x, y, 2, 4);
      let k = 0.8 + stain * 0.26 + (r() - 0.5) * 0.09 + ((board * 37) % 7) * 0.01;
      // Water runs: darker vertical streaks that fade down each board.
      k *= 1 - 0.22 * Math.max(0, streak[x] - 0.55) * (1 - yb / 42) * (n(x, 0, 16, 2) > 0.5 ? 1 : 0.3);
      if (yb < 2) k *= 0.72;
      if (soot > 0.62) k *= 1 - (soot - 0.62) * 1.4;
      const pit = r() < 0.006 ? 0.55 : 1;
      return [112 * k * pit, 112 * k * pit, 90 * k * pit];
    });
    return toTex(c);
  });
}

export function cageFloor(seed = 19) {
  // Scuffed concrete floor: tyre and drag marks, oil stains, dust at the edges.
  return once('cageFloor', () => {
    const size = 512, n = makeNoise(size, seed), m = makeNoise(size, seed + 5), r = rng(seed);
    const c = paint(size, (x, y) => {
      let k = 0.82 + n(x, y, 4, 5) * 0.22 + (r() - 0.5) * 0.07;
      const oil = m(x, y, 3, 4);
      if (oil > 0.64) k *= 1 - (oil - 0.64) * 1.8;
      const scuff = Math.abs(Math.sin((x * 0.7 + y * 0.25) * 0.05 + n(x, y, 2, 2) * 6));
      if (scuff < 0.04) k *= 0.85;
      return [134 * k, 128 * k, 102 * k];
    });
    return toTex(c);
  });
}

// Generic greyscale roughness/bump noise.
export function grime(key, seed = 19, lo = 0.35, hi = 0.85, base = 6) {
  return once('grime' + key, () => {
    const n = makeNoise(256, seed);
    const c = paint(256, (x, y) => { const v = 255 * (lo + (hi - lo) * n(x, y, base, 5)); return [v, v, v]; });
    return toTex(c, [1, 1], false);
  });
}

// Aged bronze for the 2005 Dalek: patches of darker oxidation and wear.
export function bronze(seed = 23, damaged = true) {
  // 2005 Dalek bronze as filmed: a dull, dirty brown-gold with darker grime
  // worked into the low areas and rubbed back to brighter metal at the edges.
  return once('bronze' + damaged, () => {
    const n = makeNoise(512, seed), m = makeNoise(512, seed + 1), q = makeNoise(512, seed + 2), r = rng(seed);
    const c = paint(512, (x, y) => {
      const a = n(x, y, 4, 5), b = m(x, y, 16, 3), w = q(x, y, 40, 2);
      let col = [132, 100, 58];
      const dark = Math.max(0, a - 0.42) * (damaged ? 1.9 : 1.0);
      col = col.map((v, i) => v * (1 - dark * 0.75) + [34, 28, 20][i] * dark * 0.75);
      if (damaged && b > 0.66) col = col.map((v, i) => v * 0.7 + [62, 46, 28][i] * 0.3);    // grime
      if (w > 0.74) col = col.map((v, i) => v * 0.88 + [160, 126, 74][i] * 0.12);           // rubbed metal
      const sp = (r() - 0.5) * 12;
      return col.map((v) => v + sp);
    });
    return toTex(c);
  });
}

// Mottled green hide for the Slitheen arm.
export function slitheenSkin(seed = 29) {
  // Pale olive-khaki hide (production prop photos), mottled darker, fine pores.
  return once('slitheen', () => {
    const n = makeNoise(512, seed), m = makeNoise(512, seed + 4), r = rng(seed);
    const c = paint(512, (x, y) => {
      const a = n(x, y, 4, 5), b = m(x, y, 48, 2);
      const k = 0.86 + a * 0.24;
      let col = [92 * k, 106 * k, 54 * k];    // olive green as filmed
      if (a < 0.4) col = [col[0] * 0.93, col[1] * 0.95, col[2] * 0.9];   // soft mottling
      if (b > 0.7) col = col.map((v) => v * 0.82);                        // pores
      const sp = (r() - 0.5) * 10;
      return col.map((v) => v + sp);
    });
    return toTex(c);
  });
}

// Rock / meteorite fusion crust.
export function rock(key, base, seed = 31) {
  return once('rock' + key, () => {
    const n = makeNoise(256, seed), r = rng(seed);
    const c = paint(256, (x, y) => {
      const k = 0.6 + n(x, y, 8, 5) * 0.7 + (r() - 0.5) * 0.15;
      return base.map((v) => v * k);
    });
    return toTex(c);
  });
}

// Text label rendered to a texture (museum cards, signs).
export function labelTexture(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 256;
  const [c, g] = canvas(w, h);
  g.fillStyle = opts.bg || '#ece4d2';
  g.fillRect(0, 0, w, h);
  if (opts.border !== false) {
    g.strokeStyle = opts.borderColor || 'rgba(60,50,40,.5)';
    g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  }
  g.fillStyle = opts.fg || '#2a241d';
  g.textAlign = opts.align || 'left';
  let y = opts.top || 52;
  lines.forEach((ln, i) => {
    const size = i === 0 ? (opts.titleSize || 34) : (opts.bodySize || 22);
    g.font = `${i === 0 ? 'bold ' : ''}${size}px ${opts.font || 'Georgia, serif'}`;
    g.fillText(ln, opts.align === 'center' ? w / 2 : 28, y);
    y += size * 1.35;
  });
  const t = toTex(c, [1, 1]);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// The TARDIS sign box: white on black.
export function tardisSign() {
  return once('tardisSign', () => {
    const [c, g] = canvas(1024, 128);
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#f2f2ec'; g.textAlign = 'center';
    g.font = 'bold 74px Helvetica, Arial, sans-serif';
    g.fillText('POLICE', 190, 92);
    g.fillText('BOX', 834, 92);
    g.font = 'bold 30px Helvetica, Arial, sans-serif';
    g.fillText('PUBLIC', 512, 56); g.fillText('CALL', 512, 98);
    const t = toTex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

// Small screen texture for Cage monitors: wireframe schematics on purple-white.
export function monitorTexture(seed = 37) {
  return once('monitor' + seed, () => {
    const [c, g] = canvas(256, 160);
    const r = rng(seed);
    g.fillStyle = '#d9d2f2'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = '#4a3e8a'; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const x0 = 10 + i * 82;
      g.strokeRect(x0, 12, 72, 136);
      g.beginPath();
      // A Dalek outline schematic in each panel.
      g.moveTo(x0 + 36, 30); g.arc(x0 + 36, 42, 12, Math.PI, 0); g.lineTo(x0 + 50, 62);
      g.lineTo(x0 + 60, 130); g.lineTo(x0 + 12, 130); g.lineTo(x0 + 22, 62); g.closePath();
      g.stroke();
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x0 + 4, 20 + r() * 120); g.lineTo(x0 + 68, 20 + r() * 120); g.stroke(); }
    }
    const t = toTex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

// Black/yellow hazard stripes.
export function hazard() {
  return once('hazard', () => {
    const [c, g] = canvas(128, 32);
    g.fillStyle = '#d8b21c'; g.fillRect(0, 0, 128, 32);
    g.fillStyle = '#151515';
    for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
    return toTex(c);
  });
}

// ---------- normal maps (tangent space, OpenGL convention) ----------
// h(x, y) returns a tileable height in 0..1 for canvas pixel (x, y).
function normalFrom(size, h, strength) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = h(x, y);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  const c = paint(size, (x, y) => {
    let nx = -(at(x + 1, y) - at(x - 1, y)) * strength;
    let ny = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(nx, ny, 1);
    return [(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  });
  return toTex(c, [1, 1], false);
}

export function plasterNormal() {
  return once('nPlaster', () => {
    const n = makeNoise(512, 201), m = makeNoise(512, 202);
    // Trowelled plaster: soft swirls plus fine grit.
    return normalFrom(512, (x, y) => n(x, y, 3, 4) * 0.7 + m(x, y, 40, 2) * 0.3, 6);
  });
}

export function panelNormal() {
  return once('nPanel', () => {
    const n = makeNoise(512, 203);
    return normalFrom(512, (x, y) => {
      const gy = Math.min(y % 128, 128 - (y % 128)), gx = Math.min(x % 256, 256 - (x % 256));
      const groove = Math.min(1, Math.min(gy, gx) / 3);
      return groove * 0.8 + n(x, y, 8, 4) * 0.2;
    }, 5);
  });
}

export function carpetNormal(seed = 205) {
  return once('nCarpet' + seed, () => {
    const r = rng(seed), n = makeNoise(256, seed);
    const R = Float32Array.from({ length: 256 * 256 }, r);
    return normalFrom(256, (x, y) => {
      const loop = ((x >> 1) + (y >> 1)) % 2 ? 0.7 : 0.35;
      return loop * 0.5 + R[y * 256 + x] * 0.4 + n(x, y, 6, 3) * 0.3;
    }, 3.5);
  });
}

export function woodNormal() {
  return once('nWood', () => {
    const n = makeNoise(256, 207);
    return normalFrom(256, (x, y) => 0.5 + 0.5 * Math.sin((x + n(x, y, 2, 3) * 40) * 0.35), 1.2);
  });
}

export function concreteNormal() {
  return once('nConcrete', () => {
    const n = makeNoise(512, 209), r = rng(210);
    const pits = new Float32Array(512 * 512);
    for (let i = 0; i < 1400; i++) {
      const px = Math.floor(r() * 512), py = Math.floor(r() * 512), rad = 1 + r() * 3;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy); if (d < rad) pits[((py + dy + 512) % 512) * 512 + ((px + dx + 512) % 512)] = 1 - d / rad;
      }
    }
    return normalFrom(512, (x, y) => {
      const board = y % 42 < 2 ? 0.75 : 0.5;          // shuttering joints stand proud
      return board + n(x, y, 5, 5) * 0.35 - pits[y * 512 + x] * 0.45;
    }, 7);
  });
}

export function dentNormal(seed = 211) {
  return once('nDent' + seed, () => {
    const n = makeNoise(256, seed), m = makeNoise(256, seed + 1);
    return normalFrom(256, (x, y) => n(x, y, 3, 3) * 0.6 + m(x, y, 24, 2) * 0.25, 3);
  });
}

export function paintNormal() {
  return once('nPaint', () => {
    const n = makeNoise(256, 213);
    return normalFrom(256, (x, y) => n(x, y, 20, 3), 1.2);
  });
}

// Patchy roughness: worn, slightly polished areas that catch reflections.
export function patchyRough(key, seed, lo, hi, base = 3) {
  return grime('patch' + key, seed, lo, hi, base);
}

// Exhibit models. Each builder returns a THREE.Group with its base at y=0,
// centred on x/z, front facing +z. Units are metres.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import cyberB64 from '../assets/cyberhead.bin';

// ---------- shared helpers ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Cheap 3D value noise for displacement.
function noise3(seed = 1) {
  const h = (x, y, z) => {
    let n = (x * 374761393 + y * 668265263 + z * 1274126177 + seed * 974711) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const s = (t) => t * t * (3 - 2 * t);
  const v = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = s(x - xi), fy = s(y - yi), fz = s(z - zi);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), fx), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), fx), fy),
      L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), fx), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), fx), fy), fz);
  };
  return (x, y, z, oct = 4) => {
    let a = 0.5, f = 1, t = 0, n = 0;
    for (let i = 0; i < oct; i++) { t += v(x * f, y * f, z * f) * a; n += a; a *= 0.5; f *= 2.03; }
    return t / n;
  };
}

// Tube along a curve with a radius function r(u, angle). Used for corrugated
// hose, fingers, tapering carapaces and cables.
export function shapedTube(curve, segs, radial, rFn, closed = false) {
  const frames = curve.computeFrenetFrames(segs, closed);
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, P);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const r = rFn(u, a);
      N.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      uv.push(u, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1); // outward-facing winding
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function lathe(points, segs = 48) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

const curve = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');

function stand(parent, h, r = 0.012, base = [0.12, 0.03, 0.12], mat) {
  const m = mat || std({ color: 0x111113, roughness: 0.5, metalness: 0.3 });
  mesh(new THREE.BoxGeometry(...base), m, parent, 0, base[1] / 2, 0);
  mesh(new THREE.CylinderGeometry(r, r, h, 12), m, parent, 0, base[1] + h / 2, 0);
}

// ---------- A: Cyberman head ----------
// Body and earmuffs: decimated from "Classic Cyberman Helmet" by ZacharyAnnese
// (Thingiverse 6839144, CC BY-SA). Handles and the top lamp are rebuilt here to
// match the head seen in "Dalek": corrugated loops and a holed lamp disc.
function decodeCyber() {
  const bin = Uint8Array.from(atob(cyberB64), (c) => c.charCodeAt(0));
  const dv = new DataView(bin.buffer);
  let o = 0;
  const n = dv.getUint32(o, true); o += 4;
  const parts = [];
  for (let p = 0; p < n; p++) {
    const nv = dv.getUint32(o, true), nt = dv.getUint32(o + 4, true); o += 8;
    const mn = [0, 1, 2].map((i) => dv.getFloat32(o + i * 4, true));
    const mx = [0, 1, 2].map((i) => dv.getFloat32(o + 12 + i * 4, true)); o += 24;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) { const c = i % 3; pos[i] = mn[c] + (dv.getUint16(o, true) / 65535) * (mx[c] - mn[c]); o += 2; }
    const idx = new Uint16Array(nt * 3);
    for (let i = 0; i < nt * 3; i++) { idx[i] = dv.getUint16(o, true); o += 2; }
    if (o % 4) o += 4 - (o % 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    parts.push(toCreasedNormals(g, 0.6));
  }
  return parts;
}
let cyberParts;

// Rounded-rectangle handle path, densely sampled so the corners stay tight.
function squaredLoop(sx) {
  const z = 0.026, top = 0.388, bot = 0.214, xin = 0.055, xout = 0.182, xear = 0.126, r = 0.032;
  const pts = [];
  const line = (a, b, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push(new THREE.Vector3(sx * (a[0] + (b[0] - a[0]) * t), a[1] + (b[1] - a[1]) * t, z)); } };
  const arc = (cx, cy, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(new THREE.Vector3(sx * (cx + Math.cos(a) * r), cy + Math.sin(a) * r, z)); } };
  line([xin, top], [xout - r, top], 8);
  arc(xout - r, top - r, Math.PI / 2, 0, 8);
  line([xout, top - r], [xout, bot + r], 10);
  arc(xout - r, bot + r, 0, -Math.PI / 2, 8);
  line([xout - r, bot], [xear, bot], 3);
  pts.push(new THREE.Vector3(sx * xear, bot, z));
  return pts;
}

export function cyberSilver() {
  return std({ color: 0xa9adb2, metalness: 0.88, roughness: 0.3, roughnessMap: TX.grime('cyber', 61, 0.78, 1, 24), envMapIntensity: 0.4 });
}

export function buildCyberman() {
  const g = new THREE.Group();
  g.name = 'Cyberman head';
  const silver = cyberSilver();
  cyberParts = cyberParts || decodeCyber();
  for (const geo of cyberParts) mesh(geo, silver, g);
  const dark = std({ color: 0x050505, roughness: 0.9 });
  // Dark interior, seen through the real eye and mouth openings of the shell.
  mesh(new THREE.SphereGeometry(0.1, 24, 16), dark, g, 0, 0.235, 0.02).castShadow = false;
  // Corrugated handlebars: squared C-loops (as on the Revenge-era heads): out
  // flat from the crown, straight down, then back into the side of the head
  // just below eye level. Path follows the original model's rigid handles.
  const hose = std({ color: 0xb4b8bd, metalness: 0.7, roughness: 0.42, envMapIntensity: 0.3 });
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3(squaredLoop(sx), false, 'centripetal');
    const geo = shapedTube(c, 260, 16, (u) => {
      const ends = u > 0.02 && u < 0.98 ? 1 : 0;
      return 0.0165 * (1 + 0.15 * ends * Math.abs(Math.sin(u * Math.PI * 44)));
    });
    mesh(geo, hose, g);
  }
  // Lamp: a forward-facing disc with a ring of holes, seated in the open ring
  // at the front of the crown ridge (V3).
  const lamp = new THREE.Group();
  lamp.position.set(0, 0.385, 0.118);
  lamp.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.03, 32), std({ color: 0x9c9fa1, metalness: 0.9, roughness: 0.35 }), lamp, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.004, 10), dark, lamp, Math.cos(a) * 0.012, 0.0145, Math.sin(a) * 0.012);
  }
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 10), dark, lamp, 0, 0.0145, 0);
  g.add(lamp);
  // Cables trailing out of the neck ring (V2).
  const cab = std({ color: 0x1c1c1c, roughness: 0.6 });
  const r = TX.rng(77);
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, rr = 0.03 + r() * 0.04;
    const c = curve([[Math.cos(a) * rr * 0.6, 0.03, Math.sin(a) * rr * 0.6], [Math.cos(a) * rr, -0.06, Math.sin(a) * rr], [Math.cos(a) * (rr + 0.05), -0.16 - r() * 0.05, Math.sin(a) * (rr + 0.05)], [Math.cos(a) * (rr + 0.07), -0.25, Math.sin(a) * (rr + 0.07)]]);
    mesh(new THREE.TubeGeometry(c, 24, 0.004 + r() * 0.003, 6), cab, g);
  }
  return g;
}

// The black pole the head sits on inside the tall case.
export function buildCybermanMount() {
  const g = buildCyberman();
  const wrap = new THREE.Group();
  const pole = std({ color: 0x0b0b0c, roughness: 0.5 });
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 16), pole, wrap, 0, 0.15, 0);
  g.position.y = 0.3;
  wrap.add(g);
  wrap.userData.focusY = 0.52;
  return wrap;
}

// ---------- B: Slitheen arm ----------
// Vertical loft: rings of points around the y axis. ring(y, a) -> [x, z].
function loft(y0, y1, rows, cols, ring) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= rows; i++) {
    const y = y0 + (y1 - y0) * (i / rows);
    for (let j = 0; j <= cols; j++) {
      const a = (j / cols) * Math.PI * 2;
      const [x, z, dy = 0] = ring(y, a);
      pos.push(x, y + dy, z); uv.push(j / cols * 2, (y - y0) * 3);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1); // outward-facing winding
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildSlitheenArm() {
  // Sculpted from photographs of the production prop: a massive, fleshy
  // forearm; rolls of loose skin at the wrist with a sinew trailing down one
  // side; a broad hand with three fat, knuckled fingers held close together;
  // short, ridged, bone-coloured claws. Mounted upright on a block (V1).
  const g = new THREE.Group();
  g.name = 'Slitheen arm';
  const skin = std({ map: TX.slitheenSkin(), roughness: 0.72, metalness: 0, bumpMap: TX.grime('slithBump', 63, 0, 1, 60), bumpScale: 1.6 });
  const clawMat = std({ map: TX.grime('clawRings', 71, 0.62, 0.95, 30), color: 0xe2d2b2, roughness: 0.42 });
  const n = noise3(5);
  mesh(new THREE.BoxGeometry(0.28, 0.1, 0.22), std({ color: 0x141414, roughness: 0.45 }), g, 0, 0.05, 0);

  // Forearm + wrist + palm as one lofted surface.
  const W0 = 0.1, WR = 0.36, WR1 = 0.44, PALM = 0.5, TOP = 0.585;
  const halfX = (y) => {
    if (y < 0.13) return 0.012 + 0.078 * Math.sin(((y - W0) / 0.03) * Math.PI / 2);  // rounded, closed stump
    if (y < WR) return 0.092 - 0.016 * ((y - 0.13) / (WR - 0.13));                  // forearm tapers to wrist
    if (y < PALM) return 0.076 + 0.024 * Math.sin(((y - WR) / (PALM - WR)) * Math.PI / 2); // hand widens
    const t = (y - PALM) / (TOP - PALM);
    return 0.1 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.001;                          // closed knuckle dome
  };
  const depth = (y) => (y < WR ? 0.84 : y < PALM ? 0.84 - 0.2 * ((y - WR) / (PALM - WR)) : 0.64);
  const folds = (y, a) => {
    if (y < WR - 0.02 || y > WR1) return 0;
    const t = (y - (WR - 0.02)) / (WR1 - WR + 0.02);
    const env = Math.sin(t * Math.PI);
    // Loose, irregular rolls: wavy around the arm, uneven in height.
    const yy = y + 0.014 * Math.sin(a * 2 + 1) + 0.009 * Math.sin(a * 3 + 2);
    const wave = Math.sin(yy * 2 * Math.PI * 30);
    const amp = 0.6 + 0.8 * n(Math.floor(yy * 30) * 1.7, Math.cos(a), Math.sin(a));
    return 0.014 * env * amp * Math.max(0, wave) ** 2.2;
  };
  const armGeo = loft(W0, TOP, 220, 72, (y, a) => {
    const rx = halfX(y), rz = rx * depth(y);
    const lump = 1 + 0.07 * (n(Math.cos(a) * 2.2, y * 9, Math.sin(a) * 2.2) - 0.5) + 0.025 * (n(Math.cos(a) * 9, y * 40, Math.sin(a) * 9) - 0.5);
    const r = lump;
    const f = folds(y, a);
    return [Math.cos(a) * (rx * r + f), Math.sin(a) * (rz * r + f * 0.8)];
  });
  mesh(armGeo, skin, g);

  // Sinew trailing from the wrist folds down the outer side (photo 3).
  const sinewPts = [];
  for (let i = 0; i <= 10; i++) {
    const y = WR + 0.02 - i * 0.032;
    const rx = halfX(Math.max(y, 0.14));
    sinewPts.push([rx * 0.93 + 0.012 + 0.004 * Math.sin(i), y, 0.035 + 0.01 * Math.sin(i * 0.7)]);
  }
  const sc = curve(sinewPts);
  mesh(shapedTube(sc, 80, 12, (u) => 0.012 * (1 - 0.35 * u) * (1 + 0.15 * Math.sin(u * 30))), skin, g);

  // Fingers: fat, knuckled, nearly upright, close together; claws curve out.
  const fingers = [
    // Long, splayed fingers as on screen (V1): roughly the top 40% of the specimen.
    { x: -0.06, z: 0.0, len: 0.27, tilt: -0.38, fwd: 0.06, r: 0.031, claw: -1 },
    { x: 0.0, z: 0.008, len: 0.33, tilt: -0.04, fwd: 0.09, r: 0.034, claw: 0 },
    { x: 0.058, z: 0.0, len: 0.25, tilt: 0.27, fwd: 0.07, r: 0.03, claw: 1 },
  ];
  for (const f of fingers) {
    const base = new THREE.Vector3(f.x, PALM - 0.06, f.z * 0.5);
    const dir = new THREE.Vector3(Math.sin(f.tilt), Math.cos(f.tilt), f.fwd).normalize();
    const pts = [0, 0.33, 0.66, 1].map((t) => base.clone().addScaledVector(dir, (f.len + 0.05) * t).add(new THREE.Vector3(0, 0, -0.02 * Math.sin(t * Math.PI))));
    const c = new THREE.CatmullRomCurve3(pts);
    mesh(shapedTube(c, 80, 28, (u, a) => {
      const knuckles = 0.009 * Math.exp(-((u - 0.35) ** 2) / 0.004) + 0.008 * Math.exp(-((u - 0.62) ** 2) / 0.003) + 0.006 * Math.exp(-((u - 0.86) ** 2) / 0.002);
      const p = c.getPointAt(u);
      const lump = 1 + 0.08 * (n(p.x * 40 + Math.cos(a), p.y * 40, p.z * 40 + Math.sin(a)) - 0.5);
      return (f.r * (1 - 0.22 * u) + knuckles) * lump * (u > 0.97 ? Math.sqrt(Math.max(0, (1 - u) / 0.03)) * 0.6 + 0.4 : 1);
    }), skin, g);
    // Claw: a ridged, tapering hook from the fingertip, curving outward.
    const tip = c.getPointAt(0.97), tdir = c.getTangentAt(0.97);
    const side = new THREE.Vector3(f.claw === 0 ? 0 : f.claw, 0, f.claw === 0 ? 1 : 0.4).normalize();
    const cp = [tip.clone(), tip.clone().addScaledVector(tdir, 0.03), tip.clone().addScaledVector(tdir, 0.055).addScaledVector(side, 0.012), tip.clone().addScaledVector(tdir, 0.07).addScaledVector(side, 0.035)];
    const cc = new THREE.CatmullRomCurve3(cp);
    mesh(shapedTube(cc, 40, 14, (u) => (0.014 * (1 - u) ** 0.8 + 0.0008) * (1 + 0.06 * Math.sin(u * 60))), clawMat, g);
  }
  g.scale.setScalar(0.85);
  g.userData.focusY = 0.38;
  return g;
}

// ---------- C/D: Meteorites ----------
function meteoriteGeo(seed, size, opts = {}) {
  const geo = new THREE.IcosahedronGeometry(size, 5);
  const p = geo.attributes.position;
  const n = noise3(seed);
  const r = TX.rng(seed);
  const pits = Array.from({ length: 22 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  const v = new THREE.Vector3();
  const stretch = opts.stretch || [1.25, 0.8, 1];
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let d = 1 + (n(v.x * 1.6, v.y * 1.6, v.z * 1.6) - 0.5) * 0.9 + (n(v.x * 6, v.y * 6, v.z * 6) - 0.5) * 0.12;
    // Regmaglypts: shallow thumbprint pits.
    for (const q of pits) { const dd = v.distanceTo(q); if (dd < 0.28) d -= 0.07 * Math.cos((dd / 0.28) * Math.PI / 2) ** 2; }
    v.multiplyScalar(size * d);
    v.set(v.x * stretch[0], v.y * stretch[1], v.z * stretch[2]);
    let c = [0.16, 0.14, 0.12];
    if (opts.cut && v.z > size * 0.35) { v.z = size * 0.35 + (v.z - size * 0.35) * 0.04; c = [0.55, 0.55, 0.53]; }
    else { const k = 0.8 + n(v.x * 20, v.y * 20, v.z * 20) * 0.5; c = c.map((x) => x * k); if (opts.rust) c = [c[0] * 1.5, c[1] * 1.15, c[2] * 0.9]; }
    p.setXYZ(i, v.x, v.y, v.z);
    colors.push(...c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  // Rest the rock on y=0.
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  return geo;
}

function meteoriteMat() {
  return std({ vertexColors: true, roughness: 0.82, metalness: 0.35, roughnessMap: TX.grime('met', 67, 0.6, 1, 16) });
}

export function buildMeteorite() {
  const g = new THREE.Group();
  g.name = 'Meteorite';
  // Grey display block (V1).
  mesh(new THREE.BoxGeometry(0.34, 0.13, 0.26), std({ color: 0x5c5d5e, roughness: 0.7 }), g, 0, 0.065, 0);
  const rock = mesh(meteoriteGeo(11, 0.11, { cut: true, stretch: [1.35, 0.75, 1.0] }), meteoriteMat(), g, 0, 0.13, 0);
  rock.rotation.y = 0.5;
  g.userData.focusY = 0.2;
  return g;
}

function specimenJar(parent, x, z, h = 0.1, r = 0.035, fill = 0x6b6964, fillLevel = 0.35, label) {
  const glassM = phys({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, clearcoat: 1 });
  const jar = mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true), glassM, parent, x, h / 2, z);
  jar.castShadow = false; jar.renderOrder = 3;
  mesh(new THREE.CircleGeometry(r, 28), glassM, parent, x, 0.002, z).rotation.x = -Math.PI / 2;
  const fillH = h * fillLevel;
  const powder = mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, fillH, 28), std({ color: fill, roughness: 1 }), parent, x, fillH / 2 + 0.002, z);
  mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.018, 28), std({ color: 0x9a9da0, metalness: 1, roughness: 0.35 }), parent, x, h + 0.009, z);
  if (label) {
    // Wide, centred label so the text fits the visible arc of the jar.
    const t = TX.labelTexture(label, { w: 512, h: 210, titleSize: 30, bodySize: 24, top: 90, align: 'center' });
    const l = mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.36, 32, 1, true, -1.3, 2.6), std({ map: t, roughness: 0.8 }), parent, x, h * 0.55, z);
    l.castShadow = false;
  }
  return powder;
}

export function buildMeteoriteSet() {
  const g = new THREE.Group();
  g.name = 'Meteorite fragments';
  const brass = std({ color: 0xa88648, metalness: 1, roughness: 0.35 });
  const specs = [[-0.75, 0.07, 21, [1.2, 0.8, 1]], [-0.38, 0.05, 22, [1, 1, 1.2]], [0.0, 0.085, 23, [1.4, 0.7, 1]], [0.4, 0.055, 24, [1, 0.9, 0.9]], [0.72, 0.045, 25, [1.2, 1.1, 1]]];
  specs.forEach(([x, s, seed, st], i) => {
    const sg = new THREE.Group(); sg.position.set(x, 0, -0.05 + (i % 2) * 0.07); g.add(sg);
    mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 20), brass, sg, 0, 0.01, 0);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), brass, sg, 0, 0.05, 0);
    mesh(meteoriteGeo(seed, s, { stretch: st, rust: i % 2 === 1 }), meteoriteMat(), sg, 0, 0.075, 0).rotation.y = i;
    const t = TX.labelTexture([`VS-M${String(i + 3).padStart(3, '0')}`, ['Iron', 'Stony-iron', 'Chondrite', 'Iron', 'Achondrite'][i]], { w: 256, h: 128, titleSize: 30, bodySize: 22, top: 44 });
    const lab = mesh(new THREE.PlaneGeometry(0.08, 0.04), std({ map: t }), sg, 0, 0.012, 0.11);
    lab.rotation.x = -1.1;
  });
  specimenJar(g, -0.55, 0.16, 0.07, 0.025, 0x3a3631, 0.3, ['VS-M011', 'Fragments']);
  specimenJar(g, 0.58, 0.16, 0.07, 0.025, 0x4a4038, 0.25, ['VS-M012', 'Dust']);
  g.userData.focusY = 0.12;
  return g;
}

// ---------- Moon dust ----------
export function buildMoonDust() {
  const g = new THREE.Group();
  g.name = 'Moon dust';
  mesh(new THREE.BoxGeometry(0.3, 0.06, 0.22), std({ color: 0x4f5153, roughness: 0.6 }), g, 0, 0.03, 0);
  const jar = new THREE.Group(); jar.position.y = 0.06; g.add(jar);
  specimenJar(jar, 0, 0, 0.17, 0.055, 0x7d7b78, 0.42, ['LUNAR SAMPLE', 'Regolith · 1969']);
  // Purge valve on the lid.
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), std({ color: 0xb08a48, metalness: 1, roughness: 0.3 }), jar, 0.02, 0.195, 0);
  // A sealed petri dish of the same dust beside it.
  const dish = new THREE.Group(); dish.position.set(0.1, 0.06, 0.04); g.add(dish);
  const dg = phys({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false });
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 24, 1, true), dg, dish, 0, 0.007, 0);
  mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.004, 24), std({ color: 0x86847f, roughness: 1 }), dish, 0, 0.003, 0);
  g.userData.focusY = 0.16;
  return g;
}

// ---------- Roswell milometer (conservative stand-in) ----------
function glyphTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#1b1a16'; x.fillRect(0, 0, 512, 64);
  x.strokeStyle = '#d6cfae'; x.lineWidth = 3;
  const r = TX.rng(91);
  for (let i = 0; i < 8; i++) {
    const cx = 32 + i * 64;
    x.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = r() * 6.28;
      if (r() > 0.5) x.arc(cx, 32, 6 + k * 6, a, a + 1.5 + r() * 2);
      else { x.moveTo(cx - 12 + r() * 24, 14 + r() * 8); x.lineTo(cx - 12 + r() * 24, 42 + r() * 10); }
    }
    x.stroke();
    x.fillStyle = '#d6cfae'; x.beginPath(); x.arc(cx + (r() - 0.5) * 16, 32 + (r() - 0.5) * 16, 3, 0, 6.28); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function buildMilometer() {
  const g = new THREE.Group();
  g.name = 'Roswell milometer';
  const cast = std({ color: 0x6d6a5f, metalness: 0.75, roughness: 0.48, roughnessMap: TX.grime('mil', 71, 0.4, 0.9, 10) });
  const darkMetal = std({ color: 0x2a2925, metalness: 0.8, roughness: 0.4 });
  // Cradle.
  mesh(new THREE.BoxGeometry(0.36, 0.03, 0.18), std({ color: 0x111111, roughness: 0.5 }), g, 0, 0.015, 0);
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.09, 0.12), darkMetal, g, sx * 0.12, 0.075, 0);
  // Housing: an asymmetric lozenge, longer on one side, made from a lathe on its side.
  const prof = [[0, -0.17], [0.05, -0.165], [0.07, -0.12], [0.075, 0.0], [0.068, 0.1], [0.05, 0.14], [0.03, 0.16], [0, 0.163]];
  const hous = mesh(lathe(prof, 40), cast, g, 0, 0.17, 0);
  hous.rotation.z = Math.PI / 2; hous.scale.set(1, 1, 0.82);
  // Flattened front with a recessed counter window.
  mesh(new THREE.BoxGeometry(0.22, 0.06, 0.03), darkMetal, g, -0.01, 0.175, 0.055);
  const drums = new THREE.Group(); drums.position.set(-0.01, 0.175, 0.06); g.add(drums);
  const gt = glyphTexture();
  for (let i = 0; i < 7; i++) {
    const t = gt.clone(); t.needsUpdate = true; t.offset.x = i * 0.13;
    const d = mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.024, 24), [std({ map: t, roughness: 0.6 }), darkMetal, darkMetal], drums, -0.09 + i * 0.03, 0, 0);
    d.rotation.z = Math.PI / 2;
  }
  mesh(new THREE.BoxGeometry(0.23, 0.05, 0.004), phys({ color: 0xfff6dd, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }), g, -0.01, 0.175, 0.083);
  // Rear ribbing and a bezel ring at the long end.
  for (let i = 0; i < 6; i++) mesh(new THREE.TorusGeometry(0.06 - i * 0.002, 0.004, 6, 32), cast, g, 0.07 + i * 0.012, 0.17, 0).rotation.y = Math.PI / 2;
  // Severed conduits with frayed wires.
  const wireCols = [0x8a2a1a, 0xc9b25a, 0x2a4a8a, 0xcccccc];
  for (const [x, y, z, ang] of [[0.16, 0.2, -0.02, 0.3], [0.15, 0.13, 0.02, -0.4]]) {
    const cg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), darkMetal, g, x, y, z);
    cg.rotation.z = Math.PI / 2 + ang;
    wireCols.forEach((col, k) => {
      const c = curve([[x + 0.02, y, z], [x + 0.04, y + (k - 1.5) * 0.008, z + (k % 2 ? 0.01 : -0.01)], [x + 0.055, y + (k - 1.5) * 0.015, z + (k - 1.5) * 0.01]]);
      mesh(new THREE.TubeGeometry(c, 8, 0.0018, 5), std({ color: col, roughness: 0.5 }), g);
    });
  }
  // Dents: small dark scuffs.
  g.userData.focusY = 0.17;
  return g;
}

// ---------- Black ribbed carapace (on screen, unidentified) ----------
export function buildRibbed() {
  const g = new THREE.Group();
  g.name = 'Ribbed carapace';
  const black = phys({ color: 0x0c0c0e, roughness: 0.22, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  stand(g, 0.12, 0.012, [0.18, 0.03, 0.14]);
  const c = curve([[0, 0.17, 0.16], [0, 0.26, 0.05], [0, 0.29, -0.08], [0, 0.25, -0.2], [0, 0.18, -0.28]]);
  const geo = shapedTube(c, 140, 32, (u, a) => {
    const prof = 0.085 * Math.sin(Math.min(1, u * 1.1 + 0.08) * Math.PI) ** 0.6 + 0.01;
    const rib = 1 + 0.07 * Math.max(0, Math.sin(u * Math.PI * 2 * 18));
    const flat = 0.78 + 0.22 * Math.abs(Math.cos(a));
    const ridge = 1 + 0.12 * Math.exp(-((Math.sin(a) - 1) ** 2) * 40);
    return prof * rib * flat * ridge;
  });
  mesh(geo, black, g);
  g.scale.setScalar(1.5);
  g.userData.focusY = 0.33;
  return g;
}

// ---------- The egg ----------
export function buildEgg() {
  const g = new THREE.Group();
  g.name = 'Ovoid specimen';
  const skin = std({ color: 0x5b5a46, roughness: 0.7, map: TX.rock('egg', [120, 116, 96], 81), bumpMap: TX.grime('eggb', 83, 0, 1, 14), bumpScale: 3 });
  mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 32), std({ color: 0x151515, roughness: 0.5 }), g, 0, 0.02, 0);
  const prof = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push([Math.sin(t * Math.PI) ** 0.8 * 0.14 * (1 - 0.18 * t) + 0.001, t * 0.42]); }
  const geo = lathe(prof, 64);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const top = Math.max(0, (y - 0.3) / 0.12);
    const k = 1 - top * 0.25 * Math.max(0, Math.cos(a * 4)) ** 8 - top * 0.05;
    p.setXYZ(i, x * k, y - top * 0.02 * Math.max(0, Math.cos(a * 4)) ** 8, z * k);
  }
  geo.computeVertexNormals();
  mesh(geo, skin, g, 0, 0.03, 0);
  g.userData.focusY = 0.24;
  return g;
}

// ---------- Primate head ----------
export function buildPrimate() {
  const g = new THREE.Group();
  g.name = 'Primate head';
  const fur = std({ color: 0x4b3424, roughness: 0.95, bumpMap: TX.grime('fur', 87, 0, 1, 40), bumpScale: 2 });
  const skin = std({ color: 0x3a2a20, roughness: 0.8 });
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 20), std({ color: 0x111111, roughness: 0.5 }), g, 0, 0.03, 0);
  const cran = mesh(new THREE.SphereGeometry(0.1, 28, 20), fur, g, 0, 0.2, -0.01); cran.scale.set(0.95, 1.0, 1.05);
  mesh(new THREE.CapsuleGeometry(0.02, 0.12, 6, 12), skin, g, 0, 0.215, 0.08).rotation.z = Math.PI / 2;
  const muzzle = mesh(new THREE.SphereGeometry(0.07, 24, 16), skin, g, 0, 0.15, 0.065); muzzle.scale.set(1, 0.8, 0.85);
  for (const sx of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.012, 10, 8), std({ color: 0x080604, roughness: 0.2 }), g, sx * 0.032, 0.195, 0.085);
    const ear = mesh(new THREE.SphereGeometry(0.025, 12, 8), skin, g, sx * 0.095, 0.2, -0.01); ear.scale.set(0.4, 1, 0.8);
  }
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 20), fur, g, 0, 0.08, -0.02);
  g.userData.focusY = 0.18;
  return g;
}

// ---------- Alien weapons (stand-ins) ----------
export function buildWeapons() {
  const g = new THREE.Group();
  g.name = 'Alien weapons';
  const m1 = std({ color: 0x3d4240, metalness: 0.8, roughness: 0.35 });
  const m2 = std({ color: 0x7a5a2a, metalness: 0.9, roughness: 0.3 });
  const m3 = std({ color: 0x1e1f22, metalness: 0.4, roughness: 0.5 });
  const bracket = std({ color: 0x0d0d0d, roughness: 0.5 });
  const guns = [
    (p) => { mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 16), m1, p).rotation.z = Math.PI / 2; mesh(new THREE.BoxGeometry(0.05, 0.12, 0.04), m3, p, -0.08, -0.07, 0).rotation.z = 0.3; mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 20), m2, p, 0.12, 0, 0).rotation.y = Math.PI / 2; },
    (p) => { mesh(new THREE.BoxGeometry(0.3, 0.06, 0.05), m2, p); mesh(new THREE.SphereGeometry(0.06, 16, 12), m1, p, -0.1, 0.01, 0); mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8), m1, p, 0.22, 0.01, 0).rotation.z = Math.PI / 2; },
    (p) => { const c = curve([[-0.18, -0.02, 0], [0, 0.03, 0], [0.18, 0, 0]]); mesh(shapedTube(c, 30, 12, (u) => 0.022 + 0.012 * Math.sin(u * Math.PI)), m3, p); mesh(new THREE.ConeGeometry(0.03, 0.08, 12), m2, p, 0.21, 0, 0).rotation.z = -Math.PI / 2; mesh(new THREE.BoxGeometry(0.04, 0.1, 0.03), m1, p, -0.05, -0.07, 0); },
  ];
  guns.forEach((fn, i) => {
    const gg = new THREE.Group(); gg.position.set(-0.6 + i * 0.6, 0.55, -0.12); g.add(gg);
    fn(gg);
    for (const sx of [-0.08, 0.08]) mesh(new THREE.BoxGeometry(0.015, 0.06, 0.1), bracket, g, -0.6 + i * 0.6 + sx, 0.5, -0.17);
  });
  g.userData.focusY = 0.55;
  return g;
}

// ---------- Hull fragment ----------
export function buildHull() {
  const g = new THREE.Group();
  g.name = 'Hull fragment';
  const r = TX.rng(95);
  const s = new THREE.Shape();
  const N = 18;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, rr = 0.16 * (0.7 + r() * 0.45);
    const x = Math.cos(a) * rr * 1.3, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
  const p = geo.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, p.getZ(i) + (x * x + y * y) * 0.6);
    const heat = Math.min(1, Math.hypot(x, y) / 0.2);
    cols.push(0.5 - heat * 0.2 + 0.1 * heat, 0.48 - heat * 0.25, 0.5 - heat * 0.05 + 0.15 * heat);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  stand(g, 0.08, 0.01, [0.16, 0.025, 0.1]);
  const plate = mesh(geo, std({ vertexColors: true, metalness: 0.85, roughness: 0.38, roughnessMap: TX.grime('hull', 97, 0.4, 0.9, 12) }), g, 0, 0.27, 0);
  plate.rotation.x = -0.25;
  g.userData.focusY = 0.25;
  return g;
}

// ---------- Indistinct objects ----------
export function buildIndistinct() {
  const g = new THREE.Group();
  g.name = 'Indistinct objects';
  const m = std({ color: 0x24211d, roughness: 0.8 });
  [[-0.35, 0.07, 1], [0.0, 0.1, 2], [0.35, 0.06, 3]].forEach(([x, s, seed]) => {
    const geo = meteoriteGeo(seed + 40, s, { stretch: [1.4, 0.6, 1] });
    geo.deleteAttribute('color');
    mesh(geo, m, g, x, 0, 0);
  });
  g.userData.focusY = 0.08;
  return g;
}

// ---------- Expanded Vault (imaginative) ----------
export function buildAuton() {
  const g = new THREE.Group(); g.name = 'Auton hand';
  const plastic = std({ color: 0xd8b9a0, roughness: 0.4 });
  stand(g, 0.1);
  const wrist = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 20), plastic, g, 0, 0.21, 0);
  const palm = mesh(new THREE.BoxGeometry(0.09, 0.1, 0.035), plastic, g, 0, 0.34, 0);
  // Hand hinged back to expose the gun barrel.
  palm.position.set(0, 0.31, -0.05); palm.rotation.x = -1.2;
  for (let i = 0; i < 4; i++) mesh(new THREE.CapsuleGeometry(0.009, 0.05, 4, 8), plastic, g, -0.03 + i * 0.02, 0.27, -0.11).rotation.x = -1.2;
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12), std({ color: 0x333333, metalness: 0.8, roughness: 0.3 }), g, 0, 0.32, 0);
  g.userData.focusY = 0.25; return g;
}
export function buildNestene() {
  const g = new THREE.Group(); g.name = 'Nestene energy unit';
  stand(g, 0.04, 0.03);
  mesh(new THREE.SphereGeometry(0.1, 32, 24), phys({ color: 0x3f6b4a, roughness: 0.25, clearcoat: 1, transmission: 0, metalness: 0.1 }), g, 0, 0.17, 0);
  g.userData.focusY = 0.17; return g;
}
export function buildSontaran() {
  const g = new THREE.Group(); g.name = 'Sontaran helmet';
  const m = std({ color: 0x3e4a3a, metalness: 0.6, roughness: 0.45 });
  stand(g, 0.06);
  const dome = mesh(new THREE.SphereGeometry(0.13, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), m, g, 0, 0.13, 0); dome.scale.set(1, 1.1, 1);
  mesh(new THREE.TorusGeometry(0.1, 0.015, 10, 32), std({ color: 0x8a8a7a, metalness: 0.8, roughness: 0.4 }), g, 0, 0.16, 0).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), std({ color: 0x050505 }), g, 0, 0.19, 0.12);
  g.userData.focusY = 0.2; return g;
}
export function buildOod() {
  const g = new THREE.Group(); g.name = 'Ood translator sphere';
  stand(g, 0.04, 0.02);
  mesh(new THREE.SphereGeometry(0.07, 32, 24), std({ color: 0xe8e8e2, roughness: 0.3 }), g, 0, 0.14, 0);
  const c = curve([[0, 0.08, -0.04], [0.05, 0.05, -0.1], [0.12, 0.02, -0.08]]);
  mesh(new THREE.TubeGeometry(c, 16, 0.006, 6), std({ color: 0x222222 }), g);
  g.userData.focusY = 0.14; return g;
}

export const BUILDERS = {
  cyberman: buildCybermanMount, slitheen: buildSlitheenArm, meteorite: buildMeteorite,
  meteorites: buildMeteoriteSet, moondust: buildMoonDust, milometer: buildMilometer,
  ribbed: buildRibbed, egg: buildEgg, primate: buildPrimate, weapons: buildWeapons,
  hull: buildHull, indistinct: buildIndistinct,
  auton: buildAuton, nestene: buildNestene, sontaran: buildSontaran, ood: buildOod,
};

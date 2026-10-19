// The exhibit room: architecture, display cases, lighting states and the
// security hardware. Dimensions come from ROOM in data.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM, TARDIS_POS } from './data.js';
import * as TX from './textures.js';
import { buildTardis } from './tardis.js';
import { makeBeam, makeDust } from './effects.js';

// ---------- material helpers ----------
function texRepeat(tex, rx, ry) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return t;
}
const std = (o) => new THREE.MeshStandardMaterial(o);

export const M = {};
function initMaterials() {
  if (M.ready) return;
  M.ochre = std({ color: 0xffffff, map: TX.plaster('ochre', [184, 118, 70], 7, 0.1), roughness: 0.88, normalMap: TX.plasterNormal(), normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: TX.grime('plR', 221, 0.8, 1, 5) });
  M.orangeWall = std({ color: 0xffffff, map: TX.plaster('orange', [170, 104, 60], 8, 0.14), roughness: 0.9, normalMap: TX.plasterNormal(), normalScale: new THREE.Vector2(0.6, 0.6) });
  M.ceiling = std({ color: 0x2a221d, roughness: 0.95 });
  M.skirting = std({ color: 0x2a1c16, roughness: 0.7 });
  M.navy = std({ color: 0x18203c, roughness: 0.42, metalness: 0.05, normalMap: TX.paintNormal(), normalScale: new THREE.Vector2(0.25, 0.25), roughnessMap: TX.grime('navyR', 225, 0.7, 1, 8) });
  M.wood = std({ map: TX.wood(), roughness: 0.48, normalMap: TX.woodNormal(), normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: TX.grime('woodR', 223, 0.75, 1, 12) });
  M.slab = std({ color: 0x77787a, roughness: 0.35, roughnessMap: TX.grime('slabR', 227, 0.6, 1, 10), normalMap: TX.dentNormal(229), normalScale: new THREE.Vector2(0.15, 0.15) });
  M.canopy = std({ color: 0x2c2d30, roughness: 0.45, metalness: 0.3, roughnessMap: TX.grime('canR', 231, 0.7, 1, 10) });
  M.black = std({ color: 0x0c0c0e, roughness: 0.35, roughnessMap: TX.grime('blkR', 233, 0.6, 1, 8) });
  M.brass = std({ color: 0xb08a48, metalness: 1, roughness: 0.35 });
  M.chrome = std({ color: 0xdedede, metalness: 1, roughness: 0.12 });
  M.steel = std({ color: 0x8b9094, metalness: 0.85, roughness: 0.42, roughnessMap: TX.grime('steel', 41, 0.5, 1) });
  M.doorPaint = std({ color: 0x4b5552, metalness: 0.3, roughness: 0.5, normalMap: TX.dentNormal(235), normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: TX.grime('doorR', 237, 0.6, 1, 6) });
  M.drape = std({ color: 0x0d0f16, roughness: 1 });
  // Physically transmissive glass: refraction, fresnel reflections, a faint
  // green body tint from the edge (low-iron glass reads almost colourless).
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.008, ior: 1.52,
    attenuationColor: new THREE.Color(0xd4eee2), attenuationDistance: 0.35, specularIntensity: 1,
    envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide,
  });
  M.glassEdge = std({ color: 0x8fb5a2, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2, depthWrite: false });
  M.canopyLight = std({ color: 0x222222, emissive: 0xffe9c8, emissiveIntensity: 0, roughness: 1 });
  M.fixture = std({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.5 });
  M.fixtureLens = std({ color: 0x333333, emissive: 0xfff0d0, emissiveIntensity: 0 });
  M.label = (tex) => std({ map: tex, roughness: 0.85 });
  M.ready = true;
}

// Box with UVs in real-world units (1 UV = 1.5 m) so textures and normal maps
// keep their scale on every face instead of stretching.
function metricBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, S = 1 / 1.5;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] * S, uv.getY(i) * dims[f][1] * S);
  }
  return g;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(metricBox(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------- display cases ----------
// Every builder returns { group, glass:[], deckY, hit, size:[w,d] } in local
// space; the case front faces local +z.
function glassBox(group, w, h, d, y0, posts = 'edge') {
  const glass = [];
  const panes = [
    [w, h, 0.008, 0, y0 + h / 2, d / 2], [w, h, 0.008, 0, y0 + h / 2, -d / 2],
    [0.008, h, d, w / 2, y0 + h / 2, 0], [0.008, h, d, -w / 2, y0 + h / 2, 0],
  ];
  for (const p of panes) {
    const m = box(p[0], p[1], p[2], M.glass, p[3], p[4], p[5], group);
    m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
    m.userData.isGlass = true;
    glass.push(m);
  }
  // Corner edges: green glass edges, or chrome posts (Cyberman case, V2).
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const mat = posts === 'chrome' ? M.chrome : M.glassEdge;
    const r = posts === 'chrome' ? 0.012 : 0.006;
    const m = box(r * 2, h, r * 2, mat, sx * w / 2, y0 + h / 2, sz * d / 2, group);
    m.castShadow = posts === 'chrome';
    if (posts !== 'chrome') { m.userData.isGlass = true; glass.push(m); }
  }
  return glass;
}

function cabinetBase(group, w, h, d, opts = {}) {
  const f = 0.045; // frame section
  // Beech frame posts and rails.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(f, h, f, M.wood, sx * (w / 2 - f / 2), h / 2, sz * (d / 2 - f / 2), group);
  for (const y of [f / 2 + 0.03, h - f / 2]) {
    box(w, f, f, M.wood, 0, y, d / 2 - f / 2, group); box(w, f, f, M.wood, 0, y, -d / 2 + f / 2, group);
    box(f, f, d, M.wood, w / 2 - f / 2, y, 0, group); box(f, f, d, M.wood, -w / 2 + f / 2, y, 0, group);
  }
  // Navy infill panels on all four faces.
  const ph = h - f * 2 - 0.03;
  box(w - f * 2, ph, d - 0.03, M.navy, 0, f + 0.03 + ph / 2, 0, group);
  // Plinth toe.
  box(w - 0.04, 0.03, d - 0.04, M.black, 0, 0.015, 0, group);
  // Brass screw heads at the front panel corners (V1).
  if (opts.screws !== false) {
    const sg = new THREE.SphereGeometry(0.009, 8, 6);
    for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
      const s = new THREE.Mesh(sg, M.brass);
      s.position.set(sx * (w / 2 - f * 1.6), f + 0.07 + sy * (ph - 0.08), sz * (d / 2 - 0.012));
      group.add(s);
    }
  }
}

function canopy(group, w, d, y, lightGroup) {
  const c = box(w + 0.05, 0.12, d + 0.05, M.canopy, 0, y + 0.06, 0, group);
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.12), M.canopyLight);
  lens.rotation.x = Math.PI / 2; lens.position.set(0, y - 0.002, 0);
  group.add(lens);
  return c;
}

function hitBox(group, w, h, d, y = h / 2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.y = y;
  m.userData.hit = true;
  group.add(m);
  return m;
}

function labelCard(group, text, x, y, z, rx = -0.5) {
  const tex = TX.labelTexture(text, { w: 512, h: 256, titleSize: 40, bodySize: 26 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.075), M.label(tex));
  m.position.set(x, y, z); m.rotation.x = rx;
  group.add(m);
  return m;
}

export const CASES = {
  vitrine(ex) {
    const g = new THREE.Group();
    const W = 0.95, D = 0.62, BH = 0.86, GH = 0.82;
    cabinetBase(g, W, BH, D);
    box(W + 0.04, 0.04, D + 0.04, M.slab, 0, BH + 0.02, 0, g);
    const glass = glassBox(g, W, GH, D, BH + 0.04);
    canopy(g, W, D, BH + 0.04 + GH);
    labelCard(g, [ex.short, 'Van Statten Collection'], W / 2 - 0.13, BH + 0.08, D / 2 - 0.07);
    const hit = hitBox(g, W, 1.9, D, 0.95);
    return { group: g, glass, deckY: BH + 0.04, hit, size: [W + 0.06, D + 0.06] };
  },
  tall(ex) {
    // Cyberman case (V2): dark base, glass with chrome corner posts, black inner plinth.
    const g = new THREE.Group();
    const W = 0.78, D = 0.78, BH = 0.34, GH = 1.92;
    box(W + 0.04, BH, D + 0.04, M.black, 0, BH / 2, 0, g);
    const glass = glassBox(g, W, GH, D, BH, 'chrome');
    box(W + 0.06, 0.08, D + 0.06, M.black, 0, BH + GH + 0.04, 0, g);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.12), M.canopyLight);
    lens.rotation.x = Math.PI / 2; lens.position.y = BH + GH - 0.002; g.add(lens);
    box(0.4, 0.74, 0.4, M.black, 0, BH + 0.37, 0, g);
    box(0.44, 0.03, 0.44, M.black, 0, BH + 0.745, 0, g);
    // Security sensor on the canopy (lights red in the alarm).
    const sensor = box(0.07, 0.035, 0.05, M.fixture, W / 2 - 0.08, BH + GH + 0.1, D / 2 - 0.06, g);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x22ff44, emissiveIntensity: 1.5 }));
    led.position.set(W / 2 - 0.08, BH + GH + 0.1, D / 2 - 0.03); g.add(led);
    g.userData.sensorLed = led;
    // Label card inside, front right (V2).
    labelCard(g, ['Cyberman head', 'Found: London sewers, 1977'], W / 2 - 0.13, BH + 0.06, D / 2 - 0.1, -0.35);
    const hit = hitBox(g, W, BH + GH, D, (BH + GH) / 2);
    return { group: g, glass, deckY: BH + 0.76, hit, size: [W + 0.08, D + 0.08] };
  },
  slim(ex) {
    const g = new THREE.Group();
    const W = 0.46, D = 0.46, BH = 0.9, GH = 1.05;
    cabinetBase(g, W, BH, D, { screws: false });
    box(W + 0.03, 0.03, D + 0.03, M.slab, 0, BH + 0.015, 0, g);
    const glass = glassBox(g, W, GH, D, BH + 0.03);
    canopy(g, W, D, BH + 0.03 + GH);
    const hit = hitBox(g, W, 2.1, D, 1.05);
    return { group: g, glass, deckY: BH + 0.03, hit, size: [W + 0.06, D + 0.06] };
  },
  low(ex) {
    const g = new THREE.Group();
    const W = 1.25, D = 0.7, BH = 0.62, GH = 0.38;
    cabinetBase(g, W, BH, D);
    box(W + 0.04, 0.03, D + 0.04, M.slab, 0, BH + 0.015, 0, g);
    const glass = glassBox(g, W, GH, D, BH + 0.03);
    box(W + 0.02, 0.01, D + 0.02, M.glass, 0, BH + 0.03 + GH, 0, g).userData.isGlass = true;
    const hit = hitBox(g, W, 1.05, D, 0.52);
    return { group: g, glass, deckY: BH + 0.03, hit, size: [W + 0.06, D + 0.06] };
  },
  wall(ex) {
    // Wall-standing vitrine in a side bay, back panel in dark cloth.
    const g = new THREE.Group();
    const W = 2.1, D = 0.55, BH = 0.8, GH = 1.15;
    cabinetBase(g, W, BH, D);
    box(W + 0.04, 0.04, D + 0.04, M.slab, 0, BH + 0.02, 0, g);
    box(W, GH, 0.02, M.black, 0, BH + 0.04 + GH / 2, -D / 2 + 0.02, g);
    const glass = glassBox(g, W, GH, D, BH + 0.04);
    canopy(g, W, D, BH + 0.04 + GH);
    labelCard(g, [ex.short, 'Van Statten Collection'], W / 2 - 0.15, BH + 0.08, D / 2 - 0.07);
    const hit = hitBox(g, W, 2.2, D, 1.1);
    return { group: g, glass, deckY: BH + 0.04, hit, size: [W + 0.06, D + 0.06] };
  },
  pedestal(ex) {
    const g = new THREE.Group();
    const W = 0.5, BH = 1.0, GH = 0.55;
    cabinetBase(g, W, BH, W, { screws: false });
    box(W + 0.04, 0.03, W + 0.04, M.slab, 0, BH + 0.015, 0, g);
    const glass = glassBox(g, W - 0.04, GH, W - 0.04, BH + 0.03);
    box(W - 0.02, 0.01, W - 0.02, M.glass, 0, BH + 0.03 + GH, 0, g).userData.isGlass = true;
    const hit = hitBox(g, W, 1.6, W, 0.8);
    return { group: g, glass, deckY: BH + 0.03, hit, size: [W + 0.08, W + 0.08] };
  },
};

// ---------- architecture ----------
function cloth(w, h, folds, seed) {
  const g = new THREE.PlaneGeometry(w, h, Math.max(8, folds * 6), 4);
  const p = g.attributes.position;
  const r = TX.rng(seed);
  const ph = r() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin((x / w) * folds * Math.PI * 2 + ph) * 0.06 + Math.sin(x * 7.3) * 0.012);
  }
  g.computeVertexNormals();
  return g;
}

function sideWall(group, side, colliders) {
  const { halfW, halfL, height } = ROOM;
  const x = side * (halfW + 0.15);
  const door = ROOM.doors.find((d) => d.wall === (side < 0 ? 'left' : 'right'));
  const bayMat = std({ map: texRepeat(TX.panelWall(), 0.625, 1.25), roughness: 0.75,
    normalMap: texRepeat(TX.panelNormal(), 0.625, 1.25), normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: texRepeat(TX.grime('bayR', 239, 0.65, 1, 5), 0.625, 1.25) });
  // Wall slab in segments around the door.
  const z0 = door.z - door.w / 2, z1 = door.z + door.w / 2;
  const segs = [[-halfL, z0], [z1, halfL]];
  for (const [a, b] of segs) {
    const m = box(0.3, height, b - a, bayMat, x, height / 2, (a + b) / 2, group);
    m.material = bayMat;
  }
  box(0.3, height - door.h, door.w, bayMat, x, door.h + (height - door.h) / 2, door.z, group);
  // Skirting and dado rail.
  for (const [a, b] of segs) {
    box(0.04, 0.14, b - a, M.skirting, side * (halfW - 0.02), 0.07, (a + b) / 2, group);
    box(0.035, 0.05, b - a, M.ochre, side * (halfW - 0.017), 0.98, (a + b) / 2, group);
  }
  // Pilasters with a simple capital and base (V1).
  for (const pz of ROOM.pilasterZ) {
    const px = side * (halfW - ROOM.pilasterD / 2);
    box(ROOM.pilasterD, height, ROOM.pilasterW, M.ochre, px, height / 2, pz, group);
    box(ROOM.pilasterD + 0.06, 0.16, ROOM.pilasterW + 0.08, M.ochre, px, height - 0.42, pz, group);
    box(ROOM.pilasterD + 0.05, 0.22, ROOM.pilasterW + 0.06, M.skirting, px, 0.11, pz, group);
    colliders.push([Math.min(px - ROOM.pilasterD / 2, px + ROOM.pilasterD / 2), pz - ROOM.pilasterW / 2, Math.max(px - ROOM.pilasterD / 2, px + ROOM.pilasterD / 2), pz + ROOM.pilasterW / 2]);
  }
  colliders.push(side < 0 ? [-halfW - 1, -halfL - 1, -halfW, z0] : [halfW, -halfL - 1, halfW + 1, z0]);
  colliders.push(side < 0 ? [-halfW - 1, z1, -halfW, halfL + 1] : [halfW, z1, halfW + 1, halfL + 1]);
}

function archWall(group) {
  const { halfW, height, arch } = ROOM;
  const s = new THREE.Shape();
  s.moveTo(-halfW, 0); s.lineTo(halfW, 0); s.lineTo(halfW, height); s.lineTo(-halfW, height); s.lineTo(-halfW, 0);
  const hole = new THREE.Path();
  hole.moveTo(-arch.halfW, 0); hole.lineTo(-arch.halfW, arch.spring);
  hole.absarc(0, arch.spring, arch.halfW, Math.PI, 0, true);
  hole.lineTo(arch.halfW, 0); hole.lineTo(-arch.halfW, 0);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 40 });
  // Planar UVs in metres for the plaster texture.
  const uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.5, p.getY(i) / 2.5);
  const mat = std({ map: texRepeat(TX.plaster('orange', [170, 104, 60], 8, 0.14), 1, 1), roughness: 0.9, normalMap: TX.plasterNormal(), normalScale: new THREE.Vector2(0.6, 0.6) });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, 0, arch.z - 0.5);
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  // Arch moulding (a half-ring of ochre).
  const ring = new THREE.Mesh(new THREE.TorusGeometry(arch.halfW + 0.06, 0.07, 10, 48, Math.PI), M.ochre);
  ring.position.set(0, arch.spring, arch.z + 0.02); group.add(ring);
  for (const sx of [-1, 1]) box(0.14, arch.spring, 0.12, M.ochre, sx * (arch.halfW + 0.06), arch.spring / 2, arch.z + 0.02, group);
  // Sign above the arch (V5): a dim light box, contents illegible.
  const signTex = TX.labelTexture(['LEVEL 53', 'RESTRICTED'], { w: 512, h: 128, bg: '#16181b', fg: '#c9c6bb', titleSize: 40, bodySize: 24, align: 'center', top: 50, border: false, font: 'Helvetica, Arial, sans-serif' });
  const sign = box(1.05, 0.24, 0.08, M.canopy, 0, arch.spring + arch.halfW + 0.24, arch.z + 0.06, group);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.2), new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 }));
  face.position.set(0, arch.spring + arch.halfW + 0.24, arch.z + 0.105); group.add(face);
  group.userData.signFace = face;
}

function archBay(group, colliders) {
  const { arch } = ROOM;
  const z0 = arch.z - 0.5, z1 = arch.z - arch.bayDepth, hw = arch.bayHalfW, h = 4.6;
  const back = new THREE.Mesh(cloth(hw * 2, h, 9, 3), M.drape);
  back.position.set(0, h / 2, z1 + 0.1); group.add(back);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(cloth(arch.bayDepth, h, 6, 4 + sx), M.drape);
    side.rotation.y = -sx * Math.PI / 2; side.position.set(sx * hw, h / 2, (z0 + z1) / 2); group.add(side);
  }
  box(hw * 2, 0.05, arch.bayDepth, M.black, 0, h, (z0 + z1) / 2, group);
  // Rigging bar visible through the arch (V5).
  box(hw * 2 - 0.3, 0.05, 0.05, M.fixture, 0, 3.4, z0 - 0.8, group);
  colliders.push([-hw - 1, z1 - 1, hw + 1, z1 + 0.2], [-hw - 1, z1, -hw, z0], [hw, z1, hw + 1, z0]);
  // Arch wall either side of the opening.
  colliders.push([-ROOM.halfW - 1, arch.z - 0.5, -arch.halfW, arch.z], [arch.halfW, arch.z - 0.5, ROOM.halfW + 1, arch.z]);
}

function nearWall(group, colliders) {
  const { halfW, halfL, height } = ROOM;
  const d = ROOM.doors.find((x) => x.id === 'main');
  const mat = std({ map: texRepeat(TX.plaster('orange', [170, 104, 60], 8, 0.14), 1, 1), roughness: 0.9, normalMap: TX.plasterNormal(), normalScale: new THREE.Vector2(0.6, 0.6) });
  box((halfW * 2 - d.w) / 2, height, 0.3, mat, -(halfW + d.w / 2) / 2, height / 2, halfL + 0.15, group);
  box((halfW * 2 - d.w) / 2, height, 0.3, mat, (halfW + d.w / 2) / 2, height / 2, halfL + 0.15, group);
  box(d.w, height - d.h, 0.3, mat, 0, d.h + (height - d.h) / 2, halfL + 0.15, group);
  box(halfW * 2, 0.14, 0.04, M.skirting, 0, 0.07, halfL - 0.02, group);
  colliders.push([-halfW - 1, halfL, -d.w / 2, halfL + 1], [d.w / 2, halfL, halfW + 1, halfL + 1]);
}

// Doors with security shutters, keypads and beacons. Returns door records.
function buildDoor(group, d, colliders) {
  const g = new THREE.Group();
  group.add(g);
  // Local frame: door opening in the XY plane at z=0, room side towards +z.
  if (d.wall === 'near') { g.position.set(d.x, 0, d.z); g.rotation.y = Math.PI; }
  if (d.wall === 'left') { g.position.set(d.x, 0, d.z); g.rotation.y = Math.PI / 2; }
  if (d.wall === 'right') { g.position.set(d.x, 0, d.z); g.rotation.y = -Math.PI / 2; }
  const fw = 0.08;
  box(d.w + fw * 2, fw, 0.34, M.steel, 0, d.h + fw / 2, 0, g);
  for (const sx of [-1, 1]) box(fw, d.h, 0.34, M.steel, sx * (d.w / 2 + fw / 2), d.h / 2, 0, g);
  // Two leaves, closed, with vision panels and push bars.
  for (const sx of [-1, 1]) {
    const leaf = box(d.w / 2 - 0.01, d.h - 0.02, 0.05, M.doorPaint, sx * d.w / 4, d.h / 2, -0.05, g);
    box(0.16, 0.5, 0.055, std({ color: 0x223, roughness: 0.1, metalness: 0.5 }), sx * d.w / 4, 1.55, -0.05, g);
    box(d.w / 2 - 0.2, 0.04, 0.05, M.chrome, sx * d.w / 4, 1.0, 0.0, g);
    box(d.w / 2 - 0.04, 0.25, 0.052, M.steel, sx * d.w / 4, 0.15, -0.05, g);
  }
  // Corridor stub behind (dark).
  box(d.w + 0.4, 0.05, 1.5, M.black, 0, 0.02, -0.9, g);
  // Shutter housing and the shutter itself (starts raised, inside the housing).
  box(d.w + 0.3, 0.32, 0.26, M.steel, 0, d.h + 0.24, 0.16, g);
  const shutterTex = TX.grime('shutter', 43, 0.45, 0.8, 4);
  const shutterGeo = new THREE.PlaneGeometry(d.w + 0.16, d.h, 1, 60);
  const sp = shutterGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin(sp.getY(i) * 70) * 0.008);
  shutterGeo.computeVertexNormals();
  shutterGeo.translate(0, -d.h / 2, 0); // top edge at the origin so it unrolls downwards
  const shutter = new THREE.Mesh(shutterGeo, std({ color: 0x9a9fa3, metalness: 0.8, roughness: 0.45, roughnessMap: shutterTex }));
  shutter.position.set(0, d.h + 0.08, 0.14);
  shutter.castShadow = true;
  shutter.userData.keep = true;
  g.add(shutter);
  shutter.scale.y = 0.001;
  // Keypad.
  const kp = box(0.14, 0.2, 0.04, M.fixture, d.w / 2 + 0.35, 1.35, 0.03, g);
  const kled = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x000, emissive: 0x22ff55, emissiveIntensity: 1.2 }));
  kled.position.set(d.w / 2 + 0.35, 1.42, 0.052); g.add(kled);
  // Rotating beacon over the door.
  const beacon = new THREE.Group();
  beacon.position.set(0, d.h + 0.55, 0.22);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x551111, emissive: 0xff1a0a, emissiveIntensity: 0, transparent: true, opacity: 0.85, roughness: 0.2 }));
  const baseB = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.05, 16), M.fixture);
  baseB.position.y = -0.02; beacon.add(baseB, dome);
  const bl = new THREE.SpotLight(0xff2010, 0, 9, 0.5, 0.6, 1.6);
  bl.position.set(0, 0.03, 0); bl.target.position.set(1, -0.3, 0);
  beacon.add(bl, bl.target);
  // Sweeping red beam, visible only during the alarm.
  const bb = makeBeam(new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(4.2, -1.2, 0), 0.2, 0xff2a14, 0.0);
  beacon.add(bb);
  g.add(beacon);
  // Lockdown collider for the doorway (only active during lockdown).
  const c = d.wall === 'near' ? [d.x - d.w / 2, d.z - 0.2, d.x + d.w / 2, d.z + 1]
    : d.wall === 'left' ? [d.x - 1, d.z - d.w / 2, d.x + 0.2, d.z + d.w / 2]
    : [d.x - 0.2, d.z - d.w / 2, d.x + 1, d.z + d.w / 2];
  colliders.push(c); // doors are closed in every state
  return { id: d.id, shutter, h: d.h, kled, dome, light: bl, beacon, beam: bb };
}

function lightSwitch(group) {
  const s = ROOM.lightSwitch;
  const g = new THREE.Group();
  g.position.set(s.x, s.y, s.z); g.rotation.y = -Math.PI / 2;
  box(0.22, 0.3, 0.04, std({ color: 0x9c9a94, roughness: 0.5, metalness: 0.4 }), 0, 0, 0, g);
  const rockers = [];
  for (let i = 0; i < 3; i++) {
    const r = box(0.04, 0.08, 0.03, std({ color: 0x1a1a1a, roughness: 0.4 }), -0.06 + i * 0.06, 0.02, 0.03, g);
    r.rotation.x = 0.25; rockers.push(r);
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), M.label(TX.labelTexture(['GALLERY LIGHTS'], { w: 256, h: 64, titleSize: 26, top: 42, border: false, align: 'center' })));
  lab.position.set(0, -0.1, 0.022); g.add(lab);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.hit = true; g.add(hit);
  group.add(g);
  return { group: g, rockers, hit };
}

// Ceiling with beams on the pilaster lines and two track runs (speculative).
function ceiling(group, lights) {
  const { halfW, halfL, height } = ROOM;
  box(halfW * 2 + 0.6, 0.1, halfL * 2 + 0.6, M.ceiling, 0, height + 0.05, 0, group).castShadow = false;
  for (const z of ROOM.pilasterZ) box(halfW * 2, 0.36, 0.5, M.ochre, 0, height - 0.18, z, group);
  const fixtures = [];
  for (const x of [-2.0, 2.0]) {
    box(0.05, 0.04, halfL * 2 - 1.5, M.fixture, x, height - 0.38, 0, group);
    for (const z of [8, 4, 0, -4, -8]) {
      const can = new THREE.Group();
      can.position.set(x, height - 0.52, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 16), M.fixture);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), M.fixtureLens);
      lens.rotation.x = Math.PI / 2; lens.position.y = -0.111;
      can.add(body, lens);
      can.rotation.z = x < 0 ? 0.35 : -0.35;
      group.add(can);
      fixtures.push(can);
    }
  }
  return fixtures;
}

// ---------- lighting ----------
function buildLights(scene, group) {
  const L = { lit: [], dark: [], spots: [], beams: [] };
  const add = (l, state, on) => { l.userData.on = on; L[state].push(l); group.add(l); return l; };
  // A faint visible cone under a spot (dust in the air catching the light).
  const beam = (s, state, color, strength, widen = 0.85) => {
    const b = makeBeam(s.position, s.target.position, s.angle * widen, color, strength);
    b.userData.state = state; L.beams.push(b); group.add(b); return b;
  };
  add(new THREE.HemisphereLight(0xffe2bc, 0x4a3420, 0.0), 'lit', 1.35);
  add(new THREE.AmbientLight(0x2a3550, 0.0), 'dark', 0.22);
  // Ceiling spots onto the case rows (warm tungsten, ~3000 K).
  const shadowers = new Set(['-2,0', '2,0', '-2,-4', '2,-4', '-2,-8']);
  for (const x of [-2.0, 2.0]) for (const z of [8, 4, 0, -4, -8]) {
    const s = new THREE.SpotLight(0xffd6a6, 0, 14, 0.55, 0.85, 1.5);
    s.position.set(x, ROOM.height - 0.6, z);
    s.target.position.set(x * 0.95, 0, z);
    if (shadowers.has(`${x},${z}`)) {
      s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
      s.shadow.camera.near = 0.5; s.shadow.camera.far = 8;
    }
    group.add(s.target);
    add(s, 'lit', 21);
    L.spots.push(s);
    beam(s, 'lit', 0xffd9a8, 0.022, 0.75);
  }
  // Wall washers: soft warm light on the side walls behind the cases (V1).
  for (const side of [-1, 1]) for (const z of [-8, -3, 2]) {
    const ww = new THREE.SpotLight(0xffd2a0, 0, 9, 0.75, 1.0, 1.3);
    ww.position.set(side * 1.2, ROOM.height - 0.3, z);
    ww.target.position.set(side * ROOM.halfW, 1.6, z);
    group.add(ww.target); add(ww, 'lit', 16);
  }
  // Runner wash down the centre.
  for (const z of [6, -2, -9]) {
    const p = new THREE.PointLight(0xffcf9a, 0, 11, 1.4);
    p.position.set(0, ROOM.height - 0.7, z);
    add(p, 'lit', 8);
  }
  // Key light on the Cyberman case.
  const cy = new THREE.SpotLight(0xf2efe6, 0, 6, 0.14, 0.6, 1.4);
  cy.position.set(-2.4, ROOM.height - 0.6, -7.7); cy.target.position.set(-4.3, 1.62, -8.0);
  cy.castShadow = true; cy.shadow.mapSize.set(1024, 1024); cy.shadow.bias = -0.0004;
  group.add(cy.target); add(cy, 'lit', 16);
  beam(cy, 'lit', 0xeef0ff, 0.03, 0.9);
  // Dark state: cool spill through the arch and the TARDIS lamp.
  const archBlue = new THREE.SpotLight(0x5f7fd0, 0, 18, 0.7, 0.9, 1.4);
  archBlue.position.set(0, 4.2, -15.5); archBlue.target.position.set(0, 0, -4);
  group.add(archBlue.target); add(archBlue, 'dark', 26);
  beam(archBlue, 'dark', 0x6f8fe0, 0.03, 0.55);
  const archBlueLit = new THREE.SpotLight(0x3858b8, 0, 10, 0.9, 0.9, 1.4);
  archBlueLit.position.set(0, 4.3, -12.8); archBlueLit.target.position.set(0, 1.2, -16.8);
  group.add(archBlueLit.target); add(archBlueLit, 'lit', 12);
  // Front fill on the TARDIS (on screen it reads bright blue once the lights are up).
  const tf = new THREE.SpotLight(0xfff0e0, 0, 12, 0.32, 0.7, 1.4);
  tf.position.set(TARDIS_POS.x - 0.6, ROOM.height - 0.4, TARDIS_POS.z + 4.5); tf.target.position.set(TARDIS_POS.x, 1.3, TARDIS_POS.z);
  group.add(tf.target); add(tf, 'lit', 34);
  return L;
}

// ---------- main builder ----------
export function buildMuseum(scene) {
  initMaterials();
  const group = new THREE.Group();
  group.name = 'Museum';
  const colliders = [];
  const { halfW, halfL } = ROOM;

  // Floor: grey carpet overall, mustard runner (V1).
  const greyC = TX.carpet('grey', [112, 108, 102], 3);
  const fr = [halfW * 2 / 1.5, (halfL * 2 + 6) / 1.5];
  const floorMat = std({ map: texRepeat(greyC, ...fr), roughness: 1, normalMap: texRepeat(TX.carpetNormal(205), fr[0] * 3, fr[1] * 3), normalScale: new THREE.Vector2(0.7, 0.7) });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfL * 2 + 6), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -3; floor.receiveShadow = true;
  group.add(floor);
  const runC = TX.carpet('mustard', [184, 136, 50], 5);
  const runLen = halfL * 2 + 2.5;
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.runnerHalfW * 2, runLen),
    std({ map: texRepeat(runC, ROOM.runnerHalfW * 2 / 1.2, runLen / 1.2), roughness: 1, normalMap: texRepeat(TX.carpetNormal(206), ROOM.runnerHalfW * 2 / 0.4, runLen / 0.4), normalScale: new THREE.Vector2(0.7, 0.7) }));
  runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.004, halfL - runLen / 2 - 0.3); runner.receiveShadow = true;
  group.add(runner);

  sideWall(group, -1, colliders);
  sideWall(group, 1, colliders);
  archWall(group);
  archBay(group, colliders);
  nearWall(group, colliders);
  const fixtures = ceiling(group);
  const doors = ROOM.doors.map((d) => buildDoor(group, d, colliders));
  const sw = lightSwitch(group);
  const lights = buildLights(scene, group);
  // Dust drifting through the spot beams.
  const dust = makeDust({ count: 1200, min: new THREE.Vector3(-4.4, 0.2, -11.5), max: new THREE.Vector3(4.4, 4.4, 11.5), color: 0xffe2b8, size: 0.012, opacity: 0.55 });
  group.add(dust);

  const tardis = buildTardis();
  tardis.group.position.set(TARDIS_POS.x, 0, TARDIS_POS.z);
  tardis.group.rotation.y = TARDIS_POS.rotY;
  group.add(tardis.group);
  const tw = 0.82;
  colliders.push([TARDIS_POS.x - tw, TARDIS_POS.z - tw, TARDIS_POS.x + tw, TARDIS_POS.z + tw]);
  lights.dark.push(...tardis.darkLights);
  lights.lit.push(...tardis.litLights);

  return { group, colliders, doors, lightSwitch: sw, lights, fixtures, tardis, dust, signFace: group.userData.signFace };
}

// Merge static meshes by material to cut draw calls (called after build).
export function mergeStatic(root) {
  const buckets = new Map();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.userData.keep || o.userData.hit || o.userData.isGlass) return;
    if (o.parent !== root) return;
    if (!(o.geometry.isBufferGeometry) || o.geometry.attributes.uv === undefined) return;
    const k = o.material.uuid + (o.castShadow ? 's' : '');
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(o);
  });
  for (const list of buckets.values()) {
    if (list.length < 3) continue;
    const geos = list.map((m) => { const g = m.geometry.clone().toNonIndexed(); g.applyMatrix4(m.matrix); return g; });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true;
    root.add(mesh);
    list.forEach((m) => { root.remove(m); m.geometry.dispose(); });
  }
}

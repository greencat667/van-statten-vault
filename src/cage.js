// The Cage: the Dalek's cell, a separate, selectable environment (V6/V7).
import * as THREE from 'three';
import * as TX from './textures.js';
import { buildDalek } from './dalek.js';
import { makeBeam, makeDust } from './effects.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const CAGE = { radius: 6.2, height: 5.4, pillarR: 3.3 };
const PILLAR_ANGLES = [-2.55, -1.45, -0.62, 0.62, 1.45, 2.55]; // radians from +z

// One chain as an InstancedMesh of alternating torus links along a curve.
function chain(curve, linkLen = 0.075, mat) {
  const len = curve.getLength();
  const n = Math.floor(len / (linkLen * 0.78));
  const geo = new THREE.TorusGeometry(linkLen * 0.32, linkLen * 0.09, 6, 12);
  geo.scale(1, 1.55, 1);
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.castShadow = true;
  const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    curve.getPointAt(u, d.position);
    const t = curve.getTangentAt(u);
    d.quaternion.setFromUnitVectors(up, t);
    d.rotateY(i % 2 ? Math.PI / 2 : 0);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  return im;
}

export function buildCage() {
  const group = new THREE.Group();
  group.name = 'The Cage';
  const colliders = [];
  const { radius: R, height: H } = CAGE;
  const conc = TX.concrete();
  const wallMat = std({ map: conc.clone(), roughness: 0.95, normalMap: TX.concreteNormal().clone(), normalScale: new THREE.Vector2(1.2, 1.2) });
  wallMat.normalMap.needsUpdate = true; wallMat.normalMap.repeat.set(8, 2);
  wallMat.map.needsUpdate = true; wallMat.map.repeat.set(8, 2);
  // Sealed concrete floor with worn, slightly polished patches that pick up the light pillars.
  const floorMat = std({ map: TX.cageFloor().clone(), roughness: 1, color: 0xffffff, roughnessMap: TX.patchyRough('cageFloor', 241, 0.55, 1, 3), normalMap: TX.concreteNormal().clone(), normalScale: new THREE.Vector2(0.35, 0.35) });
  floorMat.normalMap.needsUpdate = true; floorMat.normalMap.repeat.set(5, 5);
  floorMat.map.needsUpdate = true; floorMat.map.repeat.set(5, 5);

  // Round board-marked concrete room.
  const wall = mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), wallMat, group, 0, H / 2, 0);
  wall.material.side = THREE.BackSide;
  const floor = mesh(new THREE.CircleGeometry(R, 64), floorMat, group, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  const ceil = mesh(new THREE.CircleGeometry(R, 64), std({ color: 0x1c1d1c, roughness: 1 }), group, 0, H, 0); ceil.rotation.x = Math.PI / 2;
  // Yellow band at floor level (V6, wal_10).
  const band = mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.16, 64, 1, true), std({ color: 0xc89a24, roughness: 0.7, side: THREE.BackSide }), group, 0, 0.3, 0);
  // Ceiling pipes and ducts.
  const pipeMat = std({ color: 0x3a3c3b, metalness: 0.6, roughness: 0.5 });
  for (const [x, z, ry] of [[-1.5, 0, 0], [1.8, 0, 0], [0, -2.5, Math.PI / 2]]) {
    const p = mesh(new THREE.CylinderGeometry(0.12, 0.12, R * 1.8, 16), pipeMat, group, x, H - 0.35, z);
    p.rotation.set(Math.PI / 2, 0, ry);
  }
  mesh(new THREE.BoxGeometry(R * 1.6, 0.4, 0.6), pipeMat, group, 0, H - 0.5, 1.2);

  // Two-tier octagonal plinth.
  mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.12, 8), std({ color: 0x6f6c60, roughness: 0.85, map: conc, normalMap: TX.concreteNormal() }), group, 0, 0.06, 0).rotation.y = Math.PI / 8;
  mesh(new THREE.CylinderGeometry(0.86, 0.9, 0.12, 8), std({ color: 0x7a776c, roughness: 0.85, map: conc, normalMap: TX.concreteNormal() }), group, 0, 0.18, 0).rotation.y = Math.PI / 8;
  colliders.push({ c: [0, 0], r: 1.15 });

  const dalek = buildDalek({ damaged: true });
  dalek.position.y = 0.24;
  group.add(dalek);

  // Light pillars, anchors and chains.
  const pillarMat = std({ color: 0x2f302f, roughness: 0.5, metalness: 0.4, roughnessMap: TX.grime('pilR', 243, 0.6, 1, 6), normalMap: TX.dentNormal(245), normalScale: new THREE.Vector2(0.3, 0.3) });
  const panelMat = std({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 2.4 });
  const barMat = std({ color: 0x222222, roughness: 0.6 });
  const anchorMat = std({ color: 0x7e7f7c, roughness: 0.75, map: conc, normalMap: TX.concreteNormal() });
  const steel = std({ color: 0x3a3631, metalness: 0.85, roughness: 0.55, roughnessMap: TX.grime('chain', 113, 0.5, 1, 8) });
  const hazardMat = std({ map: TX.hazard(), roughness: 0.7 });
  hazardMat.map.repeat.set(4, 1);
  const anchors = [];
  const pillarLights = [];
  PILLAR_ANGLES.forEach((a, i) => {
    const px = Math.sin(a) * CAGE.pillarR, pz = Math.cos(a) * CAGE.pillarR;
    const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.rotation.y = a + Math.PI; group.add(pg);
    mesh(new THREE.BoxGeometry(0.5, 2.9, 0.42), pillarMat, pg, 0, 1.45, 0);
    // Light slot facing the centre, segmented by bars.
    mesh(new THREE.BoxGeometry(0.13, 2.5, 0.02), panelMat, pg, 0, 1.45, 0.215).castShadow = false;
    for (let k = 0; k <= 12; k++) mesh(new THREE.BoxGeometry(0.16, 0.018, 0.03), barMat, pg, 0, 0.2 + k * 0.208, 0.22);
    colliders.push([px - 0.35, pz - 0.35, px + 0.35, pz + 0.35]);
    const pl = new THREE.PointLight(0xfff3da, 0, 7, 1.6);
    pl.position.set(px * 0.86, 1.6, pz * 0.86);
    pl.userData.on = 5.0;
    group.add(pl); pillarLights.push(pl);
    // Wedge anchor between pillar and plinth.
    const ar = CAGE.pillarR - 0.75;
    const ax = Math.sin(a) * ar, az = Math.cos(a) * ar;
    const wedge = new THREE.Shape();
    wedge.moveTo(-0.35, 0); wedge.lineTo(0.35, 0); wedge.lineTo(0.35, 0.42); wedge.lineTo(-0.35, 0.08); wedge.lineTo(-0.35, 0);
    const wg = new THREE.ExtrudeGeometry(wedge, { depth: 0.46, bevelEnabled: false });
    wg.translate(0, 0, -0.23);
    const ag = new THREE.Group(); ag.position.set(ax, 0, az); ag.rotation.y = a + Math.PI / 2; group.add(ag);
    mesh(wg, anchorMat, ag);
    const hz = mesh(new THREE.PlaneGeometry(0.7, 0.05), hazardMat, ag, 0, 0.025, 0.232);
    const hz2 = mesh(new THREE.PlaneGeometry(0.7, 0.05), hazardMat, ag, 0, 0.025, -0.232); hz2.rotation.y = Math.PI;
    // Ring bolt on the slope.
    const ring = mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20), steel, ag, -0.05, 0.3, 0);
    ring.rotation.set(0, Math.PI / 2, 0.45);
    const ringWorld = new THREE.Vector3(); ag.updateMatrixWorld(); ring.getWorldPosition(ringWorld);
    anchors.push({ pos: ringWorld, angle: a });
    colliders.push({ c: [ax, az], r: 0.45 });
  });

  // Chains: taut state (four chains crossing the Dalek, V7) and slack state (V6).
  const taut = new THREE.Group(), slack = new THREE.Group();
  group.add(taut, slack);
  const attachY = 0.24 + 0.95;
  anchors.forEach((an, i) => {
    // Taut: to the far side of the shoulder ring so the chains cross over.
    const opp = an.angle + Math.PI * 0.82 * (i % 2 ? 1 : -1);
    const end = new THREE.Vector3(Math.sin(opp) * 0.3, attachY + (i % 3) * 0.08, Math.cos(opp) * 0.33);
    const mid = an.pos.clone().lerp(end, 0.5); mid.y += 0.05;
    const crossing = new THREE.Vector3(Math.sin(an.angle) * 0.42, attachY - 0.15, Math.cos(an.angle) * 0.46);
    taut.add(chain(new THREE.CatmullRomCurve3([an.pos, mid.lerp(crossing, 0.6), crossing, end]), 0.075, steel));
    // Slack: a heap from the ring onto the floor towards the plinth.
    const r = TX.rng(i + 3);
    const pts = [an.pos.clone()];
    let p = an.pos.clone();
    for (let k = 0; k < 6; k++) {
      p = p.clone().lerp(new THREE.Vector3(0, 0, 0), 0.11); p.y = 0.02;
      p.x += (r() - 0.5) * 0.25; p.z += (r() - 0.5) * 0.25;
      pts.push(p);
    }
    slack.add(chain(new THREE.CatmullRomCurve3(pts), 0.075, steel));
  });
  slack.visible = false;

  // Cables from the ceiling into the dome and shoulders (V6).
  const cableMat = std({ color: 0x141414, roughness: 0.55 });
  [[-0.25, 1.62, 0.05, -1.2, -0.6], [0.2, 1.66, -0.05, 1.3, -0.9], [0.0, 1.5, -0.2, 0.4, -1.8], [-0.3, 1.25, -0.1, -1.6, 0.6]].forEach(([x, y, z, cx, cz]) => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(cx, H, cz), new THREE.Vector3(cx * 0.6, H * 0.7, cz * 0.6), new THREE.Vector3(x * 1.6, y + 0.6, z * 1.6), new THREE.Vector3(x, y, z)]);
    for (let k = 0; k < 3; k++) {
      const off = new THREE.Vector3((k - 1) * 0.02, 0, (k - 1) * 0.015);
      const cc = new THREE.CatmullRomCurve3(c.points.map((p, j) => p.clone().add(off.clone().multiplyScalar(j < 2 ? 1 : 0.4))));
      mesh(new THREE.TubeGeometry(cc, 40, 0.012, 6), cableMat, group);
    }
  });

  // Monitor rack behind the Dalek (V6/V7).
  const rack = new THREE.Group(); rack.position.set(0, 0, -4.6); group.add(rack);
  const frame = std({ color: 0x2b2c2d, metalness: 0.6, roughness: 0.5 });
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 2.4, 0.05), frame, rack, sx * 1.05, 1.2, 0);
  for (const y of [0.5, 1.1, 2.4]) mesh(new THREE.BoxGeometry(2.15, 0.04, 0.5), frame, rack, 0, y, 0);
  const screens = [];
  for (const sx of [-1, 1]) {
    const tex = TX.monitorTexture(37 + sx);
    mesh(new THREE.BoxGeometry(0.98, 0.62, 0.08), frame, rack, sx * 0.5, 1.85, 0);
    const scr = mesh(new THREE.PlaneGeometry(0.9, 0.54), std({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3 }), rack, sx * 0.5, 1.85, 0.042);
    screens.push(scr);
  }
  const screenLight = new THREE.PointLight(0xb7a6ff, 0, 4, 2); screenLight.position.set(0, 1.9, -4.1); screenLight.userData.on = 2.2;
  group.add(screenLight);
  colliders.push([-1.2, -5.0, 1.2, -4.2]);
  // Equipment cases (right, V6).
  const caseMat = std({ color: 0xbfbcb2, roughness: 0.6 });
  mesh(new THREE.BoxGeometry(0.6, 0.45, 0.45), caseMat, group, 3.6, 0.225, -3.5);
  mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), caseMat, group, 3.65, 0.65, -3.5);
  colliders.push([3.2, -3.9, 4.1, -3.1]);

  // Heavy door in the wall behind the visitor's start point.
  const door = new THREE.Group(); door.position.set(0, 0, R - 0.05); group.add(door);
  const dm = std({ color: 0x55595a, metalness: 0.75, roughness: 0.45, roughnessMap: TX.grime('cdoor', 117, 0.4, 0.9, 6) });
  mesh(new THREE.BoxGeometry(1.8, 2.6, 0.2), dm, door, 0, 1.3, 0);
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(1.7, 0.05, 0.05), std({ color: 0x3a3d3e, metalness: 0.8, roughness: 0.4 }), door, 0, 0.3 + i * 0.5, -0.12);
  mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24), dm, door, 0.5, 1.3, -0.13).rotation.x = Math.PI / 2;

  // Lighting: cold, hazy, top-lit.
  const lights = { lit: [...pillarLights, screenLight], dark: [] };
  const amb = new THREE.HemisphereLight(0xc8c2a4, 0x302c20, 0); amb.userData.on = 0.22; group.add(amb); lights.lit.push(amb);
  const key = new THREE.SpotLight(0xfff0d8, 0, 12, 0.5, 0.7, 1.4);
  key.position.set(0.8, H - 0.3, 1.2); key.target.position.set(0, 0.75, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
  key.userData.on = 34; group.add(key, key.target); lights.lit.push(key);
  const back = new THREE.SpotLight(0xe8e0c8, 0, 12, 0.6, 0.8, 1.4);
  back.position.set(-1, H - 0.4, -3.5); back.target.position.set(0, 1.2, 0); back.userData.on = 26;
  group.add(back, back.target); lights.lit.push(back);
  const darkAmb = new THREE.AmbientLight(0x202838, 0); darkAmb.userData.on = 0.12; group.add(darkAmb); lights.dark.push(darkAmb);
  // Shafts through the haze (V6 is visibly smoky) and haze dust.
  lights.beams = [];
  for (const [sp, col, st] of [[key, 0xf2e8d0, 0.03], [back, 0xe2dcc6, 0.028]]) {
    const b = makeBeam(sp.position, sp.target.position.clone().lerp(sp.position, -0.35), sp.angle * 0.8, col, st);
    b.userData.state = 'lit'; lights.beams.push(b); group.add(b);
  }
  // Soft vertical glow in front of each light slot.
  PILLAR_ANGLES.forEach((a) => {
    const from = new THREE.Vector3(Math.sin(a) * (CAGE.pillarR - 0.25), 2.75, Math.cos(a) * (CAGE.pillarR - 0.25));
    const b = makeBeam(from, from.clone().add(new THREE.Vector3(-Math.sin(a) * 0.9, -2.5, -Math.cos(a) * 0.9)), 0.22, 0xfff3dc, 0.014);
    b.userData.state = 'lit'; lights.beams.push(b); group.add(b);
  });
  const dust = makeDust({ count: 1500, min: new THREE.Vector3(0, 0.1, 0), max: new THREE.Vector3(0, 4.8, 0), radius: CAGE.radius - 0.4, color: 0xe8e2cc, size: 0.011, opacity: 0.2 });
  group.add(dust);

  return { group, colliders, dalek, chains: { taut, slack }, lights, screens, dust, panelMat, spawn: { pos: [0, 1.62, 4.9], yaw: 0 } };
}

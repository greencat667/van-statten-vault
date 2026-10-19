// The 2005 bronze Dalek ("Metaltron"), battle-damaged, as chained in the Cage.
// Geometry: dalek_asm_v6_upright.stl by rsfuhrer, Printables model 12372 (CC BY-NC-SA 4.0)
// (https://www.printables.com/model/12372-dalek-model-doctor-who-2005-series), 1.62 m, 2005 pattern,
// decimated and grouped by tools/dalek-decimate.py. Groups: skirt, hemi,
// shoulder, slat, joint, gun, plunger, neck, ring, dome, eye, lamp.
// Materials, damage, the crack and all animation are added here.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { shapedTube } from './exhibits.js';
import dalekB64 from '../assets/dalek.bin';

const std = (o) => new THREE.MeshStandardMaterial(o);

export function decodePack(b64) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const dv = new DataView(bin.buffer);
  let o = 0;
  const n = dv.getUint32(o, true); o += 4;
  const out = {};
  for (let p = 0; p < n; p++) {
    const name = new TextDecoder().decode(bin.subarray(o, o + 12)).replace(/\0+$/, ''); o += 12;
    const nv = dv.getUint32(o, true), nt = dv.getUint32(o + 4, true), wide = dv.getUint32(o + 8, true); o += 12;
    const mn = [0, 1, 2].map((i) => dv.getFloat32(o + i * 4, true));
    const mx = [0, 1, 2].map((i) => dv.getFloat32(o + 12 + i * 4, true)); o += 24;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) { const c = i % 3; pos[i] = mn[c] + (dv.getUint16(o, true) / 65535) * (mx[c] - mn[c]); o += 2; }
    const idx = wide ? new Uint32Array(nt * 3) : new Uint16Array(nt * 3);
    for (let i = 0; i < nt * 3; i++) { idx[i] = wide ? dv.getUint32(o, true) : dv.getUint16(o, true); o += wide ? 4 : 2; }
    if (o % 4) o += 4 - (o % 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    out[name] = boxUV(toCreasedNormals(g, 0.55), 0.55);
  }
  return out;
}

// Box-projected UVs so the bronze and grime textures land on STL geometry.
function boxUV(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

let PACK;

export function buildDalek(opts = {}) {
  const damaged = opts.damaged !== false;
  PACK = PACK || decodePack(dalekB64);
  const g = new THREE.Group();
  g.name = 'Dalek (2005)';
  const dents = TX.dentNormal(247);
  // Dull, dirty finish as filmed: low env reflection, high roughness; the
  // hemispheres keep a little more sheen.
  const bronze = std({ map: TX.bronze(23, damaged), metalness: 0.6, roughness: 0.68, roughnessMap: TX.grime('dalekR', 101, 0.75, 1, 8), normalMap: dents, normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.45 });
  const bronzeDark = std({ map: TX.bronze(23, damaged), color: 0x7a634a, metalness: 0.55, roughness: 0.72, normalMap: dents, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.4 });
  const hemiMat = std({ map: TX.bronze(29, damaged), color: 0xd2b080, metalness: 0.75, roughness: 0.48, roughnessMap: TX.grime('hemiR', 249, 0.7, 1, 10), envMapIntensity: 0.55 });
  const black = std({ color: 0x141312, roughness: 0.55, metalness: 0.4 });
  const steel = std({ color: 0x8e8c86, metalness: 1, roughness: 0.3 });
  const lampMat = std({ color: 0xfff4e0, emissive: 0xfff2d0, emissiveIntensity: 0.1, roughness: 0.25, metalness: 0.2 });
  const bronzeUpper = bronze.clone(); bronzeUpper.color = new THREE.Color(0x9a8a6c);
  const MAT = { skirt: bronze, shoulder: bronzeUpper, dome: bronzeUpper, hemi: hemiMat, slat: bronzeDark, joint: bronzeDark,
    ring: bronzeDark, neck: std({ color: 0x241d14, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide }),
    gun: black, plunger: black, eye: bronzeDark, lamp: lampMat };

  const head = new THREE.Group(); g.add(head);   // dome turns about the turret axis (x=z=0)
  const eye = new THREE.Group(); head.add(eye);
  const meshes = {};
  for (const [name, geo] of Object.entries(PACK)) {
    const m = new THREE.Mesh(geo, MAT[name] || bronze);
    m.castShadow = m.receiveShadow = true;
    meshes[name] = m;
    (name === 'dome' || name === 'lamp' ? head : name === 'eye' ? eye : g).add(m);
  }
  // Eyestalk pivot at its rear end, where it enters the dome.
  const eb = new THREE.Box3().setFromObject(meshes.eye);
  const pivot = new THREE.Vector3((eb.min.x + eb.max.x) / 2, (eb.min.y + eb.max.y) / 2, eb.min.z);
  eye.position.copy(pivot);
  meshes.eye.position.sub(pivot);
  // Blue lens at the front of the eyestalk.
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 24), std({ color: 0x2244ff, emissive: 0x3f7bff, emissiveIntensity: 2.4 }));
  lens.position.set(0, 0, eb.max.z - pivot.z + 0.002);
  eye.add(lens);
  const eyeLight = new THREE.PointLight(0x4a7dff, 0.5, 2.5, 2);
  eyeLight.position.set(0, 0, eb.max.z - pivot.z + 0.05);
  eye.add(eyeLight);

  // Battle damage (V6): a jagged split down the front skirt panel, found by
  // ray-casting the real panel surface.
  if (damaged) {
    const skirt = meshes.skirt;
    skirt.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    const r = TX.rng(5), pts = [];
    for (let i = 0; i <= 18; i++) {
      const y = 0.16 + i * 0.034, x = -0.05 + (r() - 0.5) * 0.035;
      rc.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
      const hit = rc.intersectObject(skirt, false)[0];
      if (hit) pts.push(hit.point.add(new THREE.Vector3(0, 0, 0.004)));
    }
    if (pts.length > 4) {
      const crack = new THREE.CatmullRomCurve3(pts);
      const cm = new THREE.Mesh(shapedTube(crack, 90, 6, (u) => 0.0025 + 0.0045 * Math.sin(u * Math.PI) * (0.55 + 0.45 * Math.sin(u * 37))), std({ color: 0x060403, roughness: 1 }));
      g.add(cm);
    }
  }

  const bb = new THREE.Box3().setFromObject(g);
  g.userData = { head, eye, lampMat, eyeLight, height: bb.max.y, box: bb };
  return g;
}

// Idle behaviour: slow eyestalk search, dome lights flashing while it speaks.
export function animateDalek(d, t, speaking) {
  const u = d.userData;
  u.head.rotation.y = Math.sin(t * 0.23) * 0.35 + Math.sin(t * 0.07) * 0.2;
  u.eye.rotation.x = -0.05 + Math.sin(t * 0.41) * 0.08;
  u.eye.rotation.y = Math.sin(t * 0.31) * 0.06;
  u.lampMat.emissiveIntensity = speaking ? 0.4 + speaking * 3.2 : 0.08;
  u.eyeLight.intensity = 0.4 + Math.sin(t * 2.1) * 0.08;
}

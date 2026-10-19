// The TARDIS police box as it stands by the arch in the gallery.
// Body: Format1.STL from CGTrader "TARDIS 2005 model A/B"
// (https://www.cgtrader.com/free-3d-models/aircraft/other/tardis-2005-model-a-b), scaled to 2.9 m (1.445 m base), packed by
// tools/pack-stl.py. Lit sign boxes, windows, the door notice and the lamp
// glow are overlays positioned from an orthographic elevation of that mesh.
import * as THREE from 'three';
import * as TX from './textures.js';
import { decodePack } from './dalek.js';
import tardisB64 from '../assets/tardis.bin';

let PACK;

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 148;
  const x = c.getContext('2d');
  x.fillStyle = '#16294a'; x.fillRect(0, 0, 128, 148);
  const pw = 34, ph = 62, gx = (128 - pw * 3) / 4, gy = (148 - ph * 2) / 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const g = x.createLinearGradient(0, gy + i * (ph + gy), 0, gy + i * (ph + gy) + ph);
    g.addColorStop(0, '#f4f7ff'); g.addColorStop(1, '#c9d6f2');
    x.fillStyle = g; x.fillRect(gx + j * (pw + gx), gy + i * (ph + gy), pw, ph);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildTardis() {
  PACK = PACK || decodePack(tardisB64);
  const g = new THREE.Group();
  g.name = 'TARDIS';
  const blue = new THREE.MeshStandardMaterial({ color: 0x1b3b74, roughness: 0.62, metalness: 0.0, roughnessMap: TX.grime('tardis', 51, 0.75, 1, 8), normalMap: TX.paintNormal(), normalScale: new THREE.Vector2(0.12, 0.12) });
  const body = new THREE.Mesh(PACK.body, blue);
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  const signTex = TX.tardisSign();
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, color: 0xe8e0c8, emissive: 0xfff2d6, emissiveMap: signTex, emissiveIntensity: 0.28, roughness: 0.4 });
  const signBox = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.45 });
  const wt = windowTexture();
  const winMat = new THREE.MeshStandardMaterial({ map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 0.75, roughness: 0.3 });
  const FACE = 0.6745, FRIEZE = 0.7235;
  for (let f = 0; f < 4; f++) {
    const face = new THREE.Group(); face.rotation.y = f * Math.PI / 2; g.add(face);
    // The 2005 prop's sign box stands proud of the frieze: black, with backlit cream lettering.
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.19, 0.05), signBox);
    box.position.set(0, 2.24, FRIEZE + 0.022); box.castShadow = true; face.add(box);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.15), signMat);
    sign.position.set(0, 2.24, FRIEZE + 0.048); face.add(sign);
    for (const x of [-0.262, 0.258]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.39), winMat);
      w.position.set(x, 1.86, FACE + 0.002); face.add(w);
    }
    if (f === 0) {
      // Police telephone notice on the left door and the St John Ambulance badge.
      const n = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.28), new THREE.MeshStandardMaterial({ map: TX.labelTexture(['POLICE TELEPHONE', 'FREE FOR USE OF', 'PUBLIC', 'ADVICE & ASSISTANCE', 'OBTAINABLE IMMEDIATELY'], { w: 256, h: 300, titleSize: 22, bodySize: 17, align: 'center', top: 40 }), color: 0xbdb7a6, roughness: 0.6 }));
      n.position.set(-0.262, 1.37, FACE + 0.004); face.add(n);
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.5 }));
      badge.position.set(-0.262, 0.98, FACE + 0.004); face.add(badge);
      const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.055), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }));
      cross.position.set(-0.262, 0.98, FACE + 0.005); cross.rotation.z = Math.PI / 4; face.add(cross);
    }
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 }));
  lamp.position.y = 2.78;
  g.add(lamp);

  // Light from the windows and lamp: strong in the dark state, subtle when lit.
  const inner = new THREE.PointLight(0xc8d8ff, 0, 7, 1.7); inner.position.set(0, 2.0, 0.95);
  const lampL = new THREE.PointLight(0xfff2d6, 0, 6, 1.8); lampL.position.set(0, 2.95, 0);
  inner.userData.on = 2.2; lampL.userData.on = 1.2;
  const innerLit = new THREE.PointLight(0xc8d8ff, 0, 4, 2); innerLit.position.set(0, 2.0, 0.95); innerLit.userData.on = 0.6;
  g.add(inner, lampL, innerLit);
  return { group: g, darkLights: [inner, lampL], litLights: [innerLit], lamp, size: 1.445 };
}

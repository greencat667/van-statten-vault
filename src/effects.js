// Atmospheric lighting effects: soft volumetric beams and drifting dust.
import * as THREE from 'three';

const beamVert = `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const beamFrag = `
  uniform vec3 color; uniform float strength; uniform float time;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    // Clamp before pow(): interpolated UVs can dip below 0 at the rim, and a
    // NaN here would be smeared across the frame by the bloom pass.
    float along = pow(clamp(vUv.y, 0.0, 1.0), 1.7);       // brightest at the lamp
    float nl = length(vN);
    float edge = nl > 1e-4 ? pow(clamp(abs(dot(vN / nl, normalize(vV))), 0.0, 1.0), 1.6) : 0.0;
    float shimmer = 0.9 + 0.1 * sin(vUv.y * 30.0 - time * 0.6 + vUv.x * 12.0);
    float a = strength * along * edge * shimmer;
    if (!(a > 0.0)) discard;                               // also rejects NaN
    gl_FragColor = vec4(color * a, 1.0);
  }`;

// A cone of light from `from` towards `to`, `angle` = half-angle in radians.
export function makeBeam(from, to, angle, color, strength) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = new THREE.ConeGeometry(Math.tan(angle) * len, len, 40, 1, true);
  geo.translate(0, -len / 2, 0); // apex at the origin, opening along -y
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: 0 }, time: { value: 0 } },
    vertexShader: beamVert, fragmentShader: beamFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  m.userData.strength = strength;
  m.userData.isBeam = true;
  m.renderOrder = 5;
  m.frustumCulled = false;
  return m;
}

let dot;
function dotTexture() {
  if (dot) return dot;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  dot = new THREE.CanvasTexture(c);
  return dot;
}

// Drifting dust motes inside a box (or a cylinder when `radius` is given).
export function makeDust({ count, min, max, radius, color, size, opacity }) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    if (radius) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
      pos.set([Math.cos(a) * r, min.y + Math.random() * (max.y - min.y), Math.sin(a) * r], i * 3);
    } else {
      pos.set([min.x + Math.random() * (max.x - min.x), min.y + Math.random() * (max.y - min.y), min.z + Math.random() * (max.z - min.z)], i * 3);
    }
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, map: { value: dotTexture() }, color: { value: new THREE.Color(color) }, opacity: { value: 0 }, size: { value: size }, scale: { value: innerHeight / 2 } },
    vertexShader: `
      attribute float seed; uniform float time, size, scale; varying float vTw;
      void main() {
        vec3 p = position;
        p.x += sin(time * 0.07 + seed) * 0.25;
        p.y += sin(time * 0.05 + seed * 1.7) * 0.18;
        p.z += cos(time * 0.06 + seed * 0.9) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * scale / -mv.z;
        vTw = 0.55 + 0.45 * sin(time * 0.8 + seed * 3.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vTw;
      void main() { float a = texture2D(map, gl_PointCoord).a * opacity * vTw; if (!(a > 0.0)) discard; gl_FragColor = vec4(color * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.opacity = opacity;
  return pts;
}

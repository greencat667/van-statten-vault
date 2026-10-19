// First-person walking with pointer lock and 2D collision against rectangles
// [x0,z0,x1,z1] and circles {c:[x,z], r, inside?}.
import * as THREE from 'three';

export class Walker {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.yaw = 0; this.pitch = 0;
    this.pos = new THREE.Vector3(0, 1.62, 8);
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.colliders = [];
    this.radius = 0.28;
    this.eye = 1.62;
    this.sensitivity = 0.0022;
    this.enabled = true;
    this.locked = false;
    this.bob = 0;
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      this.onLockChange && this.onLockChange(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) this.keys.add(e.code); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  lock() { try { const p = this.dom.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not available */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  set(pos, yaw = this.yaw, pitch = 0) { this.pos.set(pos[0], pos[1] ?? this.eye, pos[2]); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0); this.apply(); }
  apply() {
    this.camera.position.copy(this.pos);
    this.camera.position.y += Math.sin(this.bob) * 0.012;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 3.2 : 1.45;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const want = fwd.multiplyScalar(f).add(right.multiplyScalar(s));
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(speed);
    const a = 1 - Math.exp(-dt * 10);
    this.vel.lerp(want, a);
    const step = this.vel.clone().multiplyScalar(dt);
    // Move in sub-steps for stable collision.
    const n = Math.max(1, Math.ceil(step.length() / 0.1));
    for (let i = 0; i < n; i++) {
      this.pos.x += step.x / n; this.pos.z += step.z / n;
      this.collide();
    }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.2) this.bob += dt * sp * 5.5; else this.bob *= 0.9;
    this.apply();
  }
  collide() {
    const r = this.radius, p = this.pos;
    for (let it = 0; it < 2; it++) for (const c of this.colliders) {
      if (Array.isArray(c)) {
        const cx = Math.max(c[0], Math.min(p.x, c[2])), cz = Math.max(c[1], Math.min(p.z, c[3]));
        const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 1e-8) { const d = Math.sqrt(d2), push = (r - d) / d; p.x += dx * push; p.z += dz * push; }
          else {
            // Centre inside the rect: push out along the shallowest axis.
            const opts = [[c[0] - r - p.x, 0], [c[2] + r - p.x, 0], [0, c[1] - r - p.z], [0, c[3] + r - p.z]];
            opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
            p.x += opts[0][0]; p.z += opts[0][1];
          }
        }
      } else if (c.inside) {
        const dx = p.x - c.c[0], dz = p.z - c.c[1], d = Math.hypot(dx, dz), lim = c.r - r;
        if (d > lim) { p.x = c.c[0] + dx / d * lim; p.z = c.c[1] + dz / d * lim; }
      } else {
        const dx = p.x - c.c[0], dz = p.z - c.c[1], d = Math.hypot(dx, dz) || 1e-6, lim = c.r + r;
        if (d < lim) { p.x = c.c[0] + dx / d * lim; p.z = c.c[1] + dz / d * lim; }
      }
    }
  }
}

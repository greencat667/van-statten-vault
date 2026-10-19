// THE VAULT — application shell: renderer, environments, interaction, tour,
// security, inspection, reference comparison and the floor plan.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EXHIBITS, TOUR, PLAN, CONF, ROOM, TARDIS_POS } from './data.js';
import { buildMuseum, CASES, M } from './museum.js';
import { BUILDERS } from './exhibits.js';
import { buildCage, CAGE } from './cage.js';
import { animateDalek } from './dalek.js';
import { Walker } from './controls.js';
import * as SFX from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.03, 80);
const walker = new Walker(camera, canvas);
const pmrem = new THREE.PMREMGenerator(renderer);

// ---------- state ----------
const S = {
  env: 'museum', mode: 'intro', // intro | walk | free | tour | inspect
  light: 'dark', armed: true, alarm: false, expanded: false, grade: true, fx: true,
  hover: null, speaking: 0, tourI: 0, tourAuto: false, plan: false,
};

// ---------- worlds ----------
const worlds = {};
function makeMuseum() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const mus = buildMuseum(scene);
  scene.add(mus.group);
  const exhibits = [];
  for (const ex of EXHIBITS) {
    const c = CASES[ex.case](ex);
    const root = new THREE.Group();
    root.name = 'exhibit:' + ex.id;
    root.position.set(ex.pos[0], 0, ex.pos[1]);
    root.rotation.y = ex.rotY;
    root.add(c.group);
    const model = BUILDERS[ex.id]();
    model.position.y = c.deckY;
    if (ex.case === 'wall') model.position.z = -0.05;
    root.add(model);
    // Soft contact shadow (a cheap, selective ambient occlusion).
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(c.size[0] * 1.5, c.size[1] * 1.5), aoMaterial());
    ao.rotation.x = -Math.PI / 2; ao.position.y = 0.006; ao.renderOrder = 1;
    root.add(ao);
    scene.add(root);
    const q = Math.abs(Math.sin(ex.rotY)) > 0.7;
    const hw = (q ? c.size[1] : c.size[0]) / 2 + 0.02, hd = (q ? c.size[0] : c.size[1]) / 2 + 0.02;
    const rect = [ex.pos[0] - hw, ex.pos[1] - hd, ex.pos[0] + hw, ex.pos[1] + hd];
    c.hit.userData.exhibit = ex.id;
    exhibits.push({ ex, root, c, model, rect, active: !ex.expanded });
    root.visible = !ex.expanded;
  }
  // AO under the TARDIS too.
  const tao = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), aoMaterial());
  tao.rotation.x = -Math.PI / 2; tao.position.set(TARDIS_POS.x, 0.006, TARDIS_POS.z); tao.name = 'tardisAO'; scene.add(tao);
  const w = { scene, mus, exhibits, lights: mus.lights, env: {} };
  w.colliders = () => [...mus.colliders, ...exhibits.filter((e) => e.active).map((e) => e.rect)];
  w.spawn = { pos: [0.5, 1.62, -5.6], yaw: -0.2 };
  return w;
}

function makeCage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0a);
  scene.fog = new THREE.FogExp2(0x6f6d5a, 0.0);
  const cg = buildCage();
  scene.add(cg.group);
  const w = { scene, cage: cg, lights: cg.lights, env: {} };
  w.colliders = () => [...cg.colliders, { c: [0, 0], r: CAGE.radius - 0.1, inside: true }];
  w.spawn = cg.spawn;
  return w;
}

let aoTex;
function aoMaterial() {
  if (!aoTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    aoTex = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, toneMapped: false });
}

function world() { return worlds[S.env]; }

// ---------- post-processing ----------
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), new THREE.Scene(), camera);
outline.edgeStrength = 2.2; outline.edgeGlow = 0; outline.edgeThickness = 1; outline.pulsePeriod = 0;
outline.visibleEdgeColor.set(0xe8d3a2); outline.hiddenEdgeColor.set(0x3a3020);
const gradePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, amount: { value: 1 }, time: { value: 0 }, alarm: { value: 0 }, sat: { value: 1 }, tint: { value: new THREE.Vector3(1.03, 1.0, 0.95) }, lift: { value: new THREE.Vector3(0.012, 0.008, 0.006) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount, time, alarm, sat; uniform vec3 tint, lift; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 g = c.rgb;
      // 2005 broadcast look: slightly lifted blacks, warm mids, gentle contrast.
      g = mix(g, g*g*(3.0-2.0*g), 0.18);
      g = mix(vec3(dot(g, vec3(0.299, 0.587, 0.114))), g, sat);
      g = g * tint + lift;
      float v = smoothstep(0.95, 0.35, length(vUv-0.5));
      g *= mix(1.0, v, 0.55);
      g += (h(vUv*vec2(1913.,1171.)+time)-0.5) * 0.018;
      g = mix(g, g*vec3(1.25,0.75,0.72), alarm*0.35);
      gl_FragColor = vec4(mix(c.rgb, g, amount), c.a);
    }`,
});
// Bloom only on genuinely bright sources: lamps, lit signs, light boxes, beacons.
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.5, 1.1);
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(outline);
composer.addPass(new OutputPass());
composer.addPass(gradePass);

function setSceneForPasses(scene, cam) {
  renderPass.scene = scene; renderPass.camera = cam;
  outline.renderScene = scene; outline.renderCamera = cam;
}

// Environment maps captured from each world in each lighting state.
function refreshEnv() {
  const w = world();
  const key = S.light;
  const hidden = [];
  const hide = (o) => { if (o.visible) { hidden.push(o); o.visible = false; } };
  if (!w.env[key]) {
    w.scene.traverse((o) => { if (o.userData.isGlass || o.userData.isBeam || o.isPoints) hide(o); });
    w.env[key] = pmrem.fromScene(w.scene, 0.02, 0.1, 60, { size: 512, position: S.env === 'museum' ? new THREE.Vector3(0, 1.7, 0) : new THREE.Vector3(0, 1.7, 2.5) }).texture;
    // Local probes so the key objects reflect what actually surrounds them.
    w.probes = w.probes || {};
    w.probes[key] = probeTargets(w).map(({ obj, pos }) => {
      hide(obj);
      const tex = pmrem.fromScene(w.scene, 0.0, 0.05, 40, { size: 256, position: pos }).texture;
      obj.visible = true; hidden.splice(hidden.indexOf(obj), 1);
      return { obj, tex };
    });
    hidden.forEach((o) => (o.visible = true));
  }
  (w.probes?.[key] || []).forEach(({ obj, tex }) => obj.traverse((o) => {
    if (o.isMesh && o.material && 'envMap' in o.material && !o.material.isShaderMaterial) { o.material.envMap = tex; o.material.needsUpdate = true; }
  }));
  w.scene.environment = w.env[key];
  w.scene.environmentIntensity = S.env === 'museum' ? (S.light === 'lit' ? 0.9 : 0.6) : 0.8;
}
function probeTargets(w) {
  const at = (o, dy = 0) => { const v = new THREE.Vector3(); o.getWorldPosition(v); v.y += dy; return v; };
  if (w.mus) {
    const cy = w.exhibits.find((e) => e.ex.id === 'cyberman').model;
    return [{ obj: cy, pos: at(cy, 0.55) }, { obj: w.mus.tardis.group, pos: at(w.mus.tardis.group, 1.5) }];
  }
  return [{ obj: w.cage.dalek, pos: at(w.cage.dalek, 1.0) }];
}

// ---------- lighting ----------
let flicker = null;
function setLight(state, animate = true) {
  S.light = state;
  $('darkBtn').classList.toggle('on', state === 'dark');
  $('litBtn').classList.toggle('on', state === 'lit');
  for (const w of Object.values(worlds)) applyLights(w, state, 1);
  if (animate && state === 'lit' && S.env === 'museum') {
    flicker = { t: 0, seed: Math.random() * 100 };
    SFX.lightSwitchSound(true);
  } else if (animate) SFX.lightSwitchSound(false);
  if (S.env === 'museum') {
    const sw = worlds.museum.mus.lightSwitch;
    sw.rockers.forEach((r) => (r.rotation.x = state === 'lit' ? -0.25 : 0.25));
  }
  setTimeout(refreshEnv, animate ? 1300 : 0);
}
function applyLights(w, state, k, jitter) {
  const L = w.lights;
  L.lit.forEach((l, i) => { const j = jitter ? jitter(i) : 1; l.intensity = state === 'lit' ? l.userData.on * k * j : 0; });
  L.dark.forEach((l) => (l.intensity = state === 'dark' ? l.userData.on : 0));
  (L.beams || []).forEach((b) => (b.material.uniforms.strength.value = S.fx && b.userData.state === state ? b.userData.strength * (state === 'lit' ? k : 1) : 0));
  const dust = w.mus ? w.mus.dust : w.cage?.dust;
  if (dust) { dust.visible = S.fx; dust.material.uniforms.opacity.value = dust.userData.opacity * (w.mus ? (state === 'lit' ? k : 0.25) : (state === 'lit' ? 1 : 0.35)); }
  if (w.mus) {
    M.canopyLight.emissiveIntensity = state === 'lit' ? 0.14 * k : 0;
    M.fixtureLens.emissiveIntensity = state === 'lit' ? 2.0 * k : 0;
  }
  if (w.cage) {
    w.scene.fog.density = state === 'lit' ? 0.028 : 0.018;
    w.cage.screens.forEach((s) => (s.material.emissiveIntensity = state === 'lit' ? 0.85 : 0.4));
    w.cage.panelMat.emissiveIntensity = state === 'lit' ? 2.4 : 0.1;   // light pillars go out with the lights
  }
}

// ---------- security ----------
const alarmFx = { t: 0, shutter: 0 };
function triggerAlarm(source = 'glass') {
  if (S.env !== 'museum') return;
  if (!S.armed) { toast('You touch the glass. The alarm is disarmed, so nothing happens.', true); return; }
  if (S.alarm) return;
  S.alarm = true;
  SFX.alarm(true); SFX.shutterSound();
  const cy = worlds.museum.exhibits.find((e) => e.ex.id === 'cyberman');
  const led = cy.c.group.userData.sensorLed;
  led.material.emissive.set(0xff2010); led.material.emissiveIntensity = 3;
  worlds.museum.mus.doors.forEach((d) => { d.kled.material.emissive.set(0xff2a1a); d.dome.material.emissiveIntensity = 2.5; d.light.intensity = 30; d.beam.material.uniforms.strength.value = S.fx ? 0.45 : 0; });
  $('secState').textContent = 'Status: ALARM. Case sensor tripped; exhibit room sealed.';
  toast('SECURITY ALERT · Level 53 exhibit room · Case 07 sensor tripped · Doors sealed. Remain where you are.');
}
function resetSecurity() {
  S.alarm = false;
  SFX.alarm(false);
  const cy = worlds.museum.exhibits.find((e) => e.ex.id === 'cyberman');
  const led = cy.c.group.userData.sensorLed;
  led.material.emissive.set(0x22ff44); led.material.emissiveIntensity = 1.5;
  worlds.museum.mus.doors.forEach((d) => { d.kled.material.emissive.set(0x22ff55); d.dome.material.emissiveIntensity = 0; d.light.intensity = 0; d.beam.material.uniforms.strength.value = 0; });
  $('secState').textContent = S.armed ? 'Status: armed. Doors open to staff.' : 'Status: disarmed.';
  toast('Security reset. Shutters raised.', true);
}
function updateSecurity(dt, t) {
  if (!worlds.museum) return;
  const target = S.alarm ? 1 : 0;
  alarmFx.shutter += (target - alarmFx.shutter) * Math.min(1, dt * (S.alarm ? 0.55 : 1.4));
  worlds.museum.mus.doors.forEach((d) => {
    d.shutter.scale.y = Math.max(0.001, Math.min(1, alarmFx.shutter * 1.04));
    d.beacon.rotation.y = S.alarm ? t * 7 : d.beacon.rotation.y;
    if (S.alarm) d.dome.material.emissiveIntensity = 1.5 + Math.sin(t * 14) * 1.0;
  });
  gradePass.uniforms.alarm.value = S.alarm && S.env === 'museum' ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
}

// ---------- toast ----------
let toastT;
function toast(msg, info = false) {
  const el = $('toast');
  el.textContent = msg; el.className = info ? 'info' : '';
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add('hidden'), info ? 3500 : 7000);
}

// ---------- environments ----------
function setEnv(env, spawn = true) {
  S.env = env;
  $('envSel').value = env;
  $('where').textContent = env === 'museum' ? 'LEVEL 53 · EXHIBIT ROOM' : 'LEVEL 53 · THE CAGE';
  $('cageSec').classList.toggle('hidden', env !== 'cage');
  const w = world();
  setSceneForPasses(w.scene, camera);
  // Per-room grade: the museum is warm, soft and slightly lifted (2005 video,
  // sampled from the V1 still: runner ~(183,134,45), border ~(138,119,88)); the Cage stills are a murky warm olive
  // (sampled from BBC still s1_06_wal_04: walls ~(69,69,48), floor ~(127,121,91)).
  const G = gradePass.uniforms;
  if (env === 'cage') { G.sat.value = 0.88; G.tint.value.set(1.02, 1.0, 0.84); G.lift.value.set(0.012, 0.012, 0.004); }
  else { G.sat.value = 0.88; G.tint.value.set(1.04, 1.0, 0.86); G.lift.value.set(0.022, 0.017, 0.008); }
  walker.colliders = w.colliders();
  if (spawn) walker.set(w.spawn.pos, w.spawn.yaw, 0);
  if (env === 'cage') SFX.alarm(false); else if (S.alarm) SFX.alarm(true);
  applyLights(w, S.light, 1);
  refreshEnv();
  drawPlan();
}

// ---------- modes ----------
let orbit;
function setMode(mode) {
  const prev = S.mode;
  S.mode = mode;
  $('intro').classList.toggle('hidden', mode !== 'intro');
  $('reticle').classList.toggle('hidden', mode !== 'walk');
  $('hint').classList.toggle('hidden', mode !== 'walk');
  $('caption').classList.toggle('hidden', mode !== 'tour');
  $('inspect').classList.toggle('hidden', mode !== 'inspect');
  $('freeBtn').classList.toggle('on', mode === 'free');
  $('prompt').classList.add('hidden');
  walker.enabled = mode === 'walk';
  if (orbit) { orbit.dispose(); orbit = null; }
  if (mode === 'free') {
    walker.unlock();
    orbit = new OrbitControls(camera, canvas);
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    orbit.target.copy(camera.position).addScaledVector(dir, 3);
    orbit.enableDamping = true; orbit.maxDistance = 30;
    orbit.update();
  }
  if (mode !== 'walk') walker.unlock();
  if (mode === 'walk' && prev !== 'walk') {
    // Re-derive yaw/pitch from wherever the camera now is.
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    walker.pos.copy(camera.position); walker.pos.y = walker.eye;
    walker.yaw = e.y; walker.pitch = e.x;
    walker.colliders = world().colliders();
    walker.collide();
    camera.fov = +$('fov').value; camera.updateProjectionMatrix();
    resize();
  }
  camera.fov = +$('fov').value; resize();
  outline.selectedObjects = [];
}

// ---------- hover / interaction ----------
const ray = new THREE.Raycaster();
ray.far = 2.8;
function updateHover() {
  if (S.mode !== 'walk') return;
  const w = world();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  let targets = [];
  if (S.env === 'museum') {
    targets = w.exhibits.filter((e) => e.active).map((e) => e.c.hit);
    targets.push(w.mus.lightSwitch.hit);
  } else {
    targets = [w.cage.dalek];
  }
  const hit = ray.intersectObjects(targets, true)[0];
  let h = null;
  if (hit) {
    if (hit.object.userData.exhibit) h = { kind: 'exhibit', e: w.exhibits.find((x) => x.ex.id === hit.object.userData.exhibit) };
    else if (hit.object === w.mus?.lightSwitch.hit) h = { kind: 'switch' };
    else h = { kind: 'dalek' };
  }
  S.hover = h;
  const p = $('prompt');
  if (!h) { p.classList.add('hidden'); outline.selectedObjects = []; return; }
  p.classList.remove('hidden');
  if (h.kind === 'exhibit') {
    outline.selectedObjects = [h.e.model];
    p.innerHTML = `<kbd>E</kbd>Inspect · ${h.e.ex.name}` + (h.e.ex.alarm ? ' &nbsp; <kbd>T</kbd>Touch the glass' : '');
  } else if (h.kind === 'switch') {
    outline.selectedObjects = [w.mus.lightSwitch.group];
    p.innerHTML = `<kbd>E</kbd>${S.light === 'lit' ? 'Switch the lights off' : 'Switch the lights on'}`;
  } else {
    outline.selectedObjects = [];
    p.innerHTML = '<kbd>E</kbd>Listen';
  }
}
function interact() {
  const h = S.hover;
  if (!h) return;
  if (h.kind === 'exhibit') openInspect(h.e.ex.id);
  else if (h.kind === 'switch') setLight(S.light === 'lit' ? 'dark' : 'lit');
  else speak();
}
function speak() {
  const times = SFX.dalekSpeak();
  const t0 = performance.now() / 1000;
  S.speakTimes = times.map(([a, b]) => [t0 + a, t0 + b]);
}

// ---------- inspection ----------
const insp = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(35, 1, 0.01, 30), obj: null, caseObj: null, ex: null, orbit: null };
{
  insp.scene.background = new THREE.Color(0x101113);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  insp.scene.environment = env; insp.scene.environmentIntensity = 0.55;
  const key = new THREE.SpotLight(0xfff0dc, 40, 10, 0.5, 0.6, 1.5); key.position.set(1.4, 2.6, 1.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003;
  const rim = new THREE.DirectionalLight(0xa8c0ff, 1.2); rim.position.set(-2, 1.5, -2);
  const fill = new THREE.HemisphereLight(0xffeedd, 0x202020, 0.4);
  insp.scene.add(key, key.target, rim, fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; insp.scene.add(floor);
  insp.floor = floor;
}
function openInspect(id) {
  const e = worlds.museum.exhibits.find((x) => x.ex.id === id);
  const ex = e.ex;
  insp.ex = ex;
  if (insp.obj) insp.scene.remove(insp.obj);
  if (insp.caseObj) insp.scene.remove(insp.caseObj);
  const obj = BUILDERS[id]();
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  insp.scene.add(obj);
  insp.obj = obj;
  const c = CASES[ex.case](ex);
  c.group.position.y = -c.deckY;
  c.hit.visible = false;
  insp.caseObj = c.group;
  insp.caseObj.visible = false;
  insp.scene.add(c.group);
  $('glassBtn').classList.remove('on');
  $('glassBtn').textContent = 'Show display case';
  $('touchBtn').classList.toggle('hidden', !ex.alarm);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  insp.target = centre; insp.radius = Math.max(size.x, size.y, size.z);
  insp.orbit && insp.orbit.dispose();
  insp.orbit = new OrbitControls(insp.camera, canvas);
  insp.orbit.enableDamping = true; insp.orbit.minDistance = insp.radius * 0.35; insp.orbit.maxDistance = insp.radius * 6;
  insp.orbit.zoomSpeed = 0.8;
  viewPreset('front');
  renderDoc(ex);
  setMode('inspect');
  setSceneForPasses(insp.scene, insp.camera);
  resize();
}
function viewPreset(kind) {
  const r = insp.radius * 2.0, t = insp.target;
  const p = kind === 'top' ? [0.001, r, 0.001] : kind === 'under' ? [0.001, -r, 0.25 * r] : [r * 0.45, r * 0.18, r * 0.9];
  insp.camera.position.set(t.x + p[0], t.y + p[1], t.z + p[2]);
  insp.orbit.target.copy(t);
  insp.orbit.update();
  insp.floor.visible = kind !== 'under';
}
function closeInspect() {
  insp.orbit && insp.orbit.dispose(); insp.orbit = null;
  setSceneForPasses(world().scene, camera);
  setMode('walk');
  walker.lock();
}
function renderDoc(ex) {
  const conf = CONF[ex.confidence], pconf = CONF[ex.posConf];
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  $('doc').innerHTML = `
    <div class="cap">${ex.expanded ? 'Expanded Vault · imaginative' : 'Van Statten Collection'}</div>
    <h2>${esc(ex.name)}</h2>
    <div class="small"><span class="chip" style="background:${conf.color}"></span>Identification: ${conf.label}<br>
    <span class="chip" style="background:${pconf.color}"></span>Position in room: ${pconf.label}</div>
    <dl>
      <dt>Classification</dt><dd>${esc(ex.classification)}</dd>
      <dt>Provenance</dt><dd>${esc(ex.provenance)}</dd>
      <dt>Known function</dt><dd>${esc(ex.func)}</dd>
      <dt>Condition</dt><dd>${esc(ex.condition)}</dd>
      <dt>Historical notes</dt><dd>${esc(ex.notes)}</dd>
      <dt>Evidence</dt><dd>${ex.evidence.map(([k, t]) => `<div class="ev"><span class="chip" style="background:${CONF[k].color}"></span><b>${CONF[k].label}.</b> ${esc(t)}</div>`).join('')}</dd>
    </dl>`;
}

// ---------- guided tour ----------
const tourAnim = { from: null, to: null, t: 1, dur: 2.6 };
function tourPose(stop) {
  if (stop.exhibit) {
    const e = worlds.museum.exhibits.find((x) => x.ex.id === stop.exhibit);
    const focus = new THREE.Vector3(0, e.c.deckY + (e.model.userData.focusY || 0.2), 0);
    e.root.localToWorld(focus);
    const out = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), e.ex.rotY);
    const d = e.ex.case === 'wall' ? 1.6 : 1.25;
    const pos = focus.clone().addScaledVector(out, d); pos.y = Math.max(1.3, focus.y + 0.2);
    pos.addScaledVector(new THREE.Vector3(out.z, 0, -out.x), 0.35);
    return { pos, look: focus };
  }
  return { pos: new THREE.Vector3(...stop.pos), look: new THREE.Vector3(...stop.look) };
}
function startTour(i = 0) {
  if (S.env !== 'museum') setEnv('museum', false);
  setMode('tour');
  goTour(i);
}
function goTour(i) {
  S.tourI = (i + TOUR.length) % TOUR.length;
  const stop = TOUR[S.tourI];
  if (stop.light && stop.light !== S.light) setLight(stop.light);
  const pose = tourPose(stop);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pose.pos, pose.look, new THREE.Vector3(0, 1, 0)));
  tourAnim.from = { pos: camera.position.clone(), q: camera.quaternion.clone() };
  tourAnim.to = { pos: pose.pos, q };
  tourAnim.t = 0;
  $('capTitle').textContent = stop.title;
  $('capText').textContent = stop.text;
  $('tourPos').textContent = `${S.tourI + 1} / ${TOUR.length}`;
  S.tourWait = 0;
}
function updateTour(dt) {
  if (tourAnim.t < 1) {
    tourAnim.t = Math.min(1, tourAnim.t + dt / tourAnim.dur);
    const k = tourAnim.t < 0.5 ? 4 * tourAnim.t ** 3 : 1 - (-2 * tourAnim.t + 2) ** 3 / 2;
    // Arc slightly upward mid-move so the camera clears case canopies.
    camera.position.lerpVectors(tourAnim.from.pos, tourAnim.to.pos, k);
    camera.position.y += Math.sin(k * Math.PI) * 0.25;
    camera.quaternion.slerpQuaternions(tourAnim.from.q, tourAnim.to.q, k);
  } else if (S.tourAuto) {
    S.tourWait += dt;
    if (S.tourWait > 9) goTour(S.tourI + 1);
  }
}

// ---------- fixed viewpoint (testing helper, not exposed in the UI) ----------
function viewFrom(pos, look, fov = 40) {
  setMode('free');
  if (orbit) { orbit.dispose(); orbit = null; }
  camera.position.set(...pos); camera.lookAt(...look);
  camera.fov = fov; camera.updateProjectionMatrix();
}

// ---------- floor plan ----------
function drawPlan() {
  const cv = $('planCanvas'), x = cv.getContext('2d');
  x.clearRect(0, 0, cv.width, cv.height);
  if (S.env !== 'museum') {
    x.fillStyle = '#9c968a'; x.font = '11px monospace'; x.fillText('Plan: exhibit room only', 10, 20);
    return;
  }
  const sc = 15.5, ox = cv.width / 2, oz = 12 * sc + 14;
  const P = (px, pz) => [ox + px * sc, oz + pz * sc];
  const rect = (r, fill, stroke) => { const [a, b] = P(r[0], r[1]), [c, d] = P(r[2], r[3]); if (fill) { x.fillStyle = fill; x.fillRect(a, b, c - a, d - b); } if (stroke) { x.strokeStyle = stroke; x.strokeRect(a, b, c - a, d - b); } };
  PLAN.forEach((r) => rect(r.rect, CONF[r.conf].color + '33'));
  rect([-ROOM.halfW, -ROOM.halfL, ROOM.halfW, ROOM.halfL], null, '#d9b36a');
  rect([-ROOM.arch.bayHalfW, -ROOM.halfL - ROOM.arch.bayDepth, ROOM.arch.bayHalfW, -ROOM.halfL], null, '#6b6658');
  rect([-ROOM.runnerHalfW, -ROOM.halfL - 2, ROOM.runnerHalfW, ROOM.halfL - 0.5], 'rgba(196,146,52,.18)');
  ROOM.pilasterZ.forEach((z) => { rect([-ROOM.halfW, z - 0.35, -ROOM.halfW + 0.45, z + 0.35], '#b9763e'); rect([ROOM.halfW - 0.45, z - 0.35, ROOM.halfW, z + 0.35], '#b9763e'); });
  worlds.museum.exhibits.filter((e) => e.active).forEach((e) => rect(e.rect, CONF[e.ex.posConf].color, '#000'));
  rect([TARDIS_POS.x - 0.7, TARDIS_POS.z - 0.7, TARDIS_POS.x + 0.7, TARDIS_POS.z + 0.7], '#1d3557', '#7fb2e5');
  ROOM.doors.forEach((d) => { x.fillStyle = S.alarm ? '#e0483a' : '#ddd'; const [a, b] = P(d.x, d.z); x.fillRect(a - 3, b - 3, 6, 6); });
  // Viewer.
  const [vx, vz] = P(camera.position.x, camera.position.z);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(vx, vz);
  const a0 = Math.atan2(dir.z, dir.x);
  x.arc(vx, vz, 40, a0 - 0.5, a0 + 0.5); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(vx, vz, 3.5, 0, Math.PI * 2); x.fill();
}
function buildLegend() {
  $('planLegend').innerHTML = ['confirmed', 'inferred', 'speculative', 'imaginative'].map((k) => `<span><span class="chip" style="background:${CONF[k].color}"></span>${CONF[k].label}</span>`).join('');
}

// ---------- UI wiring ----------
function toggleNav(force) {
  const nav = $('nav');
  const open = force ?? nav.classList.contains('hidden');
  nav.classList.toggle('hidden', !open);
  $('menuBtn').setAttribute('aria-expanded', open);
  if (open) walker.unlock();
}
function buildExhibitList() {
  const list = $('exList');
  list.innerHTML = '';
  worlds.museum.exhibits.filter((e) => e.active).forEach((e) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="chip" style="background:${CONF[e.ex.confidence].color}"></span>${e.ex.name}`;
    b.onclick = () => { toggleNav(false); if (S.env !== 'museum') setEnv('museum'); openInspect(e.ex.id); };
    list.appendChild(b);
  });
}
function setExpanded(on) {
  S.expanded = on;
  worlds.museum.exhibits.forEach((e) => { if (e.ex.expanded) { e.active = on; e.root.visible = on; } });
  if (S.env === 'museum') walker.colliders = world().colliders();
  buildExhibitList(); drawPlan();
  toast(on ? 'Expanded Vault: imaginative additions shown (purple in the plan).' : 'Strict 2005 collection restored.', true);
}

function enterWalk() {
  setMode('walk');
  walker.lock();
}

function bindUI() {
  $('enterMuseum').onclick = () => { SFX.audio(); SFX.roomTone(true); setEnv('museum'); enterWalk(); toast('Utah, 2012. Half a mile underground. Find the light switch, or press L.', true); };
  $('enterCage').onclick = () => { SFX.audio(); SFX.roomTone(true); setEnv('cage'); setLight('lit', false); enterWalk(); };
  $('startTour').onclick = () => { SFX.audio(); SFX.roomTone(true); setEnv('museum'); setLight('dark', false); startTour(0); };
  $('menuBtn').onclick = () => toggleNav();
  canvas.addEventListener('click', () => { if (S.mode === 'walk' && !walker.locked) walker.lock(); });
  walker.onLockChange = (l) => { if (S.mode === 'walk') $('hint').classList.toggle('hidden', l); };
  document.querySelectorAll('#nav [data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'explore') { toggleNav(false); if (S.mode === 'inspect') closeInspect(); else enterWalk(); }
    if (a === 'free') { toggleNav(false); setMode(S.mode === 'free' ? 'walk' : 'free'); }
    if (a === 'tour') { toggleNav(false); startTour(0); }
    if (a === 'dark') setLight('dark');
    if (a === 'lit') setLight('lit');
    if (a === 'trigger') { if (S.env !== 'museum') setEnv('museum'); triggerAlarm(); }
    if (a === 'reset') resetSecurity();
    if (a === 'plan') { S.plan = !S.plan; $('plan').classList.toggle('hidden', !S.plan); b.classList.toggle('on', S.plan); drawPlan(); }
    if (a === 'chains') { const c = worlds.cage.cage.chains; c.taut.visible = !c.taut.visible; c.slack.visible = !c.taut.visible; }
    if (a === 'speak') { if (S.env !== 'cage') setEnv('cage'); speak(); }
  }));
  $('envSel').onchange = (e) => { setEnv(e.target.value); if (S.mode === 'intro') enterWalk(); };
  $('expanded').onchange = (e) => setExpanded(e.target.checked);
  $('armed').onchange = (e) => { S.armed = e.target.checked; if (!S.armed && S.alarm) resetSecurity(); $('secState').textContent = S.armed ? 'Status: armed.' : 'Status: disarmed.'; };
  $('quality').onchange = (e) => { renderer.setPixelRatio(Math.min(devicePixelRatio, +e.target.value)); resize(); };
  $('shadows').onchange = (e) => { renderer.shadowMap.enabled = e.target.checked; for (const w of Object.values(worlds)) w.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };
  $('grade').onchange = (e) => { S.grade = e.target.checked; gradePass.uniforms.amount.value = S.grade ? 1 : 0; };
  $('bloom').onchange = (e) => { bloom.enabled = e.target.checked; };
  $('fx').onchange = (e) => { S.fx = e.target.checked; for (const w of Object.values(worlds)) applyLights(w, S.light, 1); if (S.alarm) worlds.museum.mus.doors.forEach((d) => (d.beam.material.uniforms.strength.value = S.fx ? 0.45 : 0)); };
  $('sens').oninput = (e) => (walker.sensitivity = +e.target.value);
  $('fov').oninput = (e) => { camera.fov = +e.target.value; camera.updateProjectionMatrix(); };
  $('vol').oninput = (e) => SFX.setVolume(+e.target.value);
  // Inspection bar.
  $('glassBtn').onclick = () => { insp.caseObj.visible = !insp.caseObj.visible; $('glassBtn').classList.toggle('on', insp.caseObj.visible); $('glassBtn').textContent = insp.caseObj.visible ? 'Hide display case' : 'Show display case'; };
  $('viewReset').onclick = () => viewPreset('front');
  $('viewTop').onclick = () => viewPreset('top');
  $('viewUnder').onclick = () => viewPreset('under');
  $('touchBtn').onclick = () => { closeInspect(); triggerAlarm(); };
  $('inspectExit').onclick = closeInspect;
  // Tour.
  $('tourNext').onclick = () => goTour(S.tourI + 1);
  $('tourPrev').onclick = () => goTour(S.tourI - 1);
  $('tourAuto').onclick = () => { S.tourAuto = !S.tourAuto; $('tourAuto').classList.toggle('on', S.tourAuto); };
  $('tourExit').onclick = () => enterWalk();

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.code;
    if (S.mode === 'intro') return;
    if (k === 'KeyE') { if (S.mode === 'inspect') closeInspect(); else if (S.mode === 'walk') interact(); }
    if (k === 'Escape' && S.mode === 'inspect') closeInspect();
    if (k === 'Escape' && (S.mode === 'tour' || S.mode === 'free')) setMode('walk');
    if (k === 'KeyT' && S.mode === 'walk' && S.hover?.kind === 'exhibit' && S.hover.e.ex.alarm) triggerAlarm();
    if (k === 'KeyL' && S.mode !== 'inspect') setLight(S.light === 'lit' ? 'dark' : 'lit');
    if (k === 'KeyM' || k === 'Tab') { e.preventDefault(); toggleNav(); }
    if (k === 'KeyP') $('planBtn').click();
    if (k === 'KeyF' && (S.mode === 'walk' || S.mode === 'free')) setMode(S.mode === 'free' ? 'walk' : 'free');
    if (S.mode === 'tour') {
      if (k === 'ArrowRight' || k === 'Space') { e.preventDefault(); goTour(S.tourI + 1); }
      if (k === 'ArrowLeft') goTour(S.tourI - 1);
      if (k === 'KeyW' || k === 'KeyA' || k === 'KeyS' || k === 'KeyD') enterWalk();
    }
  });
}

// ---------- resize / loop ----------
function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H);
  composer.setSize(W, H);
  outline.setSize(W, H);
  bloom.setSize(W, H);
  for (const w of Object.values(worlds)) { const d = w.mus ? w.mus.dust : w.cage?.dust; if (d) d.material.uniforms.scale.value = H / 2; }
  camera.aspect = W / H; camera.updateProjectionMatrix();
  insp.camera.aspect = W / H;
  // Keep the inspected object centred in the space left of the document panel.
  if (W > 900) insp.camera.setViewOffset(W, H, 200, 0, W, H); else insp.camera.clearViewOffset();
  insp.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

const clock = new THREE.Clock();
let planT = 0, frames = 0, fpsT = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  tick(dt, t);
  composer.render(dt);
  frames++; fpsT += dt; if (fpsT > 1) { window.__fps = frames / fpsT; frames = 0; fpsT = 0; }
  requestAnimationFrame(loop);
}
function tick(dt, t) {
  if (S.mode === 'walk') { walker.update(dt); updateHover(); }
  if (S.mode === 'free' && orbit) orbit.update();
  if (S.mode === 'tour') updateTour(dt);
  if (S.mode === 'inspect' && insp.orbit) insp.orbit.update();
  if (S.mode === 'intro') {
    // Slow drift through the dark gallery behind the title.
    camera.position.set(Math.sin(t * 0.05) * 0.8, 1.6, -3.5 + Math.sin(t * 0.03) * 1.2);
    camera.lookAt(TARDIS_POS.x, 1.3, TARDIS_POS.z);
  }
  if (flicker) {
    flicker.t += dt;
    const w = worlds.museum;
    if (flicker.t > 1.1) { applyLights(w, 'lit', 1); flicker = null; }
    else applyLights(w, 'lit', Math.min(1, flicker.t * 1.4), (i) => (Math.sin(flicker.seed + i * 13.1 + flicker.t * 50) > (0.7 - flicker.t) ? 1 : 0.05));
  }
  updateSecurity(dt, t);
  if (worlds.cage && S.env === 'cage') {
    let sp = 0;
    if (S.speakTimes) { const now = performance.now() / 1000; for (const [a, b] of S.speakTimes) if (now >= a && now <= b) sp = 1; if (now > S.speakTimes.at(-1)[1] + 0.5) S.speakTimes = null; }
    animateDalek(worlds.cage.cage.dalek, t, sp);
  }
  gradePass.uniforms.time.value = t % 100;
  const fxw = world();
  const dust = fxw.mus ? fxw.mus.dust : fxw.cage?.dust;
  if (dust) dust.material.uniforms.time.value = t;
  for (const b of fxw.lights.beams || []) b.material.uniforms.time.value = t;
  if (S.plan) { planT += dt; if (planT > 0.1) { drawPlan(); planT = 0; } }
  if (FILM.on) filmUpdate(t);
}

// ---------- film mode (?film): frame-exact scripted capture for the video ----------
const FILM = { on: new URLSearchParams(location.search).has('film'), frame: 0, t: 0, cues: [], cam: null, stare: 0, stareTarget: 0, signal: false, mat: null, handheld: 0, exp: null };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
function poseQuat(pos, look) {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(...pos), new THREE.Vector3(...look), new THREE.Vector3(0, 1, 0)));
}
function filmUpdate(t) {
  const c = FILM.cam;
  if (c) {
    const u = c.n ? Math.min(1, (FILM.frame - c.f0) / c.n) : 1, k = c.linear ? u : ease(u);
    camera.position.lerpVectors(c.p0, c.p1, k);
    camera.quaternion.slerpQuaternions(c.q0, c.q1, k);
    camera.fov = c.fov0 + (c.fov1 - c.fov0) * k;
  }
  if (FILM.handheld) {
    // A camcorder on a shoulder: two slow, small wobbles.
    const h = FILM.handheld;
    camera.rotateX(Math.sin(t * 0.9) * 0.0022 * h + Math.sin(t * 2.3) * 0.0009 * h);
    camera.rotateY(Math.sin(t * 0.7 + 1) * 0.0028 * h + Math.sin(t * 1.9) * 0.0008 * h);
  }
  camera.updateProjectionMatrix();
  // Camera gain (security cameras open up in the dark).
  const e = FILM.exp;
  if (e) { const u = e.n ? Math.min(1, (FILM.frame - e.f0) / e.n) : 1; renderer.toneMappingExposure = e.a + (e.b - e.a) * ease(u); }
  // The Dalek turns to look at the camera, and calls out with its dome lights.
  if (worlds.cage && S.env === 'cage') {
    const d = worlds.cage.cage.dalek, u = d.userData;
    FILM.stare += (FILM.stareTarget - FILM.stare) * 0.035;
    if (FILM.stare > 0.001) {
      const local = d.worldToLocal(camera.position.clone());
      const yaw = Math.atan2(local.x, local.z);
      u.head.rotation.y += (yaw - u.head.rotation.y) * ease(Math.min(1, FILM.stare));
      const ep = new THREE.Vector3(); u.eye.getWorldPosition(ep);
      const dy = camera.position.y - ep.y, hz = Math.hypot(camera.position.x - ep.x, camera.position.z - ep.z);
      u.eye.rotation.set(-Math.atan2(dy, hz) * ease(Math.min(1, FILM.stare)), 0, 0);
    }
    if (FILM.signal) {
      const pulse = Math.max(0, Math.sin(t * Math.PI * 2 * 1.3)) ** 3;
      u.lampMat.emissiveIntensity = 0.3 + 3.2 * pulse;
      u.eyeLight.intensity = 0.6 + 1.6 * pulse;
    }
  }
  // TARDIS materialisation: the box fades in and out, swelling a little more each time.
  const m = FILM.mat;
  if (m) {
    const p = Math.min(1, (FILM.frame - m.f0) / m.n), sec = (FILM.frame - m.f0) / 30;
    const wobble = 0.5 + 0.5 * Math.sin(sec * Math.PI * 2 / 1.7 - Math.PI / 2);
    let o = Math.min(1, p * 1.25) * (0.25 + 0.75 * wobble);
    o = o + (1 - o) * THREE.MathUtils.smoothstep(p, 0.82, 1);
    m.mats.forEach((mm) => { mm.opacity = o; });
    m.glow.intensity = 6 * (0.3 + 0.7 * wobble) * (1 - THREE.MathUtils.smoothstep(p, 0.85, 1)) * Math.min(1, p * 4);
    if (p >= 1) { m.mats.forEach((mm) => { mm.transparent = mm.userData.wasTransparent; mm.opacity = 1; mm.needsUpdate = true; }); m.glow.intensity = 0; FILM.mat = null; }
  }
}
const filmAPI = {
  ready: false,
  step(n = 1) {
    for (let i = 0; i < n; i++) { FILM.frame++; FILM.t += 1 / 30; tick(1 / 30, FILM.t); }
    composer.render(1 / 30);
    return FILM.frame;
  },
  frame: () => FILM.frame,
  cue(kind, extra = {}) { FILM.cues.push({ f: FILM.frame, kind, ...extra }); },
  cues: () => FILM.cues,
  // Move (or cut, with frames = 0) the camera to pos, looking at look.
  cam(pos, look, fov, frames = 0, linear = false) {
    FILM.cam = { p0: camera.position.clone(), q0: camera.quaternion.clone(), fov0: camera.fov, p1: new THREE.Vector3(...pos), q1: poseQuat(pos, look), fov1: fov, f0: FILM.frame, n: frames, linear };
    if (!frames) filmUpdate(FILM.t);
  },
  handheld(h) { FILM.handheld = h; },
  exposure(v, frames = 0) { FILM.exp = { a: renderer.toneMappingExposure, b: v, f0: FILM.frame, n: frames }; if (!frames) renderer.toneMappingExposure = v; },
  env(name) { setEnv(name, false); },
  light(state, animate = true) { setLight(state, animate); if (animate) filmAPI.cue(state === 'lit' ? 'switchOn' : 'switchOff'); },
  alarm() { triggerAlarm(); filmAPI.cue('alarm'); },
  reset() { resetSecurity(); filmAPI.cue('reset'); },
  stare(on) { FILM.stareTarget = on ? 1 : 0; if (on) filmAPI.cue('stare'); },
  signal(on) { FILM.signal = on; filmAPI.cue(on ? 'signal' : 'signalOff'); },
  chains(taut) { const c = worlds.cage.cage.chains; c.taut.visible = taut; c.slack.visible = !taut; },
  tardis(state, frames = 180) {
    const g = worlds.museum.mus.tardis.group;
    const ao = worlds.museum.scene.getObjectByName('tardisAO');
    if (state === 'hide') { g.visible = false; if (ao) ao.visible = false; return; }
    g.visible = true; if (ao) ao.visible = true;
    if (state === 'materialise') {
      const mats = [];
      g.traverse((o) => { if (o.isMesh && !mats.includes(o.material)) mats.push(o.material); });
      mats.forEach((mm) => { mm.userData.wasTransparent = mm.transparent; mm.transparent = true; mm.opacity = 0; mm.needsUpdate = true; });
      let glow = g.getObjectByName('materialiseGlow');
      if (!glow) { glow = new THREE.PointLight(0x8fb2ff, 0, 9, 1.4); glow.name = 'materialiseGlow'; glow.position.set(0, 1.6, 1.2); g.add(glow); }
      FILM.mat = { f0: FILM.frame, n: frames, mats, glow };
      filmAPI.cue('materialise', { frames });
    }
  },
};
function startFilm() {
  document.body.classList.add('film');
  setMode('film');
  // Security cameras see more than the eye: lift the after-hours light a little.
  for (const w of Object.values(worlds)) w.lights.dark.forEach((l) => (l.userData.on *= 2.4));
  // Pre-capture both lighting states in both rooms so env maps never stall a take.
  for (const env of ['cage', 'museum']) { setEnv(env, false); setLight('lit', false); refreshEnv(); setLight('dark', false); refreshEnv(); }
  filmAPI.tardis('hide');
  window.__film = filmAPI;
  filmAPI.ready = true;
}

// ---------- boot ----------
async function boot() {
  const status = $('loading');
  const step = (msg) => new Promise((r) => { status.textContent = msg; setTimeout(r, 16); });
  await step('Building the exhibit room…');
  worlds.museum = makeMuseum();
  await step('Building the Cage…');
  worlds.cage = makeCage();
  await step('Compiling materials…');
  buildExhibitList(); buildLegend();
  bindUI();
  setEnv('museum');
  setLight('dark', false);
  renderer.compile(worlds.museum.scene, camera);
  renderer.compile(worlds.cage.scene, camera);
  status.textContent = 'Ready.';
  resize();
  if (FILM.on) startFilm(); else loop();
  // Exposed for automated checks.
  window.__vault = { S, worlds, camera, renderer, setEnv, setLight, triggerAlarm, resetSecurity, openInspect, closeInspect, startTour, goTour, viewFrom, setMode, setExpanded, walker };
}
boot().catch((e) => { $('loading').textContent = 'Failed to start: ' + e.message; console.error(e); });

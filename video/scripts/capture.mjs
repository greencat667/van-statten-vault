// Records the footage for "Level 53 Orientation": drives van_statten_vault.html?film frame by frame (30 fps)
// in headless Chromium, screenshots every frame and writes the beat timeline + sound cues for the Remotion edit.
// Adapted from 116's capture.mjs.
//   node video/scripts/capture.mjs        (needs the static server on :8122 serving the project folder)
// Output: working/film/frames/%05d.jpg, video/public/footage/timeline.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.resolve(HERE, '..');
const VERTICAL = !!process.env.VERTICAL;   // VERTICAL=1: portrait capture for the Short
const FRAMES = path.resolve(VIDEO, VERTICAL ? '../working/film/frames-v' : '../working/film/frames');
const { chromium } = await import('playwright');   // npm i -D playwright
const NAR = JSON.parse(fs.readFileSync(path.join(VIDEO, 'public/narration/narration.json'), 'utf8'));
const FPS = 30, VW = VERTICAL ? 720 : 1280, VH = VERTICAL ? 1280 : 720;   // captured below HD on purpose: the CRT finish softens it further

fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:8122/van_statten_vault.html?film');
await page.waitForFunction(() => window.__film && window.__film.ready, null, { timeout: 120000 });
const F = (fn, ...a) => page.evaluate(([fn, a]) => window.__film[fn](...a), [fn, a]);

let n = 0;
const lines = [], beats = [];
async function frame() {
  await F('step', 1);
  await page.screenshot({ path: path.join(FRAMES, String(n).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  n++;
  if (n % 150 === 0) console.log(`frame ${n} (${(n / FPS).toFixed(1)} s)`);
}
const secs = (s) => Math.round(s * FPS);
function at(id, w) {
  const hit = NAR[id].words.find((x) => x[0].toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(w.toLowerCase()));
  if (!hit) throw new Error(`word "${w}" not in ${id}: ${NAR[id].words.map((x) => x[0]).join(' ')}`);
  return hit[1];
}
async function beat(name, id, acts, { lead = 0.4, tail = 1.2, min = 0 } = {}) {
  beats.push({ id: name, f: n });
  const t0 = n + secs(lead);
  if (id) lines.push({ id, f: t0 });
  const queue = acts.map(([t, fn]) => [t0 + secs(t), fn]).sort((a, b) => a[0] - b[0]);
  const end = Math.max(n + secs(min), id ? t0 + secs(NAR[id].dur + tail) : n + secs(tail));
  while (true) {
    while (queue.length && queue[0][0] <= n) await queue.shift()[1]();
    if (n >= end && !queue.length) break;
    await frame();
  }
}

// ---------- shot helpers ----------
const cuts = [];                                    // footage frames where the picture cuts
const cut = async (pos, look, fov) => { await F('cam', pos, look, fov); cuts.push(n); };
const move = (pos, look, fov, sec, linear = false) => F('cam', pos, look, fov, secs(sec), linear);
const W = (id, w, d = 0) => at(id, w) + d;           // time of a word in a line (s)

// Security cameras (museum / Cage coordinates, metres).
const CCTV_GALLERY = [[4.2, 4.25, 6.5], [-0.5, 0.6, -7], 58];
const CCTV_CYBER = [[-2.3, 3.6, -6.2], [-4.3, 1.5, -8.0], 46];
const CCTV_DOOR = [[1.6, 3.5, 8.8], [0, 1.3, 12], 56];
const CCTV_ARCH = [[-2.6, 3.7, -3.6], [1.2, 1.2, -9.3], 50];
const CCTV_ARCH2 = [[2.9, 3.4, -5.2], [1.3, 1.4, -9.3], 40];
const CCTV_CAGE = [[2.0, 3.3, 2.4], [0, 1.2, 0], 44];
const CCTV_CAGE2 = [[-1.6, 2.5, 1.5], [0, 1.45, 0], 36];


// ---------- the older tape (Kessler, 2009): harsh tripod footage of the Cage ----------
const oldTape = async (pos, look, fov, staring = false) => {
  await F('env', 'cage'); await F('light', 'lit', false); await F('chains', true);
  await F('handheld', 0); await F('exposure', 1.35); await F('stare', staring);
  await cut(pos, look, fov);
};
const backTo = async () => { await F('stare', false); await F('env', 'museum'); await F('light', 'lit', false); await F('exposure', 1.0); };
async function bleed(name, id, pos, look, fov, extra = [], opts = {}) {
  await beat(name, id, [[-0.25, () => oldTape(pos, look, fov, opts.staring)], ...extra], { lead: 0.25, tail: opts.tail ?? 0.35 });
}

// ---------- settle (not recorded) ----------
await F('env', 'museum'); await F('light', 'dark', false);
await F('cam', ...CCTV_GALLERY); await F('handheld', 0);
await F('step', 30);

// ---------- COLD OPEN: three security feeds of the dark gallery ----------
await beat('cold', 'n01', [
  [-0.4, async () => { await F('exposure', 3.2); await move(CCTV_GALLERY[0], [-1.6, 0.6, -8], 58, 4, true); }],
  [W('n01', 'sky', 0.25), async () => { await F('exposure', 7); await cut(...CCTV_CYBER); }],
  [W('n01', 'sky', 0.3), () => move(CCTV_CYBER[0], [-4.3, 1.55, -8.0], 40, 3, true)],
  [W('n01', 'job', -0.1), async () => { await F('exposure', 8); await cut(...CCTV_DOOR); }],
], { lead: 0.15, tail: 1.6 });

// ---------- LESSON ONE: walk to the switch, flick it, the room appears ----------
await beat('switch', 'n03', [
  [-0.5, async () => { await F('handheld', 1); await F('exposure', 1.9); await cut([2.4, 1.6, -2.6], [4.79, 1.3, -6.9], 50); }],
  [-0.4, () => move([3.35, 1.6, -5.6], [4.79, 1.3, -6.9], 46, NAR.n03.dur - 0.6)],
  [W('n03', 'switch', -0.15), () => cut([4.32, 1.42, -6.72], [4.79, 1.35, -6.9], 30)],
  [W('n03', 'switch', 0.45), async () => { await F('light', 'lit', true); await F('exposure', 1.0, secs(0.5)); }],
  [W('n03', 'switch', 0.85), async () => { await F('handheld', 0.4); await cut([0.2, 0.85, 2.6], [0, 1.7, -10], 56); }],
  [W('n03', 'switch', 0.9), () => move([0.2, 0.95, 1.8], [0, 1.65, -10], 54, 2.4)],
], { lead: 0.5, tail: 2.6 });

// ---------- THE COLLECTION: the episode's wide shot, then a track past the cases ----------
await beat('reveal', 'n04', [
  [-0.3, async () => { await F('handheld', 0.8); await cut([-0.682, 1.409, -0.862], [-1.15, 0.49, -8.79], 34.3); }],
  [-0.2, () => move([-0.5, 1.42, -1.6], [-1.0, 0.6, -9.2], 34, 3.2)],
  [W('n04', 'possibly', -0.2), () => cut([-0.85, 1.32, 0.6], [-2.4, 1.05, -0.6], 44)],
  [W('n04', 'possibly', -0.15), () => move([-0.85, 1.32, -5.4], [-2.4, 1.05, -6.6], 44, 3.2, true)],
], { lead: 0.3, tail: 0.6 });
await bleed('bleed1', 'k1', [2.6, 1.2, 3.1], [0, 1.1, 0], 50, [[0.2, () => move([2.5, 1.2, 3.0], [0, 1.1, 0], 46, 5)]]);
await backTo();

// ---------- CASE 03: meteorite, moon dust ----------
await beat('meteorite', 'n05', [
  [-0.3, () => cut([-0.85, 1.38, -5.7], [-1.95, 1.0, -6.4], 34)],
  [-0.2, () => move([-1.15, 1.3, -5.95], [-1.95, 1.0, -6.4], 30, 2.6)],
  [W('n05', 'moon', -0.15), () => cut([0.95, 1.4, -2.95], [1.95, 1.08, -3.4], 30)],
  [W('n05', 'moon', -0.1), () => move([1.2, 1.3, -3.1], [1.95, 1.06, -3.4], 26, 2.4)],
  [W('n05', 'nobody', -0.1), () => cut([1.45, 1.22, -3.2], [1.95, 1.08, -3.4], 24)],
], { lead: 0.3, tail: 0.6 });

// ---------- CASE 05: the Roswell milometer ----------
await beat('milometer', 'n06', [
  [-0.3, () => cut([1.25, 1.2, 0.35], [1.95, 1.07, -0.05], 24)],
  [-0.2, () => move([1.25, 1.2, -0.3], [1.95, 1.07, 0.05], 24, NAR.n06.dur * 0.6, true)],
  [W('n06', 'just', -0.1), () => cut([0.9, 1.45, 0.75], [1.95, 1.05, 0.0], 36)],
  [W('n06', 'just', 0), () => move([1.15, 1.38, 0.5], [1.95, 1.05, 0.0], 30, 1.8)],
], { lead: 0.3, tail: 0.6 });
await bleed('bleed2', 'k2', [1.4, 1.3, 1.9], [0, 1.2, 0], 40);
await backTo();

// ---------- CASE 01: the arm, tilt up to the claws ----------
await beat('slitheen', 'n07', [
  [-0.3, () => cut([-0.7, 1.15, -3.45], [-1.95, 0.98, -3.8], 38)],
  [-0.2, () => move([-0.7, 1.25, -3.45], [-1.95, 1.48, -3.8], 38, 2.8)],
  [W('n07', 'we', -0.1), () => cut([-1.15, 1.5, -3.2], [-1.95, 1.52, -3.8], 34)],
  [W('n07', 'we', 0), () => move([-1.25, 1.5, -3.35], [-1.95, 1.54, -3.8], 30, 2.4)],
], { lead: 0.3, tail: 0.8 });

// ---------- CASE 11: the egg ----------
await beat('egg', 'n08', [
  [-0.3, () => cut([0.45, 1.55, -8.7], [-0.55, 1.3, -10.7], 36)],
  [-0.2, () => move([0.25, 1.5, -9.1], [-0.55, 1.3, -10.7], 32, NAR.n08.dur - 1.2)],
  [W('n08', 'tap', -0.2), () => cut([-0.02, 1.45, -9.75], [-0.55, 1.22, -10.7], 30)],
], { lead: 0.3, tail: 0.8 });
await bleed('bleed3', 'k3', [0.9, 0.8, 1.3], [0, 1.6, 0], 44);
await backTo();

// ---------- CASE 07: the Cyberman, out of the dark end of the room ----------
await beat('cyberman', 'n09', [
  [-0.4, async () => { await F('handheld', 0.6); await cut([-0.4, 1.6, -6.4], [-4.33, 1.62, -8.0], 30); }],
  [-0.3, () => move([-1.3, 1.62, -6.9], [-4.33, 1.62, -8.0], 28, 2.2)],
  [W('n09', 'found', -0.1), () => cut([-3.55, 0.75, -8.15], [-4.04, 0.42, -8.26], 28)],
  [W('n09', 'whatever', -0.1), () => cut([-2.95, 1.63, -7.95], [-4.33, 1.62, -8.0], 26)],
  [W('n09', 'whatever', 0), () => move([-3.3, 1.63, -7.97], [-4.33, 1.62, -8.0], 24, NAR.n09.dur - W('n09', 'whatever') + 1.0)],
], { lead: 0.4, tail: 1.0 });
await bleed('bleed4', 'k4', [0.3, 1.5, 1.6], [0, 1.5, 0], 38, [[W('k4', 'camera', -1.6), () => F('stare', true)]], { tail: 0.6 });
await backTo();

// ---------- SECURITY: a hand-held approach to the glass ----------
await beat('security', 'n10', [
  [-0.2, () => move([-3.6, 1.6, -7.98], [-4.33, 1.6, -8.0], 24, W('n10', 'fingerprint') + 0.2)],
  [W('n10', 'fingerprint', 0.15), () => F('cue', 'touch')],
  [W('n10', 'seals', -0.3), () => F('alarm')],
  [W('n10', 'seals', 0.2), async () => { await F('handheld', 1.6); await cut([-3.4, 2.75, 2.9], [-4.72, 3.05, 4.0], 34); }],
], { lead: 0.3, tail: 0.5 });

// ---------- LOCKDOWN: three doors, three shutters ----------
await beat('lockdown', 'n11', [
  [-0.3, () => cut([-1.0, 1.6, 0.6], [-4.8, 1.4, 4.0], 48)],
  [-0.2, () => move([-1.3, 1.6, 0.4], [-4.8, 1.35, 4.0], 46, 2.4)],
  [W('n11', 'nothing', -0.1), () => cut([0.6, 1.6, 8.3], [0, 1.4, 12], 50)],
  [W('n11', 'out', -0.4), () => cut([2.2, 1.6, -1.6], [4.8, 1.3, 0], 46)],
], { lead: 0.3, tail: 2.4 });
await bleed('bleed5', 'k5', [1.2, 1.35, 1.9], [0, 1.4, 0], 42, [[W('k5', 'and', -0.05), () => move([1.0, 0.25, 1.8], [-2.5, 0.0, 3.0], 42, 0.35)]], { staring: true, tail: 0.25 });

// ---------- THE CAGE ----------
await beat('cage', 'n12', [
  [-0.6, async () => { await F('reset'); await F('env', 'cage'); await F('light', 'lit', false); await F('chains', true); await F('handheld', 0.7); await cut([1.4, 0.5, 2.3], [0, 1.25, 0], 48); }],
  [-0.5, () => move([1.0, 0.55, 2.0], [0, 1.3, 0], 46, 2.6)],
  [W('n12', 'living', -0.2), () => cut([0.05, 1.05, 3.6], [0, 1.0, 0], 50)],
  [W('n12', 'living', -0.1), () => move([0.05, 1.0, 3.0], [0, 1.05, 0], 48, 2.4)],
  [W('n12', 'calls', -0.1), () => cut([0.55, 1.75, 1.7], [0, 1.5, 0], 34)],
], { lead: 0.6, tail: 0.8 });
await beat('aside', 'n12b', [[-0.2, () => cut([-2.4, 1.0, 2.6], [0, 1.2, 0], 40)], [0, () => move([-2.2, 1.0, 2.4], [0, 1.25, 0], 38, 3)]], { lead: 0.6, tail: 0.8 });
await beat('stare', 'n13', [
  [-0.2, () => cut([0.3, 0.72, 1.05], [0.05, 0.58, 0.4], 32)],
  [W('n13', 'sleep', -0.4), () => cut([1.25, 0.65, 2.55], [1.48, 0.32, 2.08], 34)],
  [W('n13', 'hasnt', -0.15), () => cut([0.0, 1.2, 2.6], [0, 1.3, 0], 44)],
  [W('n13', 'hasnt', -0.1), () => move([0.0, 1.25, 1.9], [0, 1.4, 0], 40, NAR.n13.dur - W('n13', 'hasnt'))],
  [W('n13', 'see', -1.4), () => F('stare', true)],
  [W('n13', 'see', 0.55), () => cut([0.0, 1.47, 1.05], [0, 1.5, 0], 30)],
], { lead: 0.3, tail: 2.0 });
await bleed('bleed6', 'k6', [0.0, 1.47, 0.9], [0, 1.5, 0], 28, [], { staring: true, tail: 0.5 });

// ---------- SIGN OFF: the gallery on camera 3, lights out ----------
await beat('signoff', 'n14', [
  [-0.5, async () => { await F('stare', false); await F('env', 'museum'); await F('light', 'lit', false); await F('handheld', 0); await F('exposure', 1.0); await cut(...CCTV_GALLERY); }],
  [-0.4, () => move(CCTV_GALLERY[0], [-1.2, 0.6, -7.6], 58, NAR.n14.dur + 2.6, true)],
  [W('n14', 'off', 0.4), () => F('light', 'dark', true)],
  [W('n14', 'off', 1.1), () => F('exposure', 3.2, secs(1.6))],
], { lead: 0.6, tail: 2.8 });

// ---------- AFTER HOURS: the Cage calls; the gallery waits; the call is answered ----------
await beat('signal', null, [
  [0, async () => { await F('env', 'cage'); await F('light', 'dark', false); await F('stare', false); await F('exposure', 4); await cut(...CCTV_CAGE); }],
  [1.0, () => F('signal', true)],
  [3.4, async () => { await F('env', 'museum'); await F('light', 'dark', false); await F('exposure', 4.5); await cut(...CCTV_GALLERY); }],
  [4.6, async () => { await F('env', 'cage'); await F('exposure', 4); await cut(...CCTV_CAGE2); }],
], { tail: 6.4 });
await beat('arrival', null, [
  [0, async () => { await F('signal', false); await F('env', 'museum'); await F('light', 'dark', false); await F('exposure', 2.6); await cut(...CCTV_ARCH); }],
  [1.2, () => F('tardis', 'materialise', secs(7))],
  [6.2, async () => { await F('exposure', 1.8); await cut(...CCTV_ARCH2); }],
], { tail: 10.6 });

const out = { fps: FPS, frames: n, width: VW, height: VH, lines, beats, cuts, cues: (await F('cues')).map((c) => ({ ...c })),
  narration: Object.fromEntries(Object.entries(NAR).map(([k, v]) => [k, { dur: v.dur, text: v.text, words: v.words }])) };
// cue frames are page frames; footage frame 0 was page frame `first`
const first = (await F('frame')) - n;
out.cues = out.cues.map((c) => ({ ...c, f: c.f - first - 1 })).filter((c) => c.f >= 0);
fs.writeFileSync(path.join(VIDEO, VERTICAL ? 'public/footage/timeline-v.json' : 'public/footage/timeline.json'), JSON.stringify(out, null, 1));
console.log(`done: ${n} frames (${(n / FPS).toFixed(1)} s), ${lines.length} lines, ${out.cues.length} cues`);
await browser.close();

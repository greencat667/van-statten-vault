// All sound is synthesised with Web Audio at run time; no sound files.
let ctx, master, alarmNodes, humNodes;

export function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setVolume(v) { audio(); master.gain.value = v; }

function noiseBuffer(sec = 1) {
  const c = audio();
  const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// Heavy rocker switch, then fluorescent tubes striking.
export function lightSwitchSound(on) {
  const c = audio(), t = c.currentTime;
  const n = c.createBufferSource(); n.buffer = noiseBuffer(0.08);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = on ? 1800 : 1400; f.Q.value = 2;
  const g = c.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  n.connect(f).connect(g).connect(master); n.start(t);
  if (!on) return;
  for (let i = 0; i < 4; i++) {
    const tt = t + 0.15 + i * 0.09 + Math.random() * 0.05;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 100;
    const og = c.createGain(); og.gain.setValueAtTime(0, tt); og.gain.linearRampToValueAtTime(0.05, tt + 0.01); og.gain.exponentialRampToValueAtTime(0.001, tt + 0.08);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp).connect(og).connect(master); o.start(tt); o.stop(tt + 0.1);
  }
}

// Low room tone: ventilation rumble plus faint 50/60 Hz hum.
export function roomTone(on, level = 0.06) {
  const c = audio();
  if (on && !humNodes) {
    const n = c.createBufferSource(); n.buffer = noiseBuffer(3); n.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const o = c.createOscillator(); o.frequency.value = 60; const og = c.createGain(); og.gain.value = 0.012;
    const g = c.createGain(); g.gain.value = level;
    n.connect(lp).connect(g).connect(master); o.connect(og).connect(g);
    n.start(); o.start();
    humNodes = { n, o, g };
  } else if (!on && humNodes) {
    humNodes.n.stop(); humNodes.o.stop(); humNodes = null;
  }
}

// Security alarm: a rising/falling electronic whoop in two-second cycles over
// a pulsing klaxon, newly generated in the spirit of the episode's alarm.
export function alarm(on) {
  const c = audio();
  if (on && !alarmNodes) {
    const t = c.currentTime;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = 'square';
    const lfo = c.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 0.55;
    const lfoGain = c.createGain(); lfoGain.gain.value = 260;
    o1.frequency.value = 640; o2.frequency.value = 645;
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfoGain.connect(o2.frequency);
    const pulse = c.createOscillator(); pulse.type = 'square'; pulse.frequency.value = 2.2;
    const pulseGain = c.createGain(); pulseGain.gain.value = 0.25;
    const amp = c.createGain(); amp.gain.value = 0.0;
    amp.gain.linearRampToValueAtTime(0.12, t + 0.2);
    pulse.connect(pulseGain).connect(amp.gain);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    const verb = c.createDelay(); verb.delayTime.value = 0.13; const fb = c.createGain(); fb.gain.value = 0.35;
    o1.connect(bp); o2.connect(bp); bp.connect(amp); amp.connect(master);
    amp.connect(verb); verb.connect(fb).connect(verb); fb.connect(master);
    [o1, o2, lfo, pulse].forEach((x) => x.start(t));
    alarmNodes = { stop: () => { const tt = c.currentTime; amp.gain.cancelScheduledValues(tt); amp.gain.setTargetAtTime(0, tt, 0.05); [o1, o2, lfo, pulse].forEach((x) => x.stop(tt + 0.4)); } };
  } else if (!on && alarmNodes) {
    alarmNodes.stop(); alarmNodes = null;
  }
}

// Steel shutters rolling down.
export function shutterSound() {
  const c = audio(), t = c.currentTime;
  const n = c.createBufferSource(); n.buffer = noiseBuffer(2.6);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 1.2;
  const am = c.createOscillator(); am.frequency.value = 28; const amg = c.createGain(); amg.gain.value = 0.15;
  const g = c.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.2); g.gain.setValueAtTime(0.3, t + 2.2); g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
  am.connect(amg).connect(g.gain);
  n.connect(bp).connect(g).connect(master); n.start(t); am.start(t); am.stop(t + 2.6);
  // Final clang.
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 110;
  const og = c.createGain(); og.gain.setValueAtTime(0, t + 2.5); og.gain.linearRampToValueAtTime(0.5, t + 2.51); og.gain.exponentialRampToValueAtTime(0.001, t + 3.4);
  o.connect(og).connect(master); o.start(t + 2.5); o.stop(t + 3.5);
}

// Dalek voice: formant-filtered buzz, ring-modulated at 30 Hz (the classic
// technique). Returns a list of [start, end] syllable times for the dome lights.
export function dalekSpeak(syllables = ['EX', 'TER', 'MIN', 'ATE'], rate = 0.28) {
  const c = audio(), t0 = c.currentTime + 0.05;
  const vowels = { EX: [530, 1840], TER: [490, 1350], MIN: [400, 2000], ATE: [600, 2300], DEFAULT: [600, 1600] };
  const ring = c.createOscillator(); ring.frequency.value = 30;
  const ringGain = c.createGain(); ringGain.gain.value = 0;
  ring.connect(ringGain.gain);
  const out = c.createGain(); out.gain.value = 0.8;
  ringGain.connect(out).connect(master);
  const times = [];
  syllables.forEach((s, i) => {
    const st = t0 + i * rate * (i === syllables.length - 1 ? 1.0 : 1), dur = i === syllables.length - 1 ? rate * 1.8 : rate * 0.85;
    const src = c.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(i === syllables.length - 1 ? 150 : 135 + i * 6, st);
    src.frequency.linearRampToValueAtTime(i === syllables.length - 1 ? 110 : 140, st + dur);
    const [f1, f2] = vowels[s] || vowels.DEFAULT;
    const b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 6;
    const b2 = c.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 8;
    const env = c.createGain(); env.gain.setValueAtTime(0, st); env.gain.linearRampToValueAtTime(1, st + 0.02); env.gain.setValueAtTime(1, st + dur - 0.04); env.gain.linearRampToValueAtTime(0, st + dur);
    src.connect(b1).connect(env); src.connect(b2).connect(env); env.connect(ringGain);
    src.start(st); src.stop(st + dur + 0.05);
    times.push([st - c.currentTime, st - c.currentTime + dur]);
  });
  ring.start(t0); ring.stop(t0 + syllables.length * rate + rate * 2);
  return times;
}

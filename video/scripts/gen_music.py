"""Procedural music for "Level 53 Orientation" (no samples, no models): public/music/*.wav at 48 kHz.
  corporate.wav  a bland, cheerful training-video bed (soft FM keys, pad, arpeggio), 92 bpm, ~84 s
  dread.wav      a low drone with a slow two-beat pulse and detuned strings, ~60 s
    python3 video/scripts/gen_music.py
"""
from pathlib import Path

import numpy as np
import soundfile as sf

OUT = Path(__file__).resolve().parents[1] / "public" / "music"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
rng = np.random.default_rng(53)


def t(d):
    return np.arange(int(d * SR)) / SR


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); z = 0.0
    for i in range(len(x)):
        z = (1 - a) * x[i] + a * z; y[i] = z
    return y


def adsr(n, a=.01, d=.2, s=.6, r=.3):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na); e[na:na + nd] = np.linspace(1, s, nd)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def epiano(f, d, vel=1.0):
    x = t(d)
    mod = np.sin(2 * np.pi * f * 1.0 * x) * 1.8 * np.exp(-x * 3)
    return np.sin(2 * np.pi * f * x + mod) * np.exp(-x * 1.6) * vel


def save(name, x, peak=.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR)
    print(name, f"{len(x)/SR:.1f}s")


# ---------- corporate bed: I–vi–IV–V in C with major-seventh colour ----------
bpm = 92; beat = 60 / bpm; bar = 4 * beat
chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]   # Cmaj7 Am7 Fmaj7 G7
bars = 32
L = int(bars * bar * SR) + SR
mix = np.zeros(L)
for b in range(bars):
    ch = chords[b % 4]; start = int(b * bar * SR)
    # pad: detuned saw-ish, low-passed, slow attack
    d = bar + .4; x = t(d)
    pad = sum(np.sin(2 * np.pi * note(m) * x) * .5 + np.sin(2 * np.pi * note(m) * 1.003 * x) * .5 for m in ch)
    pad = pad * adsr(len(x), a=.6, d=.4, s=.8, r=.6) * .16
    mix[start:start + len(pad)] += pad[: L - start]
    # keys on beats 1 and 3, voiced an octave up
    for k in (0, 2):
        s0 = start + int(k * beat * SR)
        for m in ch[1:]:
            e = epiano(note(m + 12), 1.6, .22)
            mix[s0:s0 + len(e)] += e[: L - s0]
    # bass
    bs = epiano(note(ch[0] - 24), bar, .55)
    mix[start:start + len(bs)] += bs[: L - start]
    # arpeggio in eighths from bar 8 onwards
    if b >= 8:
        for k in range(8):
            m = ch[k % 4] + 24
            s0 = start + int(k * beat / 2 * SR)
            e = np.sin(2 * np.pi * note(m) * t(.22)) * np.exp(-t(.22) * 14) * .07
            mix[s0:s0 + len(e)] += e[: L - s0]
# a soft drum machine: brushed hat on offbeats, gentle kick on 1 and 3
for b in range(4, bars):
    for k in range(4):
        s0 = int((b * bar + k * beat) * SR)
        if k in (0, 2):
            kk = np.sin(2 * np.pi * 55 * t(.25) * np.exp(-t(.25) * 6)) * np.exp(-t(.25) * 12) * .35
            mix[s0:s0 + len(kk)] += kk[: L - s0]
        h0 = s0 + int(beat / 2 * SR)
        hh = rng.uniform(-1, 1, int(.06 * SR)) * np.exp(-t(.06) * 60) * .04
        mix[h0:h0 + len(hh)] += hh[: L - h0]
save("corporate", lp(mix, 6500), .7)

# ---------- dread bed: drone, pulse, detuned high strings ----------
d = 60.0; x = t(d)
drone = sum(np.sin(2 * np.pi * f * x) * g for f, g in ((36.7, .9), (36.9, .9), (55.0, .35), (73.6, .2)))
drone *= .7 + .3 * np.sin(2 * np.pi * .05 * x)
pulse = np.zeros(len(x))
period = 1.6
for k in np.arange(0, d, period):
    for off, g in ((0, 1.0), (.28, .6)):
        s0 = int((k + off) * SR); seg = t(.35)
        p = np.sin(2 * np.pi * 48 * seg) * np.exp(-seg * 10) * g
        pulse[s0:s0 + len(p)] += p[: len(x) - s0]
strings = sum(np.sin(2 * np.pi * f * x + .4 * np.sin(2 * np.pi * 5.1 * x)) for f in (587.3, 622.3, 880.0)) * .04
strings *= np.clip((x - 8) / 20, 0, 1)
fade = np.ones(len(x)); k = int(1.5 * SR); fade[:k] = np.linspace(0, 1, k); fade[-k:] = np.linspace(1, 0, k)
save("dread", lp(drone * .6 + pulse * .5 + strings, 4000) * fade, .7)

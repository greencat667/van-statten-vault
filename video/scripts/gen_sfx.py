"""Procedural sound for "Level 53 Orientation" (no samples): writes public/sfx/*.wav at 48 kHz mono.
Terminal blips/glitch/static are reused from 116 (copied by this script if present).
    python3 video/scripts/gen_sfx.py      (any Python with numpy + soundfile)
"""
import shutil
from pathlib import Path

import numpy as np
import soundfile as sf

OUT = Path(__file__).resolve().parents[1] / "public" / "sfx"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
rng = np.random.default_rng(122)


def t(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc):
    # one-pole low-pass, vectorised enough via lfilter-free recursion in chunks
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); z = 0.0
    for i in range(len(x)):
        z = (1 - a) * x[i] + a * z; y[i] = z
    return y


def hp(x, fc):
    return x - lp(x, fc)


def bp(x, fc, q=4.0):
    # biquad band-pass (RBJ), constant skirt gain
    w = 2 * np.pi * fc / SR; al = np.sin(w) / (2 * q)
    b0, b2, a0, a1, a2 = al, -al, 1 + al, -2 * np.cos(w), 1 - al
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, x[i], y1, v; y[i] = v
    return y


def env(d, a=.005, r=None):
    n = int(d * SR); e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = int(r * SR); e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def save(name, x, peak=.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR)
    print(name, f"{len(x)/SR:.2f}s")


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


# --- reuse 116's terminal set ---
src = Path(__file__).resolve().parents[3] / "116-dalek-3d" / "video" / "public" / "sfx"
for name in ["key0", "key1", "key2", "key3", "granted", "blip", "chatter", "glitch", "static", "powerdown"]:
    if (src / f"{name}.wav").exists():
        shutil.copy(src / f"{name}.wav", OUT / f"{name}.wav")

# --- room tone: ventilation, mains hum and a faint fluorescent buzz (40 s loop) ---
d = 40.0; x = t(d)
vent = lp(noise(d), 220) * 3
mains = np.sin(2 * np.pi * 60 * x) * .08 + np.sin(2 * np.pi * 120 * x) * .05
fade = np.ones(len(x)); k = int(.5 * SR); fade[:k] = np.linspace(0, 1, k); fade[-k:] = np.linspace(1, 0, k)
save("roomtone", (vent * .8 + mains) * fade, .45)
buzz = (np.sign(np.sin(2 * np.pi * 120 * x)) * .5 + np.sin(2 * np.pi * 240 * x) * .3)
save("tubebuzz", lp(buzz, 1800) * (.85 + .15 * np.sin(2 * np.pi * .3 * x)) * fade, .25)

# --- heavy breaker switch; fluorescent starters ticking then striking ---
d = .35; x = t(d)
clunk = lp(noise(d), 1200) * np.exp(-x * 30) + np.sin(2 * np.pi * 90 * x) * np.exp(-x * 18) * .8
save("switch", clunk, .9)
d = 1.6; y = np.zeros(int(d * SR))
for s in [.05, .21, .34, .52, .61, .83, .95, 1.12]:
    i = int(s * SR); m = int(.04 * SR)
    y[i:i + m] += hp(noise(.04), 1500) * np.exp(-np.arange(m) / SR * 90)
hum = np.sign(np.sin(2 * np.pi * 120 * t(d))) * np.clip((t(d) - .9) / .5, 0, 1) * .25
save("tubes_on", y + lp(hum, 1500), .6)
d = .9; x = t(d)
save("tubes_off", lp(np.sign(np.sin(2 * np.pi * 120 * x)), 1500) * np.exp(-x * 5), .4)

# --- glass tap ---
d = .6; x = t(d)
tap = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * dk) * g for f, dk, g in ((3150, 14, .6), (4720, 20, .4), (6900, 30, .25)))
save("glass", tap + hp(noise(d), 4000) * np.exp(-x * 80) * .4, .55)

# --- alarm: rising/falling whoop over a pulsing klaxon, 8 s (looped) ---
d = 8.0; x = t(d)
lfo = (x * .55) % 1
f = 520 + 300 * lfo
ph = 2 * np.pi * np.cumsum(f) / SR
saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
klax = (np.sin(2 * np.pi * 2.2 * x) > 0).astype(float) * .35 + .65
al = lp(saw, 2400) * klax
save("alarm", al, .7)

# --- shutters: rattle down and clang ---
d = 3.2; x = t(d)
rat = bp(noise(d), 320, 1.2) * (1 + .4 * np.sin(2 * np.pi * 28 * x)) * np.clip(x / .15, 0, 1) * (x < 2.6)
cl = np.sin(2 * np.pi * 110 * x) * np.exp(-np.maximum(0, x - 2.6) * 7) * (x >= 2.6) + lp(noise(d), 700) * np.exp(-np.maximum(0, x - 2.6) * 18) * (x >= 2.6) * 2
save("shutter", rat * .8 + cl, .85)

# --- reset: relay and a double beep ---
d = .7; x = t(d)
save("reset", np.concatenate([clunk[:int(.3 * SR)], np.sin(2 * np.pi * 1046 * t(.4)) * ((t(.4) % .2) < .09) * .4]), .6)

# --- the Cage's signal: a slow pulsed call matching the dome lights (1.3 Hz) ---
d = 7.0; x = t(d)
pulse = np.maximum(0, np.sin(x * np.pi * 2 * 1.3)) ** 3
car = np.sin(2 * np.pi * 220 * x + 2.5 * np.sin(2 * np.pi * 30 * x))      # ring-mod style edge
chirp = np.sin(2 * np.pi * (900 + 600 * ((x * 1.3) % 1)) * x)
save("signal", (car * .6 + chirp * .25) * pulse * np.clip(x / .5, 0, 1), .6)

# --- materialisation: an original grinding, breathing groan (not a recording) ---
# Filtered noise through a resonant bank whose centre swings up and down with the
# 1.7 s fade cycle in the film, plus a low pulse; rises over the arrival, ends on a thump.
d = 7.6; x = t(d); n = noise(d)
cycle = .5 + .5 * np.sin(x * 2 * np.pi / 1.7 - np.pi / 2)
grow = np.clip(x / 5.5, 0, 1)
y = np.zeros(len(x))
seg = int(.05 * SR)
for i in range(0, len(x), seg):
    c = cycle[i]; fc = 260 + 520 * c + 120 * grow[i]
    blk = n[i:i + seg]
    y[i:i + seg] = bp(blk, fc, 6) * .8 + bp(blk, fc * 2.02, 9) * .5
groan = y * (.35 + .65 * cycle) * (.4 + .6 * grow)
low = np.sin(2 * np.pi * 48 * x) * (.3 + .7 * cycle) * .5
thump = (np.sin(2 * np.pi * 55 * x) * np.exp(-np.maximum(0, x - 6.9) * 6) * (x >= 6.9)) * 2
save("materialise", groan + low + thump, .8)

# --- tape and tube: VCR transport clunk, channel-change static, tape hiss loop ---
d = .5; x = t(d)
save("vcr", lp(noise(d), 900) * np.exp(-x * 25) + np.sin(2 * np.pi * 70 * x) * np.exp(-x * 14) * .6, .7)
d = .35; x = t(d)
save("channel", hp(noise(d), 600) * env(d, .002, .08) + np.sin(2 * np.pi * 15600 * x) * .05, .6)
d = 30.0; x = t(d)
hiss = hp(noise(d), 3500) * (.85 + .15 * np.sin(2 * np.pi * .5 * x)) + np.sin(2 * np.pi * 15734 * x) * .02
fade = np.ones(len(x)); k = int(.3 * SR); fade[:k] = np.linspace(0, 1, k); fade[-k:] = np.linspace(1, 0, k)
save("tapehiss", hiss * fade, .2)

# --- tape chew: the picture's audio warbles and drops in pitch, crinkles, dies ---
d = 1.4; x = t(d)
f = 220 * np.exp(-x * 1.8) * (1 + .25 * np.sin(2 * np.pi * 9 * x))
ph = 2 * np.pi * np.cumsum(f) / SR
tone = np.sin(ph) * np.exp(-x * 1.2) * .6
crinkle = hp(noise(d), 2500) * (rng.uniform(0, 1, len(x)) > .985) * 3 + hp(noise(d), 1200) * .15
save("chew", tone + crinkle * np.clip(x / .3, 0, 1), .8)
# --- tape tear: a short ripping burst for the bleed-throughs ---
d = .28; x = t(d)
save("tear", hp(noise(d), 900) * (np.sin(2 * np.pi * 60 * x) > 0) * env(d, .002, .06) + np.sin(2 * np.pi * 15734 * x) * .08, .7)

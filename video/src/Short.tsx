// Vertical Short (1080×1920) of "Level 53 Orientation": Marsh's cheerful tour, interrupted by the tape
// it was recorded over. Footage is a native portrait capture (same scripted shots, 720×1280 viewport),
// so it fills the frame; sound is the finished film's mix for each segment.
import React from "react";
import { AbsoluteFill, Composition, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio, Video } from "@remotion/media";
import { CRT } from "./CRT";
import { Cassette } from "./Ending";
import { FPS, LINES, NAR, OFFMIC, TL, filmF, isBleed, s } from "./data";
import { C, MONO, VT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const beat = (id: string) => TL.beats.find((b) => b.id === id)!.f;   // footage frames
const nextBeat = (id: string) => { const i = TL.beats.findIndex((b) => b.id === id); return i + 1 < TL.beats.length ? TL.beats[i + 1].f : TL.frames; };

// Segments of the film, in story order.
const IDS = ["reveal", "bleed1", "cyberman", "bleed4", "bleed5", "stare", "bleed6"];
// Marsh's welcome is cut on its first camera cut: the old tape tears in mid-sentence.
const firstCut = (id: string) => (TL as unknown as { cuts: number[] }).cuts.find((c) => c > beat(id) + 30) ?? nextBeat(id);
const RUNS = IDS.map((id) => ({ id, from: beat(id), to: id === "reveal" ? Math.min(firstCut(id), nextBeat(id)) : nextBeat(id) }));
const RUN_AT = RUNS.reduce<number[]>((a, r, i) => [...a, i ? a[i - 1] + (RUNS[i - 1].to - RUNS[i - 1].from) : 0], []);
const BODY = RUNS.reduce((n, r) => n + r.to - r.from, 0);
const CASSETTE = s(4.6), END_CARD = s(3.2);
export const SHORT_LEN = BODY + CASSETTE + END_CARD;

const toShort = (footF: number) => {
  for (let i = 0; i < RUNS.length; i++) if (footF >= RUNS[i].from && footF < RUNS[i].to) return RUN_AT[i] + footF - RUNS[i].from;
  return null;
};
const LINES_IN = TL.lines.map((l) => ({ id: l.id, at: toShort(l.f) })).filter((l) => l.at !== null) as { id: string; at: number }[];
const runAt = (f: number) => RUNS.find((r, i) => f >= RUN_AT[i] && f < RUN_AT[i] + r.to - r.from);

const OLD_GRADE = "grayscale(0.5) sepia(0.45) hue-rotate(-28deg) saturate(1.35) contrast(1.5) brightness(1.05) blur(1.6px)";
const NEW_GRADE = "sepia(0.12) saturate(1.05) contrast(1.04)";

const Footage: React.FC = () => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    {RUNS.map((r, i) => (
      <Sequence key={i} from={RUN_AT[i]} durationInFrames={r.to - r.from}>
        <AbsoluteFill style={{ filter: isBleed(r.id) ? OLD_GRADE : NEW_GRADE }}>
          <Video src={staticFile("footage/footage-v.mp4")} muted trimBefore={r.from} style={{ width: 1080, height: 1920 }} />
          {isBleed(r.id) ? <AbsoluteFill style={{ filter: "url(#grain)", opacity: 0.32, mixBlendMode: "overlay" }} /> : null}
        </AbsoluteFill>
        <Audio src={staticFile("film.mp4")} trimBefore={filmF(r.from)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const osd: React.CSSProperties = { fontFamily: VT, color: C.osd, textShadow: "2px 2px 0 rgba(0,0,0,.85), 0 0 6px rgba(255,255,255,.25)" };

// Tape displays, kept clear of the Shorts UI (top bar, right-hand buttons, bottom caption area).
const Displays: React.FC = () => {
  const frame = useCurrentFrame();
  const r = runAt(frame);
  if (!r) return null;
  if (isBleed(r.id)) {
    const jx = (random(`ox${frame}`) - 0.5) * 10;
    return (
      <AbsoluteFill style={{ fontFamily: MONO, fontWeight: 500, color: "#ffe6a0", textShadow: "3px 0 0 rgba(255,0,80,.6), -3px 0 0 rgba(0,200,255,.5)", fontSize: 42, translate: `${jx}px 0px` }}>
        <div style={{ position: "absolute", top: 250, left: 80 }}><span style={{ color: "#ff3b30", opacity: Math.floor(frame / 10) % 2 ? 0.2 : 1 }}>●</span> REC</div>
        <div style={{ position: "absolute", top: 250, right: 150 }}>CAGE OBS · TAPE 4</div>
        <div style={{ position: "absolute", top: 310, left: 80 }}>MAR 03 2009</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ ...osd, fontSize: 56 }}>
      <div style={{ position: "absolute", top: 250, left: 80 }}>PLAY ▶</div>
      <div style={{ position: "absolute", top: 250, right: 150 }}>SP</div>
      <div style={{ position: "absolute", top: 316, left: 80, fontSize: 44 }}>OCT 18 2012</div>
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6, s(3.6), s(4.2)], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", opacity: o }}>
      <div style={{ ...osd, position: "absolute", top: 520, width: 960, textAlign: "center", fontSize: 108, lineHeight: 1.0, background: "rgba(0,0,0,.55)", padding: "22px 10px" }}>
        THIS TAPE WAS<br /><span style={{ color: "#ff5a48" }}>RECORDED OVER</span>
      </div>
    </AbsoluteFill>
  );
};

const ShortCaption: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const n = NAR[id], words = LINES[id].split(/\s+/), heard = n.words, t = frame / FPS;
  const old = id.startsWith("k"), aside = OFFMIC.has(id);
  const span = heard.length ? [heard[0][1], heard[heard.length - 1][2]] : [0, n.dur];
  const at = (i: number) => (heard.length === words.length ? heard[i][1] : span[0] + ((span[1] - span[0]) * i) / words.length);
  const o = interpolate(frame, [0, 4, n.dur * FPS + 3, n.dur * FPS + 9], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 470, opacity: o }}>
      <div style={{ width: 920, textAlign: "center", lineHeight: 1.45, translate: old ? `${(random(`cj${frame}`) - 0.5) * 8}px 0px` : undefined }}>
        <span style={{ background: old ? "rgba(20,8,0,.82)" : "rgba(0,0,0,.84)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "4px 14px", fontFamily: old ? VT : MONO, fontWeight: 500, fontSize: old ? 72 : 52, fontStyle: aside ? "italic" : "normal" }}>
          {words.map((w, i) => <span key={i} style={{ color: t >= at(i) ? (old ? "#ffd27a" : "#f4f4ee") : (old ? "#6e5a2c" : "#6d6d66") }}>{w} </span>)}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0a1a8c", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: interpolate(frame, [0, 8], [0, 1], clamp) }}>
      <div style={{ ...osd, fontSize: 64, letterSpacing: "0.1em" }}>WATCH THE FULL TAPE</div>
      <div style={{ ...osd, fontSize: 150, lineHeight: 0.95, textAlign: "center", marginTop: 30 }}>LEVEL 53<br />ORIENTATION</div>
      <div style={{ ...osd, fontSize: 60, color: "#ffd27a", marginTop: 60 }}>▼ full film linked below</div>
    </AbsoluteFill>
  );
};

// the push-in to the stamp, started a little way in so it lands inside the shot
const CassettePush: React.FC = () => <Cassette k={useCurrentFrame() + s(1.6)} origin="74% 38%" />;

const CUTS = RUN_AT.slice(1).concat([BODY]);
const ShortFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <CRT cuts={CUTS}>
      <Sequence durationInFrames={BODY}><Footage /></Sequence>
      <Sequence durationInFrames={BODY}><Displays /></Sequence>
      <Sequence durationInFrames={s(4.2)}><Hook /></Sequence>
        {LINES_IN.map((l) => {
        const r = runAt(l.at)!, i = RUNS.indexOf(r), end = RUN_AT[i] + r.to - r.from;
        return <Sequence key={l.id} from={l.at} durationInFrames={Math.max(1, Math.min(s(NAR[l.id].dur) + 10, end - l.at))}><ShortCaption id={l.id} /></Sequence>;
      })}
      <Sequence from={BODY} durationInFrames={CASSETTE}>
        {/* zoom on the stamp itself (74% 38% of the cassette), shifted so it sits mid-frame */}
        <AbsoluteFill style={{ translate: "-283px 40px" }}><CassettePush /></AbsoluteFill>
      </Sequence>
      <Sequence from={BODY + CASSETTE} durationInFrames={END_CARD}><EndCard /></Sequence>
    </CRT>
    {CUTS.map((f, i) => <Sequence key={`t${i}`} from={Math.max(0, f - 1)} durationInFrames={s(0.3)} layout="none"><Audio src={staticFile("sfx/tear.wav")} volume={0.5} /></Sequence>)}
    <Sequence from={BODY} durationInFrames={s(0.6)} layout="none"><Audio src={staticFile("sfx/vcr.wav")} volume={0.6} /></Sequence>
    <Sequence from={BODY} durationInFrames={CASSETTE + END_CARD} layout="none"><Audio src={staticFile("music/dread.wav")} volume={(f) => interpolate(f, [0, 10, CASSETTE + END_CARD - 12, CASSETTE + END_CARD], [0, 0.4, 0.4, 0], clamp)} /></Sequence>
  </AbsoluteFill>
);

export const ShortComposition = () => <Composition id="Short" component={ShortFilm} durationInFrames={SHORT_LEN} fps={FPS} width={1080} height={1920} />;

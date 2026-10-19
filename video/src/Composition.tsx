// "Level 53 Orientation": a Geocomtex night-staff induction tape, recorded the night before "Dalek".
// Cold open on CCTV → title → terminal (PLAY) → the curator's tape → after-hours CCTV: the Cage calls,
// something answers → tape run-out and credits. Everything sits under a VHS-on-CRT finish.
import React from "react";
import { AbsoluteFill, Composition, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio, Video } from "@remotion/media";
import { CRT } from "./CRT";
import { Terminal, Title } from "./Boot";
import { Ending } from "./Ending";
import { Alerts, Camcorder, Caption, CctvLabel, Chapter, OldOSD } from "./Overlays";
import { A_LEN, B_LEN, B_START, BEATS, CCTV, CUES, END_LEN, END_START, FPS, NAR, s, TERM_LEN, TERM_START, TITLE_LEN, TITLE_START, TL, TOTAL, VO_LINES, filmF, BLEEDS, isBleed, audioFor } from "./data";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const beatAt = (f: number) => BEATS.find((b) => f >= b.from && f < b.to);
const beatStart = (id: string) => BEATS.find((b) => b.id === id)!.from;
const cue = (kind: string) => CUES.filter((c) => c.kind === kind);

// Picture grade per beat: CCTV is monochrome and gained up; the camcorder is warm tape colour.
const GAIN: Record<string, number> = { cold: 2.3, signoff: 1.15, signal: 1.6, arrival: 1.2 };   // most gain is applied at capture (camera exposure)
// In the cold open the second and third feeds (Cyberman case, door) are far darker than the first.
const COLD_SECOND = (TL as unknown as { cuts: number[] }).cuts[0] ?? 1e9;
const OLD_GRADE = "grayscale(0.5) sepia(0.45) hue-rotate(-28deg) saturate(1.35) contrast(1.5) brightness(1.05) blur(1.3px)";
const gradeFor = (id?: string, footF = 0) =>
  isBleed(id) ? OLD_GRADE : id && CCTV[id]
    ? `grayscale(1) brightness(${id === "cold" && footF >= COLD_SECOND ? 4.6 : GAIN[id] ?? 1.6}) contrast(1.2)`
    : "sepia(0.12) saturate(1.05) contrast(1.04)";

// The footage, split around the title and terminal (part A = cold open, part B = everything after).
const Footage: React.FC<{ part: "A" | "B"; fringe?: boolean }> = ({ part, fringe }) => {
  const frame = useCurrentFrame();
  const filmFrame = part === "A" ? frame : B_START + frame;
  const b = beatAt(filmFrame);
  const cctv = b && CCTV[b.id];
  const old = isBleed(b?.id);
  // Tape chew: the picture squashes, skews and smears at the end of Kessler's last line and of the film.
  const chewAt = [CHEW_K5, END_START - s(1.3)].find((c) => filmFrame >= c && filmFrame < c + s(1.3));
  const chew = chewAt !== undefined ? (filmFrame - chewAt) / s(1.3) : 0;
  const roll = old ? (random(`r${filmFrame}`) - 0.5) * 10 + (random(`rr${Math.floor(filmFrame / 9)}`) > 0.8 ? 60 : 0) : 0;
  const warp = chew ? `scale(${1 + chew * 0.1}, ${1 - chew * 0.55}) skewX(${chew * 22}deg) translateY(${chew * 160}px)` : undefined;
  return (
    <AbsoluteFill style={{ filter: fringe ? undefined : `${gradeFor(b?.id, part === "A" ? frame : A_LEN + frame)}${chew ? ` hue-rotate(${chew * 140}deg) brightness(${1 - chew * 0.6})` : ""}`, translate: `0px ${roll}px`, transform: warp }}>
      <Video src={staticFile("footage/footage.mp4")} muted trimBefore={part === "A" ? 0 : A_LEN} />
      {!fringe && cctv ? <AbsoluteFill style={{ background: "rgba(90,140,90,.18)", mixBlendMode: "multiply" }} /> : null}
      {!fringe && old ? (
        <>
          <AbsoluteFill style={{ filter: "url(#grain)", opacity: 0.32, mixBlendMode: "overlay" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 640 + ((filmFrame * 7) % 300), height: 34, background: "rgba(255,255,255,.22)", filter: "url(#grain)", translate: `${(random(`tb${filmFrame}`) - 0.5) * 90}px 0px` }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const B5 = BLEEDS.find((b) => b.id === "bleed5");
const CHEW_K5 = B5 ? B5.to - s(1.0) : -1e9;
const inBleed = (f: number, pad = 4) => BLEEDS.some((b) => f >= b.from - pad && f < b.to + pad);
// Tape glitches between beats (the curator's tape was edited) and at every CCTV switch.
const TEARS = [
  ...BLEEDS.map((b) => b.to),
  ...BEATS.map((b) => b.from).filter((f) => f > 0),
  ...TL.beats.filter((b) => ["signal", "arrival"].includes(b.id)).flatMap((b) => {
    const end = BEATS.find((x) => x.id === b.id)!.to;
    return (TL as unknown as { cuts: number[] }).cuts.map(filmF).filter((f) => f > beatStart(b.id) && f < end);
  }),
  B_START,
];

const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const inFootage = frame < A_LEN || (frame >= B_START && frame < END_START);
  const cageF = beatStart("cage"), switchOn = cue("switchOn")[0]?.at ?? B_START, alarmF = cue("alarm")[0]?.at ?? 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <CRT cuts={TEARS} fringe={inFootage ? (frame < A_LEN ? <Sequence durationInFrames={A_LEN}><Footage part="A" fringe /></Sequence> : <Sequence from={B_START} durationInFrames={B_LEN}><Footage part="B" fringe /></Sequence>) : null}>
        <Sequence durationInFrames={A_LEN}><Footage part="A" /></Sequence>
        <Sequence from={TITLE_START} durationInFrames={TITLE_LEN}><Title /></Sequence>
        <Sequence from={TERM_START} durationInFrames={TERM_LEN}><Terminal /></Sequence>
        <Sequence from={B_START} durationInFrames={B_LEN}><Footage part="B" /></Sequence>
        {/* overlays sit on the tape, so they get the tube treatment too */}
        {inFootage ? (<><CctvLabel /><Camcorder startF={B_START} /><OldOSD /><Chapter /><Alerts /></>) : null}
        {VO_LINES.filter((l) => l.id !== "n02").map((l) => (
          <Sequence key={l.id} from={l.f} durationInFrames={s(NAR[l.id].dur) + 10}><Caption id={l.id} /></Sequence>
        ))}
        <Sequence from={END_START} durationInFrames={END_LEN}><Ending /></Sequence>
      </CRT>

      {/* ---------- sound ---------- */}
      {VO_LINES.map((l) => (
        <Sequence key={`vo${l.id}`} from={l.f} durationInFrames={s(NAR[l.id].dur) + 6} layout="none">
          <Audio src={staticFile(audioFor(l.id))} volume={l.id.startsWith("k") ? 1 : 0.95} />
        </Sequence>
      ))}
      {/* tape hiss under everything */}
      <Sequence durationInFrames={END_START + s(1.6)} layout="none"><Audio src={staticFile("sfx/tapehiss.wav")} loop volume={0.05} /></Sequence>
      {/* gallery room tone and, once lit, the fluorescent tubes */}
      <Sequence durationInFrames={cageF} layout="none"><Audio src={staticFile("sfx/roomtone.wav")} loop volume={(f) => (inBleed(f) ? 0 : interpolate(f, [0, 10], [0, 0.35], clamp))} /></Sequence>
      <Sequence from={cageF} durationInFrames={END_START - cageF} layout="none"><Audio src={staticFile("sfx/roomtone.wav")} loop volume={(f) => (inBleed(cageF + f) ? 0 : 0.14)} /></Sequence>
      <Sequence from={switchOn} durationInFrames={Math.max(1, cageF - switchOn)} layout="none"><Audio src={staticFile("sfx/tubebuzz.wav")} loop volume={(f) => (inBleed(switchOn + f) ? 0 : 0.12)} /></Sequence>
      {/* corporate bed from the lights up; it drops out under every bleed and dies at the fifth.
          The Cage plays in silence until the stare, then the dread bed. */}
      <Sequence from={switchOn + s(0.8)} durationInFrames={Math.max(1, (B5 ? B5.from : cageF) - switchOn - s(0.8))} layout="none">
        <Audio src={staticFile("music/corporate.wav")} volume={(f) => (inBleed(switchOn + s(0.8) + f, 2) ? 0 : interpolate(f, [0, s(1.5)], [0, 0.2], clamp))} />
      </Sequence>
      <Sequence from={beatStart("stare")} durationInFrames={END_START - beatStart("stare")} layout="none">
        <Audio src={staticFile("music/dread.wav")} volume={(f) => (inBleed(beatStart("stare") + f) ? 0.08 : interpolate(f, [0, s(1.5), END_START - beatStart("stare") - s(1)], [0, 0.34, 0.45], clamp))} />
      </Sequence>
      {/* the older tape: tears in and out, its own hiss underneath, the chew at the end of the fifth */}
      {BLEEDS.map((b, i) => (
        <React.Fragment key={`bl${i}`}>
          <Sequence from={b.from - 1} durationInFrames={s(0.3)} layout="none"><Audio src={staticFile("sfx/tear.wav")} volume={0.55} /></Sequence>
          <Sequence from={b.from} durationInFrames={b.to - b.from} layout="none"><Audio src={staticFile("sfx/static.wav")} volume={0.12} /></Sequence>
          {b.id !== "bleed5" ? <Sequence from={b.to - 1} durationInFrames={s(0.3)} layout="none"><Audio src={staticFile("sfx/tear.wav")} volume={0.45} /></Sequence> : null}
        </React.Fragment>
      ))}
      {B5 ? <Sequence from={CHEW_K5} durationInFrames={s(1.4)} layout="none"><Audio src={staticFile("sfx/chew.wav")} volume={0.7} /></Sequence> : null}
      <Sequence from={END_START - s(1.3)} durationInFrames={s(1.4)} layout="none"><Audio src={staticFile("sfx/chew.wav")} volume={0.7} /></Sequence>
      {/* switch and tubes */}
      {cue("switchOn").map((c, i) => (
        <Sequence key={`on${i}`} from={c.at} durationInFrames={s(1.8)} layout="none">
          <Audio src={staticFile("sfx/switch.wav")} volume={0.6} />
          <Sequence from={4} layout="none"><Audio src={staticFile("sfx/tubes_on.wav")} volume={0.45} /></Sequence>
        </Sequence>
      ))}
      {cue("switchOff").map((c, i) => (
        <Sequence key={`off${i}`} from={c.at} durationInFrames={s(1.2)} layout="none">
          <Audio src={staticFile("sfx/switch.wav")} volume={0.5} />
          <Audio src={staticFile("sfx/tubes_off.wav")} volume={0.35} />
        </Sequence>
      ))}
      {/* security: the glass, the alarm (cut dead on the move to the Cage), the shutters */}
      {cue("touch").map((c, i) => (<Sequence key={`t${i}`} from={c.at} durationInFrames={s(0.7)} layout="none"><Audio src={staticFile("sfx/glass.wav")} volume={0.7} /></Sequence>))}
      {alarmF ? (
        <Sequence from={alarmF} durationInFrames={Math.max(1, (B5 ? B5.from : cageF) - alarmF)} layout="none">
          <Audio src={staticFile("sfx/alarm.wav")} loop volume={0.32} />
          <Sequence from={s(0.3)} layout="none"><Audio src={staticFile("sfx/shutter.wav")} volume={0.5} /></Sequence>
        </Sequence>
      ) : null}
      {/* the Cage's call and the arrival */}
      {cue("signal").map((c, i) => (<Sequence key={`sg${i}`} from={c.at} durationInFrames={s(7)} layout="none"><Audio src={staticFile("sfx/signal.wav")} volume={0.55} /></Sequence>))}
      {cue("materialise").map((c, i) => (<Sequence key={`m${i}`} from={c.at} durationInFrames={s(7.6)} layout="none"><Audio src={staticFile("sfx/materialise.wav")} volume={0.75} /></Sequence>))}
      {/* tape transport and channel switches */}
      {[TITLE_START, B_START].map((f, i) => (<Sequence key={`vcr${i}`} from={f - 2} durationInFrames={s(0.5)} layout="none"><Audio src={staticFile("sfx/vcr.wav")} volume={0.45} /></Sequence>))}
      {TEARS.filter((f) => f !== B_START).map((f, i) => (<Sequence key={`ch${i}`} from={Math.max(0, f - 1)} durationInFrames={s(0.35)} layout="none"><Audio src={staticFile("sfx/channel.wav")} volume={0.16} /></Sequence>))}
      {/* terminal */}
      <Sequence from={TERM_START} durationInFrames={TERM_LEN} layout="none">
        {[0.8, 0.9, 1.02, 1.1, 1.2, 1.31, 2.1, 2.18, 2.3, 2.4, 2.5, 2.6, 2.7].map((t, i) => (
          <Sequence key={`k${i}`} from={s(t)} durationInFrames={s(0.1)} layout="none"><Audio src={staticFile(`sfx/key${i % 4}.wav`)} volume={0.35} /></Sequence>
        ))}
        <Sequence from={s(1.5)} durationInFrames={s(0.7)} layout="none"><Audio src={staticFile("sfx/granted.wav")} volume={0.35} /></Sequence>
        <Sequence from={s(2.9)} durationInFrames={s(2.4)} layout="none"><Audio src={staticFile("sfx/chatter.wav")} volume={0.25} /></Sequence>
      </Sequence>
      {/* run-out static */}
      <Sequence from={END_START} durationInFrames={s(0.6)} layout="none"><Audio src={staticFile("sfx/vcr.wav")} volume={0.6} /></Sequence>
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition id="Level53" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);

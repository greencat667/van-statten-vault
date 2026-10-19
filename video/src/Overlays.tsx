// On-screen text: camcorder OSD, security-camera feed labels, chapter cards, alerts and closed captions.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BEATS, CCTV, CHAPTERS, CUES, FPS, LINES, NAR, OFFMIC, isBleed } from "./data";
import { random } from "remotion";
import { C, MONO, VT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const osd: React.CSSProperties = { fontFamily: VT, color: C.osd, textShadow: "2px 2px 0 rgba(0,0,0,.85), 0 0 6px rgba(255,255,255,.25)", letterSpacing: "0.04em" };

const beatAt = (f: number) => BEATS.find((b) => f >= b.from && f < b.to);

// Camcorder display on the curator's tape: PLAY, tape counter, SP, date.
export const Camcorder: React.FC<{ startF: number }> = ({ startF }) => {
  const frame = useCurrentFrame();
  const b = beatAt(frame);
  if (!b || CCTV[b.id] || isBleed(b.id)) return null;
  const sec = Math.floor((frame - startF) / FPS) + 4 * 60 + 12;
  const counter = `0:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  return (
    <AbsoluteFill style={{ ...osd, fontSize: 54, padding: "70px 110px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>PLAY ▶</span><span>{counter}</span>
      </div>
      <div style={{ position: "absolute", bottom: 70, right: 110, fontSize: 46, textAlign: "right" }}>SP<br />OCT 18 2012</div>
    </AbsoluteFill>
  );
};

// Security-camera feed: camera label, REC, timestamp.
export const CctvLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const b = beatAt(frame);
  if (!b || !CCTV[b.id]) return null;
  const base = b.id === "cold" ? 23 * 3600 + 41 * 60 + 7 : b.id === "signoff" ? 23 * 3600 + 59 * 60 + 31 : b.id === "signal" ? 0 * 3600 + 17 * 60 + 2 : 0 * 3600 + 17 * 60 + 40;
  const t = base + Math.floor((frame - b.from) / FPS);
  const hh = String(Math.floor(t / 3600) % 24).padStart(2, "0"), mm = String(Math.floor(t / 60) % 60).padStart(2, "0"), ss = String(t % 60).padStart(2, "0");
  const date = b.id === "signal" || b.id === "arrival" ? "10-19-2012" : "10-18-2012";
  return (
    <AbsoluteFill style={{ ...osd, fontSize: 48, padding: "70px 110px", color: "#e8f0e8" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{CCTV[b.id]}</span>
        <span><span style={{ color: C.red, opacity: Math.floor(frame / 15) % 2 ? 0.25 : 1 }}>● </span>REC</span>
      </div>
      <div style={{ position: "absolute", bottom: 70, left: 110 }}>{date}  {hh}:{mm}:{ss}</div>
      <div style={{ position: "absolute", bottom: 70, right: 110, fontSize: 40, opacity: 0.8 }}>GEOCOMTEX SECURITY · L53</div>
    </AbsoluteFill>
  );
};

// Chapter card, camcorder title-generator style.
export const Chapter: React.FC = () => {
  const frame = useCurrentFrame();
  const b = beatAt(frame);
  if (!b || !CHAPTERS[b.id]) return null;
  const k = frame - b.from;
  const o = interpolate(k, [6, 9, 2.6 * FPS, 2.9 * FPS], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, paddingBottom: 380 }}>
      <div style={{ ...osd, fontSize: 76, letterSpacing: "0.12em" }}>{CHAPTERS[b.id]}</div>
    </AbsoluteFill>
  );
};

// Alerts driven by the capture's cues.
const ALERTS: { kind: string; text: string; color: string; len: number; from?: number }[] = [
  { kind: "touch", text: "⚠ CASE 07 · CONTACT", color: C.red, len: 2.4 },
  { kind: "alarm", text: "LOCKDOWN · LEVEL 53 SEALED", color: C.red, len: 9 },
  { kind: "signal", text: "SIGNAL DETECTED · OUTBOUND · SOURCE: CONTAINMENT", color: C.amber, len: 6.5, from: 0.8 },
  { kind: "materialise", text: "MOTION · EXHIBIT ROOM · UNREGISTERED OBJECT", color: C.red, len: 9, from: 2.6 },
];
export const Alerts: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {ALERTS.map((a) => CUES.filter((c) => c.kind === a.kind).map((c, i) => {
        const k = frame - c.at - (a.from ?? 0) * FPS;
        if (k < 0 || k > a.len * FPS) return null;
        const blink = Math.floor(k / 12) % 2 ? 0.35 : 1;
        return (
          <AbsoluteFill key={`${a.kind}${i}`} style={{ justifyContent: "center", alignItems: "center", paddingTop: 420 }}>
            <div style={{ ...osd, fontSize: 58, color: a.color, background: "rgba(0,0,0,.55)", padding: "6px 26px", opacity: blink, letterSpacing: "0.08em" }}>{a.text}</div>
          </AbsoluteFill>
        );
      }))}
    </>
  );
};

// Closed captions (line-21 style): white on black boxes, each word lit as it is spoken.
export const Caption: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const old = id.startsWith("k"), aside = OFFMIC.has(id);
  const n = NAR[id], words = LINES[id].split(/\s+/), heard = n.words;
  const t = frame / FPS;
  const span = heard.length ? [heard[0][1], heard[heard.length - 1][2]] : [0, n.dur];
  const wordAt = (i: number) => (heard.length === words.length ? heard[i][1] : span[0] + ((span[1] - span[0]) * i) / words.length);
  const o = interpolate(frame, [0, 3, n.dur * FPS + 4, n.dur * FPS + 8], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150, opacity: o }}>
      <div style={{ maxWidth: 1380, textAlign: "center", lineHeight: 1.5 }}>
        <span style={{ background: old ? "rgba(20,8,0,.8)" : "rgba(0,0,0,.86)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "4px 14px", fontFamily: old ? VT : MONO, fontWeight: 500, fontSize: old ? 50 : 38, fontStyle: aside ? "italic" : "normal", translate: old ? `${(random(`cj${frame}`) - 0.5) * 8}px 0px` : undefined }}>
          {aside ? <span style={{ color: "#8d8d86" }}>(off mic) </span> : null}
          {words.map((w, i) => (
            <span key={i} style={{ color: t >= wordAt(i) ? (old ? "#ffd27a" : aside ? "#c9c9c0" : "#f4f4ee") : (old ? "#6e5a2c" : "#6d6d66") }}>{w} </span>
          ))}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// The older tape's own display: a cheaper camcorder, March 2009, misaligned and smeared.
export const OldOSD: React.FC = () => {
  const frame = useCurrentFrame();
  const b = beatAt(frame);
  if (!b || !isBleed(b.id)) return null;
  const k = frame - b.from;
  const sec = 2 * 3600 + 14 * 60 + 9 + Number(b.id.slice(5)) * 413 + Math.floor(k / FPS);
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0"), mm = String(Math.floor(sec / 60) % 60).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  const jx = (random(`ox${frame}`) - 0.5) * 10, jy = (random(`oy${frame}`) - 0.5) * 4;
  const st: React.CSSProperties = { fontFamily: MONO, fontWeight: 500, color: "#ffe6a0", textShadow: "3px 0 0 rgba(255,0,80,.6), -3px 0 0 rgba(0,200,255,.5)", letterSpacing: "0.06em" };
  return (
    <AbsoluteFill style={{ ...st, fontSize: 44, padding: "78px 120px", translate: `${jx}px ${jy}px` }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span><span style={{ color: "#ff3b30", opacity: Math.floor(frame / 10) % 2 ? 0.2 : 1 }}>●</span> REC</span>
        <span>CAGE OBS · TAPE 4</span>
      </div>
      <div style={{ position: "absolute", bottom: 78, left: 120 }}>MAR 03 2009  {hh}:{mm}:{ss}</div>
    </AbsoluteFill>
  );
};

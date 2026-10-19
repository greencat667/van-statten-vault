// Title card (camcorder title generator) and the Geocomtex terminal that plays the induction tape.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { FPS, NAR, s } from "./data";
import { C, VT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6, s(3.0), s(3.4)], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#06080d", justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ fontFamily: VT, color: C.osd, textAlign: "center", textShadow: "3px 3px 0 #000, 0 0 10px rgba(255,255,255,.3)" }}>
        <div style={{ fontSize: 150, letterSpacing: "0.08em", lineHeight: 1 }}>LEVEL 53</div>
        <div style={{ fontSize: 110, letterSpacing: "0.14em", lineHeight: 1.05 }}>ORIENTATION</div>
        <div style={{ fontSize: 46, letterSpacing: "0.2em", marginTop: 34, color: "#bfc4c8" }}>GEOCOMTEX · NIGHT STAFF INDUCTION · TAPE 1 OF 1</div>
      </div>
    </AbsoluteFill>
  );
};

// Typed green-phosphor terminal: login, clearance, tape load, then PLAY.
const SCRIPT: [number, string][] = [
  [0.1, "GEOCOMTEX SECURE MEDIA SYSTEM  v4.1"],
  [0.4, "SITE: THE VAULT, UTAH        LEVEL: 53"],
  [0.8, "> LOGIN MARSH.E"],
  [1.5, "  CLEARANCE ............ GRANTED"],
  [2.1, "> LOAD TAPE INDUCTION-L53-NIGHT"],
  [2.9, "  READING ........................ OK"],
  [3.9, "  DURATION 00:02:31    RATING: STAFF ONLY"],
  [4.8, "  NOTE: DO NOT DISCUSS EXHIBITS OFF-SITE"],
];
export const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const total = 1.4 + NAR.n02.dur + 1.5;
  const play = t > total - 1.6;
  const cursorOn = Math.floor(frame / 12) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: "#020603", padding: "140px 170px", fontFamily: VT, fontSize: 58, color: C.phosphor, textShadow: "0 0 8px rgba(125,255,154,.55), 0 0 22px rgba(125,255,154,.25)" }}>
      {SCRIPT.map(([at, line], i) => {
        if (t < at) return null;
        const typed = line.startsWith(">") ? line.slice(0, Math.max(0, Math.floor((t - at) * 28))) : line;
        return <div key={i} style={{ whiteSpace: "pre", opacity: interpolate(t - at, [0, 0.08], [0, 1], clamp) }}>{typed}</div>;
      })}
      {play ? (
        <div style={{ marginTop: 40, fontSize: 86, color: "#d8ffe0", opacity: interpolate(t, [total - 1.6, total - 1.4], [0, 1], clamp) }}>▶ PLAY</div>
      ) : (
        <div style={{ opacity: cursorOn ? 1 : 0 }}>█</div>
      )}
      {/* phosphor persistence shimmer */}
      <AbsoluteFill style={{ background: `rgba(125,255,154,${0.015 + random(`p${frame}`) * 0.015})` }} />
    </AbsoluteFill>
  );
};

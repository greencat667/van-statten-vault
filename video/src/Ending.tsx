// The tape ejects. The cassette: Marsh's label stuck over Kessler's ("DO NOT TAPE OVER").
// Then credits on VCR blue.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { s } from "./data";
import { C, MONO, VT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Cassette: React.FC<{ k: number; origin?: string }> = ({ k, origin = "82% 34%" }) => {
  // slow push in on the label; the newer label is peeling at its corner
  // start on the whole cassette, then push in on the stamp under the peeling corner
  const scale = interpolate(k, [0, s(1.6), s(5.6)], [1.05, 1.05, 2.35], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
  return (
    <AbsoluteFill style={{ background: "#0c0b0a", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1180, height: 700, background: "linear-gradient(180deg,#1b1b1d,#0f0f11)", borderRadius: 26, boxShadow: "0 30px 80px rgba(0,0,0,.8), inset 0 2px 0 rgba(255,255,255,.06)", position: "relative", scale: `${scale}`, transformOrigin: origin }}>
        {/* the old label, underneath */}
        <div style={{ position: "absolute", left: 90, top: 70, width: 1000, height: 250, background: "#e9e1c8", borderRadius: 6, padding: "26px 34px", fontFamily: MONO, color: "#3a3226" }}>
          <div style={{ fontSize: 30, letterSpacing: "0.12em" }}>GEOCOMTEX · LEVEL 53</div>
          <div style={{ fontSize: 58, fontWeight: 500, marginTop: 8 }}>CAGE OBS. 4 — P. KESSLER</div>
          <div style={{ fontSize: 34, marginTop: 6 }}>03 / 03 / 2009</div>
          <div style={{ position: "absolute", right: 34, bottom: 22, fontSize: 40, fontWeight: 500, color: "#a3271b", transform: "rotate(-4deg)", border: "4px solid #a3271b", padding: "2px 14px" }}>DO NOT TAPE OVER</div>
        </div>
        {/* Marsh's label, stuck over it, peeling at the bottom-right corner */}
        <div style={{ position: "absolute", left: 104, top: 62, width: 900, height: 212, background: "#fbfaf3", borderRadius: 4, padding: "26px 34px", fontFamily: VT, color: "#1d2a6a", transform: "rotate(-1.2deg)", clipPath: "polygon(0 0, 100% 0, 100% 38%, 66% 100%, 0 100%)", boxShadow: "0 2px 6px rgba(0,0,0,.35)" }}>
          <div style={{ fontSize: 44 }}>INDUCTION — LEVEL 53 — NIGHT STAFF</div>
          <div style={{ fontSize: 40, marginTop: 10 }}>E. MARSH   OCT 2012</div>
          <div style={{ fontSize: 30, marginTop: 12, color: "#6a6a6a" }}>(re-use old obs. tape — budget)</div>
        </div>
        {/* tape window and spools */}
        <div style={{ position: "absolute", left: 300, top: 400, width: 580, height: 200, background: "#050505", borderRadius: 12, border: "4px solid #2a2a2c" }}>
          {[150, 430].map((x) => <div key={x} style={{ position: "absolute", left: x - 70, top: 30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, #2b2b2d 18%, #141414 20%, #3a2a1a 60%, #20160c 100%)" }} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const EJ = s(1.2), LABEL = s(6.6);
  const line = (from: number, to: number) => interpolate(frame, [from, from + 10, to - 10, to], [0, 1, 1, 0], clamp);
  const osd: React.CSSProperties = { fontFamily: VT, color: C.osd, textShadow: "2px 2px 0 #000", textAlign: "center" };
  if (frame < EJ) {
    // hard eject: black with the OSD and a last flicker
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <div style={{ ...osd, position: "absolute", top: 70, left: 110, fontSize: 64, opacity: random(`ej${frame}`) > 0.15 ? 1 : 0 }}>EJECT ⏏</div>
      </AbsoluteFill>
    );
  }
  if (frame < EJ + LABEL) return <Cassette k={frame - EJ} />;
  return (
    <AbsoluteFill style={{ background: "#0a1a8c", justifyContent: "center", alignItems: "center", opacity: line(EJ + LABEL, EJ + LABEL + s(9.6)) }}>
      <div style={{ ...osd, fontSize: 40, lineHeight: 1.55, color: "#dfe4ff" }}>
        <div style={{ fontSize: 96, color: C.osd, lineHeight: 1 }}>LEVEL 53 ORIENTATION</div>
        <div style={{ marginBottom: 28 }}>AN UNOFFICIAL DOCTOR WHO FAN FILM · NOT FOR SALE</div>
        <div>SET THE NIGHT BEFORE "DALEK" (BBC, 2005)</div>
        <div>MUSEUM, CAGE, EXHIBITS: THE VAULT, A THREE.JS RECONSTRUCTION</div>
        <div>CYBERMAN HELMET: ZACHARYANNESE · THINGIVERSE 6839144 · CC BY-SA</div>
        <div>DALEK: RSFUHRER · PRINTABLES 12372 · CC BY-NC-SA 4.0</div>
        <div>TARDIS: "TARDIS 2005 MODEL A/B" · CGTRADER</div>
        <div>VOICES: KOKORO · MUSIC AND SOUND: SYNTHESISED</div>
        <div style={{ marginTop: 22 }}>DOCTOR WHO, DALEKS, CYBERMEN AND THE TARDIS © BBC</div>
        <div>THIS FILM: CC BY-NC-SA 4.0</div>
        <div style={{ marginTop: 22, fontSize: 52, color: C.osd }}>MADE BY CHRISTIAN GRAHAM · MMXXVI</div>
      </div>
    </AbsoluteFill>
  );
};

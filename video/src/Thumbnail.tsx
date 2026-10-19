// Thumbnails: the Dalek turning to the lens on the old tape, a red DO NOT TAPE OVER stamp, the tape's display.
import React from "react";
import { AbsoluteFill, Composition, Img, staticFile } from "remotion";
import { VT } from "./theme";

const Thumb: React.FC<{ vertical?: boolean }> = ({ vertical }) => {
  const W = vertical ? 1080 : 1280, H = vertical ? 1920 : 720, k = vertical ? 1.5 : 1;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Img src={staticFile(vertical ? "thumb/hero-v.jpg" : "thumb/hero.jpg")} style={{ width: W, height: H, objectFit: "cover", filter: "sepia(0.3) saturate(1.15) contrast(1.35) brightness(0.95)" }} />
      {/* tape: scanlines, vignette, a tracking band */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 1px, transparent 1px 3px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.75) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.83, height: 18 * k, background: "rgba(255,255,255,.18)" }} />
      {/* old tape display */}
      <div style={{ position: "absolute", top: 30 * k, left: 40 * k, fontFamily: VT, fontSize: 52 * k, color: "#ffe6a0", textShadow: "3px 0 0 rgba(255,0,80,.6), -3px 0 0 rgba(0,200,255,.5)" }}>
        <span style={{ color: "#ff3b30" }}>●</span> REC  MAR 03 2009
      </div>
      {/* the stamp */}
      <div style={{ position: "absolute", left: vertical ? 70 : 60, right: vertical ? 70 : undefined, top: vertical ? 1180 : 430, transform: "rotate(-6deg)", border: `${9 * k}px solid #e8291c`, padding: `${6 * k}px ${20 * k}px`, fontFamily: VT, fontSize: (vertical ? 128 : 112), lineHeight: 0.95, color: "#ff3a2a", background: "rgba(0,0,0,.45)", textAlign: "center", textShadow: "0 0 18px rgba(255,40,20,.6)" }}>
        DO NOT<br />TAPE OVER
      </div>
      <div style={{ position: "absolute", right: 40 * k, ...(vertical ? { bottom: 260 } : { top: 30 }), fontFamily: VT, fontSize: 46 * k, color: "#f2f2e6", textShadow: "2px 2px 0 #000" }}>LEVEL 53</div>
    </AbsoluteFill>
  );
};

export const ThumbnailCompositions = () => (
  <>
    <Composition id="Thumbnail" component={() => <Thumb />} durationInFrames={1} fps={30} width={1280} height={720} />
    <Composition id="ShortThumbnail" component={() => <Thumb vertical />} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

// Analogue finish: a VHS tape played on a CRT. Softens the render's clean CG edges.
// Layers (bottom → top): picture (soft, slightly crushed), colour fringe, scanlines, aperture grille,
// animated grain, rolling hum bar, head-switching noise at the bottom, tracking tears near cuts,
// tube vignette and bezel curve.
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Frames where the tape "jumps" (cuts): tracking tears and a stronger jitter around them.
export const CRT: React.FC<{ children: React.ReactNode; cuts?: number[]; strength?: number; fringe?: React.ReactNode }> = ({ children, cuts = [], strength = 1, fringe }) => {
  const frame = useCurrentFrame();
  const { height: VH } = useVideoConfig();
  const near = cuts.reduce((m, c) => Math.min(m, Math.abs(frame - c)), 1e9);
  const tear = near < 8 ? 1 - near / 8 : 0;
  // Line jitter: tiny horizontal wobble every frame, bigger on a tear.
  const jx = (random(`jx${frame}`) - 0.5) * (1.2 + tear * 26) * strength;
  const jy = tear > 0.6 ? (random(`jy${frame}`) - 0.5) * 14 : 0;
  const flicker = 0.985 + random(`fl${frame}`) * 0.03;
  const hum = ((frame * 2.6) % (VH + 420)) - 250;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 997} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="redonly"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
          <filter id="blueonly"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" /></filter>
        </defs>
      </svg>
      {/* picture */}
      <AbsoluteFill style={{ translate: `${jx}px ${jy}px`, filter: `blur(0.75px) contrast(1.1) saturate(0.86) brightness(${flicker})`, scale: "1.012" }}>
        {children}
      </AbsoluteFill>
      {/* colour fringe: offset red and blue ghosts of the picture */}
      {fringe ? (
        <>
          <AbsoluteFill style={{ translate: `${jx + 3}px ${jy}px`, filter: "url(#redonly) blur(1.5px)", mixBlendMode: "screen", opacity: 0.32, scale: "1.012" }}>{fringe}</AbsoluteFill>
          <AbsoluteFill style={{ translate: `${jx - 3}px ${jy}px`, filter: "url(#blueonly) blur(1.5px)", mixBlendMode: "screen", opacity: 0.28, scale: "1.012" }}>{fringe}</AbsoluteFill>
        </>
      ) : null}
      {/* tracking tear: a displaced band of noisy lines near a cut */}
      {tear > 0 ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {Array.from({ length: 5 }, (_, i) => {
            const y = random(`ty${frame}${i}`) * VH, h = 4 + random(`th${frame}${i}`) * 40 * tear;
            return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: h, background: `rgba(255,255,255,${0.06 + 0.22 * tear * random(`ta${frame}${i}`)})`, filter: "url(#grain)", translate: `${(random(`tx${frame}${i}`) - 0.5) * 120 * tear}px 0px` }} />;
          })}
        </AbsoluteFill>
      ) : null}
      {/* grain */}
      <AbsoluteFill style={{ filter: "url(#grain)", opacity: 0.1 * strength, mixBlendMode: "overlay" }} />
      {/* rolling hum bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: hum, height: 260, background: "linear-gradient(180deg, transparent, rgba(255,255,255,.045), transparent)" }} />
      {/* scanlines and aperture grille */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0 1px, transparent 1px 3px)" }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,40,40,.035) 0 1px, rgba(40,255,40,.035) 1px 2px, rgba(40,40,255,.035) 2px 3px)", mixBlendMode: "screen" }} />
      {/* head-switching noise at the bottom of the frame */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, background: "rgba(255,255,255,.08)", filter: "url(#grain)", translate: `${(random(`hs${frame}`) - 0.5) * 40}px 0px` }} />
      {/* tube: vignette and curved bezel */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0,0,0,.55) 100%)" }} />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 120px 30px rgba(0,0,0,.65)", borderRadius: 46, outline: "60px solid #000", outlineOffset: -18 }} />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(random(`b${frame}`), [0, 1], [0, 0.035], clamp) }} />
    </AbsoluteFill>
  );
};

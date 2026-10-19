// Timing for the whole film, derived from the recorded narration and the captured footage timeline.
import timeline from "../public/footage/timeline.json";
import narration from "../public/narration/narration.json";
import story from "./story.json";

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

type Nar = { dur: number; text: string; words: [string, number, number][] };
export const NAR = narration as unknown as Record<string, Nar>;
export const LINES = story.lines as Record<string, string>;
export const TL = timeline as unknown as {
  fps: number; frames: number;
  lines: { id: string; f: number }[];
  beats: { id: string; f: number }[];
  cues: { f: number; kind: string; frames?: number }[];
};

const beatF = (id: string) => TL.beats.find((b) => b.id === id)!.f;

// Structure: cold open (footage A) → title + terminal (n02) → footage B → tape run-out and credits.
export const A_LEN = beatF("switch");                  // footage frames in the cold open
export const TITLE_START = A_LEN;
export const TITLE_LEN = s(3.4);
export const TERM_START = TITLE_START + TITLE_LEN;
export const TERM_N02 = TERM_START + s(1.4);           // narration n02 over the terminal
export const TERM_LEN = s(1.4 + NAR.n02.dur + 1.5);
export const B_START = TERM_START + TERM_LEN;          // footage B begins (from beat "switch")
export const B_LEN = TL.frames - A_LEN;
export const END_START = B_START + B_LEN;
export const END_LEN = s(17.6);
export const TOTAL = END_START + END_LEN;

// Footage frame (in the capture) → film frame.
export const filmF = (f: number) => (f < A_LEN ? f : B_START + (f - A_LEN));

export const VO_LINES = [
  ...TL.lines.map((l) => ({ id: l.id, f: filmF(l.f) })),
  { id: "n02", f: TERM_N02 },
].sort((a, b) => a.f - b.f);

export const CUES = TL.cues.map((c) => ({ ...c, at: filmF(c.f) }));

// Beats shown as security-camera feeds rather than the curator's camcorder tape.
export const CCTV: Record<string, string> = {
  cold: "CAM 03 · EXHIBIT ROOM",
  signoff: "CAM 03 · EXHIBIT ROOM",
  signal: "CAM 12 · CONTAINMENT",
  arrival: "CAM 05 · EXHIBIT ROOM N",
};
export const CHAPTERS: Record<string, string> = {
  switch: "LESSON 1",
  reveal: "THE COLLECTION",
  meteorite: "CASE 03  METEORITES",
  milometer: "CASE 05  ROSWELL",
  slitheen: "CASE 01  SPECIMEN",
  egg: "CASE 11  SPECIMEN",
  cyberman: "CASE 07  CENTREPIECE",
  security: "SECURITY",
  lockdown: "LOCKDOWN TEST",
  cage: "LEVEL 53  CONTAINMENT",
};
// Film-frame spans of each beat.
export const BEATS = TL.beats.map((b, i) => {
  const end = i + 1 < TL.beats.length ? TL.beats[i + 1].f : TL.frames;
  return { id: b.id, from: filmF(b.f), to: b.f < A_LEN && end > A_LEN ? A_LEN : filmF(end - 1) + 1 };
});

// The older tape (Dr. Kessler, March 2009) bleeding through where it was recorded over.
export const isBleed = (id?: string) => !!id && id.startsWith("bleed");
export const BLEEDS = BEATS.filter((b) => isBleed(b.id));
export const audioFor = (id: string) => (id.startsWith("k") ? `narration/${id}_tape.wav` : `narration/${id}.wav`);
export const OFFMIC = new Set<string>((story as unknown as { offmic?: string[] }).offmic ?? []);

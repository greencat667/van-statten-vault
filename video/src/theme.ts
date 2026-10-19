import { loadFont as loadVT } from "@remotion/google-fonts/VT323";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

export const VT = loadVT("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const C = {
  osd: "#f2f2e6",          // camcorder on-screen display
  phosphor: "#7dff9a",     // terminal green
  phosphorDim: "#2f7a45",
  amber: "#ffb648",
  red: "#ff4a3a",
  bg: "#050505",
};

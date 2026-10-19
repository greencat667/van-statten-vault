"""Narration for "Level 53 Orientation" (project 122), adapted from 116: VoiceStudio (local OmniVoice clone) or Kokoro per line -> Whisper check -> public/narration/<id>.wav + narration.json.

Run with 092's .venv-tts through the heavy lock (from the workspace root):
    python3 .claude/skills/silhouette-film/scripts/heavy.py run --who 122 --label narration -- \
        personal-projects/092-the-myth-makers/.venv-tts/bin/python personal-projects/122-van-statten-vault/video/scripts/gen_narration.py [ids]
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "narration"
OUT.mkdir(parents=True, exist_ok=True)
SR = 24000
STORY = json.loads((ROOT / "src" / "story.json").read_text())
SPOKEN = STORY.get("spoken", {})   # respellings for the voice only; captions keep the real words


def norm(s):
    s = s.lower().replace("-", " ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return [w for w in s.split() if w]


def main():
    import whisper

    model = whisper.load_model("small.en")
    nar = STORY["narrator"]
    # Lines starting with "k" belong to the older tape's voice (Dr. Kessler).
    if nar.get("engine") == "voicestudio":
        import io, urllib.request
        def synth(text):
            body = json.dumps({"model": "omnivoice", "input": text, "voice": nar["voice"], "response_format": "wav", "speed": nar.get("speed", 1.0)}).encode()
            req = urllib.request.Request("http://127.0.0.1:3900/v1/audio/speech", body, {"Content-Type": "application/json"})
            data, sr = sf.read(io.BytesIO(urllib.request.urlopen(req, timeout=600).read()), dtype="float32")
            assert sr == SR, sr
            return data if data.ndim == 1 else data.mean(1)
    else:
        from kokoro import KPipeline
        pipe = KPipeline(lang_code=nar.get("lang", "b"))
        kes = STORY.get("voices", {}).get("kessler", nar)
        def synth(text, lid=""):
            v = kes if lid.startswith("k") else nar
            return np.concatenate([np.asarray(a, np.float32) for _, _, a in pipe(text, voice=v["voice"], speed=v["speed"])])
    only = set(sys.argv[1:])
    metaf = OUT / "narration.json"
    meta = json.loads(metaf.read_text()) if only and metaf.exists() else {}
    for lid, text in STORY["lines"].items():
        if only and lid not in only:
            continue
        say = text
        for a, b in SPOKEN.items():
            say = say.replace(a, b)
        audio = synth(say, lid) if nar.get('engine') != 'voicestudio' else synth(say)
        audio = np.concatenate([audio, np.zeros(int(.15 * SR), np.float32)])
        audio = 0.9 * audio / (np.max(np.abs(audio)) + 1e-9)
        wav = OUT / f"{lid}.wav"
        sf.write(wav, audio, SR)
        res = model.transcribe(str(wav), language="en", word_timestamps=True)
        heard = res["text"].strip()
        words = [[w["word"].strip(), round(w["start"], 3), round(w["end"], 3)] for s in res["segments"] for w in s.get("words", [])]
        score = len(set(norm(heard)) & set(norm(text))) / max(1, len(set(norm(text))))
        meta[lid] = {"text": text, "dur": round(len(audio) / SR, 3), "heard": heard, "score": round(score, 2), "words": words}
        print(f"{'ok   ' if score >= .9 else 'CHECK'} {lid} {len(audio)/SR:5.2f}s  {heard}", flush=True)
    metaf.write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main()

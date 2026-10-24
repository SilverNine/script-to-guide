#!/usr/bin/env python3
"""
Verify the narration: transcribe the synthesized mp3 and compare it with the script.

    python3 scripts/tts_verify.py <guide> [--stt auto|pywhispercpp|whisper|elevenlabs] [--model <path-or-id>]

Why: a person listening to three minutes of audio misses one word. A voice may read a product name
as a different word, or a space may change a pronunciation. The machine listens first.

Checks
------
1. Known mispronunciations. `pronunciation.json` may carry a `_wrong` map from a spoken form to
   strings that mean the voice got it wrong, e.g. {"_wrong": {"Claude": ["cloud"]}}. Each hit is reported.
2. Similarity. The transcript is compared with the spoken script (dictionary applied) and a ratio is
   printed. Transcription engines rewrite numbers and foreign words freely, so a ratio below 1 is normal;
   a sudden drop between runs is what to look at.

Engines
-------
- auto (default): pywhispercpp when it is installed (stg setup installs it), else whisper-cli on PATH.
- whisper: whisper.cpp through the `whisper-cli` executable (brew install whisper-cpp, or
  build from source). Model path from --model or WHISPER_MODEL, e.g. ~/models/ggml-small.bin.
- pywhispercpp: the same engine through its Python binding (pip install pywhispercpp). --model takes a
  model name (small.en) or a path to a ggml-*.bin file.
- elevenlabs: Scribe. Key from ELEVENLABS_API_KEY or .env.elevenlabs in your project folder.
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from tts_synth import build, load_dict, load_json_map, script_lines  # noqa: E402
from _paths import CWD, resolve_guide  # noqa: E402


def load_key() -> str:
    k = os.environ.get("ELEVENLABS_API_KEY")
    if k:
        return k.strip()
    p = next((d / ".env.elevenlabs" for d in (CWD, ROOT) if (d / ".env.elevenlabs").exists()), ROOT / ".env.elevenlabs")
    if p.exists():
        return p.read_text(encoding="utf-8").strip()
    sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or put .env.elevenlabs in your project folder")


def stt_elevenlabs(mp3: pathlib.Path, lang: str, model: str | None) -> str:
    key = load_key()
    b, bound, parts = mp3.read_bytes(), "----" + uuid.uuid4().hex, []
    for n, v in (("model_id", model or "scribe_v1"), ("language_code", lang)):
        parts.append(f'--{bound}\r\nContent-Disposition: form-data; name="{n}"\r\n\r\n{v}\r\n'.encode())
    parts.append((f'--{bound}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\n' "Content-Type: audio/mpeg\r\n\r\n").encode())
    parts += [b, f"\r\n--{bound}--\r\n".encode()]
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/speech-to-text", data=b"".join(parts),
        headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={bound}"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read().decode()).get("text", "")


def stt_whisper(mp3: pathlib.Path, lang: str, model: str | None) -> str:
    exe = shutil.which("whisper-cli") or shutil.which("whisper-cpp") or shutil.which("main")
    if not exe:
        sys.exit("no transcription engine: run `stg setup` to install pywhispercpp, or brew install whisper-cpp, or pass --stt elevenlabs")
    model = model or os.environ.get("WHISPER_MODEL")
    if not model or not pathlib.Path(model).expanduser().exists():
        sys.exit("whisper model not found: pass --model <ggml-*.bin> or set WHISPER_MODEL")
    with tempfile.TemporaryDirectory() as td:
        wav = pathlib.Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "16000", str(wav)], check=True)
        out = pathlib.Path(td) / "out"
        subprocess.run([exe, "-m", str(pathlib.Path(model).expanduser()), "-l", lang, "-f", str(wav), "-otxt", "-of", str(out), "-np"], check=True, capture_output=True)
        return (out.with_suffix(".txt")).read_text(encoding="utf-8")


def stt_pywhispercpp(mp3: pathlib.Path, lang: str, model: str | None) -> str:
    """whisper.cpp through its Python binding (pip install pywhispercpp). No separate binary needed."""
    try:
        from pywhispercpp.model import Model  # type: ignore
    except ImportError:
        sys.exit("pywhispercpp is not installed: run `stg setup` (or pip install pywhispercpp, or use --stt whisper / elevenlabs)")
    model = model or os.environ.get("WHISPER_MODEL") or ("small.en" if lang == "en" else "small")
    with tempfile.TemporaryDirectory() as td:
        wav = pathlib.Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "16000", str(wav)], check=True)
        m = Model(str(pathlib.Path(model).expanduser()) if pathlib.Path(model).expanduser().exists() else model, print_realtime=False, print_progress=False, redirect_whispercpp_logs_to=None)
        return " ".join(seg.text.strip() for seg in m.transcribe(str(wav), language=lang))


ENGINES = {"whisper": stt_whisper, "pywhispercpp": stt_pywhispercpp, "elevenlabs": stt_elevenlabs}


def norm(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", s).lower()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("guide")
    ap.add_argument("--stt", choices=["auto", *sorted(ENGINES)], default="auto")
    ap.add_argument("--model", default=None)
    ap.add_argument("--lang", default=None)
    a = ap.parse_args()

    gdir = resolve_guide(a.guide)
    mp3 = gdir / "recordings" / "narration.mp3"
    if not mp3.exists():
        sys.exit(f"missing {mp3}: run tts_synth.py first")
    cfg = json.loads((gdir / "guide.json").read_text(encoding="utf-8")) if (gdir / "guide.json").exists() else {}
    lang = a.lang or cfg.get("page", {}).get("lang", "en")

    stt = a.stt
    if stt == "auto":
        try:
            import pywhispercpp  # type: ignore  # noqa: F401
            stt = "pywhispercpp"
        except ImportError:
            stt = "whisper"
    text = ENGINES[stt](mp3, lang, a.model)
    (gdir / "recordings" / "narration.stt.txt").write_text(text, encoding="utf-8")

    table = load_dict(gdir)
    wrong = {}
    for p in (ROOT / "references" / "pronunciation.json", gdir / "pronunciation.json"):
        if p.exists():
            wrong.update(json.loads(p.read_text(encoding="utf-8")).get("_wrong", {}))

    bad = 0
    for spoken, forms in wrong.items():
        for w in forms:
            n = text.lower().count(w.lower())
            if n:
                bad += n
                print(f"  ✗ heard '{w}' {n}x (expected '{spoken}')")

    _, _, spoken_script = build(script_lines(gdir), table)
    ratio = difflib.SequenceMatcher(None, norm(spoken_script), norm(text)).ratio()
    print(f"known mispronunciations: {bad}" + ("" if bad else " (pass)"))
    print(f"transcript similarity to script: {ratio:.3f}")
    print(f"transcript: {gdir / 'recordings' / 'narration.stt.txt'} (numbers and foreign words are often rewritten by the engine; check those by ear)")


if __name__ == "__main__":
    main()

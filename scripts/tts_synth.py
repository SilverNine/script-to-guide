#!/usr/bin/env python3
"""
Synthesize the narration of a guide: one mp3, a captions JSON with word timestamps, and a scene timetable.

    python3 scripts/tts_synth.py <guide> [--provider edge|elevenlabs] [--voice <id>] [--model <id>] [--lang ko]
    python3 scripts/tts_synth.py <guide> --reuse          # no API calls; re-stitch stored takes
    python3 scripts/tts_synth.py <guide> --force S3,S4    # re-synthesize those scenes

Why it works this way
---------------------
A TTS engine knows what it is going to say before it says it. Providers that return character or
word timestamps make speech recognition and forced alignment unnecessary: the captions are the
script, word for word, with the engine's own timing. That is how the "captions equal the script"
rule is enforced by construction rather than by review.

Spoken spelling
---------------
The script is written once, with on-screen spelling. Just before synthesis each word is passed
through `pronunciation.json` (guide folder first, then references/pronunciation.json) so the voice
reads, for example, a product name the way it is pronounced rather than the way it is spelled.
Captions keep the on-screen spelling; timing is joined back per on-screen word.

Scene gaps
----------
A demo scene often needs more screen time than its sentence takes. `gaps.json` in the guide folder
maps scene → seconds of silence to append after that scene's narration. Later captions shift by the
same amount, and the scene timetable records the result.

Per-scene takes
---------------
Each scene is synthesized separately into `guides/<guide>/takes/<scene>.mp3` + `.json`. The JSON
holds a hash of the spoken text, voice and model, and the word timings in a provider-neutral form.
On the next run, scenes whose hash is unchanged are not re-synthesized: fixing one sentence re-times
only that scene, and takes you have already listened to stay as they are.

Providers
---------
- edge (default): Microsoft Edge neural voices through the `edge-tts` package. Free, no key,
  word boundaries included. Voices such as `en-US-AriaNeural`, `ko-KR-SunHiNeural`.
- elevenlabs: `with-timestamps` endpoint, character timestamps. Key from ELEVENLABS_API_KEY or
  a `.env.elevenlabs` file in the repository root. The key is never printed.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from _paths import CWD, resolve_guide  # noqa: E402
FPS = 30

# ---------- script and dictionaries ----------


def load_json_map(p: pathlib.Path) -> dict:
    if not p.exists():
        return {}
    return {k: v for k, v in json.loads(p.read_text(encoding="utf-8")).items() if not k.startswith("_")}


def load_dict(gdir: pathlib.Path) -> dict:
    table = load_json_map(ROOT / "references" / "pronunciation.json")
    table.update(load_json_map(gdir / "pronunciation.json"))
    return {k: v for k, v in table.items() if isinstance(v, str)}


def load_gaps(gdir: pathlib.Path) -> dict:
    return {k: float(v) for k, v in load_json_map(gdir / "gaps.json").items()}


def script_lines(gdir: pathlib.Path) -> list[tuple[str, str]]:
    """Narration lines under `## [scene]` headings as (scene, line). Screen directions, tables and quotes are skipped."""
    md = (gdir / "script.md").read_text(encoding="utf-8")
    out, scene = [], None
    for raw in md.split("\n"):
        t = raw.strip()
        if t.startswith("## ["):
            scene = t[4 : t.index("]")]
            continue
        if t.startswith("## ") or t.startswith("# "):
            scene = None
            continue
        if scene is None or not t:
            continue
        if t.startswith(("**(", ">", "|", "- [", "---", "<!--")):
            continue
        t = re.sub(r"`\[[^\]]*\]`", "", t).strip()
        if t:
            out.append((scene, t))
    return out


def to_spoken(word: str, table: dict) -> str:
    """Replace longer keys first inside one word."""
    for k in sorted(table, key=len, reverse=True):
        if k in word:
            word = word.replace(k, table[k])
    return word


def build(lines: list[tuple[str, str]], table: dict):
    """Per on-screen word: its scene, and which spoken words it became."""
    display, spans, spoken = [], [], []
    for scene, line in lines:
        for w in line.split():
            s = to_spoken(w, table).split() or [w]
            display.append((scene, w))
            spans.append((len(spoken), len(spoken) + len(s)))
            spoken.extend(s)
    return display, spans, " ".join(spoken)


# ---------- providers ----------
# Each provider returns (mp3_bytes, tokens) where tokens = [{"text": str, "start": sec, "end": sec}]
# with whitespace removed from text. Token granularity may differ (characters, words); timing is
# joined back to spoken words by character position, so either works.


def load_key() -> str:
    k = os.environ.get("ELEVENLABS_API_KEY")
    if k:
        return k.strip()
    p = next((d / ".env.elevenlabs" for d in (CWD, ROOT) if (d / ".env.elevenlabs").exists()), ROOT / ".env.elevenlabs")
    if p.exists():
        return p.read_text(encoding="utf-8").strip()
    sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or create .env.elevenlabs in the repository root")


def synth_elevenlabs(text: str, voice: str, model: str, lang: str):
    key = load_key()
    payload = json.dumps({"text": text, "model_id": model, "language_code": lang, "output_format": "mp3_44100_128"}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps",
        data=payload,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs synthesis failed {e.code}: {e.read().decode()[:300]}")
    al = d["alignment"]
    tokens = [
        {"text": c, "start": s, "end": e}
        for c, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"])
        if not c.isspace()
    ]
    return base64.b64decode(d["audio_base64"]), tokens


def synth_edge(text: str, voice: str, model: str, lang: str):
    try:
        import edge_tts  # type: ignore
    except ImportError:
        sys.exit("edge-tts is not installed: pip install -r requirements.txt")

    async def run():
        try:
            com = edge_tts.Communicate(text, voice, boundary="WordBoundary")
        except TypeError:  # older edge-tts without the boundary argument
            com = edge_tts.Communicate(text, voice)
        audio, tokens = bytearray(), []
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                tokens.append({"text": re.sub(r"\s+", "", chunk["text"]), "start": start, "end": start + chunk["duration"] / 1e7})
        return bytes(audio), tokens

    audio, tokens = asyncio.run(run())
    if not tokens:
        sys.exit("edge-tts returned no word boundaries; the voice may not support them")
    return audio, tokens


def synth_silent(text: str, voice: str, model: str, lang: str):
    """No voice: silence with evenly paced word timings. For layout checks and CI, before paying for TTS."""
    words = text.split()
    per = 0.32  # seconds per word
    tokens, t = [], 0.2
    for w in words:
        d = per + 0.03 * max(0, len(w) - 4) + (0.35 if w[-1] in ".!?" else 0.12 if w[-1] in ",;:" else 0.0)
        tokens.append({"text": re.sub(r"\s+", "", w), "start": t, "end": t + d})
        t += d + 0.04
    total = t + 0.2
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{total:.3f}", "-b:a", "64k", "-f", "mp3", "pipe:1"],
        capture_output=True, check=True,
    )
    return out.stdout, tokens


PROVIDERS = {"edge": synth_edge, "elevenlabs": synth_elevenlabs, "silent": synth_silent}
DEFAULT_VOICE = {
    "edge": {"en": "en-US-AriaNeural", "ko": "ko-KR-SunHiNeural", "ja": "ja-JP-NanamiNeural", "zh": "zh-CN-XiaoxiaoNeural"},
    "silent": {"en": "none", "ko": "none", "ja": "none", "zh": "none"},
}
DEFAULT_MODEL = {"elevenlabs": "eleven_v3", "edge": "", "silent": ""}


def _wordchars(s: str) -> str:
    """Letters and digits only. Providers differ on punctuation (Edge drops it, ElevenLabs keeps it)."""
    return re.sub(r"[\W_]", "", s)


def word_times(tokens: list[dict], spoken: str) -> list[list[float]]:
    """Join token timings to spoken words by position in the word-character stream."""
    words = spoken.split()
    tok_text = "".join(_wordchars(t["text"]) for t in tokens)
    script_text = "".join(_wordchars(w) for w in words)
    if tok_text != script_text:
        at = next((i for i, (a, b) in enumerate(zip(tok_text, script_text)) if a != b), min(len(tok_text), len(script_text)))
        sys.exit(
            "Synthesized text does not match the script "
            f"(first difference at character {at}: synthesized '{tok_text[at:at + 12]}', script '{script_text[at:at + 12]}'). "
            "If you ran --reuse, the script changed: synthesize again. Numbers and symbols may need a pronunciation entry."
        )
    char_tok = []
    for ti, t in enumerate(tokens):
        char_tok.extend([ti] * len(_wordchars(t["text"])))
    times, pos = [], 0
    for w in words:
        n = len(_wordchars(w))
        if n == 0:  # punctuation-only word: zero-length, at the end of the previous word
            t0 = times[-1][1] if times else (tokens[0]["start"] if tokens else 0.0)
            times.append([t0, t0])
            continue
        first, last = tokens[char_tok[pos]], tokens[char_tok[pos + n - 1]]
        times.append([first["start"], last["end"]])
        pos += n
    return times


def ffprobe_seconds(p: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def scene_hash(spoken: str, provider: str, voice: str, model: str) -> str:
    return hashlib.sha256(f"{provider}|{voice}|{model}|{spoken}".encode()).hexdigest()[:16]


# ---------- main ----------


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("guide")
    ap.add_argument("--provider", choices=sorted(PROVIDERS), default=None)
    ap.add_argument("--voice", default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--lang", default=None, help="language code for the provider (default: guide.json page.lang or en)")
    ap.add_argument("--reuse", action="store_true", help="never call the provider; stop if a scene changed")
    ap.add_argument("--force", default="", help="scenes to re-synthesize, comma separated")
    a = ap.parse_args()

    if not re.fullmatch(r"[a-z][a-z0-9-]{1,39}", a.guide):
        sys.exit("guide names use lowercase letters, digits and hyphens")
    gdir = resolve_guide(a.guide)
    if not (gdir / "script.md").exists():
        sys.exit(f"missing {gdir}/script.md")
    cfg = json.loads((gdir / "guide.json").read_text(encoding="utf-8")) if (gdir / "guide.json").exists() else {}
    lang = a.lang or cfg.get("page", {}).get("lang", "en")
    tts_cfg = cfg.get("tts", {})
    provider = a.provider or tts_cfg.get("provider", "edge")
    voice = a.voice or tts_cfg.get("voice") or DEFAULT_VOICE.get(provider, {}).get(lang)
    model = a.model or tts_cfg.get("model") or DEFAULT_MODEL.get(provider, "")
    if not voice:
        sys.exit(f"--voice is required for provider {provider} and language {lang}")

    takes = gdir / "takes"
    takes.mkdir(parents=True, exist_ok=True)
    force = {x.strip() for x in a.force.split(",") if x.strip()}

    table, gaps_by_scene = load_dict(gdir), load_gaps(gdir)
    lines = script_lines(gdir)
    if not lines:
        sys.exit("script.md has no narration lines under `## [scene]` headings")
    order = []
    for sc, _ in lines:
        if sc not in order:
            order.append(sc)

    per, made, kept = {}, [], []
    for sc in order:
        display, spans, spoken = build([l for l in lines if l[0] == sc], table)
        mp3, js = takes / f"{sc}.mp3", takes / f"{sc}.json"
        meta = json.loads(js.read_text(encoding="utf-8")) if js.exists() else None
        h = scene_hash(spoken, provider, voice, model)
        if meta and mp3.exists() and meta.get("hash") == h and sc not in force:
            kept.append(sc)
        else:
            if a.reuse:
                sys.exit(f"scene {sc}: script changed or take missing; run without --reuse")
            audio, tokens = PROVIDERS[provider](spoken, voice, model, lang)
            mp3.write_bytes(audio)
            meta = {"provider": provider, "voice": voice, "model": model, "hash": h, "tokens": tokens}
            js.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
            made.append(sc)
        per[sc] = {"display": display, "spans": spans, "times": word_times(meta["tokens"], spoken), "mp3": mp3, "dur": ffprobe_seconds(mp3)}
    print(f"{len(lines)} lines · {len(order)} scenes · synthesized {','.join(made) or 'none'} · reused {len(kept)} · {len(table)} pronunciation rules")

    # stitch: scene take + trailing silence, scenes level-matched
    gaps = [gaps_by_scene.get(sc, 0.0) for sc in order]
    rec = gdir / "recordings"
    rec.mkdir(parents=True, exist_ok=True)
    out_mp3 = rec / "narration.mp3"
    inputs, parts, labels = [], [], []
    for k, sc in enumerate(order):
        inputs += ["-i", str(per[sc]["mp3"])]
        parts.append(f"[{k}:a]loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100,aformat=channel_layouts=mono[p{k}]")
        labels.append(f"[p{k}]")
        if gaps[k] > 0:
            parts.append(f"anullsrc=r=44100:cl=mono,atrim=0:{gaps[k]:.3f}[g{k}]")
            labels.append(f"[g{k}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", graph, "-map", "[out]", "-ac", "1", "-ar", "44100", "-b:a", "192k", str(out_mp3)], check=True)

    # captions and scene timetable
    items, scenes, t0 = [], [], 0.0
    for k, sc in enumerate(order):
        P = per[sc]
        first = len(items)
        for i, (_, word) in enumerate(P["display"]):
            a0 = P["times"][P["spans"][i][0]][0] + t0
            a1 = P["times"][P["spans"][i][1] - 1][1] + t0
            f_ms, t_ms = int(a0 * 1000), int(a1 * 1000)
            items.append({
                "timestamps": {"from": f"{f_ms // 1000:02d}:{f_ms % 1000:03d}", "to": f"{t_ms // 1000:02d}:{t_ms % 1000:03d}"},
                "offsets": {"from": f_ms, "to": t_ms},
                "text": " " + word,
            })
        t1 = t0 + P["dur"] + gaps[k]
        scenes.append({
            "scene": sc, "fromFrame": round(t0 * FPS), "toFrame": round(t1 * FPS),
            "speechFromMs": items[first]["offsets"]["from"], "speechToMs": items[-1]["offsets"]["to"],
            "gapSec": gaps[k],
        })
        t0 = t1
    data = gdir / "data"
    data.mkdir(exist_ok=True)
    (data / "captions.json").write_text(json.dumps({"transcription": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    total = ffprobe_seconds(out_mp3)
    (data / "scenes.json").write_text(
        json.dumps({"fps": FPS, "durationInFrames": round(total * FPS), "scenes": scenes}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{int(total // 60)}m {total % 60:.1f}s · {len(items)} caption words · {sum(gaps):.1f}s of inserted silence")
    for sc in scenes:
        a_, b_ = sc["fromFrame"] / FPS, sc["toFrame"] / FPS
        print(f"  {sc['scene']:<6} {int(a_ // 60)}:{a_ % 60:04.1f} ~ {int(b_ // 60)}:{b_ % 60:04.1f}  ({b_ - a_:4.1f}s · gap {sc['gapSec']:.1f})")
    print(f"  → {out_mp3} · {data}/captions.json · scenes.json")


if __name__ == "__main__":
    main()

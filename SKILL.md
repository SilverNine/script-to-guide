---
name: script-to-guide
description: Turn a written script and real app screenshots into a narrated product walkthrough. Output is a small static web page (searchable transcript, follow-along mode, embeds with an iframe) or an MP4. Every highlight, zoom and cursor move is cued to a word of the synthesized narration, so editing the script re-times the screen. Use when the user wants a product guide, onboarding walkthrough, feature tutorial or help-center video for a web app, or for any app from screenshots.
---

# script-to-guide

Guides that talk. Script + screenshots in, narrated walkthrough out, shipped as HTML or MP4.

## Where things live

- **Engine**: the folder this file is in. Call it `<skill>` below. Never write guides or outputs into it.
- **Guides**: `./guides/<name>/` in the user's project (the current directory).
- **Outputs**: `./dist/` in the user's project.

Every command goes through one entry point:

```bash
node <skill>/scripts/stg.mjs <command>
```

First use on a machine (and after the skill updates): `node <skill>/scripts/stg.mjs setup`, then `doctor`. Setup installs Node packages, Chromium for Playwright and a Python venv inside `<skill>`. ffmpeg must be on PATH; doctor says if it is not.

## Decide the mode first

1. **Sample swap**: the user wants a guide like the sample and only the product changes. `stg new <name>` copies the sample into `./guides/<name>/`, which builds at once. Then replace script, captures and scenes stage by stage (`references/pipeline.md`).
2. **Autonomous**: the user has handed over creative and engineering decisions. Run `references/pipeline.md` to the finished guide without pausing at checkpoints.
3. **Co-create** (default): the user approves at four checkpoints: brief, script, review, publish. Run `references/pipeline.md` and stop at each.

If the user gave a project path, URL or screenshots but no mode, do a minimal read-only product check (what it is, which screens matter, what data on screen is sensitive), then recommend a mode and ask.

## Rules the agent does not break

1. **Real screens are real captures.** Run the product in a demo-data state and capture with `stg capture` at 2x. Draw a screen only when it cannot be captured (OS dialogs, third-party windows), and say so in the script.
2. **No real data on screen.** Customer, personal, internal, key or live data is replaced before capture. Never trigger an action with side effects on a live service to get a screen.
3. **The script is the source of truth.** Scene motions are `cue(scene, word)`. Never place a motion at a hand-typed time.
4. **Narration is verified.** After synthesis, run `stg verify`. Fix pronunciation through the dictionary, never by rewording the on-screen text.
5. **Length never changes after synthesis.** Captions, timetable and cues all derive from the narration's word timestamps. To change a sentence, re-synthesize and let the cues move.
6. **API keys never enter the chat.** For ElevenLabs, do not ask the user to paste the key and do not read, print or write it. Tell them to create `.env.elevenlabs` in the project folder with the key alone on one line (or set `ELEVENLABS_API_KEY`) and add `.env*` to its `.gitignore`, then wait for them to say it is done.

## Commands

| Step | Command |
|---|---|
| Start a guide | `stg new <name>` |
| Capture a screen and element boxes | `stg capture --url <url> --out guides/<name>/public/screens/<shot>.webp --box name=selector` |
| Narration, captions, timetable | `stg synth <name>` |
| Check the narration | `stg verify <name>` |
| Type-check scenes | `stg check <name>` |
| HTML guide | `stg build <name>` → `dist/<name>/` |
| Review stills | `stg frames <name> --at 0,450,900` (add `--page` for the whole player) |
| MP4 and subtitles | `stg mp4 <name>` → `dist/<name>.mp4`, `.srt` |

## Where to read

| Need | Read |
|---|---|
| Stages, checkpoints, what to show the user | `references/pipeline.md` |
| Script format and scene IDs | `references/script-format.md` |
| Narration voice and sentence rules | `references/narration.md` |
| Pronunciation dictionary | `references/pronunciation.md` |
| Capture, demo data, element boxes | `references/capture.md` |
| Motion cards: read the card before using a motion, copy its pitfalls into the scene plan | `cards/README.md`, then `cards/<id>.md` |
| Guide folder layout, frames, overlays, steps | `guides/README.md` |
| A complete working guide | `guides/first-diagram/` |
| Final review checklist | `references/final-review.md` |
| HTML build and MP4 | `references/build.md` |

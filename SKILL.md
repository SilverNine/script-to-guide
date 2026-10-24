---
name: script-to-guide
description: Turn a written script and real app screenshots into a narrated product walkthrough. Output is a 2 MB HTML guide (embeddable, searchable, follow-along mode) or an MP4. Every highlight, zoom and cursor move is cued to a word of the synthesized narration, so editing the script re-times the screen. Use when the user wants a product guide, onboarding walkthrough, feature tutorial or help-center video for a web or desktop app.
---

# script-to-guide

> **Status: skeleton.** The sections below describe the shape of the skill. Reference files it points to do not exist yet. Do not run this skill until the first release.

Guides that talk. Script + screenshots in, narrated walkthrough out, shipped as HTML or MP4.

## Decide the mode first

1. **Template swap**: the user wants a guide like the sample and only the product changes. Read `template/TEMPLATE.md`.
2. **Autonomous**: the user has handed over creative and engineering decisions. Read `references/pipeline.md` and run to the finished guide without pausing for intermediate approvals.
3. **Co-create** (default): the user approves at four checkpoints: brief, script, preview, publish. Read `references/pipeline.md` and stop at each checkpoint.

If the user gave a project path, URL or screenshots but no mode, do a minimal read-only product check (what it is, which screens matter, what data on screen is sensitive), then recommend a mode and ask.

## Rules the agent does not break

1. **Real screens are real captures.** Run the product locally in a demo-data state and capture with Playwright at 2x. Draw a screen only when it cannot be captured (OS dialogs, third-party chat windows), and say so in the script.
2. **No real data on screen.** Customer, personal, internal, key or live data is replaced before capture. Freeze the demo state first.
3. **The script is the source of truth.** Scene motions are `cue(scene, word)`. Never place a motion at a hand-typed time.
4. **Narration is verified.** After synthesis, transcribe the audio and diff it against the script. Fix pronunciation through the dictionary, never by rewording the on-screen text.
5. **Length never changes after synthesis.** Captions, timetable and cues all derive from the narration's word timestamps.

## Pipeline

See `references/pipeline.md`. Stages: brief → script → capture → narration → captions and timetable → scene assembly → review → build (HTML, optional MP4) → publish.

## Where things are

| Need | Read |
|---|---|
| Script format and scene IDs | `references/script-format.md` |
| Narration voice and sentence rules | `references/narration.md` |
| Pronunciation dictionary | `references/pronunciation.md` |
| Motion cards: read the card before using a motion, copy its pitfalls into the scene plan | `cards/README.md`, then `cards/<id>.md` |
| Live preview of every motion | `gallery/` (build with `node scripts/build-gallery.mjs`) |
| Guide folder layout, frames, overlays, steps | `guides/README.md` |
| Final review checklist | `references/final-review.md` |
| Build and export | `references/build.md` |

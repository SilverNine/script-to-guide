# script-to-guide

**Guides that talk.** Script + screenshots in, a narrated product walkthrough out. Ships as 2 MB of HTML, or as MP4 when you need a file.

A [Claude Code](https://claude.com/claude-code) / [Codex](https://openai.com/codex) skill. MIT.

> **Status: pre-release.** The engine is being extracted from a private pipeline that has shipped eight internal product guides and a YouTube series. Nothing here is installable yet. Watch the repo or check the [roadmap](#roadmap).

## See it

[![Your first diagram in MermanDraw: the sample guide, paused on step 3 with the live transcript beside it](docs/first-diagram.png)](https://silvernine.github.io/script-to-guide/first-diagram/)

**[Play the sample guide](https://silvernine.github.io/script-to-guide/first-diagram/)** (1:28, English, free Edge voice). It walks through [mermandraw.com](https://mermandraw.com) in four steps. Everything that made it is in [`guides/first-diagram`](guides/first-diagram): a 200-word script, four captures, and one scene file where every highlight is `cue(scene, word)`. Nothing was placed on a timeline by hand.

The motion vocabulary is in the [gallery](https://silvernine.github.io/script-to-guide/gallery/).

## What it does

You write the script. Each paragraph names the scene it belongs to and says what should be on screen. The agent captures your real app with a headless browser (or draws the parts it cannot capture), synthesizes the narration, and assembles the guide. Every motion on screen is cued to a word of the narration.

```
script.md  +  your app (or screenshots)
        │
        ▼
  narration (TTS, word timestamps)  →  captions + scene timetable
        │
        ▼
  scenes: cue("install", "click Save")  →  spotlight, pin, zoom, cursor
        │
        ├──▶  guide.html   2 MB, embeddable, searchable, follow-along mode
        └──▶  guide.mp4    when you need a file (YouTube, Slack, LMS)
```

## Why not just a video file

Product UI changes. A recorded video dies with it. A guide built from a script does not:

- **Cue, don't keyframe.** Nothing is placed on a timeline by hand. `cue(scene, word)` anchors every highlight, zoom and cursor move to the narration. Change a sentence, re-synthesize, and the screen follows.
- **Swap a screenshot, not a shoot.** When a button moves, replace one capture and rebuild. No re-recording, no re-encoding.
- **It is HTML.** Text is selectable and searchable. Speed control and chapter jump are built in. Follow-along mode pauses after each step so the viewer can do it in their own app. Embed it in docs or a help center with one tag.
- **Still a video when you need one.** The same timeline renders to MP4 by stepping the player frame by frame in a headless browser. No video framework in the dependency tree.
- **Verified narration.** The synthesized voice is transcribed back and diffed against the script, so a mispronounced product name is caught before anyone hears it.

## What ships in this repo

| Layer | What it is |
|---|---|
| `SKILL.md` | The skill entry point. Picks a mode, says which reference to read, states the rules the agent must not break |
| `references/` | Script format, narration rules, pronunciation dictionary format, pipeline stages, final review checklist |
| `cards/` | 13 motion cards: spotlight, numbered pin, magnifier, cursor click, callout, type-in, screen swap, camera push-in, redact, title, chapter, step list, drawn dialog. Each has an intent, when to use and avoid it, a parameter table, known pitfalls and a reference implementation |
| `gallery/` | Every card playing live, rendered by the player's own runtime |
| `player/` | The HTML player. Dependency-free web component, frame clock driven by audio position, keyboard shortcuts, follow-along mode |
| `scripts/` | `stg.mjs`, the one entry point: setup, new guide, capture, TTS with word timestamps (edge-tts with no key, or ElevenLabs), transcription check, web build, MP4 export |
| `guides/first-diagram/` | One complete sample guide for a public app: script, pronunciation dictionary, captures with element boxes, scenes |

## Install

Not released yet. When the first release lands:

```bash
# Claude Code
claude plugin marketplace add SilverNine/script-to-guide
claude plugin install script-to-guide@silvernine

# Codex (or Claude Code without the plugin system)
git clone https://github.com/SilverNine/script-to-guide.git ~/.script-to-guide
ln -s ~/.script-to-guide ~/.codex/skills/script-to-guide
ln -s ~/.script-to-guide ~/.claude/skills/script-to-guide
```

Then ask your agent for a guide ("make a 2 minute guide for our signup flow"). On first use it runs `setup`, which installs the engine's Node packages, Playwright's Chromium and a Python venv inside the skill folder. You need Node 18+, Python 3.10+ and ffmpeg.

The skill folder is the engine only. Your guides live in your project under `guides/<name>/` and builds go to `dist/`, so updating the skill never touches your work.

## Without an agent

Every step is one command:

```bash
STG="node ~/.script-to-guide/scripts/stg.mjs"
$STG setup                     # once
$STG new signup                # ./guides/signup/ from the sample, builds as is
$STG synth signup              # narration, captions, scene timetable
$STG verify signup             # transcribe it back and diff against the script
$STG build signup              # dist/signup/index.html
$STG mp4 signup                # dist/signup.mp4 + .srt
```

## Roadmap

1. ~~**Engine extraction.**~~ Done. Frame runtime, `cue()`, caption and timetable generation, TTS providers (edge-tts default, ElevenLabs, silent), transcription check via whisper.cpp or ElevenLabs. No video framework.
2. ~~**Player redesign.**~~ Done. Side panel with the live transcript and step list, segmented progress, step-by-step mode, captions overlay, light theme with system dark mode, copy buttons.
3. ~~**Cards and gallery.**~~ First 13 cards done, each with a live preview. More cards as real guides need them.
4. ~~**Sample guide.**~~ Done. "Your first diagram in MermanDraw", 1:28, built end to end with the skill. Narration checked by whisper.cpp: no mispronunciations, 0.993 similarity to the script.
5. ~~**MP4 export.**~~ Done. `scripts/render-mp4.mjs` steps the player frame by frame in headless Chromium, encodes in parallel, and lays the narration under it. Captions as an `.srt` file or burned in. The sample renders in about 40 seconds on a laptop.
6. **First release.** Plugin and Codex manifests, one entry point (`stg`), guides kept in the user's project, references for every stage. Tag 0.1.0 and open the repository.

## Related projects

- [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) makes cinematic product promos. [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) makes voiceover-driven explainers from a finished recording. script-to-guide makes the guide that comes after the promo: narrated from a script, shipped as HTML, licensed for commercial use.
- [asciinema](https://github.com/asciinema/asciinema) records terminals as text instead of pixels. script-to-guide does the same for product walkthroughs.

## License

MIT. See [LICENSE](LICENSE).

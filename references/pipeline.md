# Pipeline

Brief → script → capture → narration → scene assembly → review → build → publish.

In **co-create** mode (default) stop at the four checkpoints marked ✋ and wait for the user. In **autonomous** mode run straight through and report at the end. In **sample swap** mode start from the sample guide (below) and run the same stages.

## 0. Start a guide folder

```bash
node <skill>/scripts/stg.mjs new <name>      # ./guides/<name>/ copied from the sample; builds as is
```

Everything for one guide lives in `./guides/<name>/` of the user's project. See `guides/README.md` for the layout. Below, `stg` means `node <skill>/scripts/stg.mjs`.

## 1. Brief ✋

Write five lines in `guides/<name>/script.md` as an HTML comment at the top:

- Who watches it and what they can do afterwards (one task, not a tour).
- The product, its URL or local start command, and the demo state to capture.
- Language, voice, target length (1 to 3 minutes per guide; split longer topics).
- What on screen is sensitive and how it is replaced.
- Facts the narration will state, each with where it was checked (source file, docs page, live app).

Never state a product fact you have not checked. If the product is local, read the code.

## 2. Script ✋

Follow `script-format.md` and `narration.md`. One `## [scene]` per step the viewer takes, plus an intro and an end. Under each scene: the narration, then a `**(screen ▶ …)**` direction listing the capture and every motion with the word it is cued to.

Read the motion cards (`cards/README.md`) before writing directions. Pick at most one or two motions per sentence.

## 3. Capture

Follow `capture.md`. One capture per screen state, with element boxes in `<shot>.boxes.json`. Open states from deep links or `--click` sequences, never by acting on real data.

## 4. Narration

```bash
stg synth <name>                      # takes/, recordings/narration.mp3, data/captions.json, data/scenes.json
stg verify <name> --stt pywhispercpp
```

Fix every hit from `stg verify` through `pronunciation.json` (see `pronunciation.md`), then re-run. Only changed scenes are re-synthesized. After this step the length is fixed: do not edit narration while assembling scenes. If a sentence must change, re-run synthesis and let the cues move.

Tune `gaps.json` so each demo scene has time for its motions after the last word.

## 5. Scene assembly

`Scene.tsx` places cards and captures with `<Sequence>` per block, overlays inside one `<Screen>` per run of app scenes. Every `from`/`to`/`at` is `cue(scene, word)`, `sceneStart` or `sceneEnd`. `web.tsx` lists the steps for the panel and any copy blocks.

```bash
stg check <name>
stg build <name>
```

## 6. Review ✋

```bash
stg frames <name> --at <one or two frames per scene>
stg frames <name> --at <frame> --page          # whole player page
```

Look at every frame. Then go through `final-review.md`. Show the user the stills and the built page.

## 7. Build and publish ✋

`build.md` covers the HTML build, the zip and the MP4. Publishing (a docs site, a help center, YouTube) is the user's action; prepare the files and say where they go.

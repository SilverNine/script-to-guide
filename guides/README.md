# guides/

One folder per guide. Everything a guide needs lives here; the engine (`runtime/`, `src/`, `player/`, `scripts/`) does not know any guide by name.

```
guides/<name>/
  script.md            narration, one `## [scene-id]` section per scene, with screen directions
  guide.json           build, page, theme and tts settings (read by scripts/build-web.mjs and tts_synth.py)
  gaps.json            optional: scene-id → seconds of silence appended after the scene
  pronunciation.json   optional: on-screen spelling → spoken spelling, plus `_wrong`
  timing.ts            two lines: createTimeline(scenes.json, captions.json)
  Scene.tsx            the guide: scenes placed with cue(scene, word)
  web.tsx              default export of GuideDefinition for the player
  public/              screenshots and other static files copied into the build
  data/                written by tts_synth.py: captions.json, scenes.json
  takes/               written by tts_synth.py: per-scene mp3 + json (ignored by git)
  recordings/          written by tts_synth.py: narration.mp3 (ignored by git)
```

## script.md

```markdown
# Getting started with Example

## [intro]
Example turns a text file into a diagram.
**(screen ▶ home page, the editor pane highlighted)**

## [paste]
Paste your diagram source on the left. The preview updates as you type.
```

Lines under a `## [scene]` heading are narration. Lines that start with `**(`, `>`, `|`, `- [`, `---` or `<!--` are directions for the agent and are not spoken.

## Frames: guide frame vs. block frame

`cue()` returns a **guide frame** (from the start of the guide). Inside a `<Sequence>`, `useCurrentFrame()`
returns a **block frame** (from the start of that Sequence). Compare cues only with `useGuideFrame()`.
Use `useCurrentFrame()` for a block's own entrance animation. All overlays in
`src/components/overlays.tsx` already use guide frames.

## Overlays on a captured screen

```tsx
<Screen src={asset('screens/editor.webp')} size={B._size} url="example.com/app">
  <Spotlight box={B.editor} from={cue('s3', 'code')} to={cue('s3', 'preview')} />
  <Pin at={[x, y]} n={1} from={…} to={…} />
  <Magnifier box={B.export} from={…} to={…} zoom={3} label="Export" />
  <Cursor keys={[{ at: …, p: mid(B.export) }, { at: …, p: mid(B.export), click: true }]} />
  <Callout box={B.share} text="Share a link" from={…} to={…} />
</Screen>
```

Boxes come from `scripts/capture.mjs --box name=selector`, in the screenshot's CSS pixels.

## Steps and the player panel

`web.tsx` lists `steps` (id, label, first frame, optional `copy` strings). The player numbers them,
splits the progress bar by them, shows the live transcript under each, and pauses at each step end in
step-by-step mode. Start a step at `scene(id).fromFrame` so it never opens mid-sentence. Pass
`captions` to enable the transcript and the caption overlay; scenes do not draw captions themselves.

## timing.ts

```ts
import captions from './data/captions.json';
import scenes from './data/scenes.json';
import { createTimeline } from '../../src/lib/timing';
export const { FPS, DURATION, scene, speechStart, speechEnd, cue } = createTimeline(scenes, captions);
```

## Workflow

```bash
python3 scripts/tts_synth.py <name>            # narration.mp3, data/captions.json, data/scenes.json
python3 scripts/tts_verify.py <name>           # transcribe and compare with the script
node scripts/build-web.mjs --guide <name>      # dist/<name>/index.html
node scripts/frames.mjs --guide <name> --at 0,300,900   # review stills
node scripts/render-mp4.mjs --guide <name>     # dist/<name>.mp4 + .srt (optional)
```

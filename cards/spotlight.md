---
name: spotlight
component: Spotlight
group: focus
summary: Dim everything except the part being talked about.
---

# Spotlight

Dim everything except the part being talked about. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#spotlight).

## Intent

The viewer's eye goes where the narration points. A dimmed screen keeps context (they still see where the area sits) while removing competition. This is the default way to say "look here" in a guide.

## Use when

- The narration names an area: a pane, a panel, a form section
- Two or three areas in sequence, each lit while it is named

## Avoid when

- Controls smaller than about 40 px: the lit area is too small to read. Use a Magnifier
- More than one area at a time. Light the union box instead, or split the sentence

## Usage

```tsx
import { Spotlight } from 'script-to-guide';

<Spotlight box={B.editor} from={cue('s2', 'code')} to={cue('s2', 'preview')} padding={0} radius={4} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `box` | Area in screenshot pixels, from capture.mjs --box | required |
| `from / to` | Guide frames. Fades in over 10 frames, out over 10 | required |
| `padding` | Grow the lit area on every side | 8 |
| `radius` | Corner radius of the lit area | 12 |
| `dim` | Darkness of the rest, 0 to 1 | 0.62 |

## Known pitfalls

- Chain spotlights by ending one where the next starts (`to` of the first = `from` of the second). The fades overlap and read as the light moving.
- A pane that touches the screen edge: set `padding={0}`, or the outline is clipped on one side.
- Do not combine with `camera`; the lit box is placed before the zoom and still lines up, but two focus effects at once feel busy.

## Reference

- Component: `src/components/overlays.tsx` (`Spotlight`)
- Demo: `gallery/demos.tsx`, id `spotlight`

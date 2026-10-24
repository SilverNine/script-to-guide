---
name: camera
component: Screen camera
group: focus
summary: Move closer to one area, then back out. Use sparingly.
---

# Camera push-in

Move closer to one area, then back out. Use sparingly. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#camera).

## Intent

On a phone a 1440 px screen is tiny. A slow push-in on the area being worked on makes it readable. It costs orientation, so return to the full view when the work is done.

## Use when

- A sequence of small actions in one area (typing, a form)
- Viewers on small screens

## Avoid when

- Pointing at a single control: a Magnifier keeps context
- Moving between areas while zoomed: zoom out, then in again

## Usage

```tsx
import { Screen } from 'script-to-guide';

<Screen src={…} size={B._size} camera={[
  { at: cue('s5', 'toolbar'), box: B.toolbar },
  { at: cue('s5', 'back') },
]} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `camera[].at` | Guide frame where the move starts | required |
| `camera[].box` | Area to frame. Omit to return to the full screen | full |
| `camera[].zoom` | Scale. Default fits the box with room, between 1 and 3 | auto |
| `camera[].len` | Frames for the move | 20 |

## Known pitfalls

- The view is clamped inside the capture, so a box at the edge zooms off-center. That is intended.
- Marks inside the Screen zoom with it. A Magnifier under a camera zoom doubles the enlargement.

## Reference

- Component: `src/components/overlays.tsx` (`Screen`)
- Demo: `gallery/demos.tsx`, id `camera`

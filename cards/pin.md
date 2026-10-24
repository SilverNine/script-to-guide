---
name: pin
component: Pin
group: point
summary: A marker whose number matches a step in the player's side panel.
---

# Numbered pin

A marker whose number matches a step in the player's side panel. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#pin).

## Intent

Pins tie the screen to the step list. When step 2 in the panel says "Pick a theme", a pin with 2 on the Theme button closes the loop without words.

## Use when

- Several controls introduced in one breath
- A screen the viewer will come back to: pins make it scannable when paused

## Avoid when

- One control only: a Spotlight or Callout says more
- Numbers that do not match the panel. Use letters (`n="A"`) for sub-items inside one step

## Usage

```tsx
import { Pin } from 'script-to-guide';

<Pin at={[x, y]} n={2} from={cue('s3', 'theme')} to={sceneEnd('s3')} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `at` | Center point in screenshot pixels. Put it at a corner of the control, not on its label | required |
| `n` | Number or short text | required |
| `from / to` | Guide frames. Pops in with a spring and one ring pulse | required |
| `size` | Diameter in screenshot pixels | 34 |

## Known pitfalls

- Keep earlier pins on screen while later ones appear (`to` = scene end). Pins that vanish one by one lose their purpose.
- The white ring keeps a pin readable on dark and light UI; do not remove it to match a brand.

## Reference

- Component: `src/components/overlays.tsx` (`Pin`)
- Demo: `gallery/demos.tsx`, id `pin`

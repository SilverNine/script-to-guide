---
name: magnifier
component: Magnifier
group: focus
summary: Enlarge a small control in an inset without moving the camera.
---

# Magnifier

Enlarge a small control in an inset without moving the camera. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#magnifier).

## Intent

Toolbar buttons and settings are often 30 px tall on a 1440 px screen, unreadable on a phone. A camera zoom would lose the context. The magnifier keeps the whole screen and shows the control three times larger in the opposite corner, with a dashed box on the original.

## Use when

- Icons, small buttons, menu items, status text
- The narration says the name of a control the viewer has to find

## Avoid when

- Large areas (above about a quarter of the screen): use a Spotlight
- Two magnifiers at once

## Usage

```tsx
<Magnifier box={pad(B.export, 6)} from={cue('s4', 'export')} to={next} zoom={3} label="Export as SVG or PNG" />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `box` | Source area. `pad(box, 6)` gives the control some room | required |
| `zoom` | Scale of the inset | 3 |
| `at` | Top-left of the inset. Default: the quadrant opposite the box | auto |
| `label` | One line under the inset | none |
| `from / to` | Guide frames. The inset grows out of the source box | required |

## Known pitfalls

- The inset reads from the 2x capture, so zoom up to 3 stays sharp. Above 3, capture at a larger size instead.
- An inset over a busy area is hard to read; pass `at` to place it over empty space.
- Pair with a Cursor click on the same control, entering a few frames after the magnifier.

## Reference

- Component: `src/components/overlays.tsx` (`Magnifier`)
- Demo: `gallery/demos.tsx`, id `magnifier`

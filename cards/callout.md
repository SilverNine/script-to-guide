---
name: callout
component: Callout
group: point
summary: A short label attached to a control.
---

# Callout

A short label attached to a control. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#callout).

## Intent

Names a control when its on-screen label is an icon, abbreviated, or in another language than the guide.

## Use when

- Icon-only buttons
- A label that should outlast the sentence that names it

## Avoid when

- Full sentences. Two to four words; the narration carries the rest
- Labels that repeat text already readable on screen

## Usage

```tsx
<Callout box={B.theme} text="Seven diagram themes" from={cue('s3', 'theme')} to={next} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `box` | Control in screenshot pixels | required |
| `text` | Two to four words | required |
| `side` | below, above, left, right | below |
| `from / to` | Guide frames | required |

## Known pitfalls

- Near the screen edge, pick the side that points inward or the label is clipped.
- Callouts sit above spotlights in z-order only if written after them.

## Reference

- Component: `src/components/overlays.tsx` (`Callout`)
- Demo: `gallery/demos.tsx`, id `callout`

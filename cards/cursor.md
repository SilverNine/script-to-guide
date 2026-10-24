---
name: cursor
component: Cursor
group: point
summary: A pointer that travels to a control and clicks it.
---

# Cursor and click

A pointer that travels to a control and clicks it. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#cursor).

## Intent

Shows that something is done, not just where it is. The click ripple marks the moment of action, which the narration usually says as a verb ("press", "choose").

## Use when

- Actions: the narration says click, press, choose, open
- Leading the eye across a long distance on screen

## Avoid when

- Every mention of a control. A cursor on screen all the time becomes noise
- Typing: use TypeIn

## Usage

```tsx
<Cursor keys={[
  { at: cue('s4', 'PNG') - 10, p: mid(B.png) },
  { at: cue('s4', 'PNG') + 8, p: mid(B.png), click: true },
  { at: sceneEnd },
]} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `keys[].at` | Guide frame by which the pointer has arrived. Travel takes the 16 frames before | required |
| `keys[].p` | Point in screenshot pixels. Omit to hide the pointer | required |
| `keys[].click` | Press and ripple at this key | false |

## Known pitfalls

- Arrive before the word, click on or just after it. `at: cue - 10` then `at: cue + 8, click: true`.
- Aim at the visual center plus a few pixels (`mid(box)[0] + 4`): the arrow's tip is the hotspot.
- End with a key without `p` so the pointer fades instead of staying parked.

## Reference

- Component: `src/components/overlays.tsx` (`Cursor`)
- Demo: `gallery/demos.tsx`, id `cursor`

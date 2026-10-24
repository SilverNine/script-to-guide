---
name: screen-swap
component: Screen shots
group: change
summary: Switch to another capture when the app changes state.
---

# Screen swap

Switch to another capture when the app changes state. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#screen-swap).

## Intent

Guides are made of states: menu closed, menu open, saved. Each is one capture; the swap shows the transition. Crossfade by default, a hard cut when two screens should not appear to blend.

## Use when

- Opening a menu, a dialog, a new page
- Before and after an action

## Avoid when

- Many swaps per sentence: one per state change

## Usage

```tsx
<Screen shots={[
  { at: 0, src: asset('screens/editor.webp') },
  { at: cue('s3', 'opens'), src: asset('screens/theme-menu.webp') },
]} size={B._size} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `shots[].at` | Guide frame where the capture becomes current | required |
| `shots[].src` | Capture path through asset() | required |
| `shots[].cut` | Switch without a crossfade | false |

## Known pitfalls

- Capture both states at the same size and scroll position, or the swap jumps.
- Click on the frame before the swap (`cursor click at = swap - 4`) so cause comes before effect.
- Boxes come from the capture they were measured on; keep one boxes.json per capture.

## Reference

- Component: `src/components/overlays.tsx` (`Screen`)
- Demo: `gallery/demos.tsx`, id `screen-swap`

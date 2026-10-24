---
name: title-card
component: TitleCard
group: card
summary: The opening card, and the poster before play.
---

# Title card

The opening card, and the poster before play. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#title-card).

## Intent

Says what the guide is and how long it takes. The player shows the `poster` frame before play, so this card is also the thumbnail.

## Use when

- The first scene of every guide

## Avoid when

- Repeating the title card mid-guide: use a Chapter card

## Usage

```tsx
<TitleCard kicker="Product guide" title="Your first diagram" subtitle="Two minutes" />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `title` | Up to about 30 characters on one line | required |
| `subtitle` | What the viewer will be able to do, and how long | none |
| `kicker` | Product or series name | none |
| `tone` | dark or light | dark |

## Known pitfalls

- Set the guide's `poster` to a frame after the entrance animation (about frame 30), or the thumbnail is empty.

## Reference

- Component: `src/components/cards.tsx` (`TitleCard`)
- Demo: `gallery/demos.tsx`, id `title-card`

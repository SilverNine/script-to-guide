---
name: chapter-card
component: ChapterCard
group: card
summary: A break between parts, with the whole list for orientation.
---

# Chapter card

A break between parts, with the whole list for orientation. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#chapter-card).

## Intent

In guides longer than about two minutes, viewers lose track. A two-second card with the chapter list says where they are and what is left.

## Use when

- Guides with three or more steps over two minutes
- Between steps the viewer might jump to

## Avoid when

- Short guides: the side panel already shows the steps

## Usage

```tsx
import { ChapterCard } from 'script-to-guide';

<ChapterCard n={2} title="Pick a theme" all={['Write', 'Pick a theme', 'Export', 'Share']} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `n` | Chapter number, matching the step number | required |
| `title` | Chapter title | required |
| `sub` | One line under the title | none |
| `all` | All chapter titles; the current one is lit | none |
| `tone` | dark or light | dark |

## Known pitfalls

- Place it in the silence between scenes (use gaps.json to make room), never over narration.
- Start the step in web.tsx at the card, so jumping to a step shows its card first.

## Reference

- Component: `src/components/cards.tsx` (`ChapterCard`)
- Demo: `gallery/demos.tsx`, id `chapter-card`

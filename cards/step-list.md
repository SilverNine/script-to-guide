---
name: step-list
component: StepList
group: card
summary: A list that lights one item per spoken step.
---

# Step list

A list that lights one item per spoken step. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#step-list).

## Intent

For overviews and summaries: "three things to try". Items are present but dim from the start so the list never jumps; each one lights on its word.

## Use when

- The guide's overview after the title
- A summary at the end

## Avoid when

- More than five items
- Items that are full sentences

## Usage

```tsx
import { StepList } from 'script-to-guide';

<StepList title="Three things to try" items={['Paste', 'Theme', 'Share']}
  at={[cue('s1', 'paste'), cue('s1', 'theme'), cue('s1', 'share')]} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `items` | Short labels | required |
| `at` | Guide frame per item | required |
| `title` | Heading | none |
| `tone` | dark or light | dark |

## Known pitfalls

- Cue each item on the word that names it, not on the start of its sentence.

## Reference

- Component: `src/components/cards.tsx` (`StepList`)
- Demo: `gallery/demos.tsx`, id `step-list`

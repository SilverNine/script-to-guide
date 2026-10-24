---
name: dialog
component: Dialog
group: change
summary: A neutral confirm dialog for screens you cannot capture.
---

# Drawn dialog

A neutral confirm dialog for screens you cannot capture. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#dialog).

## Intent

Operating system prompts, permission sheets and browser dialogs often cannot be captured headlessly. The drawn dialog stands in for them. It is neutral on purpose: it reads as "a dialog" without imitating a specific operating system.

## Use when

- Permission prompts, confirmations, OS sheets

## Avoid when

- Imitating another product's exact UI or branding
- Dialogs of your own app: capture those

## Usage

```tsx
import { Dialog } from 'script-to-guide';

<Dialog title="Allow clipboard access?" primary="Allow" secondary="Not now"
  from={cue('s2', 'asks')} pressAt={cue('s2', 'allow')} backdrop={<Screen … />} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `title / body` | Dialog text | required / none |
| `primary / secondary` | Button labels | required / none |
| `from` | Guide frame where it appears | required |
| `pressAt` | Guide frame where the primary button is pressed; the dialog then closes | none |
| `backdrop` | What is behind it, usually a Screen | none |
| `tone` | light or dark | light |

## Known pitfalls

- Say in the script that the dialog is drawn (a screen direction, not narration), so reviewers know it is not a capture.
- Match the real wording of the prompt exactly; viewers look for those words.

## Reference

- Component: `src/components/cards.tsx` (`Dialog`)
- Demo: `gallery/demos.tsx`, id `dialog`

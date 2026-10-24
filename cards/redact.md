---
name: redact
component: Redact
group: focus
summary: Blur or block anything that must not be readable.
---

# Redact

Blur or block anything that must not be readable. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#redact).

## Intent

The rule is demo data only. Redact is the second line: for the account name in a corner, the ID in a URL bar, anything that slipped into a capture.

## Use when

- Anything personal, internal or secret visible in a capture
- Third-party content you may not publish

## Avoid when

- As the main privacy measure. Re-capture with demo data instead

## Usage

```tsx
import { Redact } from 'script-to-guide';

<Redact box={B.accountName} mode="blur" />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `box` | Area to hide | required |
| `mode` | blur (keeps the shape) or block (solid) | blur |
| `label` | Short text on top, e.g. HIDDEN | none |
| `from / to` | Guide frames. Default: always | always |

## Known pitfalls

- Blur hides text at normal sizes but not large single characters; use `block` for short codes and numbers.
- The capture file still contains the original pixels. If the guide is published with its assets, block is not enough: re-capture.

## Reference

- Component: `src/components/overlays.tsx` (`Redact`)
- Demo: `gallery/demos.tsx`, id `redact`

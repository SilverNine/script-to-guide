---
name: type-in
component: TypeIn
group: change
summary: Text typed into a field, with a caret.
---

# Type in

Text typed into a field, with a caret. [Live preview](https://silvernine.github.io/script-to-guide/gallery/#type-in).

## Intent

Shows what to enter without recording the screen. The field is drawn over the capture at the input's box, so the text can be anything, including values that never existed in the demo data.

## Use when

- Forms, search boxes, code editors
- Values the viewer will copy: also add them to the step's `copy` list in web.tsx

## Avoid when

- Long text: more than about 40 characters reads slower than the narration
- Passwords shown in clear: set `secret` so dots are drawn

## Usage

```tsx
<TypeIn box={B.search} text="sequence diagram" from={cue('s2', 'type')} cps={14} />
```

## Parameters

| Prop | Meaning | Default |
|---|---|---|
| `box` | The input's box | required |
| `text` | What is typed | required |
| `cps` | Characters per second | 14 |
| `tone` | light or dark, to match the field | light |
| `secret` | Draw dots instead of characters | false |
| `mono, fontSize` | Match the app's field | false, 15 |

## Known pitfalls

- The drawn field covers the captured one, so capture the field empty or with a placeholder that matches.
- A camera push-in on the field (see Camera) makes small text readable on phones.

## Reference

- Component: `src/components/overlays.tsx` (`TypeIn`)
- Demo: `gallery/demos.tsx`, id `type-in`

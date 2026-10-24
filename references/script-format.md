# Script format

`guides/<name>/script.md` is the source of truth. Narration, captions, the scene timetable and every cue derive from it.

```markdown
# Title of the guide

<!-- brief and checked facts: not spoken -->

## [intro]
This guide shows you how to make your first diagram. It takes about two minutes.
**(screen ▶ title card)**

## [write]
Open the editor. The code goes on the left. The preview on the right redraws while you type.
**(screen ▶ write.webp: spotlight code pane on "left", preview on "right")**
```

## Scenes

- `## [scene-id]`: lowercase letters, digits and hyphens. The id is what `cue()`, `sceneStart()` and `gaps.json` use.
- One scene per action the viewer takes. An intro and an end scene frame them.
- Scenes are synthesized one by one and cached, so changing one sentence re-times one scene.

## What is spoken

Every line under a scene heading is narration, except lines starting with `**(`, `>`, `|`, `- [`, `---` or `<!--`. Those are directions for the agent.

## Directions

`**(screen ▶ …)**` says which capture or card is on screen and which motion is cued to which word. Name the word in quotes when it is ambiguous. Directions are the plan that `Scene.tsx` implements; keep them in sync.

## Cue words

`cue(scene, phrase, nth = 0)` finds the first word of `phrase` in that scene's captions. Quotes, brackets and punctuation around words are ignored, and `nth` is 0-based (1 is the second occurrence). Write narration so each motion has a distinct word to land on: "press **Link**", not "press it". A phrase that does not occur throws when the guide loads, never silently: `stg frames` shows the error, and so does the browser console.

## What the agent may not invent

- Product facts: names of buttons, counts, limits, prices, what is stored. Check each in the source or the live app and note where in the brief.
- Promises the product does not make ("secure", "instant", "free forever").
- Screens that were not captured. A drawn screen is marked as drawn in the direction.

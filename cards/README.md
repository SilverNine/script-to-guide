# Motion cards

One card per motion a guide can use. Each card says when to use it, when not to, its parameters, and the pitfalls found while making real guides. Every card has a live preview in the [gallery](https://silvernine.github.io/script-to-guide/gallery/).

The agent reads the card before using a motion, and copies the card's pitfalls into its plan for that scene.

| Card | Group | What it does |
|---|---|---|
| [Spotlight](spotlight.md) | Focus | Dim everything except the part being talked about. |
| [Numbered pin](pin.md) | Point | A marker whose number matches a step in the player's side panel. |
| [Magnifier](magnifier.md) | Focus | Enlarge a small control in an inset without moving the camera. |
| [Cursor and click](cursor.md) | Point | A pointer that travels to a control and clicks it. |
| [Callout](callout.md) | Point | A short label attached to a control. |
| [Type in](type-in.md) | Change | Text typed into a field, with a caret. |
| [Screen swap](screen-swap.md) | Change | Switch to another capture when the app changes state. |
| [Camera push-in](camera.md) | Focus | Move closer to one area, then back out. Use sparingly. |
| [Redact](redact.md) | Focus | Blur or block anything that must not be readable. |
| [Title card](title-card.md) | Card | The opening card, and the poster before play. |
| [Chapter card](chapter-card.md) | Card | A break between parts, with the whole list for orientation. |
| [Step list](step-list.md) | Card | A list that lights one item per spoken step. |
| [Drawn dialog](dialog.md) | Change | A neutral confirm dialog for screens you cannot capture. |

Groups: **Point** says where, **Focus** says what to look at, **Change** shows a state change, **Card** fills the whole stage.

## Rules that apply to every card

- Frames come from `cue(scene, word)`. Never type a frame number into a guide.
- Overlays compare cues with the guide frame. Inside a `<Sequence>`, use `useGuideFrame()`, not `useCurrentFrame()`, for anything tied to a cue.
- Boxes are screenshot CSS pixels written by `scripts/capture.mjs --box`.
- One focus effect at a time: a Spotlight, a Magnifier or a camera move, not two together.

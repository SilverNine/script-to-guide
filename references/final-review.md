# Final review

Go through this before showing the guide to anyone. Each item is a yes or a fix.

## Narration

- [ ] `stg verify`: no known mispronunciations. Similarity steady against the last run.
- [ ] Every product fact in the narration is checked against the source or the live app, with the place noted in the brief.
- [ ] No marketing words, no promises the product does not make.

## Screen

- [ ] One or two stills per scene with `stg frames`, looked at one by one.
- [ ] No real data on any capture. Search the captures for names, emails, phone numbers, keys.
- [ ] Every overlay lands on the element the narration names, on the word it names.
- [ ] Nothing is cut at the stage edge: labels, callouts, magnifier lenses.
- [ ] Each demo scene's motions finish before the next scene starts.
- [ ] Captures swap on the click that causes them, not before.

## Player

- [ ] Played once end to end with sound.
- [ ] Step-by-step mode stops at each step's end, Continue resumes.
- [ ] Step labels match the narration. Copy blocks contain exactly what the viewer should paste.
- [ ] The page reads at 400 px wide and in dark mode (`stg frames <name> --at <f> --page --width 400`, `--dark`).

## Build

- [ ] `stg check <name>` clean.
- [ ] The build is under about 2 MB; `build.limits` passes for the host it goes to.
- [ ] If an MP4 ships: first and last second, and every screen change, scrubbed once.

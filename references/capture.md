# Capture

Real screens come from the real app, captured headless at 2x so zooms stay sharp.

```bash
node <skill>/scripts/stg.mjs capture --url <url> --out guides/<name>/public/screens/<shot>.webp \
  --size 1440x810 --box editor=.cm-editor --box save='button:has-text("Save")'
node <skill>/scripts/stg.mjs capture --url <url> --probe        # list visible controls with their boxes
```

## Before the first capture

- Run the app in a demo state: demo account, demo data, no customer, personal, internal or live data. If a value would be sensitive in a screenshot, replace it in the app before capture, or cover it with `<Redact>`.
- Prefer deep links that open a state directly (URL hash, query, seeded route) over clicking through. They are repeatable.
- Never trigger actions with side effects on a live service (share, publish, send, pay). Capture the state before the click and show the click with `<Cursor>`.

## Boxes

`--box name=selector` writes the element's box in CSS pixels to `<shot>.boxes.json`, merged with earlier runs. `Scene.tsx` imports that file and passes boxes to overlays. Regions with no selector (part of a code line, a node in a canvas) are measured once on the capture and written as constants with a comment saying how they were measured.

## Options

- `--click <selector>` runs before the capture, in order (open a menu, switch a tab).
- `--grant clipboard-read,clipboard-write` grants permissions first.
- `--wait <ms>` waits after load (default 1500).
- `.webp` needs `cwebp`; `.png` needs nothing.

## Drawn screens

When a screen cannot be captured (an OS dialog, a third-party window), draw it with `<Dialog>` or a component, and say "drawn" in the script direction. Never draw a screen of the product itself.

## Size

Keep every capture of one guide at the same CSS size (1440x810 fits a 1920x1080 stage with the URL pill). A `<Screen>` with several shots assumes one size.

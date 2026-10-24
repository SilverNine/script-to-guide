# Build and export

Two outputs from one timeline. Build the HTML first; the MP4 is rendered from that build.

## HTML

```bash
node scripts/build-web.mjs --guide <name> [--out <folder>] [--zip]
```

- Output: `<out>/<name>/` with `index.html`, `app.js`, the captures and the narration. Open `index.html` from any static host.
- `guide.json` `build` decides what is copied: `copy` (captures), `audio` (re-encoded by ffmpeg at `bitrate`), `captions`, `chars` (folders whose text sets the font subset).
- `build.limits` (`zipMB`, `fileMB`, `files`) fails the build when it would break a host's upload limits. Keep the guide near 2 MB.
- `--zip` also writes `<name>.zip` for upload to a help center or LMS.

## MP4

```bash
node scripts/render-mp4.mjs --guide <name> [--out dist/<name>.mp4] [--captions srt|burn|none] [--workers 4] [--crf 18]
```

- The player is the renderer. Each worker opens the build in headless Chromium in stage-only mode (`?still`), calls `window.__seek(frame)` for every frame, and pipes JPEG screenshots to its own x264 encoder. The segments are joined without re-encoding and the narration goes under them as AAC.
- 1920x1080 at the guide's fps, H.264 `yuv420p` with `+faststart`, the most widely accepted MP4 profile.
- `--captions srt` (default) writes `<name>.srt` beside the video with the same sentences the player shows. Upload it to YouTube as a subtitle track. `burn` draws them into the picture instead, for places that cannot load a subtitle file.
- `--from` and `--to` render a frame range, with the narration cut to match. Use them to check one scene quickly.
- Anything on the stage must be a function of the frame. A CSS transition or a timer inside a scene renders as a jump, because the renderer never waits wall-clock time between frames.

## Checks before publishing

1. `python3 scripts/tts_verify.py <name>`: no known mispronunciations, similarity steady between runs.
2. `node scripts/frames.mjs --guide <name> --at <one frame per scene>`: look at every scene.
3. Play the HTML once end to end with sound, in step-by-step mode.
4. If you ship the MP4, scrub it once: the first and last second, and every screen change.

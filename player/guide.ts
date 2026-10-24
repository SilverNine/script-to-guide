import type { ComponentType } from 'react';

/**
 * What the player receives from one guide.
 *
 * Each guide exports this shape as default from `guides/<name>/web.tsx`. At build time
 * `scripts/build-web.mjs --guide <name>` aliases `@guide` to that file; `player/main.tsx` reads
 * nothing else. Build settings (output folder, files to copy, font, theme) live in
 * `guides/<name>/guide.json`.
 */
export interface TocItem {
  /** `?ch=<id>` opens the guide at this chapter */
  id: string;
  label: string;
  /** First frame of the chapter */
  at: number;
}

export interface GuideDefinition {
  /** VideoConfig id */
  id: string;
  Scene: ComponentType;
  fps: number;
  durationInFrames: number;
  /** Resolves an image or audio path for the current host (see player/assets.ts) */
  asset: (p: string) => string;
  /** Narration path. Without it the player runs on a wall clock from frame 0 */
  audio?: string;
  /** Frame shown before playback starts */
  poster: number;
  toc: TocItem[];
  title: string;
  subtitle: string;
  note?: string;
  /** Images to decode before the player reports ready (paths relative to the output folder) */
  preload: string[];
  /** Color of the letterbox around the 1920x1080 stage */
  stage: string;
}

import type { ComponentType } from 'react';
import type { RawCaptionsJson } from '../src/lib/captions';

/**
 * What the player receives from one guide.
 *
 * Each guide exports this shape as default from `guides/<name>/web.tsx`. At build time
 * `scripts/build-web.mjs --guide <name>` aliases `@guide` to that file; `player/main.tsx` reads
 * nothing else. Build settings (output folder, files to copy, font, theme) live in
 * `guides/<name>/guide.json`.
 */
/** The player's own words (buttons, poster, step-by-step card, key hints) */
export interface PlayerText {
  steps: (n: number) => string;
  stepByStep: string;
  stepByStepTitle: string;
  stepDone: (n: number) => string;
  tryIt: string;
  stepN: (n: number, label: string) => string;
  replay: string;
  keys: [string, string][];
  play: string;
  pause: string;
}

export interface Step {
  /** `?ch=<id>` opens the guide at this step */
  id: string;
  /** Short title shown in the step list and on the stage tag. The player numbers steps itself */
  label: string;
  /** First frame of the step */
  at: number;
  /** Text the viewer may want to paste (commands, values, code). Rendered as copy buttons under the step */
  copy?: string[];
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
  /** Word timings from tts_synth.py. Enables the live transcript and the caption overlay */
  captions?: RawCaptionsJson;
  /** Frame shown before playback starts */
  poster: number;
  steps: Step[];
  title: string;
  subtitle: string;
  note?: string;
  /** Images to decode before the player reports ready (paths relative to the output folder) */
  preload: string[];
  /** Color of the letterbox around the 1920x1080 stage */
  stage: string;
  /** The player's own words. Defaults follow guide.json page.lang (en, ko); override any of them here */
  ui?: Partial<PlayerText>;
}

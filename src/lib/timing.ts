import type { RawCaptionsJson } from './captions';

/**
 * Timeline of a guide: scene boundaries plus word timestamps, both written by scripts/tts_synth.py.
 *
 * Every motion in a scene is placed with `cue(scene, word)`. Nobody types a frame number by hand:
 * when the narration is re-synthesized only hand-typed numbers would silently drift. A cue that
 * cannot be found throws, so the build stops instead of shipping a misplaced highlight.
 */

export interface SceneTime {
  scene: string;
  fromFrame: number;
  toFrame: number;
  speechFromMs: number;
  speechToMs: number;
  gapSec: number;
}

export interface ScenesJson {
  fps: number;
  durationInFrames: number;
  scenes: SceneTime[];
}

export interface Timeline {
  FPS: number;
  DURATION: number;
  SCENES: SceneTime[];
  scene: (id: string) => SceneTime;
  /** Frame where the scene's narration starts */
  speechStart: (id: string) => number;
  /** Frame where the scene's narration ends */
  speechEnd: (id: string) => number;
  /** First frame of the scene, including the silence before its first word */
  sceneStart: (id: string) => number;
  /** Last frame of the scene, including its trailing silence from gaps.json */
  sceneEnd: (id: string) => number;
  /**
   * Frame of the word that starts with `phrase` inside scene `id`. Quotes, brackets and punctuation
   * around words are ignored. Several words separated by spaces must appear in sequence.
   * `nth` is 0-based: 0 is the first occurrence, 1 the second. Throws when the phrase is not there.
   */
  cue: (id: string, phrase: string, nth?: number) => number;
}

/** A word without the quotes, brackets and punctuation around it */
const bare = (s: string) => s.trim().replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');

interface Word {
  text: string;
  ms: number;
}

export const createTimeline = (scenesJson: ScenesJson, captionsJson: RawCaptionsJson): Timeline => {
  const FPS = scenesJson.fps;
  const DURATION = scenesJson.durationInFrames;
  const SCENES = scenesJson.scenes;

  const scene = (id: string): SceneTime => {
    const s = SCENES.find((x) => x.scene === id);
    if (!s) throw new Error(`Unknown scene: ${id}`);
    return s;
  };

  const speechEnd = (id: string) => Math.round((scene(id).speechToMs / 1000) * FPS);
  const speechStart = (id: string) => Math.round((scene(id).speechFromMs / 1000) * FPS);

  const WORDS: Word[] = captionsJson.transcription
    .map((w) => ({ text: bare(w.text), ms: w.offsets.from }))
    .filter((w) => w.text.length > 0);

  const cue = (id: string, phrase: string, nth = 0): number => {
    const s = scene(id);
    const toks = phrase.split(/\s+/).map(bare).filter(Boolean);
    let seen = 0;
    for (let i = 0; i < WORDS.length; i++) {
      const w = WORDS[i];
      if (w.ms < s.speechFromMs || w.ms > s.speechToMs + 50) continue;
      const hit = toks.every((t, k) => WORDS[i + k] && WORDS[i + k].text.startsWith(t));
      if (!hit) continue;
      if (seen === nth) return Math.round((w.ms / 1000) * FPS);
      seen += 1;
    }
    throw new Error(`Cue not found: scene ${id}, "${phrase}" #${nth}`);
  };

  const sceneStart = (id: string) => scene(id).fromFrame;
  const sceneEnd = (id: string) => scene(id).toFrame;

  return { FPS, DURATION, SCENES, scene, speechStart, speechEnd, sceneStart, sceneEnd, cue };
};

import type { GuideDefinition } from '../../player/guide';
import { asset } from '../../player/assets';
import { Scene } from './Scene';
import { captions, DURATION, FPS, sceneStart } from './timing';

const guide: GuideDefinition = {
  id: 'hello',
  Scene,
  fps: FPS,
  durationInFrames: DURATION,
  asset,
  audio: 'narration.mp3',
  captions,
  poster: 30,
  steps: [
    { id: 'intro', label: 'A guide that talks', at: 0 },
    { id: 'cue', label: 'Cued to words', at: sceneStart('cue') },
    { id: 'editor', label: 'On a real app', at: sceneStart('editor'), copy: ['flowchart LR\n  A[Script] --> B[Guide]'] },
  ],
  title: 'Hello, script-to-guide',
  subtitle: 'Smoke test · 3 steps',
  note: 'Narration by a free Edge neural voice. The app screen is mermandraw.com, captured with scripts/capture.mjs.',
  preload: __IMAGES__,
  stage: '#0b0f17',
};

export default guide;

import type { GuideDefinition } from '../../player/guide';
import { asset } from '../../player/assets';
import { Scene } from './Scene';
import { DURATION, FPS, speechEnd } from './timing';

const guide: GuideDefinition = {
  id: 'hello',
  Scene,
  fps: FPS,
  durationInFrames: DURATION,
  asset,
  audio: 'narration.mp3',
  poster: 30,
  toc: [
    { id: 'intro', label: '00 Intro', at: 0 },
    { id: 'cue', label: '01 Cues', at: speechEnd('intro') + 18 },
  ],
  title: 'Hello, script-to-guide',
  subtitle: 'smoke test · two scenes',
  note: 'Narration synthesized with a free Edge neural voice. Every motion is cued to a word.',
  preload: __IMAGES__,
  stage: '#0b0f17',
};

export default guide;

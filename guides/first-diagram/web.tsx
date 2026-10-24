import { type GuideDefinition, asset } from 'script-to-guide';
import { Scene } from './Scene';
import { captions, DURATION, FPS, sceneStart } from './timing';

const DIAGRAM = `flowchart TD
    A[Write a script] --> B[Capture screens]
    B --> C[Synthesize narration]
    C --> D{Sounds right?}
    D -->|No| A
    D -->|Yes| E[Publish the guide]`;

const guide: GuideDefinition = {
  id: 'first-diagram',
  Scene,
  fps: FPS,
  durationInFrames: DURATION,
  asset,
  audio: 'narration.mp3',
  captions,
  poster: 40,
  steps: [
    { id: 'overview', label: 'What you will do', at: 0 },
    { id: 'write', label: 'Write the code', at: sceneStart('write'), copy: [DIAGRAM] },
    { id: 'theme', label: 'Pick a theme', at: sceneStart('theme') },
    { id: 'export', label: 'Export the picture', at: sceneStart('export') },
    { id: 'link', label: 'Send a link', at: sceneStart('link') },
    { id: 'end', label: 'Try it', at: sceneStart('end'), copy: ['https://mermandraw.com/app/editor/'] },
  ],
  title: 'Your first diagram in MermanDraw',
  subtitle: 'Sample guide made with script-to-guide',
  note:
    'Narration by a free Edge neural voice (en-US-AriaNeural). Screens are mermandraw.com, captured from deep links with demo content. ' +
    'Made with script-to-guide: the script, captures and scenes for this guide are in guides/first-diagram.',
  preload: __IMAGES__,
  stage: '#0b0f17',
};

export default guide;

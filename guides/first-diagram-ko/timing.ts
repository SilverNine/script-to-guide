import captions from './data/captions.json';
import scenes from './data/scenes.json';
import { createTimeline } from 'script-to-guide';

export const { FPS, DURATION, scene, speechStart, speechEnd, sceneStart, sceneEnd, cue } = createTimeline(scenes, captions);
export { captions };

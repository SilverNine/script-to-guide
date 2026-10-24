import captions from './data/captions.json';
import scenes from './data/scenes.json';
import { createTimeline } from '../../src/lib/timing';

export const { FPS, DURATION, scene, speechStart, speechEnd, cue } = createTimeline(scenes, captions);
export { captions };

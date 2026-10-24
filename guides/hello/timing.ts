import captions from './data/captions.json';
import scenes from './data/scenes.json';
import { createTimeline } from 'script-to-guide';

export const { FPS, DURATION, scene, speechStart, speechEnd, cue } = createTimeline(scenes, captions);
/** First frame of a scene, including the silence before its first word */
export const sceneStart = (id: string) => scene(id).fromFrame;
export { captions };

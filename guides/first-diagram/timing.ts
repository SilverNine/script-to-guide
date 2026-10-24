import captions from './data/captions.json';
import scenes from './data/scenes.json';
import { createTimeline } from '../../src/lib/timing';

export const { FPS, DURATION, scene, speechStart, speechEnd, cue } = createTimeline(scenes, captions);
/** First frame of a scene, including the silence before its first word */
export const sceneStart = (id: string) => scene(id).fromFrame;
/** Last frame of a scene, including its trailing silence */
export const sceneEnd = (id: string) => scene(id).toFrame;
export { captions };

/**
 * The public API a guide imports as `script-to-guide`. The build aliases it to this file, so a guide
 * folder can live anywhere (inside the user's project) and never imports engine files by path.
 * Frame hooks and primitives come from `guide-runtime`.
 */
export * from './components/overlays';
export * from './components/cards';
export { createTimeline } from './lib/timing';
export type { SceneTime, ScenesJson, Timeline } from './lib/timing';
export { bodyFontFamily, codeFontFamily } from './theme/fonts';
export { asset } from '../player/assets';
export type { GuideDefinition, Step } from '../player/guide';

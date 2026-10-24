/** Injected by scripts/build-web.mjs */
declare const __IMAGES__: string[];

/** Aliased by scripts/build-web.mjs to guides/<name>/web.tsx */
declare module '@guide' {
  import type { GuideDefinition } from 'player/guide';
  const guide: GuideDefinition;
  export default guide;
}

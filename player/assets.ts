/**
 * Asset paths.
 *
 * A host that re-uploads the guide's files under different names can set
 * `window.__GUIDE_ASSETS__ = { "screens/home.webp": "https://cdn/..." }` before app.js runs.
 * Without a map, paths are used as written, relative to index.html.
 */
type W = { __GUIDE_ASSETS__?: Record<string, string> };

export const asset = (p: string): string => {
  const w = (typeof window !== 'undefined' ? window : undefined) as (W & Window) | undefined;
  return (w?.__GUIDE_ASSETS__ && w.__GUIDE_ASSETS__[p]) || p;
};

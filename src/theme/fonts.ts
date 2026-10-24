/**
 * Font families used on the stage.
 *
 * The player page defines `--font-body` and `--font-code` in index.html. The build script embeds a
 * subset of the guide's body font (only the characters that appear in the guide) as woff2, so the
 * guide renders the same offline and inside sandboxed embeds that cannot reach a font CDN.
 */
export const bodyFontFamily = 'var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
export const codeFontFamily = 'var(--font-code, ui-monospace, Menlo, Consolas, monospace)';

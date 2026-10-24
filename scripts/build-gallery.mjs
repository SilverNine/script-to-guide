#!/usr/bin/env node
/**
 * Build the motion gallery: dist/gallery/index.html, every card's demo playing live.
 *
 *   node scripts/build-gallery.mjs [--out dist]
 *
 * Same runtime as the guide player, so what the gallery shows is what a guide renders.
 */
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const i = process.argv.indexOf('--out');
const outRoot = path.resolve(i > 0 ? process.argv[i + 1] : 'dist');
const dir = path.join(outRoot, 'gallery');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

await esbuild.build({
  entryPoints: ['gallery/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [
    {
      name: 'guide-alias',
      setup(b) {
        b.onResolve({ filter: /^guide-runtime$/ }, () => ({ path: path.join(ROOT, 'runtime/index.tsx') }));
      },
    },
  ],
  outfile: path.join(dir, 'app.js'),
  logLevel: 'warning',
});
cpSync('gallery/index.html', path.join(dir, 'index.html'));
if (existsSync('gallery/public')) cpSync('gallery/public', dir, { recursive: true, filter: (src) => !src.endsWith('.boxes.json') && !src.endsWith('.capture.png') });

const size = (p) => (statSync(p).isDirectory() ? 0 : statSync(p).size);
console.log(`gallery → ${dir} (app.js ${(size(path.join(dir, 'app.js')) / 1024).toFixed(0)} KB)`);

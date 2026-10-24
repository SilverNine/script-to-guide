#!/usr/bin/env node
/**
 * Screenshot a built guide for review.
 *
 *   node scripts/frames.mjs --guide <name> --at 0,450,1200 [--page] [--dark] [--width 1440] [--out <folder>] [--dist <folder>]
 *
 * Serves the built guide folder (dist/<name> by default) on a local port and opens it in headless
 * Chromium. Default: the stage only (`?f=<frame>&still`) at 1920x1080, one PNG per frame.
 * `--page`: the whole player page at the given width, holding that frame (panel, controls, transcript).
 * `--dark`: emulate prefers-color-scheme: dark.
 * No video framework involved: the player is the renderer.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { outPath } from './lib/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i < 0 ? def : args[i + 1];
};
const has = (name) => args.includes(name);
const GUIDE_ARG = opt('--guide');
/** a guide name or folder; the build lives at <dist>/<folder name> */
const NAME = GUIDE_ARG && path.basename(path.resolve(GUIDE_ARG));
const AT = (opt('--at', '0') || '0').split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
const PAGE = has('--page');
const DARK = has('--dark');
const WIDTH = Number(opt('--width', '1440'));
if (!NAME) {
  console.error('usage: node scripts/frames.mjs --guide <name> --at 0,450,1200 [--page] [--dark] [--width 1440] [--out <folder>] [--dist <folder>]');
  process.exit(1);
}
const dist = path.join(outPath(opt('--dist', 'dist')), NAME);
const out = outPath(opt('--out', path.join('dist', 'frames')));
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error(`not built: ${dist} (run scripts/build-web.mjs --guide ${NAME} first)`);
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const p = path.join(dist, rel);
  if (!p.startsWith(dist) || !existsSync(p) || statSync(p).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: PAGE ? { width: WIDTH, height: 900 } : { width: 1920, height: 1080 },
  deviceScaleFactor: PAGE ? 2 : 1,
  colorScheme: DARK ? 'dark' : 'light',
});
for (const f of AT) {
  await page.goto(`http://127.0.0.1:${port}/index.html?f=${f}${PAGE ? '' : '&still'}`);
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 30000 });
  await page.waitForTimeout(PAGE ? 400 : 80);
  const tag = `${PAGE ? `page${WIDTH}${DARK ? '-dark' : ''}-` : ''}${String(f).padStart(5, '0')}`;
  const file = path.join(out, `${NAME}-${tag}.png`);
  await page.screenshot({ path: file, fullPage: PAGE });
  console.log(file);
}
await browser.close();
server.close();

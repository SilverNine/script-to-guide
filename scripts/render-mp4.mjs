#!/usr/bin/env node
/**
 * Render a built guide to MP4.
 *
 *   node scripts/render-mp4.mjs --guide <name> [--out <file.mp4>] [--dist <folder>] [--workers 4]
 *                               [--captions srt|burn|none] [--crf 18] [--from <frame>] [--to <frame>]
 *
 * The player is the renderer. Each worker opens the built guide in headless Chromium in stage-only
 * mode, steps it frame by frame through `window.__seek(n)`, and pipes the screenshots to its own
 * ffmpeg encoder. The segments are joined without re-encoding and the narration is laid under them.
 * No video framework involved, and what you get is exactly what the HTML player shows.
 *
 * Captions: `srt` (default) writes <out>.srt next to the video with the player's own sentences, which
 * YouTube and most players accept. `burn` draws them into the picture. `none` skips them.
 *
 * Needs: a build (scripts/build-web.mjs), ffmpeg on PATH, Playwright's Chromium.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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
const GUIDE_ARG = opt('--guide');
/** a guide name or folder; the build lives at <dist>/<folder name> */
const NAME = GUIDE_ARG && path.basename(path.resolve(GUIDE_ARG));
if (!NAME) {
  console.error('usage: node scripts/render-mp4.mjs --guide <name> [--out <file.mp4>] [--workers 4] [--captions srt|burn|none] [--crf 18] [--from <frame>] [--to <frame>]');
  process.exit(1);
}
const num = (name, def) => {
  const v = opt(name, def);
  const n = Number(v);
  if (v === undefined || !Number.isFinite(n) || n < 0) {
    console.error(`${name} needs a number, got ${v}`);
    process.exit(1);
  }
  return n;
};
const WORKERS = Math.max(1, Math.floor(num('--workers', String(Math.min(4, Math.max(1, os.cpus().length - 2))))));
const CAPTIONS = opt('--captions', 'srt');
if (!['srt', 'burn', 'none'].includes(CAPTIONS)) {
  console.error('--captions must be srt, burn or none');
  process.exit(1);
}
const CRF = String(num('--crf', '18'));
const dist = path.join(outPath(opt('--dist', 'dist')), NAME);
const OUT = outPath(opt('--out', path.join('dist', `${NAME}.mp4`)));
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error(`not built: ${dist} (run: stg build ${GUIDE_ARG})`);
  process.exit(1);
}
if (spawnSync('ffmpeg', ['-version']).status !== 0) {
  console.error('ffmpeg not found on PATH (brew install ffmpeg / apt-get install ffmpeg)');
  process.exit(1);
}

// ---------- serve the build ----------

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  } catch {
    rel = '';
  }
  const p = path.join(dist, rel);
  if (!rel || !p.startsWith(dist + path.sep) || !existsSync(p) || statSync(p).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_BASE = `http://127.0.0.1:${server.address().port}/index.html?still${CAPTIONS === 'burn' ? '&cc' : ''}`;

const browser = await chromium.launch();
const open = async (frame) => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${URL_BASE}&f=${frame}`);
  await page.waitForFunction(() => window.__READY__ === true && typeof window.__seek === 'function', null, { timeout: 60000 });
  return page;
};

const probe = await open(0);
const META = await probe.evaluate(() => window.__META__);
const SUBS = await probe.evaluate(() => window.__SUBS__);
await probe.close();

const FPS = META.fps;
const FROM = Math.floor(num('--from', '0'));
const TO = Math.min(META.durationInFrames, Math.floor(num('--to', String(META.durationInFrames))));
if (!(TO > FROM)) {
  console.error(`empty range: ${FROM}..${TO}`);
  process.exit(1);
}

// ---------- render: one page and one encoder per worker ----------

const tmp = mkdtempSync(path.join(os.tmpdir(), `stg-${NAME}-`));
const total = TO - FROM;
const per = Math.ceil(total / WORKERS);
const chunks = [];
for (let a = FROM; a < TO; a += per) chunks.push([a, Math.min(TO, a + per)]);

let done = 0;
let lastPct = -1;
const t0 = Date.now();
const tick = () => {
  done++;
  const pct = Math.floor((done / total) * 20) * 5;
  if (pct !== lastPct) {
    lastPct = pct;
    const s = (Date.now() - t0) / 1000;
    process.stdout.write(`  ${String(pct).padStart(3)}%  ${done}/${total} frames  ${s.toFixed(0)}s\n`);
  }
};

const encode = (file) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((res, rej) => {
    ff.on('error', rej);
    ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c} for ${path.basename(file)}`))));
  });
  closed.catch(() => undefined); // awaited below; this only keeps an early failure from being unhandled
  ff.stdin.on('error', () => undefined); // EPIPE when ffmpeg dies; reported through `closed`
  const write = (buf) => (ff.stdin.write(buf) ? Promise.resolve() : Promise.race([new Promise((r) => ff.stdin.once('drain', r)), closed]));
  return { write, end: () => (ff.stdin.end(), closed), kill: () => ff.kill('SIGKILL') };
};

console.log(`rendering ${NAME}: frames ${FROM}..${TO - 1} at ${FPS} fps, ${chunks.length} worker(s)`);
const encoders = [];
const seek = (page, f) =>
  Promise.race([
    page.evaluate((n) => window.__seek(n), f),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`frame ${f} did not paint within 30 s`)), 30000)),
  ]);
let segments;
try {
  segments = await Promise.all(
    chunks.map(async ([a, b], i) => {
      const file = path.join(tmp, `seg${i}.mp4`);
      const page = await open(a);
      page.on('console', (m) => m.type() === 'error' && m.text().startsWith('[guide]') && console.error(`  ${m.text()}`));
      const enc = encode(file);
      encoders.push(enc);
      for (let f = a; f < b; f++) {
        await seek(page, f);
        await enc.write(await page.screenshot({ type: 'jpeg', quality: 95 }));
        tick();
      }
      await page.close();
      await enc.end();
      return file;
    }),
  );
} catch (err) {
  console.error(`render failed: ${err.message}`);
  for (const e of encoders) e.kill();
  await browser.close().catch(() => undefined);
  server.close();
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
await browser.close();
server.close();

// ---------- join, lay the narration under it ----------

mkdirSync(path.dirname(OUT), { recursive: true });
const list = path.join(tmp, 'list.txt');
writeFileSync(list, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'\n`).join(''));
const seconds = total / FPS;
const audio = META.audio ? path.join(dist, META.audio) : null;
const mux = ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list];
if (audio && existsSync(audio)) {
  mux.push('-ss', String(FROM / FPS), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', 'apad', '-t', seconds.toFixed(3));
} else {
  mux.push('-c:v', 'copy');
}
mux.push('-movflags', '+faststart', OUT);
const r = spawnSync('ffmpeg', mux, { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) process.exit(r.status ?? 1);

// ---------- captions file ----------

if (CAPTIONS === 'srt' && SUBS.length) {
  const ts = (f) => {
    const ms = Math.max(0, Math.round(((f - FROM) / FPS) * 1000));
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  // Same visibility rule as the player's caption overlay: a sentence stays up to 1.2 s past its last word, or until the next one starts.
  const cues = SUBS.map((s, i) => ({ text: s.text, a: s.f, b: Math.min(s.t + Math.round(FPS * 1.2), i + 1 < SUBS.length ? SUBS[i + 1].f : Infinity, TO) }))
    .filter((c) => c.b > FROM && c.a < TO)
    .map((c, i) => `${i + 1}\n${ts(Math.max(c.a, FROM))} --> ${ts(c.b)}\n${c.text}\n`);
  writeFileSync(OUT.replace(/\.mp4$/i, '') + '.srt', cues.join('\n'));
}

const mb = (statSync(OUT).size / 1048576).toFixed(1);
console.log(`→ ${OUT}  ${seconds.toFixed(1)} s, ${mb} MB, rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s${CAPTIONS === 'srt' ? ` (+ ${path.basename(OUT).replace(/\.mp4$/i, '')}.srt)` : ''}`);

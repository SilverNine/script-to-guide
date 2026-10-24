#!/usr/bin/env node
/**
 * Build one guide into a self-contained HTML folder (and optionally a zip).
 *
 *   node scripts/build-web.mjs --guide <name|folder> [--out <folder>] [--zip]
 *
 * The guide is a folder path, or a name under ./guides, then the engine's own guides/ (scripts/lib/paths.mjs).
 * Output goes to ./dist/<name>/ of the current directory unless --out or build.out says otherwise.
 * Reads `<guide>/guide.json` (paths inside it are relative to the guide folder):
 *
 *   {
 *     "build": {
 *       "out": "dist",                       // output root; the guide lands in <out>/<name>/
 *       "copy": [ { "from": "public/screens", "to": "screens", "ext": [".webp"] } ],
 *       "audio": { "from": "recordings/narration.mp3", "to": "narration.mp3", "bitrate": "96k" },
 *       "captions": "data/captions.json",
 *       "chars": ["."],                       // folders whose source text may appear on screen (for font subsetting)
 *       "limits": { "zipMB": 20, "fileMB": 10, "files": 300 }   // optional, for hosts that enforce them
 *     },
 *     "page": {
 *       "lang": "en",
 *       "title": "…",
 *       "font": { "family": "Guide Sans", "source": "fonts/NotoSansKR-VF.ttf", "file": "guide-sans.woff2" }
 *     },
 *     "theme": { "brand": "#2563eb", … },       // overrides player/index.html defaults: --brand, --bg, --fg, …
 *     "themeDark": { "brand": "#6b9bff", … }    // same, applied under prefers-color-scheme: dark
 *   }
 *
 * - Scene code imports `guide-runtime`; esbuild aliases it to runtime/index.tsx. No video framework ships.
 * - `@guide` is aliased to `<guide>/web.tsx`, `script-to-guide` to src/index.ts. player/main.tsx does not know the guide.
 * - The body font is subset to the characters that can appear (captions, scene source, page title) and
 *   embedded as woff2, so the guide renders offline and inside sandboxed embeds. Requires fontTools
 *   (`pip install -r requirements.txt`). Without `page.font.source` the system font stack is used.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { inGuide, outPath, resolveGuide } from './lib/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

// 0) arguments and guide settings
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  if (!v || v.startsWith('--')) throw new Error(`${name} needs a value`);
  return v;
};
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const GUIDE_ARG = opt('--guide');
const outArg = opt('--out');
const ZIP = flag('--zip');
if (!GUIDE_ARG) {
  const have = existsSync('guides') ? readdirSync('guides').filter((d) => existsSync(path.join('guides', d, 'guide.json'))) : [];
  console.error(`usage: node scripts/build-web.mjs --guide <name> [--out <folder>] [--zip]\navailable: ${have.join(', ') || '(none)'}`);
  process.exit(1);
}
const { dir: gDir, name: NAME } = resolveGuide(GUIDE_ARG);
const gTsx = path.join(gDir, 'web.tsx');
const gJson = path.join(gDir, 'guide.json');
for (const f of [gTsx, gJson]) {
  if (!existsSync(f)) {
    console.error(`missing: ${path.relative('.', f)}`);
    process.exit(1);
  }
}
const cfg = JSON.parse(readFileSync(gJson, 'utf8'));
const { build, page, theme } = cfg;
const home = (p) => p.replace(/^~(?=\/|$)/, os.homedir());

const outRoot = outPath(home(outArg || build.out || 'dist'));
const G = (p) => inGuide(gDir, p);
const dir = path.join(outRoot, NAME);
const inside = (a, b) => a === b || a.startsWith(b + path.sep);
if (inside(gDir, dir) || inside(dir, gDir) || inside(ROOT, dir)) {
  console.error(`refusing to build into ${dir}: it overlaps the guide or the engine folder. Choose another --out.`);
  process.exit(1);
}
rmSync(dir, { recursive: true, force: true });
mkdirSync(path.join(dir, 'fonts'), { recursive: true });

// files to copy: { src, rel } (rel is relative to the output folder)
const copies = [];
for (const c of build.copy || []) {
  // a folder copy (ext) may be empty for a new guide; a named file (files) must exist
  const from = G(c.from);
  const names = c.files || (existsSync(from) ? readdirSync(from).filter((f) => (c.ext || []).some((e) => f.endsWith(e))).sort() : []);
  for (const n of names) copies.push({ src: path.join(from, n), rel: `${c.to}/${n}` });
}
const IMAGES = copies.filter((c) => /\.(webp|png|jpe?g|gif|svg)$/i.test(c.rel)).map((c) => c.rel);

// 1) bundle
const alias = {
  name: 'guide-alias',
  setup(b) {
    b.onResolve({ filter: /^@guide$/ }, () => ({ path: gTsx }));
    b.onResolve({ filter: /^guide-runtime$/ }, () => ({ path: path.join(ROOT, 'runtime/index.tsx') }));
    b.onResolve({ filter: /^script-to-guide$/ }, () => ({ path: path.join(ROOT, 'src/index.ts') }));
    b.onResolve({ filter: /^remotion$|^@remotion\// }, (a) => ({
      errors: [{ text: `${a.path}: scenes import from 'guide-runtime', not from a video framework` }],
    }));
  },
};
await esbuild.build({
  entryPoints: [path.join(ROOT, 'player/main.tsx')],
  absWorkingDir: ROOT,
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
    __IMAGES__: JSON.stringify(IMAGES),
  },
  plugins: [alias],
  // a guide outside the engine folder still resolves react from the engine's node_modules
  nodePaths: [path.join(ROOT, 'node_modules')],
  outfile: path.join(dir, 'app.js'),
  logLevel: 'warning',
});
const js = readFileSync(path.join(dir, 'app.js'), 'utf8');
if (build.audio && !js.includes(build.audio.to)) {
  console.error(`web.tsx audio path must equal guide.json build.audio.to (${build.audio.to})`);
  process.exit(1);
}

// 2) page, images, audio
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const cssVars = (obj) =>
  Object.entries(obj || {})
    .filter(([k]) => k !== 'mode')
    .map(([k, v]) => `--${kebab(k)}:${v};`)
    .join(' ');
const vars = cssVars(theme);
const varsDark = cssVars(cfg.themeDark);
const font = page.font || {};
const family = font.family || 'Guide Sans';
const fontFace = font.source
  ? `@font-face { font-family: "${family}"; src: url(fonts/${font.file}) format("woff2"); font-weight: 100 900; font-display: block; }`
  : '';
const fill = { lang: page.lang || 'en', title: page.title, 'font.family': family, fontFace, theme: vars, themeDark: varsDark };
const html = readFileSync('player/index.html', 'utf8')
  .replace(/^<!-- \{\{\.\.\.\}\}.*-->\n/m, '')
  .replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
    if (!(k in fill)) throw new Error(`index.html placeholder ${m} has no value`);
    return fill[k];
  });
writeFileSync(path.join(dir, 'index.html'), html);
for (const c of copies) {
  mkdirSync(path.dirname(path.join(dir, c.rel)), { recursive: true });
  copyFileSync(c.src, path.join(dir, c.rel));
}
if (build.audio) {
  mkdirSync(path.dirname(path.join(dir, build.audio.to)), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', G(build.audio.from), '-b:a', build.audio.bitrate || '96k', path.join(dir, build.audio.to)]);
}

// 3) font: only the characters that can appear on screen
let charCount = 0;
if (font.source) {
  const srcFiles = (d) =>
    readdirSync(d, { recursive: true })
      .filter((f) => /\.(tsx?|m?js|json|md)$/.test(f))
      .map((f) => readFileSync(path.join(d, f), 'utf8'));
  const texts = [
    build.captions ? JSON.parse(readFileSync(G(build.captions), 'utf8')).transcription.map((w) => w.text).join('') : '',
    ...(build.chars || ['.']).map(G).flatMap(srcFiles),
    page.title,
    page.subtitle || '',
    readFileSync('player/main.tsx', 'utf8'),
    readFileSync('player/index.html', 'utf8'),
  ];
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const chars = [...new Set([...ascii, ...texts.join('')])].filter((c) => c.codePointAt(0) >= 32).join('');
  charCount = chars.length;
  const charFile = path.join(outRoot, `font-chars-${NAME}.txt`);
  writeFileSync(charFile, chars);
  const py = existsSync('.venv/bin/python') ? '.venv/bin/python' : 'python3';
  execFileSync(py, [
    '-m', 'fontTools.subset',
    G(font.source),
    `--text-file=${charFile}`,
    '--flavor=woff2',
    '--layout-features=*',
    `--output-file=${path.join(dir, 'fonts', font.file)}`,
  ]);
  rmSync(charFile);
} else {
  rmSync(path.join(dir, 'fonts'), { recursive: true, force: true });
}

// 4) limits and zip
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push({ p: path.relative(dir, p), size: statSync(p).size });
  }
};
walk(dir);
const lim = build.limits || {};
const big = lim.fileMB ? files.filter((f) => f.size > lim.fileMB * 1024 * 1024) : [];
if (big.length || (lim.files && files.length > lim.files)) {
  console.error('limits exceeded', { big: big.map((f) => f.p), count: files.length });
  process.exit(1);
}
const mb = (n) => (n / 1048576).toFixed(2) + 'MB';
const sum = (re) => files.filter((f) => re.test(f.p)).reduce((a, f) => a + f.size, 0);
console.log(
  `[${NAME}] ${files.length} files, js ${mb(sum(/\.js$/))}, images ${mb(sum(/\.(webp|png|jpe?g|gif|svg)$/i))}, audio ${mb(sum(/\.(mp3|m4a)$/))}` +
    (font.source ? `, font ${mb(sum(/\.woff2$/))} (${charCount} chars)` : ', system font'),
);
console.log(`→ ${dir}`);
if (ZIP) {
  const zip = path.join(outRoot, `${NAME}.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', zip, NAME], { cwd: outRoot });
  const zs = statSync(zip).size;
  if (lim.zipMB && zs > lim.zipMB * 1024 * 1024) {
    console.error(`zip ${mb(zs)} > ${lim.zipMB}MB`);
    process.exit(1);
  }
  console.log(`zip ${mb(zs)} → ${zip}`);
}

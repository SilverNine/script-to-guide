#!/usr/bin/env node
/**
 * One entry point for the agent and for people.
 *
 *   node <skill>/scripts/stg.mjs <command> [args]
 *
 * The skill folder holds the engine. Guides live in the project you run this from: `./guides/<name>/`.
 * Outputs go to `./dist/`. Nothing is written into the skill folder except its own dependencies.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CWD, ROOT, resolveGuide } from './lib/paths.mjs';

const HELP = `script-to-guide

usage: node ${path.join(ROOT, 'scripts', 'stg.mjs')} <command> [args]

  setup [--no-verify]            install the engine's dependencies (once, and after an update)
  doctor                         check node, python, ffmpeg, cwebp, Chromium, dependencies
  new <name> [--from <sample>]   start ./guides/<name> from a sample guide (default: first-diagram)
  capture --url … --out …        capture a screen and element boxes (see references/capture.md)
  synth <guide> [args]           narration, captions and scene timetable (tts_synth.py)
  verify <guide> [args]          transcribe the narration and compare with the script (tts_verify.py)
  check <guide>                  type-check the guide's scenes
  build <guide> [args]           HTML guide in ./dist/<name>/ (build-web.mjs)
  frames <guide> --at a,b [args] review stills (frames.mjs)
  mp4 <guide> [args]             MP4 and .srt (render-mp4.mjs)

<guide> is a name under ./guides or a folder path.`;

const [cmd, ...rest] = process.argv.slice(2);
// no __pycache__ inside the skill folder
const env = { ...process.env, STG_CWD: CWD, PYTHONDONTWRITEBYTECODE: '1' };
const run = (bin, argv, opts = {}) => {
  const r = spawnSync(bin, argv, { stdio: 'inherit', cwd: CWD, env, ...opts });
  if (r.error) {
    console.error(`${bin}: ${r.error.message}`);
    process.exit(1);
  }
  return r.status ?? 1;
};
const node = (script, argv) => process.exit(run(process.execPath, [path.join(ROOT, 'scripts', script), ...argv]));
const python = () => (existsSync(path.join(ROOT, '.venv', 'bin', 'python')) ? path.join(ROOT, '.venv', 'bin', 'python') : 'python3');
const has = (bin, arg = '-version') => spawnSync(bin, [arg], { stdio: 'ignore' }).status === 0;
const die = (msg) => {
  console.error(msg);
  process.exit(1);
};
const chromiumReady = async () => {
  try {
    const { chromium } = await import(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs'));
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
};
const needSetup = () => {
  if (!existsSync(path.join(ROOT, 'node_modules', 'esbuild'))) {
    console.error(`dependencies are not installed: node ${path.join(ROOT, 'scripts', 'stg.mjs')} setup`);
    process.exit(1);
  }
};

switch (cmd) {
  case 'setup': {
    console.log(`installing into ${ROOT}`);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    if (run(npm, ['ci', '--no-audit', '--no-fund'], { cwd: ROOT }) !== 0) process.exit(1);
    if (run(npm, ['exec', '--', 'playwright', 'install', 'chromium'], { cwd: ROOT }) !== 0) process.exit(1);
    if (!existsSync(path.join(ROOT, '.venv'))) if (run('python3', ['-m', 'venv', '.venv'], { cwd: ROOT }) !== 0) process.exit(1);
    if (run(path.join(ROOT, '.venv', 'bin', 'python'), ['-m', 'pip', 'install', '-q', '--disable-pip-version-check', '-r', 'requirements.txt'], { cwd: ROOT }) !== 0) process.exit(1);
    // the transcription check is a rule of the skill; its model (~490 MB for English, ~570 MB otherwise) downloads on the first verify
    if (!rest.includes('--no-verify') && run(path.join(ROOT, '.venv', 'bin', 'python'), ['-m', 'pip', 'install', '-q', '--disable-pip-version-check', 'pywhispercpp'], { cwd: ROOT }) !== 0)
      console.warn('pywhispercpp did not install; stg verify needs it, or whisper-cli on PATH, or an ElevenLabs key.');
    if (!has('ffmpeg')) console.warn('\nffmpeg is missing: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux). Needed for audio and MP4.');
    if (!has('cwebp', '-version')) console.warn('cwebp is missing (optional): brew install webp, or capture to .png.');
    console.log('\nready. Try: node ' + path.join(ROOT, 'scripts', 'stg.mjs') + ' new my-guide');
    break;
  }
  case 'doctor': {
    const rows = [
      ['node 18+', Number(process.versions.node.split('.')[0]) >= 18],
      ['python 3.10+', spawnSync('python3', ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0],
      ['ffmpeg', has('ffmpeg')],
      ['cwebp (optional)', has('cwebp')],
      ['engine node_modules', existsSync(path.join(ROOT, 'node_modules', 'esbuild'))],
      ['Chromium for Playwright', await chromiumReady()],
      ['engine .venv', existsSync(path.join(ROOT, '.venv', 'bin', 'python'))],
      ['pywhispercpp (optional, for verify)', spawnSync(python(), ['-c', 'import pywhispercpp'], { stdio: 'ignore' }).status === 0],
    ];
    for (const [k, ok] of rows) console.log(`${ok ? '✓' : '✗'} ${k}`);
    console.log(`engine: ${ROOT}\nproject: ${CWD}`);
    break;
  }
  case 'new': {
    const name = rest[0];
    const i = rest.indexOf('--from');
    const from = i >= 0 ? rest[i + 1] : 'first-diagram';
    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      console.error('usage: stg new <name> [--from <sample>]   (name: lowercase letters, digits, hyphens)');
      process.exit(1);
    }
    const src = path.join(ROOT, 'guides', from);
    if (!existsSync(path.join(src, 'guide.json'))) {
      console.error(`no sample named ${from}. Samples: ${readdirSync(path.join(ROOT, 'guides')).filter((d) => existsSync(path.join(ROOT, 'guides', d, 'guide.json'))).join(', ')}`);
      process.exit(1);
    }
    const dst = path.join(CWD, 'guides', name);
    if (existsSync(dst)) {
      console.error(`${dst} already exists`);
      process.exit(1);
    }
    mkdirSync(path.dirname(dst), { recursive: true });
    // takes are a cache of the sample's voice; the stitched narration and data stay so the copy builds at once
    cpSync(src, dst, { recursive: true, filter: (p) => !/[\\/]takes([\\/]|$)/.test(p) && !p.endsWith('.stt.txt') });
    const web = path.join(dst, 'web.tsx');
    writeFileSync(web, readFileSync(web, 'utf8').replace(new RegExp(`id: '${from}'`), `id: '${name}'`));
    console.log(`→ ${dst}\ncopied from the sample "${from}". It builds as is; replace script.md, the captures and Scene.tsx step by step (references/pipeline.md).`);
    break;
  }
  case 'capture':
    needSetup();
    node('capture.mjs', rest);
    break;
  case 'synth':
  case 'verify': {
    if (!rest[0]) die(`usage: stg ${cmd} <guide> [args]`);
    if (!existsSync(path.join(ROOT, '.venv', 'bin', 'python'))) die(`the Python environment is not installed: node ${path.join(ROOT, 'scripts', 'stg.mjs')} setup`);
    process.exit(run(python(), [path.join(ROOT, 'scripts', cmd === 'synth' ? 'tts_synth.py' : 'tts_verify.py'), ...rest]));
  }
  case 'check': {
    needSetup();
    if (!rest[0]) die('usage: stg check <guide>');
    const { dir } = resolveGuide(rest[0]);
    const cdir = path.join(ROOT, '.stg-check');
    mkdirSync(cdir, { recursive: true });
    const cfg = {
      extends: '../tsconfig.json',
      compilerOptions: {
        baseUrl: '..',
        paths: {
          'guide-runtime': ['runtime/index.tsx'],
          'script-to-guide': ['src/index.ts'],
          react: ['node_modules/@types/react'],
          'react/*': ['node_modules/@types/react/*'],
        },
        typeRoots: ['../node_modules/@types'],
      },
      include: ['../runtime', '../src', '../player', dir],
    };
    writeFileSync(path.join(cdir, 'tsconfig.json'), JSON.stringify(cfg, null, 2));
    const code = run(path.join(ROOT, 'node_modules', '.bin', 'tsc'), ['-p', path.join(cdir, 'tsconfig.json')]);
    if (code === 0) console.log('types ok');
    process.exit(code);
  }
  case 'build':
  case 'frames':
  case 'mp4': {
    needSetup();
    if (!rest[0] || rest[0].startsWith('--')) die(`usage: stg ${cmd} <guide> [args]`);
    const [g, ...more] = rest;
    node({ build: 'build-web.mjs', frames: 'frames.mjs', mp4: 'render-mp4.mjs' }[cmd], ['--guide', g, ...more]);
    break;
  }
  default:
    console.log(HELP);
    process.exit(cmd && cmd !== 'help' && cmd !== '--help' ? 1 : 0);
}

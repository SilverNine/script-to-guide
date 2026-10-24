/**
 * Where things are, for every script.
 *
 * The engine (this repository, installed as a skill) and the guides (in the user's project) are
 * separate. A guide is named by a folder path, or by a name looked up in `./guides/` of the current
 * directory, then in the engine's own `guides/` (the samples). Paths inside guide.json are relative
 * to the guide folder. Outputs default to `./dist` of the current directory.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** The directory the user ran the command from, captured before any script changes directory */
export const CWD = process.env.STG_CWD || process.cwd();

export function resolveGuide(arg) {
  const tries = [path.resolve(CWD, arg), path.join(CWD, 'guides', arg), path.join(ROOT, 'guides', arg)];
  const dir = tries.find((d) => existsSync(path.join(d, 'guide.json')));
  if (!dir) {
    console.error(`guide not found: ${arg}\nlooked in:\n${tries.map((t) => '  ' + t).join('\n')}`);
    process.exit(1);
  }
  return { dir, name: path.basename(dir) };
}

/** A path from guide.json: relative to the guide folder (older guides used repository-relative paths) */
export function inGuide(gDir, p) {
  if (path.isAbsolute(p)) return p;
  const a = path.resolve(gDir, p);
  if (existsSync(a)) return a;
  for (const base of [CWD, ROOT]) if (existsSync(path.resolve(base, p))) return path.resolve(base, p);
  return a;
}

export const outPath = (p) => path.resolve(CWD, p);

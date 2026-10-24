#!/usr/bin/env node
/**
 * Capture a screen of the app being documented, plus the boxes of the elements a guide points at.
 *
 *   node scripts/capture.mjs --url <url> --out guides/<name>/public/screens/<shot>.webp
 *        [--size 1440x810] [--wait 1500] [--box name=<selector>]... [--click <selector>]... [--probe]
 *
 * - The page is rendered at the given CSS size with deviceScaleFactor 2, so the screenshot stays sharp
 *   when a guide zooms in. Box coordinates are written in CSS pixels of that size.
 * - `--box editor=.cm-editor` records the bounding box of the first match as `editor`. Selectors are
 *   Playwright selectors, so `text=Export` and `button:has-text("Export")` work.
 * - `--click` runs before the capture, in order (open a menu, switch a tab).
 * - Boxes go to `<out without extension>.boxes.json`, merged with what is already there.
 * - `.webp` output needs `cwebp` (brew install webp); otherwise use `.png`.
 * - `--probe` prints the visible buttons, links and labelled elements with their boxes, to choose selectors.
 *
 * Capture only demo data. Freeze the app in a state with no customer, personal or internal data first.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const all = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const one = (name, def) => all(name)[0] ?? def;
const has = (name) => argv.includes(name);

const url = one('--url');
const out = one('--out');
const [W, H] = one('--size', '1440x810').split('x').map(Number);
const wait = Number(one('--wait', '1500'));
if (!url || (!out && !has('--probe'))) {
  console.error('usage: node scripts/capture.mjs --url <url> --out <file.webp|png> [--size 1440x810] [--box name=selector]... [--click selector]... [--probe]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
for (const sel of all('--click')) {
  await page.locator(sel).first().click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(wait);

const round = (b) => [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];

if (has('--probe')) {
  const items = await page.evaluate((H) => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    };
    const seen = new Set();
    const pick = [];
    for (const el of document.querySelectorAll('button, a, [role=tab], [role=button], [aria-label], textarea, select, input, .cm-editor, svg[id], main, aside, header, nav, section')) {
      const b = el.getBoundingClientRect();
      if (b.width < 8 || b.height < 8 || b.y > H || seen.has(el)) continue;
      seen.add(el);
      const cls = typeof el.className === 'string' ? el.className : '';
      pick.push({ tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: cls.slice(0, 48) || undefined, text: (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 32) || undefined, box: r(el) });
    }
    return pick.slice(0, 90);
  }, H);
  for (const it of items) console.log(JSON.stringify(it));
}

if (out) {
  mkdirSync(path.dirname(out), { recursive: true });
  const ext = path.extname(out).toLowerCase();
  const png = ext === '.png' ? out : out.replace(/\.[^.]+$/, '.capture.png');
  await page.screenshot({ path: png });
  if (ext === '.webp') {
    execFileSync('cwebp', ['-quiet', '-q', '88', png, '-o', out]);
    rmSync(png);
  }
  const boxes = {};
  for (const spec of all('--box')) {
    const i = spec.indexOf('=');
    const name = spec.slice(0, i);
    const sel = spec.slice(i + 1);
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`no visible match for --box ${name}=${sel}`);
    boxes[name] = round(b);
  }
  const bf = out.replace(/\.[^.]+$/, '.boxes.json');
  const prev = existsSync(bf) ? JSON.parse(readFileSync(bf, 'utf8')) : {};
  writeFileSync(bf, JSON.stringify({ ...prev, _size: [W, H], ...boxes }, null, 2) + '\n');
  console.log(`${out} (${W}x${H} @2x)`);
  for (const [k, v] of Object.entries(boxes)) console.log(`  ${k}: ${v.join(', ')}`);
}
await browser.close();

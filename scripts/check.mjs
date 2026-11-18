#!/usr/bin/env node
/**
 * npm run check: run before publishing and on every pull request.
 *
 *  1. Blocks paid files: any PDF or ZIP, or a source/ folder, in src/ or public/.
 *  2. Checks product images: cover and previews square and at least 1000px,
 *     pin 2:3, nothing over 3 MB.
 *  3. Checks published products have no TODO left in their description.
 *  4. Builds the site (this validates every product against the schema).
 *  5. Checks every internal link and image in the built site points somewhere real,
 *     and that no PDF or ZIP ended up in the output.
 *
 * Exits with code 1 and a list of problems if anything fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    out.push({ path: p, dir: d.isDirectory() });
    if (d.isDirectory() && d.name !== 'node_modules') walk(p, out);
  }
  return out;
}

// ---------------------------------------------------------------- 1. paid files
console.log('1/5  Looking for paid files (PDF, ZIP, source/)...');
const FORBIDDEN = /\.(pdf|zip)$/i;
for (const base of ['src', 'public']) {
  for (const f of walk(path.join(ROOT, base))) {
    if (!f.dir && FORBIDDEN.test(f.path)) fail(`Paid file must not be in the repo: ${rel(f.path)}`);
    if (f.dir && path.basename(f.path).toLowerCase() === 'source') fail(`source/ folder must not be in the repo: ${rel(f.path)}`);
  }
}

// ---------------------------------------------------------------- 2. images
console.log('2/5  Checking product images...');
const PRODUCTS = path.join(ROOT, 'src', 'content', 'products');
const MAX_BYTES = 3 * 1024 * 1024;
const productDirs = fs.existsSync(PRODUCTS)
  ? fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  : [];

for (const d of productDirs) {
  const dir = path.join(PRODUCTS, d.name);
  const md = path.join(dir, 'index.md');
  if (!fs.existsSync(md)) {
    fail(`${d.name}: missing index.md`);
    continue;
  }
  const text = fs.readFileSync(md, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const body = text.slice(text.indexOf('---', 3) + 3);
  const published = /^status:\s*["']?published/m.test(fm);

  // Every image referenced in the front matter.
  const refs = [...fm.matchAll(/["']?(\.\/[^"'\s]+\.(?:png|jpe?g|webp))["']?/gi)].map((m) => m[1]);
  for (const ref of refs) {
    const file = path.join(dir, ref);
    const name = path.basename(ref).toLowerCase();
    if (!fs.existsSync(file)) {
      fail(`${d.name}: image not found: ${ref}`);
      continue;
    }
    const size = fs.statSync(file).size;
    if (size > MAX_BYTES) fail(`${d.name}/${name}: ${(size / 1048576).toFixed(1)} MB, keep images under 3 MB`);
    const { width = 0, height = 0 } = await sharp(file).metadata();
    const dims = `${width}x${height}`;
    if (name.startsWith('pin')) {
      if (Math.abs(width / height - 2 / 3) > 0.01) fail(`${d.name}/${name}: pin must be 2:3 (e.g. 1000x1500), is ${dims}`);
      if (width < 600) fail(`${d.name}/${name}: pin should be at least 1000x1500, is ${dims}`);
    } else {
      if (width !== height) fail(`${d.name}/${name}: must be square, is ${dims}`);
      if (width < 1000) fail(`${d.name}/${name}: must be at least 1000x1000, is ${dims}`);
      else if (width < 1500) warnings.push(`${d.name}/${name}: ${dims}; 1500x1500 looks sharper`);
    }
  }

  // ------------------------------------------------------------- 3. TODOs
  if (published && /\bTODO\b/.test(body)) fail(`${d.name}: published but the description still contains TODO`);
}

// ---------------------------------------------------------------- 4. build
// Stop here if the basics failed; the build would only add noise.
if (errors.length) report();

console.log('3/5  Published products: no TODOs left.');
console.log('4/5  Building the site (validates every product against the schema)...');
const build = spawnSync('npx', ['astro', 'build'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8' });
if (build.status !== 0) {
  const out = `${build.stdout}\n${build.stderr}`
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')
    .filter((l) => l.trim() && !/^\s*at /.test(l))
    .slice(-30)
    .join('\n');
  fail(`The site did not build:\n${out}`);
  report();
}

// ---------------------------------------------------------------- 5. links
console.log('5/5  Checking links and images in the built site...');
const DIST = path.join(ROOT, 'dist');
const distFiles = walk(DIST).filter((f) => !f.dir);
for (const f of distFiles) if (FORBIDDEN.test(f.path)) fail(`Paid file in build output: ${rel(f.path)}`);

const exists = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const target = path.join(DIST, clean);
  if (clean.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
  return fs.existsSync(target) || fs.existsSync(`${target}.html`) || fs.existsSync(path.join(target, 'index.html'));
};
let checked = 0;
for (const f of distFiles.filter((x) => x.path.endsWith('.html'))) {
  const html = fs.readFileSync(f.path, 'utf8');
  const urls = new Set();
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) urls.add(part.trim().split(/\s+/)[0]);
  for (let u of urls) {
    if (u.startsWith('https://theprimaryworkstudio.com')) u = u.slice('https://theprimaryworkstudio.com'.length) || '/';
    if (!u.startsWith('/') || u.startsWith('//')) continue; // external, mailto:, #anchors
    checked++;
    if (!exists(u)) fail(`Broken link in ${rel(f.path)}: ${u}`);
  }
}
console.log(`     ${checked} internal links checked.`);
report();

function report() {
  for (const w of warnings) console.warn(`  note: ${w}`);
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problem(s) found:\n`);
    for (const e of errors) console.error(`  • ${e}`);
    console.error('');
    process.exit(1);
  }
  console.log('\n✓ All checks passed.');
  process.exit(0);
}

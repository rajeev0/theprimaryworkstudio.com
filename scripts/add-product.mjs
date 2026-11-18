#!/usr/bin/env node
/**
 * Import products from the shop's "05_Published" folders.
 *
 *   npm run add-product -- "D:/Reva_Montessori/Shop/05_Published/2026-11-17_ck-words_phonics-pack"
 *   npm run add-product -- --all "D:/Reva_Montessori/Shop/05_Published"
 *
 * Options:
 *   --all      treat the path as a folder OF product folders and import each one
 *   --force    overwrite a product that already exists on the site
 *   --dry-run  show what would happen without writing anything
 *
 * Reads listing.txt, writes src/content/products/<slug>/index.md and copies
 * ONLY cover.png, preview1-8.png and pin.png. Paid files (PDF, ZIP) and
 * source/ folders are never copied.
 *
 * Anything the script cannot work out is written as TODO, and the product is
 * saved as a draft so it will not appear on the live site until fixed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'src', 'content', 'products');
const TODO = 'TODO';

/** Only these files are ever copied. Everything else is ignored. */
const IMAGE_ALLOW = /^(cover|pin|preview[1-8])\.png$/i;

// Keyword → subject. Matched against tags + title (lower case). Extend as needed.
const SUBJECT_KEYWORDS = [
  [/\b(phonics|reading|writing|handwriting|alphabet|letter sounds?|sight words?|vocabulary|literacy)\b/, ['Language', 'Literacy']],
  [/\b(math|number|numbers|counting|addition|subtraction|place value)\b/, ['Math']],
  [/\bpractical life\b/, ['Practical Life']],
  [/\bsensorial\b/, ['Sensorial']],
  [/\b(art|coloring|colouring)\b/, ['Art']],
  [/\b(geography|continents?|maps?|flags?)\b/, ['Geography']],
  [/\b(science|botany|zoology|life cycle)\b/, ['Science']],
  [/\bmusic\b/, ['Music']],
];
// Keyword → theme label.
const THEME_KEYWORDS = [
  [/\bphonics\b/, 'Phonics'],
  [/\bdouble final consonants\b/, 'Double Final Consonants'],
  [/\bcut and paste\b/, 'Cut & Paste'],
  [/\bwrite the word\b/, 'Write the Word'],
];
const STORE_NAMES = [
  [/^tpt|teachers ?pay ?teachers/i, 'tpt'],
  [/^etsy/i, 'etsy'],
  [/^tes\b/i, 'tes'],
  [/^made ?by ?teachers/i, 'madeByTeachers'],
  [/^boom/i, 'boom'],
];

// ---------------------------------------------------------------------------

export function parseListing(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const fields = {};
  const sections = {};
  let current = null;
  for (const raw of lines) {
    if (/^\s*$/.test(raw)) {
      if (current) sections[current].push('');
      continue;
    }
    if (/^\S/.test(raw)) {
      // A top-level line: either "KEY   value" or a section heading.
      const m = raw.match(/^([A-Z][A-Z /']*?[A-Z])(?:\s{2,}(.*))?$/);
      if (m) {
        const key = m[1].trim();
        if (m[2] !== undefined) {
          fields[key] = m[2].trim();
          current = null;
        } else {
          current = key;
          sections[current] = [];
        }
        continue;
      }
    }
    if (current) sections[current].push(raw.replace(/^ {2}/, ''));
  }
  for (const k of Object.keys(sections)) {
    sections[k] = sections[k]
      .filter((l) => !/^\s*\[Etsy only\]/i.test(l)) // rule: drop Etsy-only lines
      .join('\n')
      .trim();
  }
  delete fields['REVIEWED BY']; // rule: never import the review line
  return { fields, sections };
}

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** "2026-11-17_ck-words_phonics-pack" → "ck-words-phonics-pack" */
export const slugFromFolder = (name) => slugify(name.replace(/^\d{4}-\d{2}-\d{2}_/, ''));

const splitList = (s) =>
  s.split(/[,;]/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean);

export function buildProduct(folderName, listing, { knownSlugs = [] } = {}) {
  const { fields, sections } = listing;
  const todos = [];
  const need = (value, what) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) {
      todos.push(what);
      return TODO;
    }
    return value;
  };

  // --- title ---------------------------------------------------------------
  const fullTitle = fields['TITLE'] ?? '';
  const title = need(fullTitle.split('|')[0].trim(), 'title');
  const seoTitle = fullTitle.includes('|') ? fullTitle : undefined;

  // --- tracker id ----------------------------------------------------------
  const trackerRaw = fields['TRACKER ID'] ?? '';
  const trackerId = /^[A-Z]+-\d+(\s*,\s*[A-Z]+-\d+)*$/.test(trackerRaw) ? trackerRaw : need('', 'trackerId');

  // --- price / grade -------------------------------------------------------
  const priceMatch = (fields['PRICE'] ?? '').match(/\$?\s*(\d+(?:\.\d+)?)/);
  const isFreeWord = /\bfree\b/i.test(fields['PRICE'] ?? '');
  const price = isFreeWord ? 0 : priceMatch ? Number(priceMatch[1]) : need('', 'price');
  const grade = need(fields['GRADE'], 'grade');

  // --- stores + date from PUBLISHED ---------------------------------------
  const stores = {};
  const dates = [];
  for (const part of (fields['PUBLISHED'] ?? '').split(/\s*[;·]\s*|\s{2,}(?=[A-Z])/)) {
    const m = part.match(/^\s*([A-Za-z][A-Za-z ]*?)\s*(\d{4}-\d{2}-\d{2})?\s*:\s*(https?:\/\/\S+)/);
    if (!m) continue;
    const key = STORE_NAMES.find(([re]) => re.test(m[1].trim()))?.[1];
    if (key) stores[key] = m[3];
    if (m[2]) dates.push(m[2]);
  }
  if (!Object.keys(stores).length) todos.push('stores (no store URL in PUBLISHED)');
  const folderDate = folderName.match(/^(\d{4}-\d{2}-\d{2})_/)?.[1];
  const publishedDate = dates.sort()[0] ?? folderDate ?? need('', 'publishedDate');

  // --- descriptions --------------------------------------------------------
  const shortDescription = need((sections['SHORT DESCRIPTION'] ?? '').replace(/\s*\n\s*/g, ' '), 'shortDescription');
  const full = sections['FULL DESCRIPTION'] ?? '';

  // Pull structured bits out of the full description; the rest becomes the body.
  let pageCount;
  const whatsIncluded = [];
  let words = [];
  let skills = [];
  let includedPacks = [];
  const bodyLines = [];
  let inIncluded = false;
  for (const line of full.split('\n')) {
    const t = line.trim();
    let m;
    if ((m = t.match(/^What'?s included(?:\s*\((\d+)\s*pages?\))?\s*:?\s*$/i))) {
      if (m[1]) pageCount = Number(m[1]);
      inIncluded = true;
      continue;
    }
    if (inIncluded && /^[•\-*]\s+/.test(t)) {
      whatsIncluded.push(t.replace(/^[•\-*]\s+/, ''));
      continue;
    }
    inIncluded = false;
    if ((m = t.match(/^Words:\s*(.+)$/i))) { words = splitList(m[1]); continue; }
    if ((m = t.match(/^Skills:\s*(.+)$/i))) { skills = splitList(m[1]); continue; }
    if ((m = t.match(/^Included packs:\s*(.+?)(?:\s*\(.*\))?\.?$/i))) { includedPacks = splitList(m[1]); continue; }
    bodyLines.push(t);
  }
  // Collapse wrapped lines into paragraphs.
  const body = bodyLines
    .join('\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((p) => p.replace(/^Great for:/i, '**Great for:**'))
    .join('\n\n');

  // --- formats -------------------------------------------------------------
  const formatsText = `${full}\n${sections['FILES'] ?? ''}`;
  const formats = [];
  if (/US Letter|_Letter\.pdf/i.test(formatsText)) formats.push('US Letter');
  if (/\bA4\b/.test(formatsText)) formats.push('A4');
  if (/\bcolou?r\b/i.test(formatsText)) formats.push('Color');
  if (/black\s*(&|and)\s*white|\bB&W\b|_BW_/i.test(formatsText)) formats.push('Black & White');

  // --- tags / subject / theme ---------------------------------------------
  const tags = splitList((sections['TAGS / KEYWORDS'] ?? '').replace(/\n/g, ','));
  const haystack = `${tags.join(' , ')} , ${fullTitle}`.toLowerCase();
  const subject = [...new Set(SUBJECT_KEYWORDS.filter(([re]) => re.test(haystack)).flatMap(([, s]) => s))];
  const theme = [...new Set(THEME_KEYWORDS.filter(([re]) => re.test(haystack)).map(([, t]) => t))];

  // --- bundle --------------------------------------------------------------
  const isBundle = /bundle/i.test(folderName) || /\bbundle\b/i.test(title);
  let bundleItems = [];
  if (isBundle) {
    bundleItems = includedPacks.map((name) => {
      const key = slugify(name); // "-ck Words" → "ck-words"
      const hit = knownSlugs.find((s) => s === key || s.startsWith(`${key}-`));
      if (!hit) todos.push(`bundleItems: could not match "${name}"`);
      return hit ?? `${TODO}-${key}`;
    });
    if (!bundleItems.length) todos.push('bundleItems');
  }

  const product = {
    title,
    seoTitle,
    trackerId,
    status: 'published',
    publishedDate,
    shortDescription,
    subject: subject.length ? subject : [need('', 'subject')],
    theme,
    grade,
    pageCount: pageCount ?? need('', 'pageCount'),
    formats: formats.length ? formats : [need('', 'formats')],
    price,
    isFree: price === 0,
    isBundle,
    bundleItems,
    featured: false,
    whatsIncluded,
    words,
    skills: skills.length ? skills : [need('', 'skills')],
    tags,
    stores,
  };
  if (todos.length) product.status = 'draft';
  return { product, body, todos };
}

// --- YAML output (hand-written so we need no extra dependency) --------------

const q = (v) => JSON.stringify(v); // JSON strings are valid YAML strings
function yamlValue(v) {
  if (Array.isArray(v)) return v.length ? `\n${v.map((x) => `  - ${q(x)}`).join('\n')}` : ' []';
  if (typeof v === 'string') return ` ${q(v)}`;
  return ` ${v}`;
}

export function toMarkdown(product, body, images, todos) {
  const out = ['---'];
  out.push('# Imported by scripts/add-product.mjs. Edit freely.');
  if (todos.length) out.push(`# TODO before publishing: ${todos.join('; ')}`);
  for (const [k, v] of Object.entries(product)) {
    if (v === undefined) continue;
    if (k === 'stores') {
      const entries = Object.entries(v);
      out.push(entries.length ? `stores:\n${entries.map(([s, u]) => `  ${s}: ${q(u)}`).join('\n')}` : 'stores: {}');
      continue;
    }
    if (k === 'publishedDate') { out.push(`publishedDate: ${v}`); continue; }
    out.push(`${k}:${yamlValue(v)}`);
  }
  out.push(`cover: ${images.cover ? q('./cover.png') : q(TODO)}`);
  out.push(`previews:${yamlValue(images.previews.map((p) => `./${p}`))}`);
  if (images.pin) out.push(`pin: ${q('./pin.png')}`);
  out.push('---', '', body || TODO, '');
  return out.join('\n');
}

// ---------------------------------------------------------------------------

function importFolder(srcDir, { force, dryRun, knownSlugs }) {
  const folderName = path.basename(srcDir);
  const listingPath = path.join(srcDir, 'listing.txt');
  if (!fs.existsSync(listingPath)) {
    console.warn(`  skip  ${folderName}: no listing.txt`);
    return null;
  }
  const slug = slugFromFolder(folderName);
  const dest = path.join(PRODUCTS_DIR, slug);
  if (fs.existsSync(dest) && !force) {
    console.warn(`  skip  ${slug}: already exists (use --force to overwrite)`);
    return null;
  }

  const files = fs.readdirSync(srcDir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
  const images = files.filter((f) => IMAGE_ALLOW.test(f));
  const skipped = files.filter((f) => !IMAGE_ALLOW.test(f) && f !== 'listing.txt');
  const imageInfo = {
    cover: images.find((f) => /^cover\.png$/i.test(f)),
    pin: images.find((f) => /^pin\.png$/i.test(f)),
    previews: images.filter((f) => /^preview\d\.png$/i.test(f)).sort(),
  };

  const listing = parseListing(fs.readFileSync(listingPath, 'utf8'));
  const { product, body, todos } = buildProduct(folderName, listing, { knownSlugs });
  if (!imageInfo.cover) { todos.push('cover.png missing'); product.status = 'draft'; }
  const md = toMarkdown(product, body, imageInfo, todos);

  const status = todos.length ? `DRAFT (TODO: ${todos.join('; ')})` : 'published';
  console.log(`  ${dryRun ? 'would add' : 'add'}  ${slug}  [${status}]`);
  if (skipped.length) console.log(`        not copied: ${skipped.join(', ')}`);

  if (!dryRun) {
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'index.md'), md);
    for (const img of images) fs.copyFileSync(path.join(srcDir, img), path.join(dest, img.toLowerCase()));
  }
  return slug;
}

function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: npm run add-product -- [--all] [--force] [--dry-run] <folder>');
    process.exit(1);
  }
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) {
    console.error(`Folder not found: ${abs}`);
    process.exit(1);
  }
  const folders = flags.has('--all')
    ? fs.readdirSync(abs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(abs, d.name)).sort()
    : [abs];

  // Slugs that exist (or will exist) — used to match bundle items.
  const existing = fs.existsSync(PRODUCTS_DIR) ? fs.readdirSync(PRODUCTS_DIR).filter((n) => !n.startsWith('_')) : [];
  const siblings = fs.readdirSync(path.dirname(folders[0]), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => slugFromFolder(d.name));
  const knownSlugs = [...new Set([...existing, ...siblings])];

  // Import non-bundles first so bundles can refer to them.
  folders.sort((a, b) => Number(/bundle/i.test(a)) - Number(/bundle/i.test(b)));
  console.log(`Importing ${folders.length} folder(s) into src/content/products/`);
  let n = 0;
  for (const f of folders) if (importFolder(f, { force: flags.has('--force'), dryRun: flags.has('--dry-run'), knownSlugs })) n++;
  console.log(`Done: ${n} product(s) ${flags.has('--dry-run') ? 'would be ' : ''}written. Run "npm run check" next.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

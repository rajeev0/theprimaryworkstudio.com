import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../site';
import { STORES } from '../content.config';

export type Product = CollectionEntry<'products'>;

/**
 * Published products, newest first. Drafts are shown only when running
 * `npm run dev` on your own computer, never in a build that gets deployed.
 */
export async function getProducts(): Promise<Product[]> {
  const all = await getCollection('products', (p) => p.data.status === 'published' || import.meta.env.DEV);
  return all.sort(
    (a, b) =>
      b.data.publishedDate.getTime() - a.data.publishedDate.getTime() || a.data.title.localeCompare(b.data.title),
  );
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const productUrl = (p: Product | string) => `/products/${typeof p === 'string' ? p : p.id}/`;

export function formatPrice(p: Product): string {
  const { price, isFree } = p.data;
  if (isFree || price === 0) return 'Free';
  if (typeof price !== 'number') return '';
  return `$${price.toFixed(2)}`;
}

export function isNew(p: Product, now = new Date()): boolean {
  const ageDays = (now.getTime() - p.data.publishedDate.getTime()) / 86_400_000;
  return ageDays <= SITE.newForDays;
}

/** Store buttons that have a link, in a fixed order. */
export function storeLinks(p: Product) {
  return (Object.keys(STORES) as (keyof typeof STORES)[])
    .filter((k) => p.data.stores[k])
    .map((k) => ({ key: k, name: STORES[k], url: p.data.stores[k] as string }));
}

/** The text label shown for age / grade on a product. */
export const ageLabel = (p: Product) => [p.data.grade, p.data.ages].filter(Boolean).join(' · ');

/* ---------- Filters (subject, theme, grade, season) ---------- */

export const FACETS = {
  subject: { label: 'Subject', values: (p: Product) => p.data.subject.filter((s) => s !== 'TODO') as string[] },
  theme: { label: 'Theme', values: (p: Product) => p.data.theme },
  grade: { label: 'Grade', values: (p: Product) => [p.data.grade] },
  season: { label: 'Season', values: (p: Product) => (p.data.season ? [p.data.season] : []) },
} as const;
export type FacetKey = keyof typeof FACETS;
export const FACET_KEYS = Object.keys(FACETS) as FacetKey[];

export type FacetValue = { value: string; slug: string; count: number };

/** For each facet: the values in use, with slug and count. */
export function facetValues(products: Product[]) {
  const out = {} as Record<FacetKey, FacetValue[]>;
  for (const key of FACET_KEYS) {
    const counts = new Map<string, number>();
    for (const p of products) for (const v of FACETS[key].values(p)) counts.set(v, (counts.get(v) ?? 0) + 1);
    out[key] = [...counts]
      .map(([value, count]) => ({ value, slug: slugify(value), count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }
  return out;
}

/** Bundles that contain this product. */
export const bundlesContaining = (p: Product, all: Product[]) =>
  all.filter((b) => b.data.isBundle && b.data.bundleItems.some((i) => i.id === p.id));

/** Products sharing the most themes/subjects with this one. */
export function related(p: Product, all: Product[], max = 4) {
  const mine = new Set<string>([...p.data.theme, ...p.data.subject]);
  const exclude = new Set([p.id, ...p.data.bundleItems.map((i) => i.id), ...bundlesContaining(p, all).map((b) => b.id)]);
  return all
    .filter((o) => !exclude.has(o.id))
    .map((o) => ({ o, score: [...o.data.theme, ...o.data.subject].filter((x) => mine.has(x)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.o);
}

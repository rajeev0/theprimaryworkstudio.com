/**
 * Product schema. Every folder in src/content/products/<slug>/ with an
 * index.md is checked against this when the site builds (and by `npm run check`).
 * If something is missing or wrong, the build stops and tells you which
 * product and which field.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const SUBJECTS = [
  'Language',
  'Literacy',
  'Math',
  'Practical Life',
  'Sensorial',
  'Art',
  'Geography',
  'Science',
  'Culture',
  'Music',
] as const;

export const SEASONS = ['Fall', 'Winter', 'Spring', 'Summer', 'Back to School', 'Holidays', 'All Year'] as const;

export const FORMATS = ['US Letter', 'A4', 'Color', 'Black & White'] as const;

/** Store keys, in the order buttons appear on a product page. */
export const STORES = {
  tpt: 'Teachers Pay Teachers',
  etsy: 'Etsy',
  tes: 'TES',
  madeByTeachers: 'Made By Teachers',
  boom: 'Boom Learning',
} as const;

/**
 * The import script writes "TODO" where it could not fill a field. TODO is
 * allowed in drafts only; a published product with a TODO fails the build.
 */
const orTodo = <T extends z.ZodType>(schema: T, message: string) =>
  z.union([schema, z.literal('TODO')], { error: message });

/** Treat empty text (what a form saves for a blank box) as "not set". */
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

const storeUrl = optional(z.url({ message: 'must be a full web address starting with https://' }));

const products = defineCollection({
  loader: glob({
    // `_template` and any folder starting with `_` are ignored.
    pattern: ['*/index.md', '!_*/**'],
    base: './src/content/products',
    // The folder name is the product's web address, e.g. /products/ck-words-phonics-pack/
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) => {
    // Image size/shape (square cover, 2:3 pin, min 1000px) is checked by
    // `npm run check` (scripts/check.mjs); here we check the files exist.
    return z
      .object({
        title: z.string().min(3, 'title is required'),
        /** Longer title for search engines / browser tab. Defaults to title. */
        seoTitle: optional(z.string()),
        trackerId: z.string().min(1, 'trackerId is required, e.g. "P-201"'),
        status: z.enum(['draft', 'published'], {
          message: 'status must be "draft" or "published"',
        }),
        publishedDate: z.coerce.date({ message: 'publishedDate must be a date like 2026-11-17' }),
        shortDescription: z
          .string()
          .min(10, 'shortDescription is required')
          .max(220, 'shortDescription should be under 220 characters'),
        subject: z
          .array(orTodo(z.enum(SUBJECTS), `subject must be one of: ${SUBJECTS.join(', ')}`))
          .min(1, 'pick at least one subject'),
        theme: z.array(z.string()).default([]),
        season: optional(z.enum(SEASONS, { message: `season must be one of: ${SEASONS.join(', ')}` })),
        grade: z.string().min(1, 'grade is required, e.g. "PreK–1"'),
        ages: optional(z.string()),
        pageCount: orTodo(z.number().int().positive(), 'pageCount must be a whole number above 0, e.g. 12'),
        formats: z
          .array(orTodo(z.enum(FORMATS), `formats must be from: ${FORMATS.join(', ')}`))
          .min(1, 'list at least one format'),
        price: orTodo(z.number().min(0), 'price must be a number in US dollars, e.g. 1.00 (0 for free)'),
        isFree: z.boolean().default(false),
        isBundle: z.boolean().default(false),
        bundleItems: z.array(reference('products')).default([]),
        featured: z.boolean().default(false),
        whatsIncluded: z.array(z.string()).default([]),
        words: z.array(z.string()).default([]),
        skills: z.array(z.string()).min(1, 'list at least one skill'),
        tags: z.array(z.string()).default([]),
        stores: z
          .object({
            tpt: storeUrl,
            etsy: storeUrl,
            tes: storeUrl,
            madeByTeachers: storeUrl,
            boom: storeUrl,
          })
          .strict()
          .default({}),
        cover: image(),
        previews: z.array(image()).max(8, 'at most 8 preview images').default([]),
        pin: z.preprocess(blankToUndefined, image().optional()),
      })
      .superRefine((p, ctx) => {
        if (p.isFree && p.price !== 0) {
          ctx.addIssue({ code: 'custom', path: ['price'], message: 'a free product must have price: 0' });
        }
        if (p.isBundle && p.bundleItems.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['bundleItems'], message: 'a bundle must list its bundleItems' });
        }
        if (p.status === 'published') {
          if (!Object.values(p.stores).some(Boolean)) {
            ctx.addIssue({ code: 'custom', path: ['stores'], message: 'a published product needs at least one store link' });
          }
          // TODO markers left by the import script must be fixed before publishing.
          const hasTodo = JSON.stringify(p, (_k, v) => (v && typeof v === 'object' && 'src' in v ? undefined : v)).includes('TODO');
          if (hasTodo) {
            ctx.addIssue({ code: 'custom', message: 'still has a TODO in it; fix it or set status: draft' });
          }
        }
      });
  },
});

export const collections = { products };

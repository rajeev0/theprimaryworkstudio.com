# Content guide

How to make products look good on the site. For *how* to add a product, see the README.

## The brand rules

- Always write the full name: **The Primary Work Studio**. Never "The Primary Studio" (that's
  a different TpT store).
- Tagline: **Montessori shelf work**.
- **No age range in site-wide branding.** The header, footer, home page, About page,
  logo and banners never say "Ages 3–5" or "PreK". The shop may grow to serve older
  children. Ages and grades go **only on individual products**, in the `grade` and
  `ages` fields. (Revathi's own experience in a pre-K classroom can be mentioned on
  About, because that's a fact about her, not a limit on the shop.)
- Don't recolor, stretch or crop the logo, and keep clear space around it.
- Calm and uncluttered: no neon, busy borders, clip-art clutter or stock photos of children.

## Images

| File | Shape | Size | Notes |
|---|---|---|---|
| `cover.png` | square | **1500 × 1500** (min 1000) | Title readable when small, since the shop grid shows it at about 250px |
| `preview1.png` … `preview4.png` | square | 1500 × 1500 | Real pages, with the **PREVIEW** watermark on full pages. Up to 8 allowed. |
| `pin.png` | tall **2:3** | **1000 × 1500** | Used for Pinterest and when the page is shared on social media |

- PNG is best (JPG and WebP work too). Keep each file **under 3 MB**.
- Use the same images as TpT and Etsy; there's no need to make new ones.
- The site automatically makes small, fast AVIF/WebP versions. You never need to resize.
- **Never** add the paid PDFs, ZIPs or unwatermarked full pages.

## Writing

**Title** (`title`): short and clear, the part of the TpT title before the first `|`.
*"-ck Words Phonics Worksheets"*, not the whole keyword string. The full TpT title goes in
`seoTitle`, where search engines use it.

**Short description** (`shortDescription`): one or two sentences, under 220 characters.
It appears under the title and in Google results. Say what it is and what children do:
*"Two no-prep -ck word worksheets: write the word and cut & paste, with clear pictures for 10 words."*

**Full description** (the text under the `---` in `index.md`):
- Start with what the child does, in plain words.
- One idea per paragraph; leave a blank line between paragraphs.
- Put lists in the fields, not the text: **What's included** → `whatsIncluded`,
  **Words** → `words`, **Skills** → `skills`. The page shows them nicely.
- Keep the AI-art note if the product uses AI-assisted line art.
- Leave out Etsy-only lines ("Nothing will be shipped"); the site already says so.

## Subjects, themes and seasons

These make the shop filters and the "Browse" tiles on the home page.

**Subject**: the Montessori area, from this fixed list (one or more):
`Language`, `Literacy`, `Math`, `Practical Life`, `Sensorial`, `Art`, `Geography`,
`Science`, `Culture`, `Music`.
- Phonics, reading and writing: **Language** + **Literacy**
- Counting, numbers: **Math**
- Continents, maps, flags: **Geography** (use the Montessori continent colors in the product)

To add a new subject, add it to `SUBJECTS` in `src/content.config.ts` and to `.pages.yml`.

**Theme**: free text; each theme gets its own page (`/shop/theme/phonics/`).
- Reuse existing themes exactly as spelled (check the shop page). "Phonics" and "phonics"
  would make two pages.
- Good themes describe the *topic or skill family*: *Phonics*, *Double Final Consonants*,
  *Cut & Paste*, *Farm Animals*, *Fall Leaves*.
- Two to four themes per product is plenty.

**Season** (optional): `Fall`, `Winter`, `Spring`, `Summer`, `Back to School`, `Holidays`,
`All Year`. Only set it for seasonal products.

**Grade** (required): written the same way every time so the filter groups them:
`PreK–1` (with an en dash "–"), `PreK`, `K–1`, `K–2`, `1–2`. **Ages** (optional): `Ages 3–5`.

## Featured, New and drafts

- `featured: true` puts a product in the home page's **Featured** row (up to 4). Keep it to
  bundles and best sellers.
- **New** badges are automatic for 60 days after `publishedDate`.
- `status: "draft"` hides a product from the live site. Use it while a product is unfinished.

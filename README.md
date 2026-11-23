# The Primary Work Studio website

The showcase website for **The Primary Work Studio** (Montessori shelf work), at
<https://theprimaryworkstudio.com>.

The site doesn't sell anything. Each product page has a button for every store
where that product is sold (Teachers Pay Teachers now, Etsy and others later).
It's a static site built with [Astro](https://astro.build) and hosted free on
**Cloudflare Workers** (static assets only, set up in `wrangler.jsonc`). There's no
server code, no database and no paid service.

**Contents**
1. [Run the site on your computer](#1-run-the-site-on-your-computer)
2. [Add a product (three ways)](#2-add-a-product)
3. [Common changes](#3-common-changes): price, Etsy link, featured, draft
4. [Check before you publish](#4-check-before-you-publish)
5. [Deploy to Cloudflare](#5-deploy-to-cloudflare)
6. [Connect theprimaryworkstudio.com](#6-connect-the-domain)
7. [Optional extras](#7-optional-extras): analytics, newsletter
8. [Where things live](#8-where-things-live)

See also **[CONTENT_GUIDE.md](CONTENT_GUIDE.md)** for image sizes and writing tips.

---

## 1. Run the site on your computer

**One-time setup**
1. Install **Node.js 24** from <https://nodejs.org> (the "LTS" button) and **Git** from <https://git-scm.com>.
2. Open a terminal in this folder and run:
   ```
   npm ci
   ```

**Every time**
```
npm run dev
```
Open <http://localhost:4321>. The page reloads as you edit files. Press `Ctrl+C` to stop.

On your computer, **draft** products show up with a "Draft" badge so you can preview them.
They never appear on the live site.

To see exactly what will be published: `npm run build`, then `npm run preview`.

---

## 2. Add a product

Every product is **one folder** in `src/content/products/`. For example:

```
src/content/products/ck-words-phonics-pack/
  index.md        ← the details (title, price, store links…) + full description
  cover.png       ← square 1500×1500
  preview1.png … preview4.png
  pin.png         ← tall 1000×1500 (Pinterest)
```

The folder name becomes the web address: `/products/ck-words-phonics-pack/`.

> **Never** put the paid PDFs or ZIPs (`*_Letter.pdf`, `*_A4.pdf`, `*_TpT.zip`) or a
> `source/` folder in this repo. Git ignores them, and the check fails if one turns up.

### Method 1: Browser form (no code) with Pages CMS ★ easiest

[Pages CMS](https://pagescms.org) is a free editor that works in the browser. You fill
in a form and upload images, and it saves the files straight into the GitHub repo.
Cloudflare then rebuilds the site in a minute or two. It needs no server and no
GitHub OAuth app.

**One-time setup (Rajeev)**
1. Push this repo to GitHub (see [section 5](#5-deploy-to-cloudflare)).
2. Go to <https://app.pagescms.org> and click **Sign in with GitHub**.
3. When asked, **install the Pages CMS GitHub App** and give it access to *only* this repository.
4. Invite the shop owner: they need a free GitHub account. Either add them as a collaborator on the
   repo (GitHub → Settings → Collaborators), or invite them by email from Pages CMS
   (Settings → Collaborators).
5. Open the repo in Pages CMS. It reads `.pages.yml` and shows a **Products** section.
6. **Test it once:** add a throwaway product as a *draft* and check that Pages CMS saved
   it as `src/content/products/<name>/index.md`. If it saved it somewhere else, use the
   Media/Files view to create the folder first, or fall back to method 2 or 3, and tell Rajeev.

**Adding a product (shop owner)**
1. In Pages CMS, open **Media**, create a folder with the product's name
   (e.g. `ff-words-phonics-pack`), and upload `cover.png`, `preview1-4.png` and `pin.png` into it.
2. Open **Products → Add an entry**. Fill in the form, and pick the images from that folder.
3. Leave **Status** as *draft* to save without publishing. Change it to *published* when ready.
4. Click **Save**. The site updates in about 2 minutes.

If something is wrong (for example a missing required field), the Cloudflare build fails and
the old site stays up. The error message names the product and the field.

### Method 2: Import from `05_Published` (one command)

Our finished products already live in `C:\git-repo\The Primary Work Studio Shop\05_Published\`, each with
a `listing.txt` and the images. To import one:

```
npm run add-product -- "C:/git-repo/The Primary Work Studio Shop/05_Published/2026-11-17_ck-words_phonics-pack"
```

To import every folder at once (folders already on the site are skipped):

```
npm run add-product -- --all "C:/git-repo/The Primary Work Studio Shop/05_Published"
```

Options: `--dry-run` shows what would happen without writing anything.
`--force` overwrites a product that's already on the site.

What it does:
- reads `listing.txt` and creates `src/content/products/<name>/index.md`
- the site title is the part of the TpT title **before the first `|`**. The full TpT title is kept as the SEO title.
- store links come from the `PUBLISHED` line. Words, skills, page count, formats and
  "What's included" are pulled out of the full description.
- leaves out `[Etsy only]` lines and the `REVIEWED BY` line
- copies **only** `cover.png`, `preview*.png` and `pin.png`. PDFs, ZIPs and `source/` are never copied.
- anything it can't work out is written as **`TODO`**, and the product is saved as a **draft**.
  Open its `index.md`, replace each TODO (the comment at the top lists them), and change
  `status: "draft"` to `status: "published"`.

Then run `npm run check` and commit.

### Method 3: Copy the template by hand

1. Copy the folder `src/content/products/_template/` and rename the copy, e.g. `ff-words-phonics-pack`.
2. Put the images in it.
3. Edit `index.md`. Every field has a comment explaining it.
4. Run `npm run check`.

---

## 3. Common changes

All of these are edits to a product's `index.md` (or the same field in Pages CMS).

| I want to… | Change this |
|---|---|
| **Change a price** | `price: 1.00` → `price: 1.50` |
| **Add an Etsy link** | under `stores:` add `  etsy: "https://www.etsy.com/listing/…"`. A "Buy on Etsy" button appears automatically. |
| Add TES / Made By Teachers / Boom | `tes:`, `madeByTeachers:`, `boom:` under `stores:` |
| **Feature on the home page** | `featured: true` |
| **Hide a product** (keep it but take it off the site) | `status: "draft"` |
| Make it free | `price: 0` and `isFree: true`. The store link should be its free TpT download. A **Freebies** page appears automatically. |
| Make a bundle | `isBundle: true` and list the products' folder names under `bundleItems:` |
| Change the shop's TpT/Etsy store links in the footer | `src/site.ts` |

"New" badges are automatic: a product counts as new for 60 days after its `publishedDate`
(change the number in `src/site.ts`).

---

## 4. Check before you publish

```
npm run check
```

This:
- fails if any **PDF, ZIP or `source/` folder** is in the repo
- checks images: cover and previews square and at least 1000px, pin 2:3, each under 3 MB
- checks no published product still has a `TODO`
- builds the site, which checks every product's fields (with a clear message saying which product and which field is wrong)
- checks every internal link and image on the built site

The same check runs automatically on GitHub for every pull request and every push to `main`.

---

## 5. Deploy to Cloudflare

The site is deployed as a **Cloudflare Worker that only serves static files**. There is no
Worker script: `wrangler.jsonc` tells Cloudflare to serve the built `dist/` folder, to show
`404.html` for unknown pages, and the `public/_headers` file sets caching headers.

**Push to GitHub (once)**
1. Create an empty **private** repository on GitHub, e.g. `theprimaryworkstudio.com`.
2. In this folder:
   ```
   git remote add origin https://github.com/<you>/theprimaryworkstudio.com.git
   git push -u origin main
   ```

**Create the Worker (once)**
1. Log in to <https://dash.cloudflare.com> (a free account is enough).
2. **Workers & Pages → Create → Import a repository**, then pick the repository.
3. Settings:

   | Setting | Value |
   |---|---|
   | Project name | `theprimaryworkstudio-com` (must match `name` in `wrangler.jsonc`) |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Build variable | `NODE_VERSION` = `24.11.1` (optional: Cloudflare also reads `.nvmrc`) |

4. **Deploy.** After about 2 minutes the site is live at
   `https://theprimaryworkstudio-com.<your-account>.workers.dev`. **Check everything there first.**

**From then on**
- Every push to `main`, including every save in Pages CMS, **deploys to production**.
- Pushes to other branches build a **preview version** with its own URL, shown in
  Cloudflare under the Worker's *Deployments* and on the GitHub pull request.
- If a build fails, the previous version stays live. See *Deployments* in Cloudflare for the error.

---

## 6. Connect the domain

`theprimaryworkstudio.com` is registered at **Porkbun**. Today it forwards (302) to the
TpT store, and Porkbun forwards email for `info@` and `hello@`.

**Recommended: move the nameservers to Cloudflare.** Cloudflare can only serve the
bare domain (`theprimaryworkstudio.com`, without `www`) when Cloudflare runs its DNS. The
other option, CNAME records at Porkbun, only works for `www.` and would leave the bare
domain stuck on a Porkbun redirect, the opposite of what we want. The domain stays
registered (and paid for) at Porkbun; only the DNS moves.

### Step 1: Check the site on `*.workers.dev`
Finish [section 5](#5-deploy-to-cloudflare) and click through the workers.dev site.

### Step 2: Write down the current Porkbun settings
In Porkbun → **Domain Management → theprimaryworkstudio.com**:
- **DNS records**: take a screenshot of all of them.
- **Email forwarding**: note the forwards (`info@` → …, `hello@` → …). These settings stay at
  Porkbun and keep working, as long as the MX records below exist in Cloudflare.
- **DNSSEC**: if it's on, **turn it off** now and wait a day before step 4.

### Step 3: Add the domain to Cloudflare
1. Cloudflare dashboard → **Add a domain** → `theprimaryworkstudio.com` → **Free** plan.
2. Cloudflare copies the existing DNS records. **Edit the list** so it has exactly these
   email records, and add any that are missing:

   | Type | Name | Content | Priority | Proxy |
   |---|---|---|---|---|
   | MX | `@` | `fwd1.porkbun.com` | 10 | DNS only |
   | MX | `@` | `fwd2.porkbun.com` | 20 | DNS only |
   | TXT | `@` | `v=spf1 include:_spf.porkbun.com ~all` | | |

   (Values from Porkbun's guide,
   [*How to use Porkbun email when your DNS is hosted elsewhere*](https://kb.porkbun.com/article/47-how-to-use-porkbun-email-when-your-dns-is-hosted-elsewhere).)
   Also keep any other `TXT` records from your screenshot (e.g. site verification).
3. **Delete** the copied `A`, `AAAA`, `ALIAS` or `CNAME` records for `@` and `www` that point
   at Porkbun's URL-forwarding servers. Cloudflare replaces them in step 5.
4. Cloudflare shows **two nameservers** (e.g. `xxx.ns.cloudflare.com`). Copy them.

### Step 4: Switch nameservers at Porkbun
Porkbun → Domain Management → theprimaryworkstudio.com → **Authoritative Nameservers → Edit**.
Replace Porkbun's nameservers with Cloudflare's two, then save. Also turn off Porkbun's
**URL forwarding** for the domain. The switch usually takes under an hour (up to 24 h).
Cloudflare emails you when the domain is **Active**.

### Step 5: Attach the domain to the Worker
Cloudflare → **Workers & Pages → theprimaryworkstudio-com → Settings → Domains & Routes → Add → Custom domain**:
1. Enter `theprimaryworkstudio.com` → **Add domain**. Cloudflare creates the DNS record and certificate.
2. Do the same for `www.theprimaryworkstudio.com`.

### Step 6: Redirect `www` to the bare domain
Cloudflare → your domain → **Rules → Redirect Rules → Create rule → from template
"Redirect from WWW to root"** (or by hand):
- When: hostname equals `www.theprimaryworkstudio.com`
- Then: dynamic redirect to `concat("https://theprimaryworkstudio.com", http.request.uri.path)`,
  status **301**, *preserve query string* on.

### Step 7: Test
- <https://theprimaryworkstudio.com> shows the site (with the padlock).
- <https://www.theprimaryworkstudio.com/shop/> redirects to <https://theprimaryworkstudio.com/shop/>.
- Send an email to `hello@` and `info@` from another account; both must arrive.
- Optional: <https://mxtoolbox.com> → MX lookup shows `fwd1/fwd2.porkbun.com`.

---

## 7. Optional extras

**Cloudflare Web Analytics** (no cookies, so no cookie banner needed). **Off for now.**
To turn on: Cloudflare → **Analytics & Logs → Web Analytics → Add a site** → copy the token
→ Worker → **Settings → Build → Variables and secrets** → add `PUBLIC_CF_ANALYTICS_TOKEN` =
the token → redeploy. (It must be a *build* variable: the value is baked into the pages when
they're built.) The Privacy page updates its wording automatically.

**"Join the newsletter" section.** **Off.** Set `PUBLIC_SHOW_NEWSLETTER` = `true` to show the
placeholder. It doesn't collect emails until a (free) email service is connected in
`src/components/Newsletter.astro`.

**Pinterest.** Product pages already include the 2:3 `pin.png` as the share image and as
the Pinterest "Save" image, plus price tags for Rich Pins.

---

## 8. Where things live

| What | Where |
|---|---|
| Products | `src/content/products/<name>/` |
| Product fields and rules | `src/content.config.ts` |
| Site name, tagline, intro, email, store links | `src/site.ts` |
| Colors and fonts | `src/styles/global.css` |
| Pages (home, shop, about, terms, privacy…) | `src/pages/` |
| Logo, favicon, fonts and licenses | `public/brand/`, `public/fonts/` (OFL license files included) |
| Pages CMS form | `.pages.yml` |
| Import / check scripts | `scripts/` |
| Automatic check on GitHub | `.github/workflows/check.yml` |

**Colour accessibility note:** the brand terracotta `#C8734A` is too light for text or for
white text on a button (3.3:1 and 3.5:1; WCAG AA needs 4.5:1). Buttons, prices and the
tagline use a deeper terracotta, `#A85C38` (4.9:1 with white, 4.7:1 on cream). The original
`#C8734A` is still used for decorative lines and borders. Sage, charcoal and mustard
(with charcoal text) all pass as they are.

**Commands**

| Command | What it does |
|---|---|
| `npm run dev` | Run locally with live reload (drafts visible) |
| `npm run build` | Build the live site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run check` | All checks (run before publishing) |
| `npm run add-product -- <folder>` | Import a product from `05_Published` |

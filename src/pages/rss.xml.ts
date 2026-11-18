import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../site';
import { getProducts, productUrl, formatPrice } from '../lib/products';

export async function GET(context: APIContext) {
  const products = (await getProducts()).filter((p) => p.data.status === 'published').slice(0, 30);
  return rss({
    title: `${SITE.name}: new products`,
    description: `New ${SITE.tagline} printables from ${SITE.name}.`,
    site: context.site!,
    items: products.map((p) => ({
      title: p.data.title,
      link: productUrl(p),
      pubDate: p.data.publishedDate,
      description: `${p.data.shortDescription} (${p.data.grade}, ${formatPrice(p)})`,
      categories: [...p.data.subject, ...p.data.theme],
    })),
    customData: '<language>en-us</language>',
  });
}

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://theprimaryworkstudio.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  image: {
    // Product source PNGs are 1500px; we never need larger outputs.
    responsiveStyles: true,
  },
});

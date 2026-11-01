import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://example.com';
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  build: { format: 'directory' },
});

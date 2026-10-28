import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Adresse publique et sous-dossier : préproduction GitHub Pages par défaut.
// À la bascule : SITE_URL=https://radio-monaco.com BASE_PATH=/ INDEXABLE=1
const SITE = process.env.SITE_URL || 'https://nikoprdn.github.io';
const BASE = process.env.BASE_PATH ?? '/RM-test';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [sitemap({ filter: (page) => !page.includes('/hors-ligne/') })],
  vite: { build: { assetsInlineLimit: 0 } }
});

import { INDEXABLE } from '../lib/url.js';
export function GET({ site }) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const body = INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL(base + "/sitemap-index.xml", site).href}\nSitemap: ${new URL(base + "/news-sitemap.xml", site).href}\n`
    : `# Préproduction : ne pas indexer\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

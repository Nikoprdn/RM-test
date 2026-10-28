// Sitemap Google News : les articles des 2 derniers jours (règle Google), mis à jour à chaque construction.
import { getPosts } from '../lib/data.js';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export async function GET({ site }) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const posts = await getPosts();
  const newest = posts.reduce((m, p) => Math.max(m, +new Date(p.date)), 0);
  // en démonstration (données figées) on garde les 2 jours précédant le dernier article
  const since = Math.min(Date.now(), newest || Date.now()) - 2 * 864e5;
  const items = posts.filter((p) => +new Date(p.date) >= since).slice(0, 1000).map((p) => `  <url>
    <loc>${new URL(base + p.path, site).href}</loc>
    <news:news><news:publication><news:name>Radio Monaco</news:name><news:language>fr</news:language></news:publication>
      <news:publication_date>${new Date(p.date).toISOString()}</news:publication_date><news:title>${esc(p.title)}</news:title></news:news>
  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

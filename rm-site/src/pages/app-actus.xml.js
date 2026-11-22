// Flux RSS des actualités pour la section « Actualités » de l'application (GoodBarber).
// Le flux de WordPress (radio-monaco.com/feed/) ne donne ni image ni texte complet : l'application affichait des
// cartes vides. Celui-ci repart de l'API WordPress, avec l'image à la une (media:content, enclosure) et l'article entier.
import { getPosts } from '../lib/data.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cdata = (s) => '<![CDATA[' + String(s || '').replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
// liens internes de l'article : vers radio-monaco.com (l'application ouvre le vrai site) ; images : adresses complètes
const SITE = process.env.SITE_URL || 'https://nikoprdn.github.io', BP = process.env.BASE_PATH || '', BASE = SITE;
// l'API ne donne pas toujours le nom de l'auteur (comptes masqués) : Yoast l'a, comme l'ancien flux
const auteur = (p) => (p.author && p.author !== 'La rédaction' ? p.author : (p.seo && p.seo.author) || p.author);
const type = (u) => (/\.png(\?|$)/i.test(u) ? 'image/png' : /\.webp(\?|$)/i.test(u) ? 'image/webp' : 'image/jpeg');

export async function GET() {
  const posts = (await getPosts().catch(() => [])).slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);
  const items = posts.map((p) => {
    const im = p.img ? (p.img.large || p.img.full) : '';
    const html = (p.html || '').replace(/href="\/(?!\/)/g, 'href="' + BASE + '/').replace(/src="\/(?!\/)/g, 'src="' + SITE + '/')
      .replace(new RegExp('href="' + BASE + BP + '/', 'g'), 'href="https://radio-monaco.com/');
    const corps = (im ? `<p><img src="${esc(im)}" alt="${esc(p.img.alt || p.title)}" width="${p.img.w}" height="${p.img.h}"></p>` : '') + (html || `<p>${esc(p.excerpt)}</p>`);
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(p.link)}</link>
      <guid isPermaLink="false">radio-monaco-${p.id}</guid>
      <pubDate>${new Date(p.date + (/[zZ+]/.test(p.date.slice(10)) ? '' : '+01:00')).toUTCString()}</pubDate>
      <dc:creator>${esc(auteur(p))}</dc:creator>
      <category>${esc(p.cat)}</category>
      <description>${cdata(p.excerpt)}</description>
      <content:encoded>${cdata(corps)}</content:encoded>${im ? `
      <media:content url="${esc(im)}" medium="image" type="${type(im)}" width="${p.img.w}" height="${p.img.h}"/>
      <media:thumbnail url="${esc(p.img.card || im)}"/>
      <enclosure url="${esc(im)}" type="${type(im)}" length="0"/>` : ''}
    </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Radio Monaco · Actualités</title>
    <link>https://radio-monaco.com/actualites/</link>
    <description>Les actualités de Radio Monaco</description>
    <language>fr-FR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

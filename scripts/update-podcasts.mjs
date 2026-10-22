// Met à jour podcasts.json à partir des flux RSS Ausha de Radio Monaco.
// Lancé automatiquement par .github/workflows/podcasts.yml (Node 20+, aucune dépendance).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const FEEDS = {
  emissions: 'https://feed.ausha.co/oZ4LnUZDvP6E',
  mixdj: 'https://feed.ausha.co/y0lvAIWDdvnm',
  horoscope: 'https://feed.ausha.co/b7gp6fE419Rl'
};
// Émission -> [flux, motif du titre]. L'ordre et les noms affichés sont définis dans index.html.
const SHOWS = {
  morning: ['emissions', /^le morning (made in monte[- ]carlo|de l['’]été)/i],
  echo: ['emissions', /^l['’][ée]cho du rocher/i],
  feelgood: ['emissions', /^(la |les )?feel good news/i],
  switchon: ['emissions', /^switch on/i],
  curious: ['emissions', /^be curious/i],
  feed: ['emissions', /^le feed/i],
  agenda: ['emissions', /^l['’]agenda/i],
  completez: ['emissions', /^compl[ée]tez l['’]info/i],
  business: ['emissions', /^monaco business/i],
  etoiles: ['horoscope', /./],
  sunny: ['mixdj', /^sunny time/i],
  goodvibes: ['mixdj', /^good vibes/i],
  golden: ['mixdj', /^golden hour/i],
  deelighted: ['mixdj', /^deelighted/i],
  house: ['mixdj', /^house therapy/i],
  afterchic: ['mixdj', /^after chic/i],
  bemyguest: ['mixdj', /^be my\s+guest/i],
  sidekick: ['mixdj', /^sidekick/i],
  timeless: ['mixdj', /^timeless/i],
  weekend: ['mixdj', /^week[- ]?end change/i]
};
const PER_SHOW = 6;

const decode = (s) => s
  .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .trim();
const tag = (xml, name) => { const m = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>')); return m ? decode(m[1]) : ''; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp('<' + name + '\\b[^>]*\\b' + a + '="([^"]*)"')); return m ? m[1] : ''; };
const secs = (s) => (s ? s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0) : 0);
const clean = (k, feed, t) => {
  if (feed === 'mixdj') { const g = t.match(/with\s+(.+?)\s*\(/i); return k === 'bemyguest' && g ? 'Avec ' + g[1].trim() : ''; }
  if (k === 'morning') return t.replace(/^.*?–\s*/, '');
  if (k === 'etoiles') return t;
  return t.replace(/^[^:]+:\s*/, '');
};

const items = {};
for (const [k, url] of Object.entries(FEEDS)) {
  const res = await fetch(url, { headers: { 'user-agent': 'RadioMonaco-site/1.0' } });
  if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
  items[k] = [...(await res.text()).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}
const lines = [];
for (const [k, [feed, re]] of Object.entries(SHOWS)) {
  const eps = items[feed].filter((x) => re.test(tag(x, 'title'))).slice(0, PER_SHOW);
  for (const x of eps) {
    const title = tag(x, 'title');
    const img = (attr(x, 'itunes:image', 'href').match(/image\.ausha\.co\/([A-Za-z0-9]+)_1400x1400/) || [])[1] || '';
    const au = (attr(x, 'enclosure', 'url').match(/audio\.ausha\.co\/([A-Za-z0-9]+)\.mp3/) || [])[1] || '';
    if (!au) continue;
    const d = new Date(tag(x, 'pubDate')).toISOString().slice(0, 16);
    lines.push([k, d, secs(tag(x, 'itunes:duration')), img, au, clean(k, feed, title).replace(/\|/g, '/')].join('|'));
  }
}
if (lines.length < 20) throw new Error('Trop peu d’épisodes (' + lines.length + '), fichier non modifié.');
const out = 'podcasts.json';
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
if (prev && JSON.stringify(prev.lines) === JSON.stringify(lines)) { console.log('Aucun nouvel épisode.'); process.exit(0); }
writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), lines }, null, 0) + '\n');
console.log('podcasts.json mis à jour : ' + lines.length + ' épisodes.');

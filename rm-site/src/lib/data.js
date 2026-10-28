// Couche de données — lue au moment de la construction du site (build).
// WordPress (radio-monaco.com) pour les articles, l'équipe, les émissions et la grille ;
// Ausha pour les podcasts. En local, RM_FIXTURES=1 utilise des données de démonstration.
import { readFileSync, existsSync } from 'node:fs';

const env = (k, d) => (typeof process !== 'undefined' && process.env[k]) || d;
export const WP = env('WP_URL', 'https://radio-monaco.com').replace(/\/$/, '');
const API = WP + '/wp-json';
const FIX = env('RM_FIXTURES', '') === '1';
const MAX_POSTS = +env('MAX_POSTS', '0') || Infinity;

const memo = new Map();
const once = (key, fn) => { if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };
const fixture = (name) => JSON.parse(readFileSync(new URL('../../fixtures/' + name, import.meta.url), 'utf8'));

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'RadioMonaco-site/1.0' } });
      if (r.ok) return { json: await r.json(), headers: r.headers };
      if (r.status === 400 || r.status === 404) return { json: [], headers: r.headers };
    } catch (e) { if (i === tries - 1) throw e; }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  throw new Error('WordPress injoignable : ' + url);
}

async function paged(path, perPage = 100, max = Infinity) {
  const out = [];
  for (let page = 1; out.length < max; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const { json, headers } = await getJSON(`${API}${path}${sep}per_page=${perPage}&page=${page}`);
    if (!Array.isArray(json) || !json.length) break;
    out.push(...json);
    const total = +(headers.get('x-wp-totalpages') || 1);
    if (page >= total) break;
  }
  return out.slice(0, max);
}

// ---------- utilitaires texte ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
export const decode = (s = '') => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export const text = (html = '') => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
export const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOISC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const dateLong = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
export const dateShort = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MOISC[d.getMonth()]}`; };

// Chemin relatif d'une adresse WordPress (on garde les mêmes adresses pour le référencement)
export const wpPath = (link = '') => { try { const p = new URL(link).pathname; return p.endsWith('/') ? p : p + '/'; } catch (e) { return '/'; } };

// ---------- catégories ----------
export const getCategories = () => once('cats', async () => {
  const list = FIX ? fixture('categories.json') : await paged('/wp/v2/categories?_fields=id,name,slug,link,count,description', 100);
  return list.filter((c) => c.count > 0 && c.slug !== 'non-classe').map((c) => ({ ...c, name: niceCat(decode(c.name)) }));
});
const CATNAMES = { 'a-la-une': 'À la une', 'business-tech': 'Business & Tech', 'cote-dazur': 'Côte d’Azur', 'culture-media': 'Culture & Médias', 'new-york': 'New York', 'alpes-maritimes': 'Alpes-Maritimes' };
function niceCat(n) { const s = n.toLowerCase(); const t = s.replace(/(^|[\s/-])(\S)/g, (m, a, b) => a + b.toUpperCase()); return t.replace('Usa', 'USA'); }
export const catLabel = (c) => CATNAMES[c.slug] || c.name;

// ---------- articles ----------
const POST_FIELDS = 'id,slug,link,date,modified,title,content,excerpt,categories,tags,author,yoast_head_json,_links,_embedded';
export const getPosts = () => once('posts', async () => {
  const raw = FIX ? fixture('posts.json') : await paged(`/wp/v2/posts?_embed=author,wp:featuredmedia&_fields=${POST_FIELDS}`, 100, MAX_POSTS);
  const cats = await getCategories();
  const byId = new Map(cats.map((c) => [c.id, c]));
  return raw.map((p) => normalizePost(p, byId));
});

function media(x) {
  const m = x._embedded && x._embedded['wp:featuredmedia'] && x._embedded['wp:featuredmedia'][0];
  if (!m || !m.source_url) return null;
  const sizes = (m.media_details && m.media_details.sizes) || {};
  const pick = (k) => sizes[k] && sizes[k].source_url;
  const srcset = Object.values(sizes).filter((s) => s.width >= 300 && s.width === (s.width | 0) && s.source_url && !/x(100|150|370)\./.test(s.source_url))
    .sort((a, b) => a.width - b.width).map((s) => `${s.source_url} ${s.width}w`).join(', ');
  return {
    full: m.source_url, large: pick('large') || pick('1536x1536') || m.source_url, medium: pick('medium_large') || pick('large') || m.source_url,
    card: pick('proradio-card') || pick('medium_large') || m.source_url, srcset,
    w: (m.media_details && m.media_details.width) || 1200, h: (m.media_details && m.media_details.height) || 800, alt: decode(m.alt_text || '')
  };
}

function normalizePost(p, byId) {
  const cats = (p.categories || []).map((id) => byId.get(id)).filter(Boolean);
  const main = cats.find((c) => !['a-la-une', 'news'].includes(c.slug)) || cats[0] || null;
  const author = p._embedded && p._embedded.author && p._embedded.author[0] && p._embedded.author[0].name;
  return {
    id: p.id, slug: p.slug, path: wpPath(p.link), link: p.link, date: p.date, modified: p.modified,
    title: text(p.title.rendered), excerpt: text(p.excerpt.rendered), html: cleanHTML(p.content.rendered),
    cats, cat: main ? catLabel(main) : 'Actualité', catSlug: main ? main.slug : '', une: (p.categories || []).includes(39),
    author: author || 'La rédaction', img: media(p), seo: p.yoast_head_json || null
  };
}

// Nettoyage léger du HTML WordPress (attributs d’éditeur, styles inline, liens internes)
const BASEP = (env('BASE_PATH', '/RM-test') || '').replace(/\/$/, '');
export function cleanHTML(h = '') {
  return h
    .replace(/\s(data-[\w-]+|class|style|id)="[^"]*"/g, '')
    .replace(/<p>(\s|&nbsp;)*<\/p>/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/href="https?:\/\/(www\.)?radio-monaco\.com(\/(?!wp-content)[^"]*)"/g, (m, w, p) => 'href="' + BASEP + p + '"');
}

// ---------- équipe & émissions ----------
const typ = (x) => ((x.class_list || []).find((c) => c.startsWith('membertype-')) || '').slice(11);
export const getMembers = () => once('members', async () => {
  const raw = FIX ? fixture('members.json') : await paged('/wp/v2/members?_embed=wp:featuredmedia&_fields=id,slug,link,title,content,class_list,yoast_head_json,_links,_embedded', 50);
  return raw.map((m) => ({ id: m.id, slug: m.slug, path: wpPath(m.link), name: text(m.title.rendered), bio: text(m.content.rendered), html: cleanHTML(m.content.rendered), type: typ(m), img: media(m), seo: m.yoast_head_json || null }));
});
export const getShows = () => once('shows', async () => {
  const raw = FIX ? fixture('shows.json') : await paged('/wp/v2/shows?_embed=wp:featuredmedia&_fields=id,slug,link,title,excerpt,content,class_list,yoast_head_json,_links,_embedded', 50);
  return raw.map((s) => ({ id: s.id, slug: s.slug, path: wpPath(s.link), name: text(s.title.rendered), excerpt: text(s.excerpt.rendered), html: cleanHTML(s.content.rendered.split(/Afficher les épisodes/)[0]), dj: (s.class_list || []).includes('genre-dj-sets'), img: media(s), seo: s.yoast_head_json || null }));
});

export const getTeam = async () => {
  const ORD = { animateur: 0, animatrice: 1, journaliste: 2 };
  const LBL = { animateur: 'Animateur', animatrice: 'Animatrice', journaliste: 'Journaliste' };
  return (await getMembers()).filter((m) => ORD[m.type] !== undefined).sort((a, b) => ORD[a.type] - ORD[b.type]).map((m) => {
    let role = m.bio.split(/[!.🎙]/)[0].replace(m.name, '').replace(/^\s*est\s+/i, '').trim();
    role = role.replace(/^(l[’']|la |le )?(co-)?anim\w+\s+(du|de la|de l[’'])\s*/i, '').replace(/^morning/i, 'Le Morning').split(' et ')[0];
    role = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'L’info de la Principauté et de la Riviera';
    const [first, ...rest] = m.name.split(' ');
    return { ...m, first, last: rest.join(' '), role: LBL[m.type] + ' · ' + role };
  });
};

export const getDJs = async () => {
  const members = (await getMembers()).filter((m) => m.type === 'dj');
  const SPEC = { 'sidekick radio show': 'Jem’S', 'be my guest': 'DJ invité' };
  return (await getShows()).filter((s) => s.dj).map((s) => {
    const ex = s.excerpt.toLowerCase();
    const mem = members.find((m) => { const n = m.name.toLowerCase(); const c = m.bio.toLowerCase().slice(0, 45); return n === s.name.toLowerCase() || ex.includes(n) || (c.length > 20 && ex.includes(c)); });
    const sch = (s.excerpt.match(/(tous les|chaque)\s+\S+\s+(de\s+|à\s+)?\d{1,2}h(\s*à\s*\d{1,2}h)?/i) || [''])[0];
    return { name: mem ? mem.name : (SPEC[s.name.toLowerCase()] || s.name), show: s.name, when: sch ? sch.charAt(0).toLowerCase() + sch.slice(1) : '', img: (mem && mem.img) || s.img, path: s.path, member: mem ? mem.path : null };
  });
};

// ---------- grille du jour ----------
export const getToday = () => once('today', async () => {
  const raw = FIX ? fixture('today.json') : (await getJSON(API + '/proradio/v1/schedule-today-full')).json;
  return (Array.isArray(raw) ? raw : []).map((x) => ({ name: decode(x.name), desc: text(x.description || ''), start: x.broadcaststart, end: x.broadcastend, img: x.thumbnail, id: x.uid }));
});

// ---------- podcasts (Ausha) ----------
export const PODCAST_FEEDS = { emissions: 'https://feed.ausha.co/oZ4LnUZDvP6E', mixdj: 'https://feed.ausha.co/y0lvAIWDdvnm', horoscope: 'https://feed.ausha.co/b7gp6fE419Rl' };
export const PODCAST_SHOWS = [
  ['morning', 'emissions', 'Le Morning', 'Made in Monte-Carlo · Léo, Giulia & Marie', /^le morning (made in monte[- ]carlo|de l['’]été)/i],
  ['echo', 'emissions', 'L’Écho du Rocher', 'L’actualité de la Principauté', /^l['’][ée]cho du rocher/i],
  ['feelgood', 'emissions', 'La Feel Good News', 'La bonne nouvelle du jour', /^(la |les )?feel good news/i],
  ['switchon', 'emissions', 'Switch On', 'Nos vies connectées, décryptées', /^switch on/i],
  ['completez', 'emissions', 'Complétez l’info', 'Le quiz de l’actu', /^compl[ée]tez l['’]info/i],
  ['feed', 'emissions', 'Le Feed', 'Ce qui fait parler sur la Riviera', /^le feed/i],
  ['agenda', 'emissions', 'L’Agenda', 'Les sorties à ne pas manquer', /^l['’]agenda/i],
  ['curious', 'emissions', 'Be Curious', 'Culture, séries & tendances', /^be curious/i],
  ['business', 'emissions', 'Monaco Business', 'Les entrepreneurs de la Principauté', /^monaco business/i],
  ['etoiles', 'horoscope', 'Les Étoilés', 'L’horoscope du jour', /./],
  ['sunny', 'mixdj', 'Sunny Time', 'by Rhum G', /^sunny time/i],
  ['goodvibes', 'mixdj', 'Good Vibes', 'by Matt Forti', /^good vibes/i],
  ['golden', 'mixdj', 'Golden Hour', 'by Mynarya', /^golden hour/i],
  ['deelighted', 'mixdj', 'Deelighted', 'by La Cartoucherie', /^deelighted/i],
  ['house', 'mixdj', 'House Therapy', 'by DJ Eight & Gil Martin', /^house therapy/i],
  ['afterchic', 'mixdj', 'After Chic', 'by Yann One', /^after chic/i],
  ['bemyguest', 'mixdj', 'Be My Guest', 'Les invités du week-end', /^be my\s+guest/i],
  ['sidekick', 'mixdj', 'Sidekick Radio Show', 'by Jem’S', /^sidekick/i],
  ['timeless', 'mixdj', 'Timeless', 'by Adore', /^timeless/i],
  ['weekend', 'mixdj', 'Week-End Change', 'by Pampa', /^week[- ]?end change/i]
];
export const FEED_COLOR = { emissions: '#E4032E', mixdj: '#F59C00', horoscope: '#8A5AA1' };
export const FEED_LABEL = { emissions: 'Le Morning & chroniques', mixdj: '100 % Mix DJ', horoscope: 'Horoscope' };

const xtag = (xml, name) => { const m = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>')); return m ? decode(m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')).trim() : ''; };
const xattr = (xml, name, a) => { const m = xml.match(new RegExp('<' + name + '\\b[^>]*\\b' + a + '="([^"]*)"')); return m ? m[1] : ''; };
const secs = (s) => (s ? s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0) : 0);

export const getPodcasts = () => once('pods', async () => {
  let lines = [];
  if (FIX) lines = readFileSync(new URL('../../fixtures/podcasts.txt', import.meta.url), 'utf8').trim().split('\n');
  else {
    const items = {};
    for (const [k, url] of Object.entries(PODCAST_FEEDS)) {
      // 3 essais ; si un flux reste muet, la construction échoue et la version en ligne est conservée
      for (let i = 0; i < 3 && !items[k]; i++) {
        try { const r = await fetch(url); if (r.ok) items[k] = [...(await r.text()).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]); } catch (e) {}
        if (!items[k]) await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
      }
      if (!items[k] || !items[k].length) throw new Error('Flux Ausha injoignable ou vide : ' + url);
    }
    for (const [k, feed, , , re] of PODCAST_SHOWS) {
      for (const x of (items[feed] || []).filter((x) => re.test(xtag(x, 'title'))).slice(0, 12)) {
        const t = xtag(x, 'title');
        const img = (xattr(x, 'itunes:image', 'href').match(/image\.ausha\.co\/([A-Za-z0-9]+)_1400x1400/) || [])[1] || '';
        const au = (xattr(x, 'enclosure', 'url').match(/audio\.ausha\.co\/([A-Za-z0-9]+)\.mp3/) || [])[1] || '';
        if (!au) continue;
        let title = t;
        if (feed === 'mixdj') { const g = t.match(/with\s+(.+?)\s*\(/i); title = k === 'bemyguest' && g ? 'Avec ' + g[1].trim() : ''; }
        else if (k === 'morning') title = t.replace(/^.*?–\s*/, '');
        else if (k !== 'etoiles') title = t.replace(/^[^:]+:\s*/, '');
        const desc = text(xtag(x, 'description')).slice(0, 400);
        lines.push([k, new Date(xtag(x, 'pubDate')).toISOString().slice(0, 16), secs(xtag(x, 'itunes:duration')), img, au, title.replace(/\|/g, '/'), desc.replace(/\|/g, '/')].join('|'));
      }
    }
  }
  const by = {};
  for (const l of lines) {
    const p = l.split('|'); if (+p[2] < 10) continue;
    (by[p[0]] = by[p[0]] || []).push({ d: p[1], s: +p[2], img: p[3], au: p[4], t: p[5] || '', desc: p[6] || '' });
  }
  return PODCAST_SHOWS.map(([k, feed, name, sub]) => {
    const eps = (by[k] || []).sort((a, b) => (a.d < b.d ? 1 : -1)).map((e) => ({ ...e, title: epTitle(feed, e) }));
    return { k, feed, name, sub, color: FEED_COLOR[feed], eps };
  }).filter((s) => s.eps.length);
});
function epTitle(feed, e) {
  if (feed !== 'mixdj') return e.t;
  const d = new Date(e.d + 'Z');
  return e.t ? `${e.t} · ${d.getDate()} ${MOISC[d.getMonth()]}` : `Émission du ${d.getDate()} ${MOIS[d.getMonth()]}`;
}
export const ausImg = (id, big) => `https://image.ausha.co/${id}_${big ? '1400x1400' : '400x400'}.jpeg`;
export const ausAudio = (id) => `https://audio.ausha.co/${id}.mp3`;
export const dur = (s) => { const m = Math.round(s / 60); if (m < 1) return s + ' s'; if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : ''); };

// ---------- pages institutionnelles WordPress (mêmes adresses : /mentions-legales/, …) ----------
export const LEGAL = ['mentions-legales', 'politique-de-confidentialite', 'conditions-generales-dutilisation', 'reglement-jeux-concours', 'regie-publicitaire'];
export const getPages = () => once('pages', async () => {
  const raw = FIX ? fixture('pages.json') : await paged('/wp/v2/pages?_fields=id,slug,link,modified,title,content,yoast_head_json', 100);
  return raw.filter((p) => LEGAL.includes(p.slug)).map((p) => ({
    slug: p.slug, path: wpPath(p.link), modified: p.modified, title: text(p.title.rendered), seo: p.yoast_head_json || null,
    // Elementor : on ne garde que le texte structuré (titres, paragraphes, listes, liens)
    html: cleanHTML(p.content.rendered)
      .replace(/<(select|form|button|noscript|svg)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/?(div|section|span|svg|path|i|form|input|select|option|button|label|noscript|style)[^>]*>/gi, '')
      .replace(/<img[^>]*>/gi, '').replace(/\n\s*\n+/g, '\n')
  }));
});

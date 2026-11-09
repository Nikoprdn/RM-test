// Réseaux sociaux : abonnés et derniers réels Instagram.
// - Réels et abonnés Instagram : récupérés à chaque construction du site (toutes les heures) si l'une des deux sources est configurée :
//     IG_FEED_URL : flux JSON Behold.so (le plus simple : on connecte le compte Instagram une fois sur behold.so)
//     IG_TOKEN    : jeton de l'API Instagram (compte professionnel, « Instagram API with Instagram Login »)
//   Sans source, on garde la sélection ci-dessous (lib/reels.js).
// - Facebook, TikTok, LinkedIn : chiffres saisis à la main ici (aucune API publique simple).
import { REELS } from './reels.js';

export const SOCIAL = [
  { key: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/radiomonaco_officiel/', followers: 18800 },
  { key: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/radiomonaco', followers: null },
  { key: 'tiktok', name: 'TikTok', url: null, followers: null },
  { key: 'linkedin', name: 'LinkedIn', url: null, followers: null }
];

export const fmtFollowers = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' M' : n >= 1e4 ? (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' k' : String(n));

const clip = (s = '', n = 110) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

async function fetchJSON(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
}

let cache = null;
export async function getInstagram() {
  if (cache) return cache;
  const feed = process.env.IG_FEED_URL, token = process.env.IG_TOKEN;
  let reels = null, followers = null;
  try {
    if (feed) {
      const j = await fetchJSON(feed);
      followers = j.followersCount ?? j.followers_count ?? null;
      const posts = j.posts || j.data || [];
      reels = posts.filter((p) => p.isReel || p.mediaType === 'VIDEO' || p.media_product_type === 'REELS' || p.media_type === 'VIDEO')
        .map((p) => ({ href: p.permalink, img: (p.sizes && (p.sizes.medium || p.sizes.large || {}).mediaUrl) || p.thumbnailUrl || p.thumbnail_url || p.mediaUrl, alt: 'Reel : ' + clip(p.prunedCaption || p.caption || 'Radio Monaco') }));
    } else if (token) {
      const me = await fetchJSON('https://graph.instagram.com/me?fields=followers_count&access_token=' + encodeURIComponent(token));
      followers = me.followers_count ?? null;
      const m = await fetchJSON('https://graph.instagram.com/me/media?fields=media_type,media_product_type,thumbnail_url,permalink,caption,timestamp&limit=30&access_token=' + encodeURIComponent(token));
      reels = (m.data || []).filter((p) => p.media_product_type === 'REELS' || p.media_type === 'VIDEO')
        .map((p) => ({ href: p.permalink, img: p.thumbnail_url, alt: 'Reel : ' + clip(p.caption || 'Radio Monaco') }));
    }
  } catch (e) { console.warn('[instagram] flux indisponible :', e.message); }
  reels = reels && reels.filter((r) => r.href && r.img).slice(0, 10);
  cache = { live: !!(reels && reels.length), reels: reels && reels.length ? reels : REELS, followers };
  return cache;
}

export async function getSocial() {
  const ig = await getInstagram();
  return SOCIAL.map((s) => (s.key === 'instagram' && ig.followers ? { ...s, followers: ig.followers } : s));
}

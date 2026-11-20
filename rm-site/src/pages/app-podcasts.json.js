// Données des podcasts pour l'application mobile (GoodBarber, page « Podcasts ») :
// les flux Ausha ne sont pas lisibles depuis l'application (pas d'en-têtes CORS),
// GitHub Pages l'est. Reconstruit à chaque construction du site (toutes les heures).
import { getPodcasts, ausImg, ausAudio } from '../lib/data.js';

const genre = (s) => (s.feed === 'mixdj' ? 'Mix DJ' : s.feed === 'horoscope' ? 'Horoscope' : s.k === 'morning' ? 'L’intégrale' : 'Chronique');

export async function GET() {
  const pods = await getPodcasts();
  const shows = pods.map((s) => ({
    k: s.k, feed: s.feed, name: s.name, sub: s.sub, color: s.color, genre: genre(s),
    eps: s.eps.slice(0, 12).map((e) => ({ d: e.d, s: e.s, img: ausImg(e.img), au: ausAudio(e.au), t: e.title, desc: e.desc.slice(0, 180) }))
  }));
  return new Response(JSON.stringify({ built: new Date().toISOString(), shows }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

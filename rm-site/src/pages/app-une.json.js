// Fil d'informations de l'accueil de l'application (GoodBarber) : derniers podcasts, dernières actualités,
// jeux en cours. Lu par la ligne défilante de l'accueil (app/accueil.html). Reconstruit à chaque construction du site.
import { getPosts, getPodcasts, ausImg } from '../lib/data.js';

// Jeux à l'antenne : à tenir à jour à la main tant qu'aucune source ne les publie (WordPress n'a pas de rubrique jeux).
// Lus par la ligne défilante de l'accueil et par la page Jeux de l'application (app/jeux.html, piste H « la vitrine »).
// Un jeu dont « debut » est à venir s'affiche en « Bientôt » ; il passe « En cours » à cette date, et disparaît après « fin ».
// {
//   t: 'Deux nuits à Monte-Carlo',                  // titre (obligatoire)
//   sous: 'Suite vue mer, dîner étoilé…',            // une phrase sur le lot
//   img: 'assets/jeux/monte-carlo.jpg',              // photo du lot (chemin du site ou adresse complète)
//   valeur: '2 400 €', gagnants: 1,
//   debut: '2026-11-22', fin: '2026-11-30T23:59', tirage: '2026-12-01',
//   question: 'Quelle émission vous réveille chaque matin ?', choix: ['Le Morning', 'L’Écho du Rocher', 'Switch On'],
//   envoi: 'https://…',   // adresse qui reçoit les participations (POST) : Formspree, Jotform, Make…
//   form: 'https://…',    // sinon : lien vers un formulaire externe, ouvert tel quel
//   reglement: 'https://radio-monaco.com/reglement-jeux-concours/'
// }
const JEUX = [];

export async function GET() {
  const [posts, pods] = await Promise.all([getPosts().catch(() => []), getPodcasts().catch(() => [])]);
  const news = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map((p) => ({
    t: p.title, cat: p.cat, d: p.date, img: p.img ? p.img.card : ''
  }));
  const eps = [];
  pods.forEach((s) => s.eps.slice(0, 2).forEach((e) => eps.push({ t: e.title, show: s.name, d: e.d, img: ausImg(e.img), color: s.color, mix: s.feed === 'mixdj' })));
  eps.sort((a, b) => (a.d < b.d ? 1 : -1));
  const today = new Date().toISOString().slice(0, 10);
  const jeux = JEUX.filter((j) => !j.fin || j.fin >= today);
  const pod = eps.find((e) => !e.mix) || null, mix = eps.find((e) => e.mix) || null;   // dernière émission, dernier mix
  return new Response(JSON.stringify({ built: new Date().toISOString(), news, pods: eps.slice(0, 4), pod, mix, jeux }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

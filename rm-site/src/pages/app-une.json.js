// Fil d'informations de l'accueil de l'application (GoodBarber) : derniers podcasts, dernières actualités,
// jeux en cours. Lu par la ligne défilante de l'accueil (app/accueil.html). Reconstruit à chaque construction du site.
import { getPosts, getPodcasts, ausImg } from '../lib/data.js';

// Jeux à l'antenne : à tenir à jour à la main tant qu'aucune source ne les publie (WordPress n'a pas de rubrique jeux).
// Lus par la ligne défilante de l'accueil et par la page Jeux de l'application (app/jeux.html, piste H « la vitrine »).
// Un jeu dont « debut » est à venir s'affiche en « Bientôt » ; il passe « En cours » à cette date, et disparaît après « fin ».
// Plusieurs jeux en cours : ils se suivent en cartes à faire glisser.
// Jeux d'inscription seule (pas de question) ; le formulaire demande ce qu'exige le règlement des jeux (article 2) :
// prénom, nom, adresse postale, e-mail, téléphone, plus de 18 ans, une inscription par foyer.
// {
//   t: 'Vos places pour le Stade Louis-II',          // titre (obligatoire)
//   sous: 'Deux places en tribune présidentielle…',   // une phrase sur le lot
//   img: 'assets/jeux/louis-ii.jpg',                  // photo du lot (chemin du site ou adresse complète)
//   theme: 'match', logos: ['assets/jeux/asmonaco.png', '…'],   // affiche d'un match : les deux écussons officiels
//   programme: [{ i: 'expo'|'jeu'|'vr'|'atelier'|'film'|'match', t: '…', d: '…' }],   // ce qu'on vit avec le lot
//   quand: '2026-12-05',                              // date de l'événement ; gagne: '1 gagnant chaque jour' ; retrait: '…'
//   valeur: '2 places', gagnants: 5,                  // « Les 5 premiers inscrits gagnent » (règlement, article 3)
//   debut: '2026-11-22', fin: '2026-11-30T23:59',
//   envoi: 'https://…',   // adresse qui reçoit les inscriptions (POST : Formspree, Make…) ; sinon, e-mail prêt pour jeu@radio-monaco.com
//   form: 'https://…',    // ou : lien vers un formulaire externe, ouvert tel quel
//   reglement: 'https://radio-monaco.com/reglement-jeux-concours/'
// }
const JEUX = [
  { id: 'oceano-mediterranee-2026', t: 'Le Musée océanographique', img: 'assets/jeux/oceano-salle.jpg',
    sous: 'Radio Monaco et le Musée océanographique mettent la Méditerranée à l’honneur et invitent petits et grands à explorer la Grande Bleue autrement.',
    lieu: 'Journée internationale pour la Méditerranée',
    programme: [
      { i: 'expo', t: 'Exposition immersive', d: '« Méditerranée 2050 », un voyage pour découvrir, comprendre et imaginer l’avenir de la Méditerranée' },
      { i: 'jeu', t: 'Expérience gaming sur Minecraft', d: 'Explorer la Grande Bleue en jouant' },
      { i: 'vr', t: 'Réalité virtuelle', d: 'Les richesses de la Méditerranée, casque sur les yeux' },
      { i: 'atelier', t: 'Ateliers ludiques', d: 'Pour petits et grands' },
      { i: 'film', t: 'Projection d’un documentaire', d: 'Pour découvrir les richesses de la Méditerranée' }
    ],
    valeur: '2 places', gagnants: '1 par jour', gagne: '1 gagnant chaque jour', quand: '2026-11-28',
    debut: '2026-11-22T00:00:00+01:00', fin: '2026-11-27T23:59:00+01:00',
    retrait: 'Les 2 places sont envoyées chaque jour au gagnant.' },
  { id: 'asm-angers-2026', theme: 'match', t: 'AS Monaco – Angers SCO', logos: ['assets/jeux/asmonaco.png', 'assets/jeux/angers-sco.png'],
    sous: 'Vos places pour le match au Stade Louis-II, Ligue 1.', valeur: '2 places', quand: '2026-12-05',
    debut: '2026-11-30T00:00:00+01:00', fin: '2026-12-04T23:59:00+01:00' }
];

export async function GET() {
  const [posts, pods] = await Promise.all([getPosts().catch(() => []), getPodcasts().catch(() => [])]);
  const news = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map((p) => ({
    t: p.title, cat: p.cat, d: p.date, img: p.img ? p.img.card : ''
  }));
  const eps = [];
  pods.forEach((s) => s.eps.slice(0, 2).forEach((e) => eps.push({ t: e.title, show: s.name, d: e.d, img: ausImg(e.img), color: s.color, mix: s.feed === 'mixdj' })));
  eps.sort((a, b) => (a.d < b.d ? 1 : -1));
  const today = new Date().toISOString().slice(0, 10);
  const jeux = JEUX.filter((j) => !j.fin || j.fin.slice(0, 10) >= today);
  const pod = eps.find((e) => !e.mix) || null, mix = eps.find((e) => e.mix) || null;   // dernière émission, dernier mix
  return new Response(JSON.stringify({ built: new Date().toISOString(), news, pods: eps.slice(0, 4), pod, mix, jeux }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

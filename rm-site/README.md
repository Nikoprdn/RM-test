# Site Radio Monaco (Astro)

Le nouveau site de Radio Monaco : pages statiques ultra-rapides, construites à partir de **WordPress** (articles, équipe, émissions, programme, pages légales) et des flux **Ausha** (podcasts), avec un **lecteur qui ne s'arrête jamais** pendant la navigation.

## Ce qu'il y a dedans

| Étape | Contenu |
|---|---|
| 1. Vraies pages + SEO | Une page par article **à la même adresse qu'aujourd'hui** (`/titre-de-l-article/`), rubriques `/category/…/` paginées, `/actualites/`, `/nos-radios/`, `/programmes/`, `/lequipe/`, `/djs/`, `/podcasts/…`, `/members/…`, `/shows/…`, `/contact/` et pages légales reprises de WordPress. Titres et descriptions Yoast, balise canonique, Open Graph / Twitter, données structurées (NewsArticle, RadioStation, RadioChannel, RadioSeries, PodcastSeries, Person, fil d'Ariane), `sitemap-index.xml`, **sitemap Google News**, `robots.txt`. |
| 2. Lecteur persistant | Le direct ou un podcast continue d'une page à l'autre (View Transitions + `transition:persist`). Commandes sur l'écran verrouillé et les écouteurs (Media Session : titre, artiste, pochette), AirPlay sur Safari, Chromecast/Remote Playback sur Chrome. |
| 3. En ce moment / À suivre | Émission en cours et suivante (programme WordPress du jour), titre en cours et pochette (métadonnées Infomaniak + iTunes), page **Programme du jour** qui se met à jour seule. |
| 4. Mobile + appli installable | Mise en page mobile, menu plein écran, manifeste, icônes, service worker (pages déjà vues disponibles hors ligne, page « Vous êtes hors ligne »), invitation discrète à installer l'appli, raccourci « Écouter le direct » (`?play=1`, ou `?radio=1..4`). |

## Alimentation (back office)

Rien ne change pour l'équipe : **on continue à publier dans WordPress** (articles, membres, émissions, programme) et dans **Ausha** (podcasts).
Le site se reconstruit tout seul **toutes les heures**, à chaque modification du code, et à la demande (onglet *Actions* → *Site Radio Monaco* → *Run workflow*).
Si WordPress ou Ausha ne répond pas au moment de la construction, la construction s'arrête et **la version en ligne reste en place** (jamais de site vide).

Publication instantanée (optionnel) : un petit extrait PHP dans WordPress peut déclencher la reconstruction dès qu'un article est publié (appel `repository_dispatch` de type `wp-publish` avec un jeton GitHub à droits limités). À installer avec l'hébergeur WordPress.

## Mise en ligne sur GitHub Pages (préproduction)

1. Copier le dossier `rm-site/` à la racine du dépôt `Nikoprdn/RM-test`, et `rm-site/.github/workflows/deploy.yml` dans `.github/workflows/` **à la racine du dépôt**.
2. Dans GitHub : *Settings → Pages → Build and deployment → Source* : **GitHub Actions**.
3. Pousser : le site est publié sur `https://nikoprdn.github.io/RM-test/` (non indexé par Google tant que `INDEXABLE` vaut `0`).
4. L'ancien workflow `podcasts.yml` et `podcasts.json` deviennent inutiles (les flux Ausha sont lus à la construction).

## Bascule sur radio-monaco.com

Dans `deploy.yml` : `SITE_URL: https://radio-monaco.com`, `BASE_PATH: /`, `INDEXABLE: '1'`.
WordPress doit alors vivre sur un sous-domaine (ex. `admin.radio-monaco.com`) : variable `WP_URL` à renseigner.
À prévoir avant la bascule :

- **Redirections 301** des anciennes adresses qui n'existent plus (`/tag/…`, `/author/…`, archives par date, `/programmes` → OK, `/podcasts` → OK). GitHub Pages ne sait pas faire de 301 : pour la production, préférer Cloudflare Pages ou Netlify (même code, fichier `_redirects`).
- **Mentions légales** : mettre à jour l'hébergeur.
- **Mesure d'audience** et bandeau cookies (le site actuel utilise Complianz) : à choisir, idéalement une solution sans cookie.
- Soumettre `sitemap-index.xml` et `news-sitemap.xml` dans Google Search Console.

## Développement

```bash
npm install
npm run dev                         # http://localhost:4321/RM-test/ (données WordPress réelles)
RM_FIXTURES=1 npm run build         # construction hors ligne avec les données de démonstration (fixtures/)
MAX_POSTS=200 npm run build         # construction rapide limitée aux 200 derniers articles
```

Variables : `WP_URL` (défaut `https://radio-monaco.com`), `SITE_URL`, `BASE_PATH`, `INDEXABLE`, `PROD_URL` (adresse canonique pendant la préproduction), `MAX_POSTS`, `RM_FIXTURES`.

Tests de bout en bout (Playwright) : `tests/smoke.cjs` (navigation sans coupure du son, SEO), `tests/pwa.cjs` (service worker, hors ligne, installation), `tests/pages.cjs` (pages).

## Organisation

```
src/lib/data.js        lecture WordPress + Ausha (au moment de la construction)
src/lib/stations.js    les 4 radios (flux, couleurs, fréquences)
src/scripts/player.js  lecteur persistant, métadonnées, programme, écran verrouillé, AirPlay/Cast
src/scripts/site.js    en-tête, menu, défilement, apparitions
src/scripts/home.js    accueil (héros, univers, podcasts, actus, sliders)
src/scripts/pwa.js     service worker + invitation à installer
src/pages/             toutes les pages
public/                styles, images, manifeste, service worker
```

## Points ouverts

- Le flux **Paris** n'envoie pas de titre en cours (à activer chez Infomaniak).
- La bio de **Marie Marquet** est vide dans WordPress.
- La page **Régie publicitaire** est reprise en texte brut depuis Elementor : à remettre en forme (vraie page dédiée conseillée).
- Le **formulaire de contact** est remplacé par des liens e-mail par service (pas de serveur nécessaire).
- Les photos : voir le brief de shooting.

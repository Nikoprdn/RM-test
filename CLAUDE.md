# Radio Monaco — prototype du site

Mémoire de travail du projet. À lire en entier avant toute modification : elle
contient les règles de travail, l'état du site, et surtout la liste de ce qui a
déjà été essayé et refusé.

---

## Règles de travail

- **Répondre en français.** Nicolas écrit en français, les messages de commit
  sont en français, les commentaires du code aussi.
- **Pousser soi-même toutes les modifications.** Consigne permanente de Nicolas :
  « À partir de maintenant, pousse toi-même toutes les modifications du site. »
  Donc : modifier, construire, vérifier en local, committer, pousser sur `main`,
  attendre que le workflow « Site Radio Monaco » passe au vert, puis vérifier en
  ligne. Ne pas demander l'autorisation à chaque fois.
- **Ne toucher qu'à ce qui est demandé.** Une refonte de la page Podcasts ne
  justifie pas de refaire l'accueil. Déborder a déjà cassé le site une fois.
- **Vérifier avant de pousser.** Construire avec les bouchons, rendre la page
  avec Playwright, regarder la capture. Un rendu non regardé est un rendu non
  vérifié.
- **Exigence de finition.** Nicolas veut du premium et rejette tout ce qui fait
  encombré, bon marché ou « trop IA ». Il préfère une idée ferme à quatre
  variantes molles — mais quand il demande des propositions, il en veut
  plusieurs, **montées en maquette et rendues en image**, pas décrites.

---

## Le site

Prototype du futur site de Radio Monaco, webradio monégasque.
Dépôt `Nikoprdn/RM-test`, site dans `rm-site/`, publié sur GitHub Pages :
`https://nikoprdn.github.io/RM-test/`.

### Pile technique

- **Astro 5**, sortie statique, `ClientRouter` (transitions de vue).
  Pas de base de données, pas de PHP.
- Scripts : `src/scripts/player.js` (le lecteur), `site.js` (en-tête,
  magnétisme du défilement), `home.js` (rubriques de l'accueil et des pages).
- Styles : `public/styles/site.css` puis `layout.css`. **`layout.css` est chargée
  en dernier et gagne.** Elle a beaucoup grossi : avant d'ajouter une classe,
  vérifier qu'elle n'existe pas déjà (`.pzr`, `.pzc`, `.pzt` existaient déjà et
  ont écrasé une refonte entière de la rubrique Podcasts — d'où le préfixe
  `.pod-`).

### Données

| Source | Usage |
|---|---|
| WordPress REST `radio-monaco.com/wp-json/wp/v2/` | actualités, équipe, émissions, pages |
| Pro Radio `/wp-json/proradio/v1/schedule-today-full` et `/schedule` | programme du jour, grille de la semaine, créneaux des DJs |
| Ausha (3 flux RSS) | podcasts : `emissions`, `mixdj`, `horoscope` |
| Infomaniak Icecast `.xspf` + `metadata-all-cover` | titres en cours et historique des 4 webradios |
| iTunes Search | pochettes manquantes |

`src/lib/data.js` mémorise chaque réponse WordPress dans `.wp-cache/` : si
WordPress tombe, la construction réutilise la dernière version connue au lieu
d'échouer. `.github/workflows/patch-live.yml` permet de republier l'artefact en
ligne avec des changements structurels greffés, si WordPress reste injoignable.

### Construction et mise en ligne

- Workflow `.github/workflows/deploy.yml` : à chaque poussée, toutes les heures
  (`7 * * * *`), à la demande, et sur `repository_dispatch: wp-publish`.
- Variables : `SITE_URL=https://nikoprdn.github.io`, `BASE_PATH=/RM-test`,
  `INDEXABLE=0`, plus `IG_FEED_URL` / `IG_TOKEN`.
- Les images vivent dans `assets/` à la racine et sont copiées dans
  `rm-site/public/assets/` par le workflow (`cp -r` : `assets/charte/` est un
  sous-dossier). **En local, penser à `cp -r ../assets/* public/assets/` après
  avoir ajouté une image**, sinon elle manque au rendu.

### Essais en local

Le conteneur ne peut joindre ni `radio-monaco.com` ni `nikoprdn.github.io`
(filtrage de sortie). Donc :

```bash
cd rm-site
RM_FIXTURES=1 SITE_URL=https://nikoprdn.github.io BASE_PATH=/RM-test npm run build
```

puis servir `dist/` sous `/RM-test` avec un petit serveur Node et rendre la page
avec Playwright (`/opt/npm-tools/node_modules/playwright`), en interceptant les
images Ausha et WordPress par des photos locales. Les scripts d'essai vivent
dans le dossier de travail temporaire de la session.

La vérification en ligne passe par le panneau navigateur relié à l'ordinateur de
Nicolas (`mcp__remote-devices__Claude_Browser__*`) ; il n'est pas toujours
connecté. Quand il ne l'est pas : le dire, et s'en tenir au rendu local.

---

## Charte

**La charte officielle est importée dans le dépôt : lire `charte/README.md`**
(brand book 2023 V6.6, pages clés dans `charte/pages/`). Fichiers de marque dans
`assets/charte/` : logos et sigles SVG des 7 déclinaisons, PNG @3x, motif rouge.
Source : Dropbox `Radio Monaco/CHARTE GRAPHIQUE RM/`.

- Couleurs officielles (variables `--rm-*` dans `site.css`) : rouge Monte-Carlo
  `#E4032E` · bleu New York `#005EA1` · orange Mix DJ `#F59C00` · vert Feel Good
  `#93C01F` · violet Night Mood `#8A5AA1`, chacune avec sa teinte foncée ;
  noir `#000000` (« radio ») et anthracite `#37333E` (« monaco »).
- Couleurs propres au site, hors charte : crème `#F6F3EE` · encre `#141218` ·
  gris `#6A6570` (variables `--bg`, `--ink`, `--muted` de `layout.css`) ·
  horoscope bleu `#2B4C7E`. Ne pas les remplacer sans l'accord de Nicolas.
- **Le violet est réservé à Night Mood.**
- Zone de protection du logo : un carré N tout autour, rien dedans.
- Typographie **Barlow**, auto-hébergée, les 18 styles (100 à 900, droits et
  italiques). Le logo utilise Regular, Bold et ExtraBold (800).
- Logos des radios : versions couleur en 1175 px, `assets/wr-*-rgb.png`,
  fabriquées par `rm-site/scripts/make-logos.py` à partir des fichiers de marque.
  Les SVG officiels de `assets/charte/` sont désormais la meilleure source.

### Direction artistique (validée par Nicolas le 16 novembre 2026)

- **Couleur retenue** : au repos, les grandes images sont légèrement désaturées,
  proches de la couleur naturelle (`--rm-repos` dans `layout.css`, `grayscale(.3)`).
  Le noir et blanc pur a été jugé « trop triste », et une désaturation plus forte
  (`grayscale(.62)`) trop éloignée du naturel.
- **Au survol, la couleur revient** (au toucher sur mobile), en fondu
  (`--rm-survol`). Les deux filtres ont la même liste de fonctions pour que le
  fondu marche. La tonalité rouge au survol a été essayée : « horrible », refusée.
  Le liseré rouge au survol aussi, non retenu.
- **Le rouge est un signal** (direct, lecture, élément actif), pas un fond.
- **Ouverture de l'accueil : les quatre photos de Monaco d'origine, entières et
  sans filtre** (volonté du propriétaire de la radio : des images de Monaco).
  Essayé et refusé le 16 novembre : le studio en ouverture ; des recadrages hauts
  qui sortaient le port (« horrible, on ne voit plus rien ») ; la couleur retenue
  sur l'ouverture. Ne pas recadrer ni assombrir ces photos. Pas de compteur
  « 01 / 04 » sous la légende (retiré à sa demande). Le port y apparaît :
  la règle « pas de photo de bateau » ne s'applique pas à l'ouverture tant que
  le propriétaire n'a pas fourni d'autres photos de Monaco.
- Pas encore traité : les volets « Nos radios » et les autres pages.

---

## État des rubriques

**Accueil** — héros photo, puis les rubriques. Le défilement est aimanté : les
sections marquées `data-snap` sont les points d'arrêt, `data-full` règle le
décalage sous l'en-tête. **Ne jamais envelopper une rubrique dans un conteneur :
le magnétisme cherche les sections elles-mêmes.** Et se méfier de
`scrollIntoView` dans une rubrique : il fait remonter toute la page.

**Nos radios** (`Univers.astro`, accueil et `/nos-radios/`) — quatre volets
photo. Replié : le logo couleur, « En direct » et l'information locale, puis la
pochette du titre en cours avec le morceau et l'artiste à sa droite. Déplié :
les trois derniers disques, chacun légendé.

**Podcasts** (`Podcasts.astro`, accueil et `/podcasts/`) — modèle Radioplayer en
version photo : bandeau de la régie avec la recherche en verre dépoli, puis des
deux rails côte à côte, **les derniers épisodes à gauche et les derniers mixs à
droite** (20 chacun ; l'un sous l'autre sur mobile), puis les rails par univers
(Le Morning & les chroniques, 100 % Mix DJ). **Rails équilibrés, rien ne dépasse** :
la largeur des cartes se calcule pour qu'un nombre entier remplisse exactement le
rail (`--n` dans `layout.css` : 4 par rail du haut et 8 par rail du bas sur
ordinateur, 3 et 6 entre 901 et 1 199 px, 2 sur mobile) ; sous l'image : le nom de l'émission en gras, le titre de l'épisode, la
date. **Les deux rails du haut défilent seuls, carte par carte** (toutes les 4 s,
glissé doux ; `data-rail-auto`, `home.js`) pour que les vignettes restent
entières : un défilement continu (28 px/s puis 12 px/s) laissait une carte coupée
et a été jugé trop rapide. Arrêt au survol, au toucher, au clavier, pendant une
recherche, hors écran ; au bout, retour au début.
Sur les écrans peu hauts (≤ 820 px), le bandeau se resserre pour que ces rails
tiennent en entier dans le premier écran (vérifié en 1 288 × 663, l'écran de Nicolas).
« Podcasts à la une » (deux grandes cartes) a été retiré à sa demande. La recherche filtre vraiment, sur le
nom de l'émission, son sous-titre, le titre de l'épisode et le nom du rail.

**Le lecteur** (`Player.astro` + `player.js`) — une capsule en bas de page, et un
**studio** en plein écran qui s'ouvre en cliquant le titre : photos de la régie
qui se succèdent en fondu, pochette en grand, progression, −15 / +30 s,
« Aléatoire », et à droite deux dossiers : **Les directs** (les 4 webradios) et
**Les podcasts** (les 30 derniers épisodes). Le studio voyage avec le lecteur
d'une page à l'autre (`transition:persist`).

**Programme** (`/programmes/`) — le jour en diapositives plein cadre, frise des
heures, émission en cours mise en avant, relue toutes les 30 s.

**DJ sets** (`/djs/`) — volets photo, jour et heure en haut, nom à la verticale,
le volet survolé s'ouvre.

**Playlist** (`/playlist/`) — deux univers (The Sound of Monte-Carlo, Night Mood),
mosaïque de pochettes en fond, bascule par onglets.

---

## Ce qui a été essayé et refusé

À ne pas reproposer sans raison nouvelle.

- Une page Podcasts en **chapitrage** (une émission ouverte séquence par
  séquence) et en **arborescence** (les 20 rendez-vous classés en branches).
  Monté entièrement, refusé.
- Un **fond typographique** derrière la rubrique Podcasts (tous les noms
  d'émissions en Barlow, tailles variées). Quatre variantes, refusées d'emblée.
- Douze autres traitements de la rubrique Podcasts : grille d'archive façon NTS,
  rails BBC Sounds, édito France Inter, grille horaire KEXP, mur sonore
  Worldwide FM, kiosque Monocle, sommaire typographique, frise des voix,
  frise horizontale, platine, colonnes de presse. Tous refusés.
- Le **fondu entre les univers** de la page Playlist.
- La notion « **un programme, deux départs** » entre Monte-Carlo et Paris :
  abandonnée, y compris dans les textes alternatifs.
- Les **photos de bateau** : « Surtout pas de photo de bateau. »
- Le **mur des vingt vignettes** d'émissions sur la page Podcasts.
- L'**accueil reconstruit** avec les rubriques des pages : bonne idée, mais la
  première tentative a cassé le magnétisme du défilement. Refaite proprement
  depuis.

## Ce qu'on attend de Nicolas

- Une adresse de flux Behold.so ou un jeton Meta pour les vrais réels Instagram.
- Le nombre d'abonnés et les adresses Facebook, TikTok, LinkedIn.
- La validation des 64 visuels.
- Une relecture du texte de présentation de Monte-Carlo.
- Une exception durable pour `radio-monaco.com/wp-json/` dans le service de
  sécurité du site (il a déjà bloqué les constructions).
- L'encart « jeux à l'antenne ».
- D'autres photos : les siennes valent mieux que les banques d'images. Le dépôt
  ne contient que six visuels génériques de Monaco, et le conteneur ne peut pas
  en télécharger.

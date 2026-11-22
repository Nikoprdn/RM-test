# Application GoodBarber « TEST NICOLAS » — codes sur mesure

Sources des sections « Custom code » de l'application (copiées dans le back-office GoodBarber) :

- `accueil.html` — accueil (22 novembre), désormais la section Custom code « Accueil » (79622242), placée en tête ; la Home GoodBarber (widget 79601681, même code) est masquée. Barre du lecteur en bas, pochette sur l'écran verrouillé : les 4 radios, puis le sommaire Podcasts, Actualités, Jeux, Favoris ; thème clair, page crème unie, la pochette floutée seulement dans la carte de la radio qui joue (piste D). Hauteur de la zone : 800 px. Navigation de l'appli : « Aucun menu », header général anthracite avec le logo blanc.
- `accueil.html` lit aussi `app-une.json` (site : derniers podcasts, dernières actualités, jeux — liste `JEUX` à remplir dans `rm-site/src/pages/app-une.json.js`) pour le fil qui défile
- `jeux.html` — section « Jeux » (79620298), page d'attente
- `widget-liste.html` — ancien widget de l'accueil (la liste aux pochettes), remplacé par `accueil.html`
- `lecteur.html` — lecteur d'une radio (une section par radio, variable `RADIO`)
- `menu-univers-site.html` — menu « Nos univers »
- `menu-podcasts.html` — menu « Podcasts » ; lit `app-podcasts.json`, publié par le site

Le site ne les sert pas : ils ne servent qu'à garder une trace et à recharger le code dans GoodBarber.

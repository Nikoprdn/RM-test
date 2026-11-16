# Charte graphique Radio Monaco

Source : *Brand Book 2023*, « 3106 RM - Charte graphique V6.6 » (66 pages, InDesign,
avril 2023), et le dossier Dropbox `Radio Monaco/CHARTE GRAPHIQUE RM/`
(`LOGO RADIO MONACO/`, `Barlow/`). Le PDF complet pèse 58 Mo et reste dans la
Dropbox : ce dossier n'en garde que les pages utiles au site, dans `pages/`.

## Logo

- Un sigle (le « M » dans un carré arrondi, ouvert en bas) + « radio » + « monaco »
  + la couronne + le nom de la déclinaison.
- Construit sur une grille carrée. **Zone de protection = un carré N** tout autour :
  rien (titre, objet, texte) n'y entre.
- Typographie du logo :
  - « radio » : Barlow Regular, interlettrage −15, noir `#000000`
  - « monaco » : Barlow Bold, interlettrage −5, anthracite `#37333E`
  - « MONTE CARLO » : Barlow ExtraBold, capitales, interlettrage 120, couleur de la déclinaison
- Sur l'app mobile : « la lisibilité du logo doit toujours prévaloir ».
- Réseaux sociaux : avatar = **sigle blanc sur fond de couleur**.

## Déclinaisons et couleurs

| Déclinaison | Couleur principale | Teinte foncée (secondaire) |
|---|---|---|
| Monte-Carlo / corporate | rouge `#E4032E` | `#AF0D21` |
| New York | bleu `#005EA1` | `#004F87` |
| 100 % Mix DJ | orange `#F59C00` | `#D08600` |
| Feel Good | vert `#93C01F` | `#80A51B` |
| Night Mood | violet `#8A5AA1` | `#73427F` |

Constantes : noir `#000000` (« radio ») et anthracite `#37333E` (« monaco »).
Couleurs secondaires : chaque couleur se décline aussi à 75, 50 et 25 %.
Valeurs CMJN dans les pages 08 et 09.

Ces couleurs sont disponibles dans le site en variables CSS `--rm-*`
(`rm-site/public/styles/site.css`).

## Typographie

Barlow (Jeremy Tribby, Google Fonts, licence OFL : `assets/charte/Barlow-OFL.txt`).
Les 18 styles sont dans `assets/` et déclarés dans `site.css` (100 à 900, droits et italiques).
Usages de la charte : Regular, Bold, ExtraBold ; les autres graisses pour le reste.

## Fichiers (`assets/charte/`, publiés avec le site)

- `logo-<déclinaison>.svg` : corporate, montecarlo, newyork, mixdj, feelgood, nightmood, blanc
- `logo-easterntime.png` (seule version fournie, avec le `.ai` dans la Dropbox)
- `sigle-<déclinaison>.svg` : sigle de couleur ; `sigle-<déclinaison>-invert.svg` : sigle blanc sur carré de couleur
- `*@3x.png` : versions PNG haute définition fournies par Nicolas
- `motif-rouge.jpg` : fond rouge au motif de sigles en relief (1920 × 1080)

Dans la Dropbox, les sigles Feel Good portent par erreur le nom `Sigle-RM-100%DJMIX` :
ils sont bien verts, et renommés `sigle-feelgood` ici.
Les sigles New York de la Dropbox sont en bleu clair `#00AEEA`, hors charte : les
copies d'ici sont recolorées en `#005EA1`, comme le logo New York et le brand book.
Le logo Night Mood SVG n'a pas la même marge que les autres (cadre `391 × 141` au lieu
de `447 × 203`) : prévoir une taille un peu plus petite pour l'aligner.
Les versions CMJN, `.ai` et `.pdf` (impression) restent dans la Dropbox.

## Pages de référence (`pages/`)

04 structure du logo · 05 typographie du logo · 06 Barlow · 07 déclinaisons ·
08 couleurs principales · 09 couleurs secondaires · 22 Instagram · 40-41 app mobile.

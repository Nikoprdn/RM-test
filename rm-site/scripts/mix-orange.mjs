// Prépare les visuels Mix DJ en orange avant la construction du site.
// Lit le flux Ausha 100 % Mix DJ, télécharge chaque pochette, remplace le fond rouge du
// gabarit par l'orange de la charte (src/lib/mixorange.js) et l'écrit dans
// public/assets/mix/<id>.jpg, avec la liste des visuels réussis dans index.json.
// data.js n'utilise une version orange que si elle figure dans cette liste : une pochette
// qui échoue (téléchargement, décodage, gabarit différent) garde sa version d'origine.
// Le script ne fait jamais échouer la construction.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { recolor } from '../src/lib/mixorange.js';

const FEED = 'https://feed.ausha.co/y0lvAIWDdvnm';
const OUT = new URL('../public/assets/mix/', import.meta.url);
const SIZE = 800;

const done = [];
try {
  mkdirSync(OUT, { recursive: true });
  const xml = await (await fetch(FEED)).text();
  const ids = [...new Set([...xml.matchAll(/image\.ausha\.co\/([A-Za-z0-9]+)_1400x1400/g)].map((m) => m[1]))];
  for (const id of ids) {
    try {
      const r = await fetch(`https://image.ausha.co/${id}_1400x1400.jpeg`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { data, info } = await sharp(Buffer.from(await r.arrayBuffer()))
        .resize(SIZE, SIZE, { fit: 'cover' }).removeAlpha().toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
      if (!recolor(data, info.width, info.height, info.channels)) { console.log('gabarit différent, gardé tel quel :', id); continue; }
      await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).jpeg({ quality: 84, mozjpeg: true }).toFile(new URL(id + '.jpg', OUT).pathname);
      done.push(id);
    } catch (e) { console.log('visuel Mix DJ ignoré :', id, e.message); }
  }
} catch (e) { console.log('visuels Mix DJ en orange : flux injoignable,', e.message); }
writeFileSync(new URL('index.json', OUT), JSON.stringify(done));
console.log(`visuels Mix DJ en orange : ${done.length}`);

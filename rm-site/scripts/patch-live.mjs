// Greffe les nouveautés de structure d'une construction de démonstration (dist) sur le site en ligne (live).
// Usage : node scripts/patch-live.mjs dist live
import { readFileSync, writeFileSync, readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [, , DIST, LIVE] = process.argv;
const read = (p) => readFileSync(p, 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// 1. scripts et styles : on ajoute les fichiers compilés (noms uniques) et on remplace les feuilles de style
mkdirSync(join(LIVE, '_astro'), { recursive: true });
for (const f of readdirSync(join(DIST, '_astro'))) if (!existsSync(join(LIVE, '_astro', f))) copyFileSync(join(DIST, '_astro', f), join(LIVE, '_astro', f));
const di = read(join(DIST, 'index.html'));
const ver = {};
for (const css of ['site.css', 'layout.css']) {
  copyFileSync(join(DIST, 'styles', css), join(LIVE, 'styles', css));
  const m = di.match(new RegExp(css.replace('.', '\\.') + '\\?v=([a-z0-9]+)')); if (m) ver[css] = m[1];
}
for (const f of walk(LIVE).filter((p) => p.endsWith('.html'))) {
  let h = read(f), h0 = h;
  for (const [css, v] of Object.entries(ver)) h = h.replace(new RegExp(css.replace('.', '\\.') + '\\?v=[a-z0-9]+', 'g'), css + '?v=' + v);
  if (h !== h0) writeFileSync(f, h);
}

// 2. accueil : les notifications (bloc + script)
const li = join(LIVE, 'index.html'); let h = read(li);
if (!h.includes('class="ntf"')) {
  const a = di.indexOf('<div class="ntf"'); const b = di.indexOf('<div class="fade f3" style="position:absolute;left:0;right:0;bottom:36px">', a);
  if (a < 0 || b < 0) throw new Error('bloc des notifications introuvable dans la construction');
  const block = di.slice(a, b);
  const anchor = '<div class="fade f3" style="position:absolute;left:0;right:0;bottom:36px">';
  if (!h.includes(anchor)) throw new Error('point d’insertion introuvable dans le site en ligne');
  h = h.replace(anchor, block + anchor);
  const scripts = [...di.matchAll(/<script type="module" src="[^"]*Notifs[^"]*"><\/script>/g)].map((m) => m[0]);
  const inline = [...di.matchAll(/<script type="module">[^<]*rm-ntf[\s\S]*?<\/script>/g)].map((m) => m[0]);
  const tags = [...scripts, ...inline];
  if (!tags.length) throw new Error('script des notifications introuvable');
  h = h.replace('</head>', tags.join('') + '</head>');
  writeFileSync(li, h);
  console.log('notifications greffées :', tags.length, 'script(s)');
}
console.log('feuilles de style :', ver);

// Visuels Mix DJ en orange (charte : 100 % Mix DJ = #F59C00).
// Les pochettes Ausha sont faites sur le gabarit rouge de la radio : fond rouge à motif de
// sigles, cadre blanc, DJ détouré avec une ombre portée. On remplace le rouge du fond par
// l'orange de la charte en gardant le relief du motif et l'ombre (le facteur de luminosité
// k est conservé), sans toucher au DJ :
//  - le rouge de référence est relevé sur le bord de chaque image (il varie selon l'export) ;
//  - si le bord n'est pas le rouge du gabarit, l'image reste telle quelle ;
//  - seules les grandes zones rouges sont recolorées (le fond), pas un détail rouge sur un
//    vêtement ou une casquette ;
//  - en cas d'échec (téléchargement, décodage), le site garde la pochette d'origine.
// La même fonction sert à la construction (Node, sharp) et aux essais dans le navigateur.

export const ORANGE = [245, 156, 0];

export function recolor(px, w, h, ch = 3) {
  const n = w * h;
  // 1. rouge de référence, relevé sur une bande de 2 % au bord de l'image
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const reds = [[], [], []];
  let edge = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= band && x < w - band && y >= band && y < h - band) continue;
    edge++;
    const i = (y * w + x) * ch, r = px[i], g = px[i + 1], b = px[i + 2];
    if (r > 150 && g < 70 && b < 100) { reds[0].push(r); reds[1].push(g); reds[2].push(b); }
  }
  if (reds[0].length < edge * 0.5) return false; // pas le gabarit rouge : on ne touche à rien
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1] / 255;
  const R = [med(reds[0]), med(reds[1]), med(reds[2])];
  const O = ORANGE.map((v) => v / 255);
  const Rred = R[0] - Math.max(R[1], R[2]);
  // 2. poids « fond rouge » de chaque pixel (1 = fond, 0 = personne), et facteur de luminosité
  const wt = new Float32Array(n), k = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * ch, r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const kk = Math.min(1.2, r / R[0]);
    const red = r - Math.max(g, b);
    k[p] = kk;
    wt[p] = Math.min(1, Math.max(0, (red / Math.max(kk * Rred, 1e-3) - 0.45) / 0.4));
  }
  // 3. on ne garde que les grandes zones rouges (le fond, dedans et autour du cadre)
  const lab = new Int32Array(n).fill(-1), keep = new Uint8Array(n), stack = [];
  const min = n * 0.015;
  for (let s = 0; s < n; s++) {
    if (lab[s] !== -1 || wt[s] < 0.5) continue;
    const comp = []; stack.push(s); lab[s] = s;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && lab[q] === -1 && wt[q] >= 0.5) { lab[q] = s; stack.push(q); }
      }
    }
    // grande zone : le fond ; petite zone touchant le bord et bien du rouge du gabarit : un
    // coin de fond isolé par les DJs (un détail rouge sur un vêtement ne remplit pas ces deux conditions)
    let border = false, sum = 0;
    for (const p of comp) { const x = p % w, y = (p / w) | 0; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true; sum += wt[p]; }
    if (comp.length >= min || (border && comp.length >= n * 0.0005 && sum / comp.length > 0.85)) for (const p of comp) keep[p] = 1;
  }
  // bords adoucis : les pixels de transition voisins d'une grande zone suivent aussi
  const near = new Uint8Array(n);
  const rad = 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!keep[y * w + x]) continue;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < w && Y >= 0 && Y < h) near[Y * w + X] = 1;
    }
  }
  // 4. recoloration : fond rouge × k devient orange × k
  for (let p = 0; p < n; p++) {
    if (!near[p] || wt[p] === 0) continue;
    const a = wt[p] * k[p], i = p * ch;
    for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, Math.round(px[i + c] + a * (O[c] - R[c]) * 255)));
  }
  return true;
}

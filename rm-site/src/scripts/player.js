// Lecteur Radio Monaco — un seul élément audio pour tout le site.
// API : window.RM.playLive(i) · RM.playEpisode(ep) · RM.toggle() · RM.state · RM.meta · RM.onair
// Événements sur document : 'rm:state', 'rm:meta', 'rm:onair'.

const $ = (id) => document.getElementById(id);
const cfg = JSON.parse(($('rm-config') || {}).textContent || '{}');
const ST = cfg.stations || [];
const audio = $('rm-audio');
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

const RM = (window.RM = window.RM || {});
RM.stations = ST;
RM.state = { mode: 'live', station: 0, ep: null, playing: false, loading: false };
RM.meta = {};
RM.onair = { now: null, next: null };

// ---------- lecture ----------
function play(src) {
  if (audio.src !== src) audio.src = src;
  const p = audio.play();
  RM.state.loading = true;
  if (p && p.catch) p.catch(() => { RM.state.playing = false; RM.state.loading = false; render(); });
}
RM.playLive = (i = RM.state.station, force) => {
  const same = RM.state.mode === 'live' && RM.state.station === i;
  if (same && RM.state.playing && !force) { audio.pause(); return; }
  Object.assign(RM.state, { mode: 'live', station: i, ep: null, playing: true });
  play(ST[i].stream + (same ? '' : ''));
  render();
};
RM.playEpisode = (ep) => {
  const same = RM.state.mode === 'pod' && RM.state.ep && RM.state.ep.id === ep.id;
  if (same) { RM.toggle(); return; }
  Object.assign(RM.state, { mode: 'pod', ep, playing: true });
  play(ep.url);
  render();
};
RM.toggle = () => {
  if (RM.state.playing) audio.pause();
  else if (RM.state.mode === 'pod' && RM.state.ep) { const p = audio.play(); if (p && p.catch) p.catch(() => {}); RM.state.playing = true; render(); }
  else RM.playLive(RM.state.station, true);
};
RM.seek = (sec) => { if (RM.state.mode === 'pod' && isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration - 1, sec)); };

audio.addEventListener('playing', () => { RM.state.playing = true; RM.state.loading = false; render(); });
audio.addEventListener('pause', () => { RM.state.playing = false; render(); });
audio.addEventListener('ended', () => { RM.state.playing = false; render(); });
audio.addEventListener('error', () => { RM.state.playing = false; RM.state.loading = false; render(); });
let lastT = 0;
audio.addEventListener('timeupdate', () => {
  if (RM.state.mode !== 'pod') return;
  const now = Date.now(); if (now - lastT < 500) return; lastT = now;
  progress();
  emit('rm:time', { t: audio.currentTime, d: audio.duration });
});

// ---------- affichage du dock ----------
const fmt = (v) => { v = Math.max(0, Math.floor(v || 0)); const h = Math.floor(v / 3600), m = Math.floor((v % 3600) / 60), s = v % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
function current() {
  const s = RM.state;
  if (s.mode === 'pod' && s.ep) return { kind: 'Podcast · ' + s.ep.show, t1: s.ep.title, t2: fmt(audio.currentTime) + ' / ' + fmt(audio.duration || s.ep.s), color: s.ep.color, ink: s.ep.ink || '#FFFFFF', cover: s.ep.img, artist: s.ep.show, art: s.ep.img };
  const st = ST[s.station] || ST[0]; const m = RM.meta[s.station];
  const showName = s.station === 0 && RM.onair.now ? RM.onair.now.name : st.line;
  return {
    kind: 'Direct · ' + st.name, t1: m && m.title ? m.title : showName, t2: m && m.title ? (m.artist || st.name) : 'En direct',
    color: st.color, ink: st.ink, cover: m && m.cover, artist: m && m.artist ? m.artist : 'Radio Monaco ' + st.name, art: (m && m.cover) || st.art
  };
}
function progress() {
  const bar = $('dock-prog'); if (!bar) return;
  const d = audio.duration || (RM.state.ep && RM.state.ep.s) || 0;
  bar.firstElementChild.style.width = (d ? (100 * audio.currentTime) / d : 0).toFixed(2) + '%';
  if (RM.state.mode === 'pod') { const c = current(); const el = $('dock-title'); if (el) el.innerHTML = `<b></b><i></i>`, el.firstChild.textContent = c.t1, el.lastChild.textContent = ' · ' + c.t2; }
}
function render() {
  const dock = $('dock'); if (!dock) return;
  const c = current(); const s = RM.state;
  dock.style.setProperty('--c', c.color);
  dock.classList.toggle('playing', !!s.playing);
  dock.classList.toggle('pod', s.mode === 'pod');
  $('dock-kind').textContent = (RM.dockKind && RM.dockKind()) || c.kind;
  const t = $('dock-title'); t.innerHTML = '<b></b><i></i>'; t.firstChild.textContent = c.t1; t.lastChild.textContent = ' · ' + c.t2;
  const img = $('dock-cover');
  if (c.cover) { if (img.getAttribute('src') !== c.cover) img.src = c.cover; img.hidden = false; } else img.hidden = true;
  const btn = $('dock-play');
  btn.classList.toggle('ink', c.ink === '#141218');
  btn.setAttribute('aria-label', s.playing ? 'Mettre en pause' : (s.mode === 'pod' ? 'Reprendre le podcast' : 'Écouter le direct'));
  $('dock-live').hidden = s.mode !== 'pod';
  progress();
  // boutons « Écouter » de l'en-tête et du héros (re-créés à chaque page)
  document.querySelectorAll('[data-rm-label]').forEach((el) => { el.textContent = s.playing ? (el.dataset.rmPlaying || 'En écoute') : (el.dataset.rmIdle || 'Écouter'); });
  document.querySelectorAll('[data-rm-toggle]').forEach((el) => el.classList.toggle('playing', !!s.playing));
  mediaSession(c);
  emit('rm:state', s);
}

// ---------- écran verrouillé / casque / voiture (Media Session) ----------
function mediaSession(c) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: c.t1, artist: c.artist, album: 'Radio Monaco',
      artwork: [c.art, cfg.icon].filter(Boolean).map((src) => ({ src, sizes: '512x512' }))
    });
    navigator.mediaSession.playbackState = RM.state.playing ? 'playing' : 'paused';
  } catch (e) {}
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession; const set = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) {} };
  set('play', () => RM.toggle()); set('pause', () => audio.pause()); set('stop', () => audio.pause());
  set('seekbackward', (d) => RM.seek(audio.currentTime - ((d && d.seekOffset) || 15)));
  set('seekforward', (d) => RM.seek(audio.currentTime + ((d && d.seekOffset) || 30)));
  set('seekto', (d) => d && RM.seek(d.seekTime));
  set('previoustrack', () => { if (RM.state.mode === 'live') RM.playLive((RM.state.station + ST.length - 1) % ST.length, true); });
  set('nexttrack', () => { if (RM.state.mode === 'live') RM.playLive((RM.state.station + 1) % ST.length, true); });
}

// ---------- AirPlay / Chromecast ----------
const cast = $('dock-cast');
if (cast) {
  if (window.WebKitPlaybackTargetAvailabilityEvent) {
    audio.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => { cast.hidden = e.availability !== 'available'; });
    cast.addEventListener('click', () => audio.webkitShowPlaybackTargetPicker());
  } else if (audio.remote && audio.remote.watchAvailability) {
    audio.remote.watchAvailability((ok) => { cast.hidden = !ok; }).catch(() => { cast.hidden = true; });
    cast.addEventListener('click', () => audio.remote.prompt().catch(() => {}));
  }
}

$('dock-play').addEventListener('click', () => RM.toggle());
$('dock-live').addEventListener('click', () => RM.playLive(RM.state.station, true));
$('dock-prog').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); const d = audio.duration; if (d) RM.seek(((e.clientX - r.left) / r.width) * d); });

// délégation : tout élément [data-rm-toggle] / [data-rm-live="i"] / [data-rm-ep] pilote le lecteur
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-rm-toggle],[data-rm-live],[data-rm-ep]'); if (!t) return;
  e.preventDefault();
  if (t.hasAttribute('data-rm-live')) RM.playLive(+t.dataset.rmLive || 0);
  else if (t.hasAttribute('data-rm-ep')) { try { RM.playEpisode(JSON.parse(t.dataset.rmEp)); } catch (err) {} }
  else RM.toggle();
});

// ---------- titres en cours (Icecast .xspf) + pochettes (iTunes) ----------
const nice = (s) => { s = (s || '').replace(/\s+/g, ' ').trim(); const l = s.replace(/[^A-Za-zÀ-ÿ]/g, ''); const up = l.replace(/[^A-ZÀ-Þ]/g, '').length; if (l.length && up / l.length > 0.6) s = s.toLowerCase().replace(/(^|[\s(\-&/])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()); return s; };
const covers = {};
async function readMeta() {
  await Promise.all(ST.map(async (st, i) => {
    try {
      const r = await fetch(st.stream + '.xspf?r=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const x = new DOMParser().parseFromString(await r.text(), 'text/xml'); const raw = ((x.querySelector('track > title') || {}).textContent || '').trim();
      if (!raw) { RM.meta[i] = null; return; }
      const parts = raw.split(' - '); const artist = nice(parts.length > 1 ? parts[0] : ''); const title = nice(parts.length > 1 ? parts.slice(1).join(' - ') : raw);
      // 100 % Mix DJ : toujours la pochette jaune ; ailleurs, la pochette de la radio si aucune n'est trouvée
      if (st.key === 'mixdj') { RM.meta[i] = { artist, title, cover: st.fb || null }; return; }
      if (covers[raw] === undefined && artist) {
        try { const q = encodeURIComponent((artist + ' ' + title).replace(/\(.*?\)|feat\.?.*$/gi, ' ').trim()); const j = await (await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=1&term=' + q)).json(); const a = j.results && j.results[0] && j.results[0].artworkUrl100; covers[raw] = a ? a.replace('100x100bb', '600x600bb') : null; } catch (e) { covers[raw] = null; }
      }
      RM.meta[i] = { artist, title, cover: covers[raw] || st.fb || null };
    } catch (e) {}
  }));
  emit('rm:meta', RM.meta); render();
}

// ---------- en ce moment / à suivre (grille WordPress) ----------
let today = cfg.today || [];
function computeOnAir() {
  const now = Date.now(); const list = today.map((x) => ({ ...x, s: Date.parse(x.start), e: Date.parse(x.end) })).sort((a, b) => a.s - b.s);
  const i = list.findIndex((x) => x.s <= now && now < x.e);
  RM.onair = { now: i >= 0 ? list[i] : null, next: i >= 0 ? list[i + 1] || null : list.find((x) => x.s > now) || null, list };
  emit('rm:onair', RM.onair); render();
}
async function refreshToday() {
  try { const r = await fetch(cfg.wp + '/wp-json/proradio/v1/schedule-today-full', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) today = j.map((x) => ({ name: decodeHTML(x.name), desc: stripHTML(x.description || ''), start: x.broadcaststart, end: x.broadcastend, img: x.thumbnail, id: x.uid })); } } catch (e) {}
  computeOnAir();
}
const ta = document.createElement('textarea');
const decodeHTML = (s) => { ta.innerHTML = s || ''; return ta.value; };
const stripHTML = (s) => decodeHTML(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

computeOnAir(); refreshToday(); readMeta();
setInterval(readMeta, 20000); setInterval(computeOnAir, 30000); setInterval(refreshToday, 30 * 60000);
// ---------- verre liquide : la goutte « à l'antenne » sort du lecteur sur le premier écran de l'accueil ----------
// Le corps de verre (goutte + barre + col qui les relie) est dessiné en SVG (métaballe) et sert de masque au flou.
const LG = { t: 0, to: 0, raf: 0, hero: false, glass: false };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
function metaball(c1, r1, c2, r2, v = 0.5, hs = 2.4) {
  const d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  if (!r1 || !r2 || d > r1 + r2 * 2.5 || d <= Math.abs(r1 - r2)) return '';
  let u1 = 0, u2 = 0;
  if (d < r1 + r2) { u1 = Math.acos((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d)); u2 = Math.acos((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d)); }
  const ab = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]); const ms = Math.acos((r1 - r2) / d);
  const a1 = ab + u1 + (ms - u1) * v, a2 = ab - u1 - (ms - u1) * v, a3 = ab + Math.PI - u2 - (Math.PI - u2 - ms) * v, a4 = ab - Math.PI + u2 + (Math.PI - u2 - ms) * v;
  const P = (c, a, r) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const p1 = P(c1, a1, r1), p2 = P(c1, a2, r1), p3 = P(c2, a3, r2), p4 = P(c2, a4, r2);
  const dd = Math.min(v * hs, Math.hypot(p1[0] - p3[0], p1[1] - p3[1]) / (r1 + r2)) * Math.min(1, (d * 2) / (r1 + r2));
  const h1 = P(p1, a1 - Math.PI / 2, r1 * dd), h2 = P(p2, a2 + Math.PI / 2, r1 * dd), h3 = P(p3, a3 + Math.PI / 2, r2 * dd), h4 = P(p4, a4 - Math.PI / 2, r2 * dd);
  const f = (p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2);
  return `M${f(p1)}C${f(h1)} ${f(h3)} ${f(p3)}A${r2} ${r2} 0 0 0 ${f(p4)}C${f(h4)} ${f(h2)} ${f(p2)}Z`;
}
function lgDraw() {
  const dock = $('dock'); if (!dock) return;
  const H = dock.offsetHeight, W = dock.offsetWidth; if (!H || !W) return;
  const D = H, g = Math.round(H * 0.24), E = D + g, k = ease(LG.t);
  dock.style.setProperty('--lgD', D + 'px'); dock.style.setProperty('--lgx', E + 'px'); dock.style.setProperty('--lge', (E * k).toFixed(1) + 'px');
  const r2 = H / 2, c2 = [E + r2, H / 2];
  const r1 = lerp(r2 * 0.45, D / 2, k), c1 = [lerp(E + r2, D / 2, k), H / 2];
  const shapes = `<rect x="${E}" y="0" width="${W}" height="${H}" rx="${r2}"/>` + (LG.t > 0.01 ? `<circle cx="${c1[0].toFixed(2)}" cy="${c1[1]}" r="${r1.toFixed(2)}"/><path d="${metaball(c1, r1, c2, r2)}"/>` : '');
  const tw = W + E;
  $('lg-s').setAttribute('viewBox', `0 0 ${tw} ${H}`); $('lg-g').innerHTML = shapes;
  $('lg-rb').setAttribute('d', `M${(E + W * 0.3).toFixed(1)} ${H - 0.9}L${(E + W * 0.78).toFixed(1)} ${H - 0.9}`);
  const m = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tw} ${H}" preserveAspectRatio="none" fill="#000">${shapes}</svg>`)}")`;
  const b = $('lg-b'); b.style.webkitMaskImage = m; b.style.maskImage = m;
  const lgd = $('lgd'); const o = Math.max(0, Math.min(1, (LG.t - 0.55) / 0.45)); lgd.style.opacity = o; lgd.style.transform = `scale(${(0.6 + 0.4 * o).toFixed(3)})`;
  dock.classList.toggle('drop', LG.t > 0.9);
}
function lgTo(v) {
  LG.to = v; if (LG.raf) return;
  let last = performance.now();
  const step = (now) => { const dt = Math.min(64, now - last); last = now; const sp = dt / (LG.to > LG.t ? 620 : 420);
    LG.t = LG.to > LG.t ? Math.min(LG.to, LG.t + sp) : Math.max(LG.to, LG.t - sp); lgDraw();
    LG.raf = LG.t !== LG.to ? requestAnimationFrame(step) : 0; if (!LG.raf) { if (!LG.t && !LG.glass) $('dock').classList.remove('glass'); render(); } };
  LG.raf = requestAnimationFrame(step);
}
function paintOnAir() {
  const dock = $('dock'); if (!dock) return;
  const hero = document.querySelector('[data-hero]'); const glassPage = !!document.querySelector('[data-dock-glass]');
  // le verre reste en place le temps que la goutte rentre dans le lecteur, puis le lecteur redevient blanc
  const apply = () => { LG.glass = LG.hero || glassPage; if (LG.glass) dock.classList.add('glass'); else if (!LG.t) dock.classList.remove('glass'); lgTo(LG.hero && RM.onair && RM.onair.now ? 1 : 0); render(); };
  // la goutte ne vit que sur le premier écran de l'accueil : elle rentre dès qu'on passe à l'écran suivant
  LG.hero = !!hero && hero.getBoundingClientRect().bottom > innerHeight * 0.55;
  apply();
  const o = RM.onair || {}; const h = (t) => { const d = new Date(t); return d.getHours() + 'h' + (d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''); };
  if (o.now) {
    const img = $('lgd-img'); if (o.now.img && img.getAttribute('src') !== o.now.img) img.src = o.now.img;
    $('lgd-now').textContent = o.now.name;
    $('lgd-ring').style.strokeDashoffset = (100 - Math.max(2, Math.min(100, ((Date.now() - o.now.s) / Math.max(1, o.now.e - o.now.s)) * 100))).toFixed(1);
    $('lgd').setAttribute('aria-label', 'En ce moment : ' + o.now.name + ', ' + h(o.now.s) + ' – ' + h(o.now.e) + '. Voir le programme du jour');
  }
  $('lgd-next').textContent = o.next ? 'À suivre à ' + h(o.next.s) + ' · ' + o.next.name : 'Le programme du jour';
  lgDraw();
}
// sur l'accueil, la ligne du haut du lecteur annonce l'émission en cours (Monte-Carlo en direct)
RM.dockKind = () => { const o = RM.onair || {}; const s = RM.state; const d = $('dock');
  if (!d || !d.classList.contains('drop') || s.mode !== 'live' || s.station !== 0 || !o.now) return null;
  const h = (t) => { const x = new Date(t); return x.getHours() + 'h' + (x.getMinutes() ? String(x.getMinutes()).padStart(2, '0') : ''); };
  return o.now.name + ' · ' + h(o.now.s) + ' – ' + h(o.now.e); };
document.addEventListener('rm:onair', paintOnAir);
setInterval(() => { paintOnAir(); }, 30000);
window.addEventListener('resize', lgDraw);
let lgQ = 0;
window.addEventListener('scroll', () => { if (lgQ) return; lgQ = requestAnimationFrame(() => { lgQ = 0; const hero = document.querySelector('[data-hero]'); const v = !!hero && hero.getBoundingClientRect().bottom > innerHeight * 0.55; if (v !== LG.hero) paintOnAir(); }); }, { passive: true });
document.addEventListener('astro:page-load', () => { render(); paintOnAir(); });
render();

// Raccourci de l'app installée (« Écouter le direct ») et liens profonds ?play=1 / ?radio=2
(() => {
  const q = new URLSearchParams(location.search);
  const r = +(q.get('radio') || 0), go = q.has('play') || r;
  if (!go) return;
  const i = r >= 1 && r <= ST.length ? r - 1 : 0;
  RM.playLive(i, true);
  // si le navigateur bloque la lecture automatique, le premier geste lance le direct
  setTimeout(() => {
    if (audio.paused) {
      const dock = $('dock'); if (dock) dock.classList.add('nudge');
      const once = () => { RM.playLive(i, true); if (dock) dock.classList.remove('nudge'); };
      document.addEventListener('pointerdown', once, { once: true, capture: true });
    }
  }, 600);
  q.delete('play'); q.delete('radio'); q.delete('source');
  history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
})();

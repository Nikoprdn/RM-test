// Interactivité des rubriques de l'accueil, aussi utilisées par les pages Nos radios et Podcasts.
let stop = null;
const ME = {}; window.__rmHome = ME; // seule la version la plus récente de ce script agit

function init() {
  if (stop) stop();
  if (window.__rmHome !== ME) { stop = null; return; }
  if (!document.querySelector('[data-hero], [data-ux], [data-pz-sec], [data-scroller]')) { stop = null; return; }
  const ac = new AbortController(); const sig = { signal: ac.signal }; const timers = [];
  stop = () => { ac.abort(); timers.forEach(clearInterval); };
  const every = (ms, fn) => timers.push(setInterval(fn, ms));
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const restart = (el) => { el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- héros ----------
  let hi = 0; const hn = $$('[data-hs]').length; let hHold = 0;
  const hero = (i) => {
    hi = (i + hn) % hn;
    $$('[data-hs]').forEach((el, k) => { el.classList.toggle('on', k === hi); if (k === hi) { el.classList.remove('kb-on'); void el.offsetWidth; el.classList.add('kb-on'); } });
    $$('[data-cap]').forEach((el, k) => el.classList.toggle('on', k === hi));
    $$('[data-hgo] .bar').forEach((el, k) => (k === hi ? restart(el) : el.classList.remove('on')));
  };
  $$('[data-hgo]').forEach((b) => b.addEventListener('click', () => { hHold = Date.now(); hero(+b.dataset.hgo); }, sig));
  if (!reduced && hn) every(6000, () => { if (Date.now() - hHold > 9000) hero(hi + 1); });


  // ---------- univers webradios ----------
  const univers = () => {
    const RM = window.RM; if (!RM) return; const s = RM.state;
    $$('[data-ux]').forEach((el) => {
      // un volet peut réunir plusieurs départs (The Sound of Monte-Carlo : Monte-Carlo et Paris)
      const ids = (el.dataset.uxSt || el.dataset.ux).split(',').map(Number);
      const live = s.mode === 'live' && s.playing && ids.includes(s.station);
      const i = live ? s.station : ids[0]; const on = live;
      el.classList.toggle('on', on); el.classList.toggle('playing', on);
      el.querySelector('[data-ux-status]').textContent = on ? (ids.length > 1 ? 'En écoute · ' + RM.stations[i].name : 'En écoute') : 'En direct';
      el.querySelectorAll('[data-ux-dep]').forEach((b) => b.classList.toggle('on', on && +b.dataset.uxDep === s.station));
      const st = RM.stations[i]; const q = el.querySelector('[data-mark]');
      // Paris diffuse le programme de Monte-Carlo : si son flux ne publie pas de titre,
      // on reprend celui de la radio dont le volet affiche la playlist.
      const pl = q && q.dataset.uxPl !== undefined ? +q.dataset.uxPl : null;
      let m = RM.meta[i];
      if ((!m || !m.title) && pl !== null && pl !== i && RM.meta[pl] && RM.meta[pl].title) m = RM.meta[pl];
      const t1 = m && m.title ? m.title : (ids.includes(0) && RM.onair.now ? RM.onair.now.name : st.line);
      const t2 = m && m.title ? (m.artist || st.name) : 'En direct';
      el.querySelectorAll('[data-ux-t1]').forEach((n) => (n.textContent = t1));
      el.querySelectorAll('[data-ux-t2]').forEach((n) => (n.textContent = t2));
      // pochette du titre en cours ; à défaut, le visuel de la radio
      const c = el.querySelector('[data-ux-cover]');
      const src = (m && m.cover) || (q ? q.dataset.mark : '');
      if (c && src && c.getAttribute('src') !== src) c.src = src;
    });
  };
  ['rm:state', 'rm:meta', 'rm:onair'].forEach((e) => document.addEventListener(e, univers, sig)); univers();

  // ---------- playlist dans le volet The Sound of Monte-Carlo (historique Infomaniak) ----------
  const plAll = $$('[data-ux-pl]');
  [...new Set(plAll.map((b) => b.dataset.uxPl))].forEach((plId) => {
    const plBoxes = plAll.filter((b) => b.dataset.uxPl === plId); const plBox = plBoxes[0];
    const st = window.RM ? window.RM.stations[+plId] : null;
    const id = st ? new URL(st.stream).hostname.split('.')[0] : 'radiomonaco';
    const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const nice1 = (x) => { x = (x || '').replace(/\s+/g, ' ').trim(); const l = x.replace(/[^A-Za-zÀ-ÿ]/g, ''); const up = l.replace(/[^A-ZÀ-Þ]/g, '').length; if (l.length && up / l.length > 0.6) x = x.toLowerCase().replace(/(^|[\s(\-&/"«])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()); return x.replace(/ (Feat|Ft)\.? /gi, ' feat. ').replace(/ X /g, ' x '); };
const nice = (x) => { const k = (x || '').indexOf(' ('); return k > 0 ? nice1(x.slice(0, k)) + ' ' + nice1(x.slice(k + 1)) : nice1(x); };
    const fT = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Monaco', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    // pochettes : celles d'Infomaniak, sinon recherche iTunes (mémorisée pour la session, partagée avec la page Playlist)
    let store = {}; try { store = JSON.parse(sessionStorage.getItem('rm-covers') || '{}'); } catch (e) {}
    const save = () => { try { sessionStorage.setItem('rm-covers', JSON.stringify(store)); } catch (e) {} };
    const mark = plBox.dataset.mark || '';
    const find = async (t) => {
      if (store[t.raw] !== undefined) return store[t.raw];
      try {
        const q = encodeURIComponent((t.artist.split(/ x | feat\. | & | vs |, /i)[0] + ' ' + t.title).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim());
        const j = await (await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=1&country=fr&term=' + q, sig)).json();
        const a = j.results && j.results[0] && j.results[0].artworkUrl100; store[t.raw] = a ? a.replace('100x100', '300x300') : ''; save();
      } catch (e) { return ''; }
      return store[t.raw];
    };
    const loadPl = async () => {
      try {
        const j = await (await fetch(`https://metadata.infomaniak.com/api/radio/${id}/metadata-all-cover`, { cache: 'no-store', ...sig })).json();
        const list = (j.data || []).map((x) => { const raw = x.title || ''; const k = raw.indexOf(' - '); return { raw, date: x.date, dur: x.duration || 0, cover: x.cover || '', artist: nice(k > 0 ? raw.slice(0, k) : ''), title: nice(k > 0 ? raw.slice(k + 3) : raw) }; })
          .filter((t) => t.title && !/^radio monaco$/i.test(t.title) && !/^radio monaco$/i.test(t.artist)).sort((a, b) => b.date - a.date);
        // la première pochette du volet est le titre en cours (lecteur) : ici, les deux précédents
        const past = (list[0] && !list[0].dur ? list.slice(1) : list).slice(0, 2);
        await Promise.all(past.map(async (t) => { if (!t.cover) t.cover = await find(t); }));
        const html = past.map((t) => `<span class="uxqr"><img src="${esc(t.cover || mark)}" alt="" loading="lazy" /><b>${esc(t.title)}</b><i>${esc(t.artist)}</i></span>`).join('');
        plBoxes.forEach((bx) => { bx.querySelector('[data-ux-pll]').innerHTML = html; });
      } catch (e) {}
    };
    loadPl(); every(30000, () => { if (!document.hidden) loadPl(); });
  });

  // ---------- podcasts : recherche et rails ----------
  const PLAY = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  const pzSecs = $$('[data-pz-sec]');
  if (pzSecs.length) {
    // flèches : on fait défiler d'une page de vignettes, et on masque la flèche inutile
    $$('[data-rail-row]').forEach((row) => {
      const box = row.parentElement;
      const btns = $$('[data-rail]', box);
      const sync = () => {
        const max = row.scrollWidth - row.clientWidth - 2;
        btns.forEach((b) => (b.disabled = +b.dataset.rail < 0 ? row.scrollLeft <= 2 : row.scrollLeft >= max));
      };
      btns.forEach((b) => b.addEventListener('click', () => row.scrollBy({ left: +b.dataset.rail * Math.round(row.clientWidth * 0.8) }), sig));
      row.addEventListener('scroll', () => { clearTimeout(row._t); row._t = setTimeout(sync, 90); }, { passive: true, ...sig });
      addEventListener('resize', sync, sig); sync();
    });

    // recherche : on filtre les vignettes et les cartes à la une, les rails vides disparaissent
    const q = document.getElementById('pz-q');
    const count = document.querySelector('[data-pz-count]');
    const none = document.querySelector('[data-pz-none]');
    if (q) {
      const items = $$('[data-pz-i]');
      const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const run = () => {
        const t = norm(q.value);
        let n = 0;
        items.forEach((el) => { const on = !t || el.dataset.pzI.includes(t); el.hidden = !on; if (on) n++; });
        pzSecs.forEach((s) => (s.hidden = !$$('[data-pz-i]:not([hidden])', s).length));
        if (count) { count.hidden = !t; count.textContent = n > 1 ? n + ' résultats' : n === 1 ? '1 résultat' : 'Aucun résultat'; }
        if (none) none.hidden = !t || n > 0;
      };
      q.addEventListener('input', () => { clearTimeout(q._t); q._t = setTimeout(run, 120); }, sig);
      q.addEventListener('search', run, sig);
    }

    // marque l'épisode en cours d'écoute
    const mark = () => {
      const s = window.RM && window.RM.state; const cur = s && s.mode === 'pod' && s.ep ? s.ep.id : '';
      $$('[data-epid]').forEach((el) => {
        const on = el.dataset.epid === cur;
        el.classList.toggle('on', on);
        const p = el.querySelector('.pod-t-p'); if (p) p.innerHTML = on && s.playing ? EQ : PLAY;
      });
    };
    document.addEventListener('rm:state', mark, sig); mark();
  }

  // ---------- actualités ----------
  let ni = 0, nHold = 0; const nn = $$('.nsl').length;
  const news = (i) => {
    if (!nn) return; ni = (i + nn) % nn;
    $$('.nsl').forEach((el) => el.classList.toggle('on', +el.dataset.n === ni));
    $$('.nsl-img').forEach((el) => el.classList.toggle('on', +el.dataset.n === ni));
    $$('[data-ngo] .bar').forEach((el, k) => (k === ni ? restart(el) : el.classList.remove('on')));
    const link = document.getElementById('news-link'); const a = document.querySelector(`.nsl[data-n="${ni}"]`); if (link && a) link.href = a.href;
  };
  $$('[data-news]').forEach((b) => b.addEventListener('click', () => { nHold = Date.now(); news(ni + +b.dataset.news); }, sig));
  $$('[data-ngo]').forEach((b) => b.addEventListener('click', () => { nHold = Date.now(); news(+b.dataset.ngo); }, sig));
  if (!reduced && nn) every(7000, () => { if (Date.now() - nHold > 12000) news(ni + 1); });

  // ---------- carrousels (reels, DJs) ----------
  const hold = {};
  $$('[data-scroller]').forEach((el) => { el.addEventListener('mouseenter', () => (hold[el.dataset.scroller] = true), sig); el.addEventListener('mouseleave', () => (hold[el.dataset.scroller] = false), sig); el.addEventListener('touchstart', () => (hold[el.dataset.scroller] = true), { passive: true, ...sig }); });
  const step = (el) => { const c = el.querySelector('[data-card]'); return (c ? c.offsetWidth : 280) + 14; };
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => { const el = document.querySelector(`[data-scroller="${b.dataset.scroll}"]`); el.scrollBy({ left: +b.dataset.dir * step(el), behavior: 'smooth' }); }, sig));
  if (!reduced) every(3600, () => $$('[data-scroller]').forEach((el) => {
    if (hold[el.dataset.scroller]) return; const max = el.scrollWidth - el.clientWidth; if (max <= 4) return;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: 'smooth' }); else el.scrollBy({ left: step(el), behavior: 'smooth' });
  }));

  // ---------- équipe ----------
  let ti = 0, tHold = 0; const tn = $$('.tsl').length;
  const team = (i) => {
    ti = (i + tn) % tn;
    $$('.tsl').forEach((el) => el.classList.toggle('on', +el.dataset.t === ti));
    $$('.tsl-img').forEach((el) => el.classList.toggle('on', +el.dataset.t === ti));
    $$('[data-tgo]').forEach((b) => { const on = +b.dataset.tgo === ti; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  };
  $$('[data-tgo]').forEach((b) => b.addEventListener('click', () => { tHold = Date.now(); team(+b.dataset.tgo); }, sig));
  if (!reduced && tn) every(5000, () => { if (Date.now() - tHold > 15000) team(ti + 1); });

  // vidéo du logo (lecture forcée, silencieuse)
  const v = document.querySelector('[data-hero] video');
  if (v) { v.muted = true; if (needsKey()) keyVideo(v, ac.signal); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
}

// Safari et tous les navigateurs d'iPhone/iPad (WebKit) : ni la transparence du WebM ni
// mix-blend-mode sur une vidéo ne fonctionnent, le logo apparaît dans un rectangle noir.
// On lit alors le MP4 (logo blanc sur noir) dans un canvas en changeant le noir en transparence.
function needsKey() {
  const ua = navigator.userAgent;
  const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios || (/AppleWebKit/.test(ua) && /Safari/.test(ua) && !/Chrome\/|Chromium|Edg\/|OPR\/|Android/.test(ua));
}
function keyVideo(v, sig) {
  const box = v.parentElement; if (!box || box.querySelector('canvas')) return;
  const mp4 = v.querySelector('source[type="video/mp4"]');
  if (mp4 && v.canPlayType('video/mp4')) { v.src = mp4.src; v.load(); }
  const c = document.createElement('canvas'); c.width = 960; c.height = 540; c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  box.style.position = 'relative';
  // la vidéo reste en place (iOS ne lit pas une vidéo masquée) mais invisible
  v.style.opacity = '0'; v.style.mixBlendMode = 'normal';
  box.appendChild(c);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const draw = () => {
    if (v.readyState < 2) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
    // logo blanc : luminosité → opacité, couleur blanche
    for (let i = 0; i < d.length; i += 4) { const l = d[i] > d[i + 1] ? (d[i] > d[i + 2] ? d[i] : d[i + 2]) : (d[i + 1] > d[i + 2] ? d[i + 1] : d[i + 2]); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = l < 12 ? 0 : l; }
    ctx.putImageData(im, 0, 0);
  };
  let raf = 0;
  const loop = () => { draw(); if (!v.paused && !v.ended && !sig.aborted) raf = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };
  v.addEventListener('playing', loop, { signal: sig });
  ['loadeddata', 'seeked', 'ended', 'pause'].forEach((e) => v.addEventListener(e, draw, { signal: sig }));
  sig.addEventListener('abort', () => { if (v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(raf); cancelAnimationFrame(raf); });
}

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => { if (stop) { stop(); stop = null; } });

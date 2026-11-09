// Interactivité des rubriques de l'accueil, aussi utilisées par les pages Nos radios et Podcasts.
let stop = null;

function init() {
  if (stop) stop();
  if (!document.querySelector('[data-hero], [data-ux], #pz-data')) { stop = null; return; }
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
      const m = RM.meta[i]; const st = RM.stations[i];
      const t1 = m && m.title ? m.title : (ids.includes(0) && RM.onair.now ? RM.onair.now.name : st.line);
      el.querySelector('[data-ux-t1]').textContent = t1;
      el.querySelector('[data-ux-t2]').textContent = m && m.title ? (m.artist || st.name) : 'En direct';
      const c = el.querySelector('[data-ux-cover]');
      if (m && m.cover) { if (c.getAttribute('src') !== m.cover) c.src = m.cover; c.hidden = false; } else c.hidden = true;
    });
  };
  ['rm:state', 'rm:meta', 'rm:onair'].forEach((e) => document.addEventListener(e, univers, sig)); univers();

  // ---------- playlist dans le volet The Sound of Monte-Carlo (historique Infomaniak) ----------
  const plBoxes = $$('[data-ux-pl]'); const plBox = plBoxes[0];
  if (plBox) {
    const st = window.RM ? window.RM.stations[+plBox.dataset.uxPl] : null;
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
        const past = (list[0] && !list[0].dur ? list.slice(1) : list).slice(0, 3);
        await Promise.all(past.map(async (t) => { if (!t.cover) t.cover = await find(t); }));
        const html = past.map((t) => `<span class="uxqr"><img src="${esc(t.cover || mark)}" alt=""${t.cover ? '' : ' class="ph"'} loading="lazy" /><b>${esc(t.title)}</b><i>${esc(t.artist)}</i></span>`).join('');
        plBoxes.forEach((bx) => { bx.querySelector('[data-ux-pll]').innerHTML = html; bx.hidden = !past.length; });
      } catch (e) {}
    };
    loadPl(); every(30000, () => { if (!document.hidden) loadPl(); });
  }

  // ---------- podcasts ----------
  const dataEl = document.getElementById('pz-data');
  if (dataEl) {
    const D = JSON.parse(dataEl.textContent); const SH = D.shows; let filt = 'all', sel = '';
    const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const when = (iso) => { const d = new Date(iso + 'Z'); const dd = new Date(d); dd.setHours(0, 0, 0, 0); const n = Math.round((t0 - dd) / 864e5); return n <= 0 ? 'Aujourd’hui' : n === 1 ? 'Hier' : n < 7 ? `Il y a ${n} jours` : d.getDate() + ' ' + MOIS[d.getMonth()]; };
    const dur = (s) => { const m = Math.round(s / 60); if (m < 1) return s + ' s'; if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : ''); };
    const img = (id, big) => `https://image.ausha.co/${id}_${big ? '1400x1400' : '400x400'}.jpeg`;
    const ep = (sh, i) => { const e = sh.e[i]; return { id: sh.k + ':' + i, url: `https://audio.ausha.co/${e[3]}.mp3`, title: e[4], show: sh.n, color: sh.c, ink: sh.f === 'mixdj' ? '#141218' : '#FFFFFF', img: img(e[2]), s: e[1], d: e[0], big: img(e[2], true), sub: sh.sub }; };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PLAY = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    const draw = () => {
      const shows = SH.filter((s) => filt === 'all' || s.f === filt);
      const selShow = sel ? SH.find((s) => s.k === sel) : null;
      const all = []; shows.forEach((s) => s.e.forEach((_, i) => all.push(ep(s, i)))); all.sort((a, b) => (a.d < b.d ? 1 : -1));
      const feat = selShow ? ep(selShow, 0) : (all.find((x) => x.id.startsWith('morning:')) || all[0]);
      const list = selShow ? selShow.e.map((_, i) => ep(selShow, i)).slice(0, 7) : [feat, ...all.filter((x) => x.id !== feat.id)].slice(0, 7);
      document.getElementById('pz-title').textContent = selShow ? selShow.n + ' · ' + selShow.sub : (filt === 'all' ? 'Derniers épisodes' : D.labels[filt]);
      document.getElementById('pz-list').innerHTML = list.map((x) => `<button class="pzr2" type="button" data-rm-ep='${esc(JSON.stringify(x))}' data-epid="${x.id}" style="--c:${x.color}"><span class="pzr2c"><img src="${x.img}" alt="" loading="lazy"></span><span class="pzr2x"><span class="pzrs">${esc(x.show)}</span><span class="pzr2t">${esc(x.title)}</span><span class="pzrm">${when(x.d)} · ${dur(x.s)}</span></span><span class="pzr2p">${PLAY}</span><span class="pzrbar" aria-hidden="true"><i style="width:0%"></i></span></button>`).join('');
      const F = document.getElementById('pz-feat');
      if (F && feat) {
        F.style.setProperty('--c', feat.color);
        F.querySelectorAll('[data-rm-ep]').forEach((b) => (b.dataset.rmEp = JSON.stringify(feat)));
        const im = F.querySelector('.pzfcv img'); if (im.getAttribute('src') !== feat.big) im.src = feat.big;
        F.querySelector('.live-dot').style.background = feat.color;
        F.querySelector('[data-f=badge]').textContent = (when(feat.d) === 'Aujourd’hui' ? 'Nouveau · aujourd’hui' : 'À la une') + ' · ' + feat.show;
        F.querySelector('[data-f=title]').textContent = feat.title;
        F.querySelector('[data-f=meta]').textContent = when(feat.d) + ' · ' + dur(feat.s) + ' · ' + feat.sub;
      }
      $$('.pzchip2').forEach((c) => { const on = c.dataset.show === sel; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.hidden = !(filt === 'all' || SH.find((s) => s.k === c.dataset.show).f === filt); });
      $$('[data-filter]').forEach((t) => { const on = t.dataset.filter === filt; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      mark();
    };
    const mark = () => {
      const s = window.RM && window.RM.state; const cur = s && s.mode === 'pod' && s.ep ? s.ep.id : '';
      $$('#pz-list .pzr2').forEach((r) => { const on = r.dataset.epid === cur; r.classList.toggle('on', on); r.querySelector('.pzr2p').innerHTML = on && s.playing ? EQ : PLAY; });
      const F = document.getElementById('pz-feat');
      if (F) { const fid = JSON.parse(F.querySelector('.pzfcb').dataset.rmEp).id; const on = cur === fid && s.playing; F.querySelector('[data-f=cta]').textContent = on ? 'Pause' : cur === fid ? 'Reprendre l’écoute' : 'Écouter l’épisode'; F.classList.toggle('playing', on); }
    };
    const prog = (e) => { const s = window.RM.state; if (s.mode !== 'pod' || !s.ep) return; const r = document.querySelector(`#pz-list [data-epid="${s.ep.id}"] .pzrbar i`); if (r && e.detail.d) r.style.width = ((100 * e.detail.t) / e.detail.d).toFixed(1) + '%'; };
    $$('[data-filter]').forEach((t) => t.addEventListener('click', () => { filt = t.dataset.filter; sel = ''; draw(); }, sig));
    $$('.pzchip2').forEach((c) => c.addEventListener('click', () => { sel = sel === c.dataset.show ? '' : c.dataset.show; draw(); }, sig));
    $$('[data-chips]').forEach((b) => b.addEventListener('click', () => document.getElementById('pz-chips').scrollBy({ left: +b.dataset.chips * 300, behavior: 'smooth' }), sig));
    document.addEventListener('rm:state', mark, sig); document.addEventListener('rm:time', prog, sig);
    mark();
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

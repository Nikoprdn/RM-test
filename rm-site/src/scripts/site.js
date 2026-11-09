// Comportements communs à toutes les pages (relancés à chaque navigation).
// En-tête, menu mobile, rubrique active, barre de progression, glissé vers les ancres,
// défilement amorti, apparition des rubriques, transitions.

let ctrl = null;
const ME = {}; window.__rmSite = ME; // seule la version la plus récente de ce script agit

function init() {
  if (window.__rmSite !== ME) { if (ctrl) ctrl.abort(); ctrl = null; return; }
  if (ctrl) ctrl.abort();
  ctrl = new AbortController();
  const sig = { signal: ctrl.signal };
  const doc = document.documentElement;
  const se = () => document.scrollingElement || doc;
  const mm = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = mm('(prefers-reduced-motion: reduce)');
  const hdr = document.querySelector('.hdr');
  const hasHero = !!document.querySelector('[data-hero]');

  // ---- menu mobile ----
  const mb = document.querySelector('.menu-btn');
  if (mb && hdr) {
    // plein écran sur mobile : la page derrière ne défile pas tant que le menu est ouvert
    const setMenu = (o) => { hdr.classList.toggle('open', o); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); mb.setAttribute('aria-label', o ? 'Fermer le menu' : 'Menu'); document.documentElement.classList.toggle('menu-open', o); };
    mb.addEventListener('click', () => setMenu(!hdr.classList.contains('open')), sig);
    hdr.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false), sig));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hdr.classList.contains('open')) { setMenu(false); mb.focus(); } }, sig);
    window.addEventListener('resize', () => { if (innerWidth > 1000 && hdr.classList.contains('open')) setMenu(false); }, sig);
  }

  // ---- apparition des rubriques ----
  const secs = [...document.querySelectorAll('[data-reveal]')];
  if (reduced || typeof IntersectionObserver === 'undefined') secs.forEach((s) => s.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -14% 0px' });
    secs.forEach((s) => io.observe(s));
    ctrl.signal.addEventListener('abort', () => io.disconnect());
  }

  // ---- rubrique active + indicateur ----
  const nav = hdr && hdr.querySelector('.nav');
  const ind = nav && nav.querySelector('.ind');
  const links = nav ? [...nav.querySelectorAll('a[data-sec], a[data-page]')] : [];
  const targets = links.map((a) => document.getElementById(a.dataset.sec)).filter(Boolean);
  let active = '';
  const setActive = (id) => {
    if (id === active) return; active = id;
    links.forEach((a) => { const on = a.dataset.sec === id || (!targets.length && a.dataset.page && location.pathname.includes(a.dataset.page)); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    const el = links.find((a) => a.classList.contains('on'));
    if (ind) { if (el) { ind.style.width = el.offsetWidth + 'px'; ind.style.transform = `translateX(${el.offsetLeft}px)`; ind.style.opacity = 1; } else ind.style.opacity = 0; }
  };
  if (!targets.length) { active = null; setActive(''); }

  // ---- défilement : en-tête, progression, profondeur du héros, rubrique active ----
  let q = 0, gliding = 0;
  const onScroll = () => {
    q = 0;
    const y = se().scrollTop, vh = window.innerHeight || 800, max = Math.max(1, se().scrollHeight - vh);
    doc.style.setProperty('--rm-p', Math.min(1, y / max).toFixed(4));
    if (hdr && hasHero) hdr.classList.toggle('over', y <= 80);
    if (hasHero && y < 1400) {
      doc.style.setProperty('--rm-hy', (y * 0.38).toFixed(1) + 'px');
      doc.style.setProperty('--rm-hc', (y * 0.16).toFixed(1) + 'px');
      doc.style.setProperty('--rm-ho', Math.max(0, 1 - y / 560).toFixed(3));
    }
    if (targets.length && !gliding) {
      let act = ''; targets.forEach((t) => { if (t.getBoundingClientRect().top < vh * 0.42) act = t.id; });
      if (y + vh >= se().scrollHeight - 4) act = targets[targets.length - 1].id;
      setActive(act);
    }
  };
  window.addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(onScroll); }, { passive: true, ...sig });
  window.addEventListener('resize', () => { active = '__'; onScroll(); }, sig);
  onScroll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { active = '__'; onScroll(); });

  // ---- glissé long et freiné vers les ancres de la page ----
  const glide = (to) => {
    const from = se().scrollTop, dist = to - from;
    if (Math.abs(dist) < 2) return;
    if (reduced) { se().scrollTop = to; return; }
    const dur = Math.min(2000, 1000 + Math.abs(dist) * 0.16), t0 = performance.now();
    const ez = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); se().scrollTop = from + dist * ez(t); if (t < 1 && !ctrl.signal.aborted) gliding = requestAnimationFrame(step); else { gliding = 0; onScroll(); } };
    cancelAnimationFrame(gliding); gliding = requestAnimationFrame(step);
  };
  // ---- magnétisme des sections : quand le défilement s'arrête entre deux rubriques, on glisse vers la plus proche ----
  // Les rubriques marquées data-snap ; à l'intérieur d'une rubrique plus haute que l'écran, on reste libre.
  const snaps = [...document.querySelectorAll('[data-snap]')];
  if (snaps.length > 1 && !reduced) {
    let lastY = se().scrollTop, dir = 1, timer = 0, anim = 0, busy = false, touching = false;
    const view = (el) => { const top = el.getBoundingClientRect().top + se().scrollTop; const pt = parseFloat(getComputedStyle(el).paddingTop) || 0;
      return el.hasAttribute('data-hero') ? 0 : el.hasAttribute('data-full') ? top - 84 : el.classList.contains('hsec') ? top + pt - 84 - 52 : top - 84; };
    const zones = () => { const vh = innerHeight, max = se().scrollHeight - vh; const z = [];
      snaps.forEach((el, i) => { const a = Math.max(0, view(el)); const end = (snaps[i + 1] ? snaps[i + 1].getBoundingClientRect().top + se().scrollTop : se().scrollHeight) - vh; z.push([Math.min(a, max), Math.min(max, Math.max(a, end))]); });
      const ft = z[z.length - 1]; if (ft) ft[1] = max; return z; };
    const stopAnim = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; busy = false; } };
    const go = (to) => { const from = se().scrollTop, d = to - from; if (Math.abs(d) < 3) return; busy = true; const dur = Math.min(900, 420 + Math.abs(d) * 0.5), t0 = performance.now();
      const ez = (t) => 1 - Math.pow(1 - t, 4);
      const st = (n) => { const t = Math.min(1, (n - t0) / dur); se().scrollTop = from + d * ez(t); if (t < 1 && !ctrl.signal.aborted) anim = requestAnimationFrame(st); else { anim = 0; setTimeout(() => { busy = false; lastY = se().scrollTop; }, 60); } };
      anim = requestAnimationFrame(st); };
    const settle = () => {
      if (busy || gliding || touching || doc.classList.contains('menu-open')) return;
      const y = se().scrollTop, z = zones(); const vh = innerHeight;
      if (z.some(([a, b]) => y >= a - 2 && y <= b + 2)) return; // on est sur un bon point de vue
      // entre deux rubriques : bord de la zone précédente ou début de la suivante, selon le sens et la distance
      let prev = null, next = null; z.forEach(([a, b]) => { if (b < y) prev = b; if (a > y && next === null) next = a; });
      if (prev === null) return go(next); if (next === null) return go(prev);
      const k = (y - prev) / Math.max(1, next - prev);
      go(dir > 0 ? (k > 0.12 ? next : prev) : (k < 0.88 ? prev : next));
    };
    window.addEventListener('scroll', () => { const y = se().scrollTop; if (!busy) { if (Math.abs(y - lastY) > 1) dir = y > lastY ? 1 : -1; lastY = y; }
      clearTimeout(timer); timer = setTimeout(settle, 'onscrollend' in window ? 400 : 180); }, { passive: true, ...sig });
    if ('onscrollend' in window) window.addEventListener('scrollend', () => { clearTimeout(timer); timer = setTimeout(settle, 60); }, sig);
    ['wheel', 'keydown'].forEach((e) => window.addEventListener(e, stopAnim, { passive: true, ...sig }));
    window.addEventListener('touchstart', () => { touching = true; stopAnim(); }, { passive: true, ...sig });
    window.addEventListener('touchend', () => { touching = false; clearTimeout(timer); timer = setTimeout(settle, 220); }, { passive: true, ...sig });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a || e.defaultPrevented) return;
    const url = new URL(a.href, location.href); if (url.pathname !== location.pathname || !url.hash) return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1))); if (!el) return;
    e.preventDefault();
    const pt = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const to = el.hasAttribute('data-full') ? el.getBoundingClientRect().top + se().scrollTop - 84 : el.getBoundingClientRect().top + se().scrollTop + pt - 84 - 52;
    if (a.dataset.sec) setActive(a.dataset.sec);
    glide(Math.max(0, Math.min(to, se().scrollHeight - innerHeight)));
    history.replaceState(history.state, '', url.hash);
  }, sig);
  // arrivée sur une page avec #ancre
  if (location.hash && hasHero) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => { const to = el.hasAttribute('data-full') ? el.offsetTop - 84 : el.offsetTop - 40; se().scrollTop = to; }, 60); }

  // ---- partage ----
  document.querySelectorAll('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(location.href); b.textContent = 'Lien copié'; } catch (e) {} }
  }, sig));
}

document.addEventListener('astro:page-load', init);

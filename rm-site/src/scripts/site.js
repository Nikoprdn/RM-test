// Comportements communs à toutes les pages (relancés à chaque navigation).
// En-tête, menu mobile, rubrique active, barre de progression, glissé vers les ancres,
// défilement amorti, apparition des rubriques, transitions.

let ctrl = null;

function init() {
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
    mb.addEventListener('click', () => { const o = hdr.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); }, sig);
    hdr.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => hdr.classList.remove('open'), sig));
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

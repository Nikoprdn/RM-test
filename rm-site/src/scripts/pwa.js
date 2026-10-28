// Site installable : service worker + invitation discrète à l'installation.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register(BASE + '/sw.js', { scope: BASE + '/' }).catch(() => {}));
}
let deferred = null;
const KEY = 'rm-install-later';
const later = () => { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < 14 * 864e5; } catch (e) { return false; } };
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const box = () => document.getElementById('install');
function show(txt) {
  const b = box(); if (!b || later() || standalone()) return;
  if (txt) document.getElementById('install-txt').textContent = txt;
  b.classList.add('show');
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferred = e;
  // on attend que l'auditeur ait montré de l'intérêt (2e page vue ou écoute lancée)
  const n = +(sessionStorage.getItem('rm-pv') || 0);
  if (n >= 2 || (window.RM && window.RM.state.playing)) show();
  else document.addEventListener('rm:state', (ev) => { if (ev.detail.playing) setTimeout(() => show(), 4000); }, { once: true });
});
document.addEventListener('astro:page-load', () => {
  try { sessionStorage.setItem('rm-pv', String(+(sessionStorage.getItem('rm-pv') || 0) + 1)); } catch (e) {}
  const ok = document.getElementById('install-ok'), no = document.getElementById('install-no');
  if (ok && !ok.dataset.wired) {
    ok.dataset.wired = '1';
    ok.addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; box().classList.remove('show'); }
      else { document.getElementById('install-txt').textContent = 'Touchez le bouton Partager, puis « Sur l’écran d’accueil ».'; ok.hidden = true; }
    });
    no.addEventListener('click', () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} box().classList.remove('show'); });
  }
  // iPhone / iPad : pas d'événement d'installation, on propose le geste manuel après 3 pages vues
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone();
  if (ios && +(sessionStorage.getItem('rm-pv') || 0) === 3) show('Touchez Partager puis « Sur l’écran d’accueil » : le direct en un geste.');
});

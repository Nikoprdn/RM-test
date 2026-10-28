// Test PWA : manifeste, service worker, hors ligne, invitation à l'installation, raccourci ?play=1
const { chromium } = require('playwright');
const fs = require('fs');
const TONE = fs.readFileSync('/tmp/claude-0/-home-claude/cbf41fa3-6d35-5be0-a984-1af5a0b8761e/scratchpad/tone.wav');
const SRV = process.env.SRV;
const OUT = '/home/claude/rm-site/tests/shots/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await ctx.route(/infomaniak\.ch\/.*\.(mp3|aac)$|audio\.ausha\.co/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: TONE }));
  await ctx.route(/\.xspf|itunes|wp-json|wp-content|ausha/, (r) => r.abort());
  const cp = require('child_process'); let srv = cp.spawn('python3', ['-m', 'http.server', '8801'], { cwd: SRV, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1000));
  const base = 'http://localhost:8801/RM-test/';
  await p.goto(base, { waitUntil: 'load' });
  const man = await p.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href); const j = await r.json(); const icons = await Promise.all(j.icons.map(async (i) => (await fetch(new URL(i.src, l.href))).status)); return { ok: r.ok, name: j.name, start: new URL(j.start_url, l.href).pathname, icons }; });
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
  if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) { await p.reload({ waitUntil: 'load' }); }
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { scope: r && r.scope, controlled: !!navigator.serviceWorker.controller, caches: (await caches.keys()), n: (await (await caches.open('rm-v1')).keys()).length }; });
  // visiter une page, puis couper le réseau
  await p.goto(base + 'programmes/', { waitUntil: 'load' });
  srv.kill(); await new Promise((r) => setTimeout(r, 500));
  await p.goto(base + 'programmes/', { waitUntil: 'load' }).catch(() => {});
  const offCached = await p.evaluate(() => document.querySelector('h1') && document.querySelector('h1').textContent);
  await p.goto(base + 'jamais-visitee/', { waitUntil: 'load' }).catch(() => {});
  const offNew = await p.evaluate(() => (document.querySelector('h1') || {}).textContent);
  await p.screenshot({ path: OUT + 'pwa-offline.png' });
  srv = cp.spawn('python3', ['-m', 'http.server', '8801'], { cwd: SRV, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1000));
  // invitation : on simule l'événement d'installation après 2 pages vues
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = 1; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await p.waitForTimeout(700);
  const inst = await p.evaluate(() => ({ shown: document.getElementById('install').classList.contains('show'), txt: document.getElementById('install-txt').textContent }));
  await p.screenshot({ path: OUT + 'pwa-install.png' });
  await p.click('#install-ok'); await p.waitForTimeout(300);
  const prompted = await p.evaluate(() => ({ prompted: !!window.__prompted, hidden: !document.getElementById('install').classList.contains('show') }));
  // raccourci « Écouter le direct »
  await p.goto(base + '?play=1&source=pwa', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const sc = await p.evaluate(() => ({ playing: RM.state.playing, paused: document.getElementById('rm-audio').paused, url: location.search }));
  await p.goto(base + '?radio=3', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const sc3 = await p.evaluate(() => ({ station: RM.state.station, title: document.getElementById('dock-title').textContent, paused: document.getElementById('rm-audio').paused }));
  console.log(JSON.stringify({ man, sw, offCached, offNew, inst, prompted, sc, sc3, errs }, null, 1));
  await b.close(); srv.kill();
})();

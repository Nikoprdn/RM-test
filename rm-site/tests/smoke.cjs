// Test de bout en bout : rendu, navigation sans coupure du son, pages, métadonnées.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const A = '/home/claude/rm-site/public/assets/';
const TONE = fs.readFileSync('/tmp/claude-0/-home-claude/cbf41fa3-6d35-5be0-a984-1af5a0b8761e/scratchpad/tone.wav');
const OUT = '/home/claude/rm-site/tests/shots/'; fs.mkdirSync(OUT, { recursive: true });
const imgs = fs.readdirSync(A).filter((f) => /\.(jpg)$/.test(f) && /^(team|dj|show|rm-)/.test(f));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push('PAGE ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load|ERR_|404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  let n = 0;
  await ctx.route(/wp-content\/demo\/|image\.ausha\.co/, (r) => { const f = r.request().url().includes('/demo/') ? r.request().url().split('/demo/')[1] : imgs[(n++) % imgs.length]; r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(A + (fs.existsSync(A + f) ? f : imgs[0])) }); });
  await ctx.route(/infomaniak\.ch\/.*\.(mp3|aac)$|audio\.ausha\.co/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: TONE }));
  await ctx.route(/\.xspf/, (r) => r.fulfill({ status: 200, contentType: 'text/xml', body: '<?xml version="1.0"?><playlist><trackList><track><title>DISCO LINES - NO BROKE BOYS</title></track></trackList></playlist>' }));
  await ctx.route(/itunes\.apple\.com|radio-monaco\.com\/wp-json/, (r) => r.abort());
  const base = 'http://localhost:8800/RM-test/';
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '01-home.png' });
  // lancer le direct
  await p.click('.hdr .hbtn'); await p.waitForTimeout(1500);
  const s1 = await p.evaluate(() => ({ playing: RM.state.playing, t: document.getElementById('rm-audio').currentTime, label: document.querySelector('.hdr [data-rm-label]').textContent, dock: document.getElementById('dock-title').textContent }));
  // naviguer vers les podcasts puis un article : le son doit continuer
  await p.click('nav a[href$="#podcasts"]'); await p.waitForTimeout(2600); await p.screenshot({ path: OUT + '02-podcasts.png' });
  await p.click('#pz-list .pzr2 >> nth=1'); await p.waitForTimeout(1200);
  const s2 = await p.evaluate(() => ({ mode: RM.state.mode, playing: RM.state.playing, ep: RM.state.ep && RM.state.ep.title }));
  await p.goto(base + 'demo-article-1/', { waitUntil: 'load' }); // chargement complet (référence)
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(800);
  await p.click('.hdr .hbtn'); await p.waitForTimeout(1200);
  const audioId = await p.evaluate(() => { window.__aid = Math.random(); document.getElementById('rm-audio').__id = window.__aid; return window.__aid; });
  await p.click('a.row >> nth=0'); await p.waitForTimeout(1800);
  const s3 = await p.evaluate(() => ({ url: location.pathname, same: document.getElementById('rm-audio').__id, playing: RM.state.playing, paused: document.getElementById('rm-audio').paused, t: document.getElementById('rm-audio').currentTime, h1: document.querySelector('h1').textContent }));
  await p.screenshot({ path: OUT + '03-article.png' });
  await p.click('.art-meta .cat'); await p.waitForTimeout(1500);
  const s4 = await p.evaluate(() => ({ url: location.pathname, paused: document.getElementById('rm-audio').paused, cards: document.querySelectorAll('.card').length }));
  await p.screenshot({ path: OUT + '04-category.png' });
  await p.click('nav a[href$="/programmes/"]'); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '05-programme.png' });
  const s5 = await p.evaluate(() => ({ url: location.pathname, paused: document.getElementById('rm-audio').paused, slots: document.querySelectorAll('.slot').length, now: (document.querySelector('.slot.now b') || {}).textContent }));
  // retour à l'accueil par le logo
  await p.click('.hdr .lg'); await p.waitForTimeout(2000);
  const s6 = await p.evaluate(() => ({ url: location.pathname, paused: document.getElementById('rm-audio').paused, onair: document.getElementById('onair-now').textContent, heroOver: document.querySelector('.hdr').classList.contains('over') }));
  // métadonnées SEO d'un article
  const seo = await p.evaluate(async (u) => { const h = await (await fetch(u)).text(); const d = new DOMParser().parseFromString(h, 'text/html'); return { title: d.title, canon: d.querySelector('link[rel=canonical]').href, robots: (d.querySelector('meta[name=robots]') || {}).content, og: d.querySelector('meta[property="og:image"]').content, ld: [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)['@type']) }; }, base + 'demo-article-2/');
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.route(/wp-content\/demo\/|image\.ausha\.co/, (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(A + 'rm-casino.jpg') }));
  await m.route(/infomaniak|itunes|wp-json|audio\.ausha/, (r) => r.abort());
  await m.goto(base, { waitUntil: 'load' }); await m.waitForTimeout(2000); await m.screenshot({ path: OUT + '06-mobile-home.png' });
  await m.click('.menu-btn'); await m.waitForTimeout(400); await m.screenshot({ path: OUT + '07-mobile-menu.png' });
  await m.goto(base + 'demo-article-3/', { waitUntil: 'load' }); await m.waitForTimeout(800); await m.screenshot({ path: OUT + '08-mobile-article.png', fullPage: false });
  console.log(JSON.stringify({ errs, s1, s2, s3, s4, s5, s6, seo }, null, 1));
  await b.close();
})();

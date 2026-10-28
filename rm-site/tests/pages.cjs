const { chromium } = require('playwright');
const fs = require('fs');
const A = '/home/claude/rm-site/public/assets/'; const OUT = '/home/claude/rm-site/tests/shots/';
const imgs = fs.readdirSync(A).filter((f) => /\.(jpg)$/.test(f) && /^(team|dj|show|rm-)/.test(f));
(async () => {
  const b = await chromium.launch();
  const res = {};
  for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    let n = 0; const errs = [];
    await ctx.route(/wp-content\/demo\/|image\.ausha\.co/, (r) => { const f = r.request().url().includes('/demo/') ? r.request().url().split('/demo/')[1] : imgs[(n++) % imgs.length]; r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(A + (fs.existsSync(A + f) ? f : imgs[0])) }); });
    await ctx.route(/infomaniak|itunes|wp-json/, (r) => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    for (const pg of ['nos-radios', 'djs', 'contact', 'mentions-legales', 'actualites']) {
      if (tag === 'm' && !['nos-radios', 'contact'].includes(pg)) continue;
      await p.goto('http://localhost:8800/RM-test/' + pg + '/', { waitUntil: 'load' }); await p.waitForTimeout(900);
      await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((s) => s.classList.add('in')));
      res[tag + ':' + pg] = await p.evaluate(() => ({ h1: document.querySelector('h1').textContent, active: [...document.querySelectorAll('.nav a.on')].map((a) => a.textContent), canon: document.querySelector('link[rel=canonical]').href }));
      await p.screenshot({ path: OUT + `pg-${tag}-${pg}.png`, fullPage: tag === 'd' && pg !== 'actualites' });
    }
    res[tag + ':errs'] = errs; await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1)); await b.close();
})();

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const html = read('index.html'), worker = read('notifications-sw.js');
const core = read('sbp-core.css'), ui = read('sbp-ui.css');
const version = '20261101-css-bundle-v1';

test('both generated CSS bundles exactly match the editable source sheets',()=>{
  const result = spawnSync(process.execPath, ['scripts/build-css.cjs','--check'], {cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stdout,/sbp-core\.css: 11 source sheets/);
  assert.match(result.stdout,/sbp-ui\.css: 11 source sheets/);
});
test('only three local CSS files block page rendering instead of 23',()=>{
  const links=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match=>match[1]);
  const local=links.filter(link=>!/^https?:\/\//.test(link));
  assert.deepEqual(local,[
    'tailwind-local.css?v=20261101-no-violet-v1',
    'sbp-core.css?v='+version,
    'sbp-ui.css?v='+version
  ]);
  assert.ok(links.indexOf('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css') < links.indexOf('sbp-core.css?v='+version));
  assert.ok(links.indexOf('tailwind-local.css?v=20261101-no-violet-v1') < links.indexOf('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'));
  assert.ok(!html.includes('href="desktop.css'), 'desktop rules must be scoped inside the core bundle');
});
test('desktop-only styling is inside its original min-width media query',()=>{
  assert.match(core,/\/\* === desktop\.css === \*\/\n@media \(min-width: 768px\) \{/);
  assert.match(core,/\/\* === gradients\.css === \*\//);
  assert.ok(core.indexOf('/* === desktop.css === */') < core.indexOf('/* === gradients.css === */'));
  assert.ok(core.indexOf('/* === style.css === */') < core.indexOf('/* === responsive-fit.css === */'));
  assert.ok(ui.indexOf('/* === approved-interface.css === */') < ui.indexOf('/* === brand-blue.css === */'));
  assert.match(ui,/border-bottom:0!important/,'latest removed header divider still present');
  assert.match(ui,/\.notification-bell/,'all header icons remain');
});
test('PWA caches only required local CSS while keeping original application scripts and icons',()=>{
  const precache=worker.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)?.[1];
  assert.ok(precache);
  const assets=[...precache.matchAll(/'([^']+)'/g)].map(match=>match[1]);
  const cachedCss=assets.filter(asset=>/^\.\/[^?]+\.css\?/.test(asset));
  assert.deepEqual(cachedCss.sort(),[
    './tailwind-local.css?v=20261101-no-violet-v1',
    './sbp-core.css?v='+version,
    './sbp-ui.css?v='+version
  ].sort());
  assert.ok(assets.includes('./app.js?v='+version));
  assert.ok(assets.includes('./release-notes.js?v='+version));
  assert.ok(assets.includes('./release-data.js?v='+version));
  assert.ok(assets.includes('./sbp-icon-192.png'));
  assert.match(worker,/sbp-shell-20261101-css-bundle-v1/);
  assert.match(html,/step19\.29-css-bundle-2026-11-01-v1/);
});
test('the 19.29 performance release has both RU and KZ descriptions',()=>{
  const release=read('release-data.js');
  const current=release.slice(release.indexOf("version:'19.29'"),release.indexOf("version:'19.28'"));
  assert.match(current,/ru:\[/);
  assert.match(current,/kz:\[/);
});

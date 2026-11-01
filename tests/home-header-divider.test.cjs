'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const approved=read('approved-interface.css');
const finalCss=read('brand-blue.css');
const homeReference=read('home-first-reference.css');
const html=read('index.html');
const worker=read('notifications-sw.js');

test('day heading no longer draws the leftover horizontal divider',()=>{
  assert.match(homeReference,/\.home-ref-today-head\s*\{[\s\S]*?border-bottom:1px solid var\(--home-first-edge\)!important/);
  assert.match(approved,/#view-home \.home-ref-today-head\s*\{[^}]*border-bottom:0!important/);
  assert.doesNotMatch(approved,/#view-home \.home-ref-today-head\s*\{[^}]*border-bottom:1px/);
  const specific=finalCss.match(/#view-home \.home-ref-today > \.home-ref-today-head\s*\{([^}]*)\}/);
  assert.ok(specific,'last stylesheet overrides earlier heading styles');
  assert.match(specific[1],/border:0!important/);
  assert.match(specific[1],/border-bottom:0!important/);
  assert.match(specific[1],/box-shadow:none!important/);
});
test('first lesson has a small gap below the clean heading and keeps its outline',()=>{
  const timeline=finalCss.match(/#view-home \.home-ref-today > #home-day-timeline\s*\{([^}]*)\}/);
  assert.ok(timeline);
  assert.match(timeline[1],/padding:6px 2px 2px!important/);
  assert.match(finalCss,/\.home-ref-lesson-card\.next:not\(\.current\)/);
  assert.match(finalCss,/border:1px solid #b9deef!important/);
  assert.match(finalCss,/#view-home \.home-ref-break-card:not\(\.current\)/);
  assert.match(html,/id="home-reference-title"/);
  assert.match(html,/id="home-reference-date"/);
});
test('build 19.28 refreshes the exact changed styles in the installed PWA',()=>{
  assert.match(html,/step19\.29-css-bundle-2026-11-01-v1/);
  assert.ok(html.includes('sbp-ui.css?v=20261101-css-bundle-v1'),'latest UI CSS is linked');
  assert.ok(worker.includes('sbp-ui.css?v=20261101-css-bundle-v1'),'latest UI CSS is cached');
  const output=read('sbp-ui.css');
  for(const name of ['approved-interface.css','brand-blue.css']) {
    assert.ok(output.includes('/* === '+name+' === */'),'source CSS preserved in deployed UI bundle: '+name);
  }
  assert.match(worker,/sbp-shell-20261101-css-bundle-v1/);
  const releases=read('release-data.js');
  const latest=releases.slice(releases.indexOf("version:'19.28'"),releases.indexOf("version:'19.27'"));
  assert.match(latest,/ru:\[/);
  assert.match(latest,/kz:\[/);
});

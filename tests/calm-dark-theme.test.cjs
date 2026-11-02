'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dark=read('dark-mode.css'),brand=read('brand-blue.css'),core=read('sbp-core.css'),ui=read('sbp-ui.css'),html=read('index.html'),sw=read('notifications-sw.js');
const calm=brand.slice(brand.indexOf('/* 19.52: charcoal dark UI'));
function hex(token){return dark.match(new RegExp('--sbp-'+token+':(#[0-9a-f]{6})'))?.[1]}
function lum(hex){const a=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('charcoal surfaces and low-glare accent retain readable contrast',()=>{
 assert.ok(calm.startsWith('/* 19.52'), 'new dark-only override is last');
 for(const [name,wanted] of Object.entries({page:'#121416',surface:'#1c1f21',soft:'#222629',raised:'#2a2f33',line:'#343b3f',ink:'#e2e6e8',muted:'#afb8bc',accent:'#acc0ca'}))
  assert.equal(hex(name),wanted,name);
 for(const [fg,bg] of [['ink','surface'],['ink','soft'],['muted','soft'],['accent','surface'],['green','green-soft'],['warning','warning-soft'],['danger','danger-soft']])
  assert.ok(contrast(hex(fg),hex(bg))>=4.5,fg+' on '+bg);
 assert.doesNotMatch(calm,/#229ed9|#65c7f2|#82d8ff|#9bdeff/i,'no old neon blues in latest layer');
});
test('light palette is not changed by last dark-only overrides',()=>{
 assert.match(brand,/:root:root \{\s*--sbp-accent:#1684ba/);
 assert.match(calm,/:root:root\[data-sbp-theme="dark"\] body\.sbp-redesign/);
 assert.doesNotMatch(calm,/:root:root body\.sbp-redesign/,'dark-only overrides must not target the light UI');
 assert.match(read('redesign.js'),/prefers-color-scheme: dark/);
 assert.doesNotMatch(html,/data-sbp-theme="(?:light|dark|system)"|sbp-theme-card/);
});
test('cards, navigation, fields, banner and current lesson are muted and separated',()=>{
 for(const selector of ['#view-home .home-ref-today','#view-schedule .schedule-ref-card','#view-roster .roster-person-card','#admin-settings-modal .settings-reference-card','.support-thread-btn','.notification-card','.sbp-cover-banner','.home-ref-lesson-card.current','.primary','.mini-calendar-day.today'])
  assert.ok(calm.includes(selector),'missing charcoal override for '+selector);
 assert.ok(calm.includes('--sbp-green-soft:#1d2f29'),'active lesson remains green');
 assert.ok(calm.includes('--sbp-danger-soft:#36272b'),'errors remain distinguishable');
});
test('compiled CSS and installed PWA use the same updated dark palette',()=>{
 assert.ok(core.includes('--sbp-page:#121416'));
 assert.ok(ui.includes('/* 19.52: charcoal dark UI'));
 assert.match(html,/sbp-ui\.css\?v=20261102-neutral-dark-v1/);
 assert.match(sw,/sbp-ui\.css\?v=20261102-neutral-dark-v1/);
 assert.match(sw,/sbp-shell-20261102-neutral-dark-v1/);
 const release=read('release-data.js');
 const entry=release.slice(release.indexOf("version:'19.52'"),release.indexOf("version:'19.51'"));
 assert.match(entry,/ru:\[/);assert.match(entry,/kz:\[/);
});

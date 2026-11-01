'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const css=read('brand-blue.css'),html=read('index.html'),sw=read('notifications-sw.js');
const latest=css.slice(css.indexOf('/* 19.26:'));

test('College heading is centered inside the safe grid column, never beneath the bell',()=>{
  assert.match(html, /id="view-college" class="hidden college-page"/);
  assert.match(html, /class="college-topbar"[^\n]*<h1 data-sbp-text="college">О колледже<\/h1>[^\n]*class="notification-bell"/);
  const rule=latest.match(/#view-college\.college-page \.college-topbar > h1\s*\{([\s\S]*?)\}/);
  assert.ok(rule,'explicit College-title override after the 19.21 absolute centering');
  const body=rule[1];
  for(const token of ['position:relative!important','grid-column:2!important','grid-row:1!important','transform:none!important','justify-self:stretch!important','width:100%!important','max-width:100%!important','min-width:0!important','text-align:center!important','white-space:normal!important','overflow-wrap:break-word!important']){
    assert.ok(body.includes(token),'College title missing safe positioning: '+token);
  }
  assert.match(read('secondary-header-alignment.css'), /#view-college \.college-topbar > h1/);
  assert.match(latest, /@media\(min-width:900px\)/);
});

test('all requested settings sections use the same rounded, clipped card container',()=>{
  const ids=['settings-display-section','settings-admins-section','settings-notifications-section','settings-system-section'];
  for(const id of ids)assert.match(html,new RegExp('<details class="settings-reference-card" id="'+id+'">'));
  assert.match(html, /class="settings-reference-card settings-language-card"/);
  assert.match(html, /class="settings-reference-card sbp-theme-card"/);
  const rule=latest.match(/#admin-settings-modal\.settings-reference \.settings-reference-list > \.settings-reference-card\s*\{([\s\S]*?)\}/);
  assert.ok(rule,'outer settings cards need one reusable radius');
  for(const token of ['border-radius:18px!important','overflow:hidden!important','background:var(--sbp-surface)!important','border:1px solid var(--sbp-line)!important']){
    assert.ok(rule[1].includes(token),'missing rounded card style: '+token);
  }
  const summary=latest.match(/#admin-settings-modal\.settings-reference \.settings-reference-list > \.settings-reference-card > \.settings-reference-summary\s*\{([\s\S]*?)\}/);
  assert.match(summary?.[1]||'',/background:transparent!important/);
  assert.match(summary?.[1]||'',/border-radius:18px!important/);
  assert.match(latest,/\.settings-reference-card\[open\] > \.settings-reference-summary\s*\{\s*border-radius:18px 18px 0 0!important/);
  assert.match(read('style.css'),/\.settings-reference-card\.hidden\{display:none !important\}/);
});

test('Help main background panel has rounded top and bottom corners on phone and desktop',()=>{
  assert.match(html, /id="help-navigation-modal" class="app-overlay hidden"/);
  assert.match(html, /<section class="sheet-panel help-navigation-panel">/);
  const rule=latest.match(/#help-navigation-modal\.app-overlay > \.help-navigation-panel\s*\{([\s\S]*?)\}/);
  assert.ok(rule,'Help sheet must have a whole-container override');
  for(const token of ['width:min(760px,calc(100% - 24px))!important','max-height:calc(100dvh - 36px)!important','border-radius:22px!important','overflow-y:auto!important','background:var(--sbp-surface)!important','border:1px solid var(--sbp-line)!important']){
    assert.ok(rule[1].includes(token),'missing Help sheet style: '+token);
  }
  assert.doesNotMatch(rule[1],/border-radius:[^;]*0 0/);
  assert.match(latest,/@media\(max-width:380px\)/);
  assert.match(latest,/border-radius:18px!important/);
});

test('19.26 release, active CSS, script and offline worker versions agree',()=>{
  const rel=read('release-data.js');
  const block=rel.slice(rel.indexOf("version:'19.26'"),rel.indexOf("version:'19.25'"));
  assert.match(block,/ru:\[/);assert.match(block,/kz:\[/);
  assert.match(html,/step19\.29-css-bundle-2026-11-01-v1/);
  assert.match(html,/sbp-ui\.css\?v=20261101-css-bundle-v1/);
  assert.match(sw,/sbp-ui\.css\?v=20261101-css-bundle-v1/);
  assert.match(sw,/sbp-shell-20261101-css-bundle-v1/);
});

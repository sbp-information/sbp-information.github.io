'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const css=read('brand-blue.css'),html=read('index.html'),sw=read('notifications-sw.js');
const latest=css.slice(css.indexOf('/* 19.26:'));

test('removed College information is absent from UI, JS and PWA resources',()=>{
  assert.doesNotMatch(html, /id="view-college"|menu-college-button|switchView\('college'\)|О колледже/);
  assert.doesNotMatch(read('app.js'), /getElementById\('view-college'\)|'view-college'|'schedule','college'/);
  assert.doesNotMatch(read('redesign.js'), /collegeMarkup|college-data\.js|college-content/);
  assert.doesNotMatch(sw, /college-data\.js|college-illustration\.svg/);
  assert.equal(fs.existsSync(path.join(root,'college-data.js')),false);
  assert.equal(fs.existsSync(path.join(root,'college-illustration.svg')),false);
});

test('all requested settings sections use the same rounded, clipped card container',()=>{
  const ids=['settings-display-section','settings-admins-section','settings-notifications-section','settings-system-section'];
  for(const id of ids)assert.match(html,new RegExp('<details class="settings-reference-card" id="'+id+'">'));
  assert.match(html, /class="settings-reference-card settings-language-card"/);
  assert.doesNotMatch(html, /class="settings-reference-card sbp-theme-card"/, 'theme controls are no longer selectable');
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
  assert.match(html,/step19\.53-neutral-dark-2026-11-02-v1/);
  assert.match(html,/sbp-ui\.css\?v=20261102-neutral-dark-v1/);
  assert.match(sw,/sbp-ui\.css\?v=20261102-neutral-dark-v1/);
  assert.match(sw,/sbp-shell-20261102-neutral-dark-v1/);
});

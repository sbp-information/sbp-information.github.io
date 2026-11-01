'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'), css=read('compact-layout.css');
const sw=read('notifications-sw.js'), release=read('release-data.js');

test('compact header replaces logo bar without removing language and navigation',()=>{
 assert.doesNotMatch(html,/<a class="sbp-brand"/);
 assert.doesNotMatch(html,/<div class="sbp-sidebar-brand"/);
 assert.match(html, /class="sbp-language"/);
 assert.match(html, /data-sbp-lang="ru"/);
 assert.match(html, /data-sbp-lang="kz"/);
 for(const name of ['home','tracker','schedule','roster','college']) {
  assert.match(html,new RegExp('id="view-'+name+'"'));
 }
 assert.ok((html.match(/onclick="openAppMenu\(\)"/g)||[]).length>=5);
 assert.ok((html.match(/onclick="openNotifications\(\)"/g)||[]).length>=5);
 assert.match(css, /grid-template-columns:42px minmax\(0,1fr\) 42px 88px/);
});
test('covers remain editable, no longer take a grid row, and work in both themes',()=>{
 assert.match(css, /#view-home #sbp-home-banner/);
 assert.match(css, /#view-roster #sbp-group-banner/);
 assert.match(css, /position:absolute!important/);
 assert.match(css, /pointer-events:auto/);
 assert.match(css, /data-sbp-theme="dark"/);
 assert.match(html,/openBannerEditor\('home'\)/);
 assert.match(html,/openBannerEditor\('group'\)/);
 assert.match(html,/id="group-icon-roster"/);
});
test('compact styles, release history and active PWA build agree',()=>{
 const version=html.match(/<script type="module" src="app\.js\?v=([^"]+)"/)?.[1];
 const build=html.match(/<meta name="app-build" content="([^"]+)"/)?.[1];
 assert.ok(version && build?.startsWith('step'),'active build and app script version exist');
 assert.ok(sw.includes(`'./app.js?v=${version}'`),'app script matches PWA precache');
 assert.ok(sw.includes(`const CACHE_NAME = 'sbp-shell-${version}'`),'PWA cache matches app script');
 assert.match(html,/compact-layout\.css\?v=20261031-compact-v1/);
 assert.match(sw,/compact-layout\.css\?v=20261031-compact-v1/);
 assert.ok(html.includes(`release-notes.js?v=${version}`),'release notes use active version');
 assert.ok(sw.includes(`'./release-data.js?v=${version}'`),'release data uses active PWA version');
 assert.match(release,/version:'19\.10'/);
 const top=release.slice(release.indexOf("version:'19.10'"),release.indexOf("version:'19.09'"));
 assert.match(top,/ru:\[/);
 assert.match(top,/kz:\[/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

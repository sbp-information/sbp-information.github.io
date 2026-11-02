'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const dark=read('dark-mode.css'), html=read('index.html');
const sw=read('notifications-sw.js'), app=read('app.js');
const redesign=read('redesign.js'), release=read('release-data.js');
const getToken=name=>dark.match(new RegExp('--sbp-'+name+':(#[0-9a-f]{6});','i'))?.[1];
function luminance(hex){
 const values=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255)
 .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(a,b){const [x,y]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (x+.05)/(y+.05);}
test('device dark mode has dedicated contrast styles with no manual setting required',()=>{
 assert.match(dark,/:root\[data-sbp-theme="dark"\]/);
 assert.doesNotMatch(dark,/html:not\(\[data-sbp-theme="dark"\]\)/);
 assert.ok((dark.match(/:root:root\[data-sbp-theme="dark"\]/g)||[]).length>30);
 assert.match(html,/sbp-core\.css\?v=20261102-calm-dark-v1/);
 assert.match(sw,/sbp-core\.css\?v=20261102-calm-dark-v1/);
 const version=html.match(/<script type="module" src="app\.js\?v=([^"]+)"/)?.[1];
 assert.ok(version,'active app script version exists');
 assert.ok(sw.includes(`const CACHE_NAME = 'sbp-shell-${version}'`),'dark theme is cached in current PWA build');
 assert.match(html,/sbp-core\.css\?v=20261102-calm-dark-v1/);
 assert.match(sw,/sbp-core\.css\?v=20261102-calm-dark-v1/);
 assert.match(app,/redesign\.js\?v=20261102-calm-dark-v1/);
 assert.match(sw,/redesign\.js\?v=20261102-calm-dark-v1/);
 assert.match(release,/version:'19\.09'/);
});
test('all core text colors pass WCAG AA contrast on relevant surfaces',()=>{
 const pairs=[['ink','surface'],['ink','soft'],['muted','surface'],['muted','soft'],
  ['accent','surface'],['accent','tint'],['green','green-soft'],
  ['danger','surface'],['warning','warning-soft']];
 for(const [fg,bg] of pairs){
  const a=getToken(fg), b=getToken(bg);
  assert.ok(a&&b, 'missing color '+fg+' or '+bg);
  assert.ok(contrast(a,b)>=4.5,fg+' on '+bg+' contrast '+contrast(a,b).toFixed(2));
 }
 assert.ok(contrast(getToken('accent-ink'),getToken('accent'))>=4.5);
});
test('semantic lesson colors, modal surfaces, sections and form controls are present',()=>{
 for(const x of ['#view-home','#view-tracker','#view-schedule','#view-roster','#view-college',
  '.app-drawer','.sbp-banner-dialog','.settings-reference-card','.mini-calendar',
  '.notification-item','.support-msg','.release-card','.journal-ref-panel',
  '.schedule-ref-card','.roster-person-card','.home-ref-lesson-card.current',
  '.system-status-banner[data-kind="warning"]','.system-status-banner[data-kind="error"]',
  'input:not([type="checkbox"])','input[type="checkbox"]'])
 assert.ok(dark.includes(x),'missing dark style for '+x);
 assert.equal((dark.match(/\{/g)||[]).length,(dark.match(/\}/g)||[]).length);
});
test('appearance follows Android, iOS and desktop OS, never a previously saved preference',()=>{
 const storage=new Map([['sbp_design_theme','dark'],['toe_ui_language','ru']]);
 const accessed=[],mediaEvents={};
 const mq={matches:false,addEventListener(event,fn){mediaEvents[event]=fn;}};
 const meta={attributes:{content:'#fafafe'},getAttribute(k){return this.attributes[k]},
  setAttribute(k,v){this.attributes[k]=v;}};
 const languageButtons=['ru','kz'].map(value=>({dataset:{sbpLang:value},attributes:{},
  setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}}));
 const document={
  documentElement:{dataset:{},style:{}},
  querySelector(sel){return sel==='meta[name="theme-color"]'?meta:null},
  querySelectorAll(sel){return sel==='[data-sbp-lang]'?languageButtons:[]}
 };
 const window={localStorage:{getItem(k){accessed.push(k);return storage.get(k)||null;},
  setItem(k,v){throw Error('Theme must not be written to storage');}},
  matchMedia:()=>mq};
 const src=redesign.replaceAll('export ','');
 const ctx={window,document,console};
 vm.runInNewContext(src+'\ninitRedesign();',ctx);
 assert.equal(document.documentElement.dataset.sbpTheme,'light','OS light overrules stale dark preference');
 assert.equal(document.documentElement.style.colorScheme,'light dark','native controls use automatic OS scheme');
 assert.equal(meta.getAttribute('content'),'#f6fbfd');
 assert.equal(window.setSBPTheme,undefined,'there is no manual theme API');
 assert.equal(accessed.includes('sbp_design_theme'),false,'old theme selection is ignored');
 mq.matches=true;mediaEvents.change();
 assert.equal(document.documentElement.dataset.sbpTheme,'dark');
 assert.equal(meta.getAttribute('content'),'#121416');
 mq.matches=false;mediaEvents.change();
 assert.equal(document.documentElement.dataset.sbpTheme,'light');
 storage.set('toe_ui_language','kz');window.refreshRedesign();
 assert.equal(document.documentElement.dataset.sbpTheme,'light','language switch keeps device appearance');
 assert.equal(languageButtons[1].attributes['aria-pressed'],'true');
 assert.equal(ctx.resolvedTheme(true),'dark');
 assert.equal(ctx.resolvedTheme(false),'light');
});

test('theme selector removed from settings and early page paint never reads saved override',()=>{
 assert.doesNotMatch(html,/sbp-theme-card|sbp-theme-options|data-sbp-theme="(?:light|dark|system)"/);
 assert.doesNotMatch(redesign,/sbp_design_theme|setSBPTheme|data-sbp-theme/);
 const firstScript=html.slice(html.indexOf('// Let the device choose the light/dark appearance'),html.indexOf('</script>',html.indexOf('// Let the device choose the light/dark appearance')));
 assert.match(firstScript,/prefers-color-scheme: dark/);
 assert.doesNotMatch(firstScript,/localStorage|sbp_design_theme/);
 assert.match(html,/step19\.52-calm-dark-2026-11-02-v1/);
 assert.match(release,/version:'19\.51'/);
});

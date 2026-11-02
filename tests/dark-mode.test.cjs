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
 assert.match(html,/sbp-core\.css\?v=20261102-schedule-theme-v1/);
 assert.match(sw,/sbp-core\.css\?v=20261102-schedule-theme-v1/);
 const version=html.match(/<script type="module" src="app\.js\?v=([^"]+)"/)?.[1];
 assert.ok(version,'active app script version exists');
 assert.ok(sw.includes("const CACHE_NAME = 'sbp-shell-20261102-pwa-reliability-v1'"),'new PWA shell caches unchanged dark-mode assets');
 assert.match(html,/sbp-core\.css\?v=20261102-schedule-theme-v1/);
 assert.match(sw,/sbp-core\.css\?v=20261102-schedule-theme-v1/);
 assert.match(app,/redesign\.js\?v=20261102-schedule-theme-v1/);
 assert.match(sw,/redesign\.js\?v=20261102-schedule-theme-v1/);
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

function boot(saved,systemDark=false,blocked=false){
 const storage=new Map(saved?[['sbp_design_theme',saved]]:[]),events={},mediaEvents={};
 const mq={matches:systemDark,addEventListener(k,fn){mediaEvents[k]=fn;}};
 const meta={attributes:{},getAttribute(k){return this.attributes[k]},setAttribute(k,v){this.attributes[k]=v;}};
 const buttons=['light','dark','system'].map(value=>({dataset:{sbpTheme:value},attributes:{},events:{},getAttribute(k){return this.attributes[k]},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.events[k]=fn}}));
 const label={dataset:{sbpText:'theme'},textContent:''};
 const document={documentElement:{dataset:{},style:{}},querySelector(){return meta},querySelectorAll(sel){return sel==='button[data-sbp-theme]'?buttons:sel==='[data-sbp-text]'?[label]:[]}};
 const window={localStorage:{getItem(k){if(blocked)throw Error('denied');return storage.get(k)||null},setItem(k,v){if(blocked)throw Error('denied');storage.set(k,v)}},matchMedia:()=>mq,addEventListener(k,fn){events[k]=fn}};
 const ctx={window,document,console};vm.runInNewContext(redesign.replaceAll('export ','')+'\ninitRedesign();',ctx);
 return {window,document,storage,events,mediaEvents,mq,buttons,label,meta};
}
test('manual choices persist, override OS, update controls and survive language changes',()=>{
 const b=boot('dark',false);const theme=()=>b.document.documentElement.dataset.sbpTheme;
 assert.equal(theme(),'dark');assert.equal(b.document.documentElement.style.colorScheme,'dark');
 b.buttons[0].events.click();assert.equal(theme(),'light');assert.equal(b.storage.get('sbp_design_theme'),'light');
 b.mq.matches=true;b.mediaEvents.change();assert.equal(theme(),'light');
 assert.equal(b.buttons[0].attributes['aria-pressed'],'true');
 assert.equal(boot(b.storage.get('sbp_design_theme'),true).document.documentElement.dataset.sbpTheme,'light');
 b.buttons[1].events.click();assert.equal(theme(),'dark');assert.equal(b.meta.attributes.content,'#121416');
 b.storage.set('toe_ui_language','kz');b.window.refreshRedesign();assert.equal(b.label.textContent,'Безендіру тақырыбы');assert.equal(theme(),'dark');
 b.window.setSBPTheme('invalid');assert.equal(theme(),'dark');
 b.buttons[2].events.click();b.mq.matches=false;b.mediaEvents.change();assert.equal(theme(),'light');
 b.mq.matches=true;b.mediaEvents.change();assert.equal(theme(),'dark');
 b.storage.set('sbp_design_theme','light');b.events.storage({key:'sbp_design_theme'});assert.equal(theme(),'light');
});
test('first paint matches loaded theme for saved, system, invalid and unavailable storage',()=>{
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const [saved,dark,blocked] of [['dark',false,false],['light',true,false],[null,true,false],['bad',true,false],[null,true,true]]){
  const b=boot(saved,dark,blocked);const expected=b.document.documentElement.dataset.sbpTheme;
  b.document.documentElement.dataset={};
  vm.runInNewContext(script,{window:b.window,document:b.document,localStorage:b.window.localStorage});
  assert.equal(b.document.documentElement.dataset.sbpTheme,expected);
 }
 const b=boot(null,true,true);b.window.setSBPTheme('light');assert.equal(b.document.documentElement.dataset.sbpTheme,'light');
 assert.match(html,/sbp-theme-card/);
});
test('language quick switch shows destination with Latin labels in both directions',()=>{
 const button={setAttribute(k,v){this[k]=v}},nodes={'sbp-lang-switch':button};
 const document={documentElement:{},getElementById:id=>nodes[id]};let lang='ru';
 const fn=app.slice(app.indexOf('function updateLanguageButtons()'),app.indexOf('startInterfaceTranslations();',app.indexOf('function updateLanguageButtons()')));
 const ctx={document,currentLang:()=>lang};vm.runInNewContext(fn+'\nupdateLanguageButtons();',ctx);
 assert.equal(button.textContent,'KZ');assert.equal(button['aria-label'],'Переключить на казахский');
 lang='kz';ctx.updateLanguageButtons();assert.equal(button.textContent,'RU');assert.equal(button['aria-label'],'Орыс тіліне ауысу');
 assert.match(html,/id="lang-ru"[^>]*>RU<\/button>/);assert.match(html,/id="lang-kz"[^>]*>KZ<\/button>/);
});

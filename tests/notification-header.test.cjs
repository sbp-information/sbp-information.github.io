'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'), app=read('app.js'), css=read('secondary-header-alignment.css');
const worker=read('notifications-sw.js');

test('five views share one correctly labelled clickable bell and independent unread badge',()=>{
  const bells=[...html.matchAll(/<button\b[^>]*class="[^"]*\bnotification-bell\b[^"]*"[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]);
  assert.equal(bells.length,5,'Home, Journal, Schedule, College and Group all need a bell');
  for(const bell of bells){
    for(const token of ['type="button"','onclick="openNotifications()"','aria-controls="notifications-modal"','aria-haspopup="dialog"','aria-expanded="false"','data-sbp-aria="notifications"','notification-badge hidden']){
      assert.ok(bell.includes(token),'bell missing '+token);
    }
  }
  assert.equal((html.match(/id="notification-badge"/g)||[]).length,1,'keep the original badge ID unique');
  for(const view of ['home','tracker','schedule','roster','college']){
    const section=html.slice(html.indexOf('id="view-'+view+'"'),html.indexOf('id="view-'+view+'"')+1700);
    assert.ok(section.includes('notification-bell'),'bell missing from '+view);
  }
});
test('all headers use the Home bell slot and allow taps without covering language switch',()=>{
  assert.match(css, /#view-home,#view-tracker,#view-schedule,#view-roster,#view-college/);
  assert.match(css, /grid-template-columns:42px minmax\(0,1fr\) 42px 64px!important/);
  assert.match(css, /\.notification-bell\s*\{[\s\S]*?grid-column:3!important/);
  assert.match(css, /pointer-events:auto!important/);
  assert.match(css, /\.notification-badge\.hidden\s*\{\s*display:none!important/);
  assert.match(css, /#view-college \.college-topbar > h1/);
  assert.match(html, /sbp-ui\.css\?v=20261101-css-bundle-v1/);
  assert.match(worker, /sbp-ui\.css\?v=20261101-css-bundle-v1/);
});
test('unread counts update and clear simultaneously on every page',()=>{
  const start=app.indexOf('function updateNotificationBadge(){');
  const end=app.indexOf('function renderHomeLatestNotification()',start);
  assert.ok(start>=0 && end>start);
  const source=app.slice(start,end);
  const badges=Array.from({length:5},()=>({
    textContent:'0',
    hidden:true,
    classList:{toggle(name,hidden){assert.equal(name,'hidden');this.hidden=hidden;}}
  }));
  let ids=new Set(['read']);
  const document={querySelectorAll:selector=>{
    assert.equal(selector,'.notification-bell .notification-badge');
    return badges;
  }};
  const update=new Function('document','getReadNotificationIds','notificationsCache',source+';return updateNotificationBadge;')(
    document,()=>ids,[{id:'read'},{id:'unread1'},{id:'unread2'}]);
  update();
  for(const badge of badges){assert.equal(badge.textContent,'2');assert.equal(badge.classList.hidden,false);}
  ids=new Set(['read','unread1','unread2']);
  update();
  for(const badge of badges){assert.equal(badge.textContent,'0');assert.equal(badge.classList.hidden,true);}
});
test('opening and closing notifications syncs the five bell aria-expanded states',()=>{
  const start=app.indexOf('window.openNotifications=function(){');
  const end=app.indexOf('let publishingNotification=false;',start);
  assert.ok(start>=0 && end>start);
  const source=app.slice(start,end);
  const states=[];
  const buttons=Array.from({length:5},()=>({setAttribute(k,v){assert.equal(k,'aria-expanded');this.expanded=v;}}));
  const modal={classList:{add(v){states.push('modal-add-'+v);},remove(v){states.push('modal-remove-'+v);}}};
  const composer={classList:{toggle(k,val){states.push('composer-'+k+'-'+val);}}};
  const doc={getElementById:id=>id==='notifications-modal'?modal:id==='notification-admin-composer'?composer:null,
    querySelectorAll:selector=>{assert.equal(selector,'.notification-bell');return buttons;},
    body:{classList:{add:v=>states.push('body-add-'+v),remove:v=>states.push('body-remove-'+v)}}};
  const win={closeAppMenu:()=>states.push('menu-closed')};
  let rendered=0,marked=0;
  new Function('window','document','canPublishNotifications','renderNotifications','setTimeout','markNotificationsRead',
    source+'; window.openNotifications(); window.closeNotifications();')(
    win,doc,()=>false,()=>rendered++,fn=>fn(),()=>marked++);
  assert.ok(states.includes('menu-closed'));
  assert.ok(states.includes('modal-remove-hidden'));
  assert.ok(states.includes('modal-add-hidden'));
  assert.equal(rendered,1);assert.equal(marked,1);
  assert.ok(buttons.every(button=>button.expanded==='false'));
});

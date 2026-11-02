'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const app = read('app.js');
const from = app.indexOf('const deletingSupportThreadIds=new Set();');
const to = app.indexOf('window.refreshSupportNotifications=function()',from);
assert.ok(from>0&&to>from,'support delete implementation exists');
const code = app.slice(from,to);

function fixture() {
  const toasts=[],deleted=[],stored={},state={staff:true,user:true,confirm:true,fail:false};
  const nodes=new Map();
  function element(id){
    if(!nodes.has(id))nodes.set(id,{value:'draft',innerHTML:'old messages',disabled:false});
    return nodes.get(id);
  }
  const inbox=element('support-staff-inbox');
  inbox.querySelectorAll=()=>[];
  const context={
    console:{warn(){}},Date,JSON,Map,Set,encodeURIComponent,decodeURIComponent,
    auth:{currentUser:{uid:'staff1'}},db:{},CLOUD_ROOT:['toe_group','shared'],
    window:{confirm:()=>state.confirm},
    document:{getElementById:element},
    localStorage:{setItem(k,v){stored[k]=v}},
    isSupportStaff:()=>state.staff,
    supportContext:()=>state.user?'staff1:staff':'',
    supportReadKey:()=> 'support-read',
    threadUnread:()=>0,
    escapeNotificationText:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
    interfaceLocale:()=> 'ru-RU',
    translateUI:s=>s,
    applyKzTranslations(){},
    updateSupportBadge(){},
    updateSupportRecipient(){},
    showToast:s=>toasts.push(s),
    doc:(_,...p)=>({id:p.at(-1),path:p}),
    async deleteDoc(ref){if(state.fail)throw {code:'permission-denied'};deleted.push(ref);}
  };
  vm.createContext(context);
  vm.runInContext(`
    let supportThreadsCache=[
      {id:'a',displayName:'Анна',messages:[{text:'Первое сообщение'}]},
      {id:'b',displayName:'Богдан',messages:[{text:'Другой запрос'}]}
    ];
    let activeSupportThreadId='a';
    let supportUnsubscribe=()=>{};
    let supportDrafts=new Map([['a','draft a'],['b','draft b']]);
    let supportReadCounts={a:1,b:2};
    let displayedSupportMessages=[{text:'Первое сообщение'}];
    let pendingSupportThreadId='a';
  `+code,context);
  return {state,context,inbox,nodes,toasts,deleted,stored,
    get active(){return vm.runInContext('activeSupportThreadId',context)},
    get remaining(){return [...vm.runInContext('supportThreadsCache.map(x=>x.id)',context)]},
    get drafts(){return [...vm.runInContext('[...supportDrafts.keys()]',context)]},
    readCount(id){return vm.runInContext('supportReadCounts['+JSON.stringify(id)+']',context)}
  };
}

test('staff sees separate accessible controls to reply and delete',()=>{
  const f=fixture();vm.runInContext('renderSupportInbox()',f.context);
  assert.match(f.inbox.innerHTML,/data-support-thread="a"/);
  assert.match(f.inbox.innerHTML,/data-support-delete="a"/);
  assert.match(f.inbox.innerHTML,/aria-label="Удалить обращение"/);
  assert.match(f.inbox.innerHTML,/data-support-delete="b"/);
});

test('visitor and admin without support permission cannot delete threads',async()=>{
  const f=fixture();f.state.staff=false;
  await f.context.window.deleteSupportThread('a');
  assert.equal(f.deleted.length,0);
  f.state.staff=true;f.context.auth.currentUser=null;
  await f.context.window.deleteSupportThread('a');
  assert.equal(f.deleted.length,0);
  f.context.auth.currentUser={uid:'staff1'};
  await f.context.window.deleteSupportThread('unknown');
  assert.equal(f.deleted.length,0);
});

test('confirmation cancellation and permission denial keep the thread',async()=>{
  const f=fixture();f.state.confirm=false;
  await f.context.window.deleteSupportThread('a');
  assert.equal(f.deleted.length,0);
  f.state.confirm=true;f.state.fail=true;
  await f.context.window.deleteSupportThread('a');
  assert.equal(f.deleted.length,0);
  assert.equal(f.active,'a');
  assert.equal(f.toasts.at(-1),'Нет права удалять обращение');
});

test('deleting active thread leaves other thread, counters and drafts intact',async()=>{
  const f=fixture();const button={disabled:false,isConnected:true};
  await f.context.window.deleteSupportThread('a',button);
  assert.equal(f.deleted.length,1);
  assert.deepEqual(f.deleted[0].path,['toe_group','shared','support','a']);
  assert.deepEqual(f.remaining,['b']);
  assert.deepEqual(f.drafts,['b']);
  assert.equal(f.readCount('b'),2);
  assert.equal(f.readCount('a'),undefined);
  assert.equal(f.active,'');
  assert.equal(f.nodes.get('support-text').value,'');
  assert.equal(f.nodes.get('support-messages').innerHTML,'');
  assert.match(f.inbox.innerHTML,/data-support-delete="b"/);
  assert.doesNotMatch(f.inbox.innerHTML,/data-support-delete="a"/);
  assert.equal(f.toasts.at(-1),'Обращение удалено');
  assert.equal(button.disabled,false);
});

test('delete action and confirmation labels have RU/KZ translations',()=>{
  const src=read('i18n.js').replaceAll('export ', '');
  const context={localStorage:{getItem:()=> 'kz'}};
  vm.createContext(context);vm.runInContext(src,context);
  for(const msg of ['Удалить обращение','Удалить обращение вместе со всей перепиской? Это действие нельзя отменить.','Обращение удалено','Нет права удалять обращение','Не удалось удалить обращение']){
    assert.notEqual(context.translateUI(msg,'kz'),msg,msg);
  }
});

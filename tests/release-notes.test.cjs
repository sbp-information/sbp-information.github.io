'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const data=fs.readFileSync(path.join(root,'release-data.js'),'utf8').replaceAll('export ','');
const ui=fs.readFileSync(path.join(root,'release-notes.js'),'utf8').replace(/^import .*;\n/,'');
function app({build='step19.40-history-manual-2026-11-02-v1',language='ru',denied=false,pushLaunch=false}={}){
 const storage=new Map([['toe_ui_language',language]]),nodes=new Map(),events=new Map(),timers=[];
 const cls=initial=>({items:new Set(initial),contains(x){return this.items.has(x);},add(x){this.items.add(x);},remove(x){this.items.delete(x);}});
 const document={
  readyState:'complete',visibilityState:'visible',activeElement:null,
  body:{classList:cls([])},documentElement:{classList:cls([])},
  addEventListener(name,fn){events.set('document:'+name,fn);},
  querySelector(selector){return selector.includes('meta')?{content:build}:node('bottom-nav-home');},
  getElementById:node,
  querySelectorAll(){return [];}
 };
 function node(id){
  if(!nodes.has(id))nodes.set(id,{
   textContent:'',innerHTML:'',scrollTop:0,hidden:false,disabled:false,isConnected:true,
   classList:cls(id==='release-notes-modal'?['hidden']:[]),handlers:{},attributes:{},
   setAttribute(k,v){this.attributes[k]=v;},focus(){document.activeElement=this;},
   closest(){return null;},addEventListener(name,fn){this.handlers[name]=fn;},
   querySelectorAll(){return [node('release-notes-close'),node('release-notes-history'),node('release-notes-acknowledge')];}
  });
  return nodes.get(id);
 }
 document.activeElement=node('bottom-nav-home');
 let closedMenu=0;
 const context={console,Date,Intl,String,Number,URLSearchParams,document,
  location:{search:pushLaunch?'?notification=support':''},
  localStorage:{
   getItem(key){if(denied)throw Error('Storage denied');return storage.get(key)||null;},
   setItem(key,value){if(denied)throw Error('Storage denied');storage.set(key,value);}
  },
  setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},
  window:{addEventListener(name,fn){events.set('window:'+name,fn);},closeAppMenu(){closedMenu++;}}
 };
 vm.createContext(context);
 vm.runInContext(data,context);vm.runInContext(ui,context);
 return {node,storage,timers,events,document,context,get closedMenu(){return closedMenu;}};
}
const fresh=app();
assert.equal(fresh.node('release-notes-modal').classList.contains('hidden'),true,'no automatic Whats New dialog on first visit');
assert.equal(fresh.timers.length,0,'no delayed update prompt');
assert.equal(fresh.events.has('document:DOMContentLoaded'),false,'no DOM-ready auto prompt');
assert.equal(fresh.events.has('document:visibilitychange'),false,'returning to app never prompts');
assert.doesNotMatch(ui,/function showUnreadRelease|function schedulePrompt/,'automatic prompt implementation removed');
assert.equal(fresh.storage.has('sbp_release_seen_19.40'),false,'manual history does not need seen keys');

fresh.context.window.openReleaseHistory();
assert.equal(fresh.closedMenu,1,'history action closes navigation menu');
assert.equal(fresh.node('release-notes-modal').classList.contains('hidden'),false,'manual menu action opens history');
assert.equal(fresh.node('release-notes-heading').textContent,'История обновлений');
assert.equal(fresh.node('release-notes-history').hidden,true);
assert.match(fresh.node('release-notes-content').innerHTML,/19\.40/);
assert.match(fresh.node('release-notes-content').innerHTML,/19\.39/);
assert.match(fresh.node('release-notes-content').innerHTML,/Исправления/);
assert.equal(fresh.document.body.classList.contains('release-notes-open'),true);
fresh.node('release-notes-acknowledge').handlers.click();
assert.equal(fresh.node('release-notes-modal').classList.contains('hidden'),true);
assert.equal(fresh.document.body.classList.contains('release-notes-open'),false);
assert.equal(fresh.storage.has('sbp_release_seen_19.40'),false,'closing history must not write prompt tracking state');
assert.equal(fresh.document.activeElement,fresh.node('bottom-nav-home'),'focus returns to the prior control');

const push=app({pushLaunch:true});
assert.equal(push.node('release-notes-modal').classList.contains('hidden'),true,'Push deep link must not be covered');
push.context.window.openReleaseHistory();
assert.equal(push.node('release-notes-modal').classList.contains('hidden'),false,'history stays manually accessible from Push launch');
const privateMode=app({denied:true});
assert.equal(privateMode.node('release-notes-modal').classList.contains('hidden'),true,'storage-denied visit stays quiet');
privateMode.context.window.openReleaseHistory();
assert.equal(privateMode.node('release-notes-modal').classList.contains('hidden'),false,'history works without storage access');
privateMode.node('release-notes-close').handlers.click();
assert.equal(privateMode.node('release-notes-modal').classList.contains('hidden'),true);

const kz=app({language:'kz'});
assert.equal(kz.node('menu-release-history-label').textContent,'Жаңартулар тарихы');
kz.context.window.openReleaseHistory();
assert.equal(kz.node('release-notes-heading').textContent,'Жаңартулар тарихы');
assert.match(kz.node('release-notes-content').innerHTML,/Нұсқа 19\.40/);
assert.match(kz.node('release-notes-content').innerHTML,/Түзетулер/);
assert.doesNotMatch(kz.node('release-notes-content').innerHTML,/История обновлений|Исправления/);
kz.storage.set('toe_ui_language','ru');
kz.events.get('window:storage')({key:'toe_ui_language'});
assert.equal(kz.node('release-notes-heading').textContent,'История обновлений');
assert.match(kz.node('release-notes-content').innerHTML,/Исправления/);
kz.storage.set('toe_ui_language','kz');kz.context.window.refreshReleaseNotes();
assert.match(kz.node('release-notes-content').innerHTML,/Түзетулер/);
vm.runInContext("for(const r of RELEASES) for(const k of ['fixes','updates']) { if(!r[k]) continue; if(r[k].ru.length!==r[k].kz.length || r[k].kz.some(t=>!t)) throw Error('RU/KZ mismatch'); }",kz.context);

const older=app({build:'step18.45-mobile-bells-update-2026-10-05'});
older.context.window.openReleaseHistory();
assert.doesNotMatch(older.node('release-notes-content').innerHTML,/19\.40|18\.46/,'old builds do not show unreleased entries');
const unknown=app({build:'step18.999-not-described-yet'});
assert.equal(unknown.node('release-notes-modal').classList.contains('hidden'),true);
unknown.context.window.openReleaseHistory();
assert.match(unknown.node('release-notes-content').innerHTML,/Описание этой версии скоро появится/);
const keyboard=app();
keyboard.context.window.openReleaseHistory();
let prevented=false;
keyboard.events.get('document:keydown')({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});
assert.equal(prevented,true);
assert.equal(keyboard.document.activeElement,keyboard.node('release-notes-close'));
keyboard.events.get('document:keydown')({key:'Escape',preventDefault(){}});
assert.equal(keyboard.node('release-notes-modal').classList.contains('hidden'),true);
assert.equal(keyboard.storage.has('sbp_release_seen_19.40'),false);

assert.equal(fresh.context.releaseTypeLabel({type:'update',size:'small'}),'Мини-обновление');
assert.equal(fresh.context.releaseTypeLabel({type:'update',size:'major'}),'Крупное обновление');
console.log('Release history: manual-only, no startup/reentry prompt, Push launch, privacy, RU/KZ, filtering, accessibility and close passed.');

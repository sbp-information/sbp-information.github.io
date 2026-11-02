'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'notifications-sw.js'),'utf8');
const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'),'utf8');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'),'utf8');

function fixture() {
 const listeners = new Map(), data = new Map(), requests = [];
 let failing = '', online = true, claimed = 0;
 const cacheName = source.match(/CACHE_NAME = '([^']+)'/)[1];
 const resources = [...source.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
 const key = input => new URL(typeof input === 'string' ? input : input?.url, 'https://sbp-information.github.io/').href;
 const caches = {
  async keys(){return [...data.keys()];},
  async open(name){if(!data.has(name))data.set(name,new Map());const cache=data.get(name);
    return {async match(request){return cache.get(key(request))?.clone()||null;},
      async put(request,response){cache.set(key(request),response.clone());}};},
  async delete(name){return data.delete(name);}
 };
 const self = {
  location:{origin:'https://sbp-information.github.io'},
  registration:{scope:'https://sbp-information.github.io/',navigationPreload:{async disable(){}}},
  clients:{async claim(){claimed++;}},
  async skipWaiting(){},
  addEventListener(name,fn){listeners.set(name,fn);}
 };
 async function fetch(url){
  const name=typeof url==='string'?url:url?.url;requests.push(name);
  if(!online)throw Error('Network offline');
  if(name===failing)return new Response('missing',{status:503});
  return new Response('fresh:'+name,{status:200});
 }
 vm.runInNewContext(source,{self,URL,Request,Response,console,caches,fetch,setTimeout,clearTimeout});
 async function event(type,extra={}){
  let response,pending;
  listeners.get(type)({...extra,waitUntil(p){pending=p;},respondWith(p){response=p;}});
  if(pending)await pending;
  return response ? await response : undefined;
 }
 return {event,cacheName,data,resources,requests,caches,setOnline(value){online=value;},setFail(value){failing=value;},claimed:()=>claimed};
}

test('failed critical asset keeps old installed app and rejects half-filled new shell',async()=>{
 const f=fixture();
 const old=(await f.caches.open('sbp-shell-previous'));
 await old.put('./index.html',new Response('complete previous app'));
 f.setFail('./app.js?v=20261102-push-reminders-v1');
 await assert.rejects(f.event('install'),/Incomplete PWA shell/);
 assert.equal(f.data.has(f.cacheName),false,'no broken new version is left in Cache Storage');
 assert.equal(await (await old.match('./index.html')).text(),'complete previous app');
 f.setFail('');await f.event('install');
 assert.ok(f.data.get(f.cacheName).has('https://sbp-information.github.io/index.html'));
 assert.ok(f.data.get(f.cacheName).has('https://sbp-information.github.io/app.js?v=20261102-push-reminders-v1'));
 assert.ok(f.data.get(f.cacheName).has('https://sbp-information.github.io/firebase.js?v=20261102-fast-start-v1'));
 assert.ok(f.data.get(f.cacheName).has('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'));
});

test('offline and online relaunch use the same installed HTML instead of a mixed remote version',async()=>{
 const f=fixture();await f.event('install');
 f.requests.length=0;
 const scope='https://sbp-information.github.io/';
 f.setOnline(false);
 const offline=await f.event('fetch',{request:{method:'GET',mode:'navigate',url:scope,cache:'default'}});
 assert.equal(await offline.text(),'fresh:./index.html');
 f.setOnline(true);
 const same=await f.event('fetch',{request:{method:'GET',mode:'navigate',url:scope+'?random=1',cache:'default'}});
 assert.equal(await same.text(),'fresh:./index.html');
 const updated=await f.event('fetch',{request:{method:'GET',mode:'navigate',url:scope+'?app-refresh=123',cache:'default'}});
 assert.equal(await updated.text(),'fresh:./index.html');
 assert.equal(f.requests.length,0,'old worker never inserts newer HTML into the current offline shell');
});

test('new worker retains exactly one previous shell for old running tabs and does not erase unrelated caches',async()=>{
 const f=fixture();
 for(const name of ['sbp-shell-ancient','sbp-shell-previous','other-user-cache']) {
   await (await f.caches.open(name)).put('./old.js?v=1',new Response(name));
 }
 await f.event('install');
 await f.event('activate');
 assert.equal(f.data.has('sbp-shell-ancient'),false);
 assert.equal(f.data.has('sbp-shell-previous'),true);
 assert.equal(f.data.has('other-user-cache'),true);
 assert.equal(f.claimed(),1);
 f.setOnline(false);
 const old=await f.event('fetch',{request:{method:'GET',mode:'same-origin',
   destination:'script',cache:'default',url:'https://sbp-information.github.io/old.js?v=1'}});
 assert.equal(await old.text(),'sbp-shell-previous','old running tabs load the exact older script offline');
});

test('reopening the PWA restores its saved view and reconnects the offline edit queue',()=>{
 assert.match(html,/data-initial-view/);
 assert.match(html,/localStorage\.getItem\('toe_current_view'\)/);
 assert.match(app,/const savedView = localStorage\.getItem\('toe_current_view'\)/);
 assert.match(app,/switchView\(initialView, true\)/);
 assert.match(app,/window\.addEventListener\('online',[\s\S]*?reconnectAndFlushOfflineQueue\(\)/);
 assert.match(app,/await syncPendingScheduleData\(\)/);
 assert.match(app,/await flushOfflineQueue\(\)/);
 assert.match(app,/const OFFLINE_QUEUE_KEY = 'toe_offline_queue_v1'/);
});

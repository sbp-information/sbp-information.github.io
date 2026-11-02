'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),app=read('app.js'),worker=read('notifications-sw.js');

test('home renders reserved lesson space before JS without inventing a timetable',()=>{
 const start=html.indexOf('<div id="home-day-timeline" class="home-ref-schedule-list">');
 const end=html.indexOf('<button id="home-schedule-toggle"',start);
 assert.ok(start>=0&&end>start,'home timeline has a synchronous placeholder before app boot');
 const initialMarkup=html.slice(start,end);
 assert.equal((initialMarkup.match(/class="home-timeline-placeholder-lesson"/g)||[]).length,4);
 assert.equal((initialMarkup.match(/class="home-timeline-placeholder-break"/g)||[]).length,3);
 assert.match(initialMarkup,/aria-hidden="true"/);
 assert.doesNotMatch(initialMarkup,/\d\d:\d\d|Физика|Математика/);
 assert.match(html,/#home-day-timeline \.home-timeline-placeholder\{[^}]*min-height:425px/);
 assert.match(app,/box\.innerHTML=html/,'real lesson cards replace the placeholder');
});
test('saved college view and precise scroll survive a cold boot and update',()=>{
 assert.match(html,/const savedView = localStorage\.getItem\('toe_current_view'\)/);
 assert.match(html,/html\[data-initial-view="college"\] #view-college\{display:block!important\}/);
 assert.match(app,/const viewIds = \['view-home','view-tracker','view-roster','view-schedule','view-college'\]/);
 assert.match(app,/if \(currentVisibleView && currentVisibleView !== viewName\) saveCurrentScrollPosition\(\)/);
 assert.match(app,/window\.addEventListener\('pagehide', saveCurrentScrollPosition\)/);
 assert.match(app,/restoreScrollPosition\(viewName\)/);
});
test('slow mobile is not blocked by downloading the external icons stylesheet',()=>{
 assert.match(html,/<link rel="preload" as="style" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/);
 assert.match(html,/onload="this\.onload=null;this\.rel='stylesheet'"/);
 assert.match(html,/<noscript><link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com/);
 assert.match(html,/<link rel="stylesheet" href="sbp-core\.css/,'critical layout remains render-blocking');
});

test('offline app-refresh navigation falls back to the locally cached shell',async()=>{
 const eventListeners=new Map(),scope='https://sbp-information.github.io/';
 const self={location:{origin:scope.slice(0,-1)},registration:{scope},addEventListener(name,callback){eventListeners.set(name,callback);}};
 let requests=0,cachedKeys=[];
 const cache={async match(key){cachedKeys.push(key);return key==='./index.html'?new Response('cached shell'):null;}};
 const context={self,URL,Response,console,setTimeout,clearTimeout,fetch:async()=>{requests++;throw Error('offline');},caches:{async open(){return cache;}}};
 vm.runInNewContext(worker,context);
 let answer;
 eventListeners.get('fetch')({request:{method:'GET',url:scope+'?app-refresh=123',mode:'navigate',cache:'default'},respondWith(promise){answer=promise;}});
 assert.ok(answer,'service worker intercepts app refresh');
 const response=await answer;
 assert.equal(await response.text(),'cached shell');
 assert.equal(requests,1,'always prefer the network for a genuine update');
 assert.deepEqual(cachedKeys,['./index.html']);
});

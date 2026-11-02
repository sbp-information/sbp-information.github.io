'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),worker=fs.readFileSync('notifications-sw.js','utf8');
test('short branded launch shows installed icon and SBP Information without a second screen',()=>{
 assert.match(html,/id="sbp-launch-animation"/);
 assert.match(html,/<img src="\.\/sbp-icon-192\.png" alt="" width="90" height="90"/);
 assert.match(html,/<strong>SBP Information<\/strong>/);
 assert.match(html,/const visibleFor = reduced \? 40 : 160/);
});
test('cached installed PWA navigation returns quickly while network refresh remains asynchronous',async()=>{
 const handlers={};const cached=new Response('offline page');
 const cache={async match(key){return key==='./index.html'?cached:null;},async put(){}};
 const scope='https://sbp-information.github.io/';
 const self={location:{origin:'https://sbp-information.github.io'},registration:{scope},addEventListener(name,fn){handlers[name]=fn;}};
 const context={self,URL,Response,console,setTimeout,clearTimeout,fetch:()=>new Promise(()=>{}),caches:{async open(){return cache;}}};
 vm.runInNewContext(worker,context);
 let response;
 handlers.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith(p){response=p;},waitUntil(){}});
 assert.ok(response,'service worker intercepts navigation');
 const start=Date.now();const result=await response;
 assert.equal(await result.text(),'offline page');
 assert.ok(Date.now()-start<300,'cached navigation is returned promptly');
 assert.doesNotMatch(worker,/await cache\.put\('\.\/', response\.clone\(\)\)/);
});

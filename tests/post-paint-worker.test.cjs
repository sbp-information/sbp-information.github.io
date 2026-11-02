'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'performance.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'notifications-sw.js'),'utf8');

test('mobile PWA worker starts only after first paint; offline and push events remain supported',async()=>{
 const listeners=new Map(),timers=[],calls=[];
 const node=()=>({textContent:'',classList:{add(){},remove(){}},addEventListener(){}});
 const registration={waiting:null,installing:null,addEventListener(){},async update(){}};
 const navigator={onLine:true,connection:{saveData:false},serviceWorker:{controller:{},register(url,options){calls.push([url,options]);return Promise.resolve(registration);}}};
 let obs=null;
 class PerformanceObserver{constructor(cb){obs={cb,observed:false,disconnected:false};}observe(){obs.observed=true;}disconnect(){obs.disconnected=true;}}
 const doc={readyState:'loading',visibilityState:'visible',querySelector(){return {content:'step19.46-postpaint-2026-11-02-v1'};},getElementById:node,addEventListener(type,cb){listeners.set('document:'+type,cb);}};
 const win={matchMedia(){return {matches:true};},addEventListener(type,cb){listeners.set(type,cb);},setInterval(){}};
 const sandbox={window:win,document:doc,navigator,PerformanceObserver,performance:{getEntriesByType(){return[];}},localStorage:{getItem(){return 'ru';}},URL,Date,Map,Set,Promise,AbortSignal,location:{href:'https://sbp-information.github.io/',search:''},history:{state:{},replaceState(){}},console:{debug(){},warn(){}},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){}};
 vm.runInNewContext(source,sandbox);
 assert.equal(calls.length,0,'do not register SW before mobile first paint');
 assert.ok(obs?.observed,'paint observer should watch for first contentful paint');
 obs.cb({getEntries(){return[{name:'first-contentful-paint'}];}});
 assert.ok(obs.disconnected);
 const ready=timers.filter(t=>t.ms===0);
 assert.equal(ready.length,1);
 await ready[0].fn();
 await Promise.resolve();
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'./notifications-sw.js');
 listeners.get('load')?.();
 for(const timer of timers.filter(t=>t.ms===1600))await timer.fn();
 assert.equal(calls.length,1,'no duplicate registration after fallback');
 assert.match(sw,/self\.addEventListener\('push'/);
 assert.match(sw,/self\.addEventListener\('notificationclick'/);
 assert.match(html,/performance\.js\?v=20261102-postpaint-v1/);
});
test('desktop keeps immediate worker registration and offline update support',()=>{
 assert.match(source,/if \(mobileFast && document\.visibilityState === 'visible'\)/);
 assert.match(source,/else \{\s*registerWorker\(\);\s*\}/);
 assert.match(source,/if \(reg\.waiting && navigator\.serviceWorker\.controller\) showUpdatePrompt/);
 assert.match(source,/watchInstalling\(reg\.installing\)/);
 assert.match(sw,/const CACHE_NAME = 'sbp-shell-20261102-support-delete-v1'/);
});

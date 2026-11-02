'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('firebase.js'),app=read('app.js'),schedule=read('schedule.js'),html=read('index.html');
const worker=read('notifications-sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
test('Firebase SDK loads only after lightweight module evaluation',async()=>{
 assert.doesNotMatch(source,/^\s*import\s+/m,'Firebase SDK must not be a static module dependency');
 assert.match(source,/Promise\.all\(\[\s*import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.19\.0\/firebase-app\.js'\)/);
 assert.match(source,/import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.19\.0\/firebase-auth\.js'\)/);
 assert.match(source,/import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.19\.0\/firebase-firestore\.js'\)/);
 assert.match(source,/functionsSdkPromise = import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.19\.0\/firebase-functions\.js'\)/);
 assert.match(app,/await createFirebaseServices\(\)/);
 assert.match(app,/requestAnimationFrame\(\(\) => setTimeout\(startCloudBoot, 0\)\)/);
 assert.match(app,/onAuthStateChanged\(auth, user => \{/);
 assert.match(app,/subscribeToSchedule\(\)/);
 assert.match(app,/syncRealtimeModules\(\)/);
 assert.match(app,/from "\.\/firebase\.js\?v=20261102-fast-start-v1"/);
 assert.match(schedule,/from "\.\/firebase\.js\?v=20261102-fast-start-v1"/);
 const imports=[],sdk={
  app:{initializeApp(config){return {projectId:config.projectId};}},
  auth:{getAuth(app){return {app};},browserLocalPersistence:{type:'LOCAL'},signInAnonymously(auth){return {uid:'viewer'};},onAuthStateChanged(auth,fn){return()=>{};},setPersistence(auth,mode){return mode.type;}},
  store:{getFirestore(app){return {app};},doc(db,...parts){return ['doc',...parts].join('/')},getDoc(ref){return Promise.resolve(ref)},onSnapshot(){return()=>{};}},
  functions:{getFunctions(){return {region:'us-central1'};},httpsCallable(fn,name){return async data=>({data:{name,data,region:fn.region}});}}
 };
 const load=async url=>{
  imports.push(url);
  if(url.includes('firebase-app.js'))return sdk.app;
  if(url.includes('firebase-auth.js'))return sdk.auth;
  if(url.includes('firebase-firestore.js'))return sdk.store;
  if(url.includes('firebase-functions.js'))return sdk.functions;
  throw Error('Unexpected SDK module '+url);
 };
 const exported=['createFirebaseServices','callCloudFunction','browserLocalPersistence','signInAnonymously','onAuthStateChanged','setPersistence','doc','getDoc','onSnapshot'];
 const code=source.replace(/\bexport\s+/g,'').replace(/\bimport\(/g,'__load(')+'\nthis.api={'+exported.map(x=>x+':()=>'+x).join(',')+'};';
 const context={__load:load,console};vm.runInNewContext(code,context);
 assert.equal(imports.length,0,'initial module evaluation must make no SDK requests');
 const services=await context.api.createFirebaseServices()();
 assert.equal(imports.length,3,'only App/Auth/Firestore SDK needed initially');
 assert.equal(services.app.projectId,'sbpgroup-toe-26-9-1');
 assert.equal(context.api.browserLocalPersistence().type,'LOCAL');
 assert.equal(context.api.signInAnonymously()(services.auth).uid,'viewer');
 assert.equal(context.api.setPersistence()(services.auth,{type:'LOCAL'}),'LOCAL');
 assert.equal(context.api.doc()(services.db,'groups','shared'),'doc/groups/shared');
 assert.equal(await context.api.getDoc()('path'),'path');
 const cleanup=context.api.onAuthStateChanged()(services.auth,()=>{});assert.equal(typeof cleanup,'function');
 const cloud=await context.api.callCloudFunction()('ping',{ok:true});
 assert.equal(cloud.name,'ping');assert.equal(cloud.region,'us-central1');
 assert.equal(imports.length,4,'Functions SDK is loaded only when requested');
 await context.api.createFirebaseServices()();
 assert.equal(imports.length,4,'SDK initialization is shared');
});
test('cold boot avoids building invisible journal, roster and schedule panels',()=>{
 assert.match(app,/if \(!fromReload \|\| homeTimelineBootReady\) \{/);
 assert.match(app,/if \(currentVisibleView === 'roster'\) renderRosterList\(\)/);
 assert.match(app,/if \(currentVisibleView === 'tracker'\) renderApp\(true\)/);
 assert.match(app,/if \(currentVisibleView === 'schedule'\) renderSchedule\(getCurrentScheduleDay\(\)\)/);
 assert.match(app,/if \(!document\.getElementById\('view-tracker'\)\?\.classList\.contains\('hidden'\)\) renderApp\(\)/);
 assert.match(app,/homeTimelineBootReady = true/);
});
test('Android PWA launch animation shows icon and product name without extra delay',()=>{
 assert.equal(manifest.name,'SBP Information');
 assert.equal(manifest.short_name,'SBP Information');
 assert.match(html,/<div id="sbp-launch-animation" aria-hidden="true">[\s\S]*?class="sbp-launch-brand"/);
 assert.match(html,/<img src="\.\/sbp-icon-192\.png" alt="" width="90" height="90"/);
 assert.match(html,/<strong>SBP Information<\/strong>/);
 assert.match(html,/const visibleFor = reduced \? 60 : 240;/);
 assert.match(html,/sbp-launch-brand strong\{/);
 assert.match(html,/manifest\.webmanifest\?v=20261102-brand-launch-v1/);
 assert.match(worker,/manifest\.webmanifest\?v=20261102-brand-launch-v1/);
});
test('PWA installer limits background fetch contention on slow connections',()=>{
 assert.match(worker,/Array\.from\(\{ length: Math\.min\(4, remaining\.length\) \}, cacheNext\)/);
 assert.match(worker,/cache: url\.startsWith\('http'\) \? 'force-cache' : 'reload'/);
 assert.match(worker,/self\.addEventListener\('push'/);
 assert.match(worker,/self\.addEventListener\('notificationclick'/);
});

// Optional browser check: requires Playwright and Edge. All identity/push APIs are mocked.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(()=>{
  window.localShows=0;
  Object.defineProperty(window,'Notification',{value:{permission:'default',async requestPermission(){this.permission='granted';return 'granted';}}});
  let subscription=null;
  const reg={async update(){},async showNotification(){window.localShows++;},pushManager:{async getSubscription(){return subscription;},async subscribe(){subscription={endpoint:'https://fcm.googleapis.com/self-test',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'test',auth:'test'}};}};return subscription;}}};
  Object.defineProperty(navigator,'serviceWorker',{value:{async register(){return reg;},ready:Promise.resolve(reg),addEventListener(){}}});
 });
 await context.route('**/firebase.js?*',route=>route.fulfill({contentType:'text/javascript',body:"export const createFirebaseServices=()=>({auth:{currentUser:{getIdToken:async()=> 'fake'}}});export const onAuthStateChanged=(a,fn)=>{queueMicrotask(fn);return ()=>{};};export const signInAnonymously=async()=>{};"}));
 const jobs=[],requests=[];
 await context.route('https://sbp-information-push.sinevbogdan100.workers.dev/**',route=>{
  const req=route.request(),pathname=new URL(req.url()).pathname,data=req.postDataJSON();requests.push({pathname,data});
  let body={};
  if(pathname==='/config')body={vapidPublicKey:'a'.repeat(87)};
  if(pathname==='/register')body={registered:true};
  if(pathname==='/test'){const now=Date.now();jobs.unshift({id:'test-123',created_at:now,run_at:now+data.delay*1000,state:data.delay?'queued':'sent'});body={test:jobs[0]};}
  if(pathname==='/test-status')body={tests:jobs};
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5077/notification-test.html');
 await page.locator('#install').click();assert.equal(await page.locator('#install-help').getAttribute('open'),'');
 await page.evaluate(()=>{window.installCalled=false;const event=new Event('beforeinstallprompt');event.prompt=async()=>{window.installCalled=true;};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});
 await page.locator('#install').click();assert.equal(await page.evaluate(()=>window.installCalled),true);
 await page.locator('#prepare').click();await page.waitForFunction(()=>document.querySelector('#device-status').textContent.includes('Устройство подключено'));
 await page.locator('#local').click();assert.equal(await page.evaluate(()=>window.localShows),1);
 await page.locator('#immediate').click();await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('Отправлено'));
 assert.ok(requests.some(r=>r.pathname==='/test'&&r.data.delay===0&&r.data.endpoint.endsWith('/self-test')));
 await page.locator('#delayed').click();await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Закройте страницу'));
 assert.ok(requests.some(r=>r.pathname==='/test'&&r.data.delay===60));
 await page.evaluate(async()=>{const c=await caches.open('sbp-push-test-results');await c.put(new URL('./__push-test/test-123',location.href).href,new Response(JSON.stringify({id:'test-123',receivedAt:Date.now()})));});
 await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('Получено устройством'));
 await page.screenshot({path:require('node:path').join(__dirname,'../../notification-test-desktop.png'),fullPage:true});
 await page.locator('#language').click();await page.waitForFunction(()=>document.documentElement.lang==='kk');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile KZ has no horizontal overflow');
 assert.match(await page.locator('#results').innerText(),/Құрылғы алды/);
 await page.screenshot({path:require('node:path').join(__dirname,'../../notification-test-mobile.png'),fullPage:true});
 await page.locator('#clear').click();assert.match(await page.locator('#log').innerText(),/Тексерісті бастаңыз/);
 assert.deepEqual(errors,[]);
 console.log('PASS: RU/KZ, mobile layout, permission/setup, local and immediate/delayed push controls, receipt results, clear log. Network and OS notification APIs mocked.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'..','notification-center.js'),'utf8')
  .replace(/^import .*;\r?\n/,'').replaceAll('export function','function');
test('stale Android VAPID subscription is renewed, then foreground events show an OS notification',async()=>{
 const saved=new Map(); const listeners={}; const shown=[]; const urls=[];
 const old={endpoint:'old',options:{applicationServerKey:new Uint8Array(65).buffer},async unsubscribe(){listeners.unsubscribed=true;return true;}};
 const fresh={endpoint:'new',toJSON(){return {endpoint:'new',keys:{p256dh:'x',auth:'y'}}}};
 const registration={pushManager:{
  async getSubscription(){return old;},
  async subscribe(options){listeners.resubscribed=options;return fresh;}
 },async showNotification(title,options){shown.push({title,options});}};
 const serviceWorker={async getRegistration(){return registration;},ready:Promise.resolve(registration),addEventListener(){}};
 const notification={permission:'granted',async requestPermission(){return 'granted';}};
 const buttons=new Map();
 for(const id of ['notification-device-enable','notification-device-disable','notification-device-status']){
  buttons.set(id,{id,hidden:false,disabled:false,textContent:'',addEventListener(name,handler){listeners[id+':'+name]=handler;}});
 }
 const window={isSecureContext:true,Notification:notification,matchMedia(){return {matches:false};},addEventListener(){}};
 const document={visibilityState:'visible',getElementById:id=>buttons.get(id)||null,addEventListener(){}};
 const navigator={serviceWorker,standalone:false,userAgent:'Android',platform:'Linux',maxTouchPoints:0};
 const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const key=Buffer.alloc(65,4).toString('base64url');
 const user={uid:'student-one',async getIdToken(){return 'firebase-token';}};
 const fetch=async(url)=>{
  urls.push(url);
  const data=url.endsWith('/config')?{vapidPublicKey:key}:url.endsWith('/health')?
    {configured:true,remindersReady:true}:{registered:true};
  return {ok:true,status:200,async json(){return data;}};
 };
 const context={window,document,navigator,localStorage,Notification:notification,fetch,PUSH_WORKER_URL:'https://push.example.com',
  AbortSignal,Uint8Array,ArrayBuffer,atob,console,Promise,setTimeout};
 vm.runInNewContext(script+'\nwindow.center=createNotificationCenter({getCloud:()=>({auth:{currentUser:window.user},callFunction:async()=>true,language:()=>\'ru\'}),translate:x=>x,toast:()=>{},open:()=>{}});',context);
 window.user=user;
 await listeners['notification-device-enable:click']();
 assert.equal(listeners.unsubscribed,true,'outdated VAPID key is detached');
 assert.ok(listeners.resubscribed,'new push subscription is created');
 assert.ok(urls.some(x=>x.endsWith('/register')),'the new subscription is registered on the server');
 assert.ok(urls.some(x=>x.endsWith('/health')),'the background scheduler is checked');
 assert.equal(buttons.get('notification-device-status').textContent,'Включены, в том числе при закрытом сайте');
 await window.center.incoming({key:'event:one',title:'Завтра занятий нет',body:'Завтра выходной',kind:'events'});
 assert.equal(shown.length,1,'an OS notification appears even when the app is visible');
 assert.equal(shown[0].options.tag,'event:one');
 await window.center.incoming({key:'event:two',title:'Событие',body:'Push already arrived',kind:'events',push:true});
 assert.equal(shown.length,1,'SW push is not repeated as a second OS notification');
});

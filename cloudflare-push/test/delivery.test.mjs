import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createECDH, randomBytes, createHash } from 'node:crypto';
import { testing } from '../src/index.js';

test('real encrypted delivery: urgency, retry, deduplication and abandoned reservation recovery', async () => {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_init.sql','0002_delivery_leases.sql'])
    db.exec(readFileSync(new URL('../migrations/'+name, import.meta.url), 'utf8'));
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const device = {id:'test-device',endpoint:'https://fcm.googleapis.com/test',p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')};
  const vapid = createECDH('prime256v1'); vapid.generateKeys();
  const env = {VAPID_PRIVATE_KEY:vapid.getPrivateKey().toString('base64url'),VAPID_PUBLIC_KEY:vapid.getPublicKey().toString('base64url'),VAPID_SUBJECT:'mailto:test@example.com',
    DB:{prepare(sql) { const stmt=db.prepare(sql); return {bind(...args) {return {
      async run(){return {meta:{changes:stmt.run(...args).changes}};},
      async first(){return stmt.get(...args);}
    };}}}}};
  const original = globalThis.fetch;
  let calls=0, responseStatus=503;
  globalThis.fetch = async (url, options) => {
    calls++;
    const headers=new Headers(options.headers);
    assert.equal(headers.get('urgency'),'high');
    assert.equal(headers.get('ttl'),'300');
    assert.ok(options.signal);
    return new Response('',{status:responseStatus});
  };
  const status={failed:0}, build=()=>({title:'Test'});
  const send=()=>testing.deliver(env,[device],'lesson:test',build,{ttl:300,status});
  try {
    assert.equal(await send(),0);
    assert.equal(status.failed,1);
    assert.equal(db.prepare('SELECT count(*) n FROM deliveries').get().n,0);
    responseStatus=201;
    assert.equal(await send(),1);
    assert.equal(await send(),0);
    assert.equal(calls,2,'successful retry cannot deliver twice');
    const id=createHash('sha256').update('lesson:test:'+device.id).digest('base64url');
    db.prepare("UPDATE deliveries SET state='pending',lease_token='old',created_at=? WHERE id=?").run(Date.now(),id);
    assert.equal(await send(),0,'active concurrent sender keeps its lease');
    assert.equal(status.failed,2,'pending dispatch requests another attempt');
    db.prepare('UPDATE deliveries SET created_at=? WHERE id=?').run(Date.now()-31000,id);
    assert.equal(await send(),1,'interrupted sender does not permanently suppress an event');
    assert.equal(db.prepare('SELECT state FROM deliveries').get().state,'sent');
    assert.equal(await send(),0);
    assert.equal(calls,3);
  } finally {globalThis.fetch=original;db.close();}
});

test('a slow subscription does not block prompt delivery to other classmates',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['0001_init.sql','0002_delivery_leases.sql'])
  db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const ecdh=createECDH('prime256v1');ecdh.generateKeys();
 const vapid=createECDH('prime256v1');vapid.generateKeys();
 const env={VAPID_PRIVATE_KEY:vapid.getPrivateKey().toString('base64url'),
  VAPID_PUBLIC_KEY:vapid.getPublicKey().toString('base64url'),VAPID_SUBJECT:'mailto:test@example.com',
  DB:{prepare(sql){const stmt=db.prepare(sql);return {bind(...args){return {
   async run(){return {meta:{changes:stmt.run(...args).changes}};},
   async first(){return stmt.get(...args);}
  };}};}}
 };
 const devices=Array.from({length:8},(_,i)=>({id:'device-'+i,
  endpoint:'https://fcm.googleapis.com/push-'+i,
  p256dh:ecdh.getPublicKey().toString('base64url'),
  auth:randomBytes(16).toString('base64url')}));
 const original=globalThis.fetch;let active=0,peak=0,calls=0;
 globalThis.fetch=async()=>{
  calls++;active++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,15));
  active--;return new Response('',{status:201});
 };
 try{
  assert.equal(await testing.deliver(env,devices,'lesson:2026-11-03:next',()=>({title:'Next class'}),{ttl:180}),8);
  assert.ok(peak>=2&&peak<=4,'delivery is concurrent but limited to four connections, peak='+peak);
  assert.equal(calls,8);
  assert.equal(await testing.deliver(env,devices,'lesson:2026-11-03:next',()=>({title:'Next class'}),{ttl:180}),0);
  assert.equal(calls,8,'stable D1 receipts prevent duplicate push on retry');
 }finally{globalThis.fetch=original;db.close();}
});

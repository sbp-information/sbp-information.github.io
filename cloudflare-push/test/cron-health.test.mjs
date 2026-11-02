import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { testing } from '../src/index.js';

test('heartbeat exposes broken Cron separately from an enabled VAPID configuration', async()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['0001_init.sql','0002_delivery_leases.sql','0003_cron_health.sql'])
  db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const env={
  DB:{prepare(sql){const stmt=db.prepare(sql);return {bind(...args){return {
   async run(){return {meta:{changes:stmt.run(...args).changes}};},
   async first(){return stmt.get(...args);}
  };},async first(){return stmt.get();}};}},
  VAPID_PRIVATE_KEY:'configured',VAPID_PUBLIC_KEY:'configured',
  VAPID_SUBJECT:'mailto:owner@example.com',FIREBASE_SERVICE_ACCOUNT_JSON:'{}'
 };
 const health=async()=> {
  const response=await worker.fetch(new Request('https://push.example.com/health'),env);
  assert.equal(response.status,200);
  return response.json();
 };
 try {
  const before=await health();
  assert.equal(before.configured,true);
  assert.equal(before.cronHealthy,false,'configuration is not proof that Cron is running');
  assert.equal(before.scheduleHealthy,false);
  const now=Date.now();
  await testing.recordHeartbeat(env,{last_run_at:now,last_schedule_ok_at:now});
  const healthy=await health();
  assert.equal(healthy.cronHealthy,true);
  assert.equal(healthy.scheduleHealthy,true);
  assert.equal(healthy.lastCronAt,now);
  await testing.recordHeartbeat(env,{last_schedule_error_at:now+1});
  assert.equal((await health()).scheduleHealthy,false,'Firestore failures are visible');
  await testing.recordHeartbeat(env,{last_schedule_ok_at:now+2});
  assert.equal((await health()).scheduleHealthy,true,'next successful poll clears the failure');
  await testing.recordHeartbeat(env,{last_run_at:now-6*60000});
  assert.equal((await health()).cronHealthy,false,'missed Cron ticks are detected');
  assert.equal((await health()).scheduleHealthy,true);
 } finally{db.close();}
});

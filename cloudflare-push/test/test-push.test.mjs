import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {testRequest,sendDueTests} from '../src/test-push.js';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0001_init.sql','0002_delivery_leases.sql','0003_push_tests.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 db.prepare('INSERT INTO devices VALUES (?,?,?,?,?,?,?,?)').run('device-a','user-a','','https://fcm.googleapis.com/a','key','auth','ru',Date.now());
 db.prepare('INSERT INTO devices VALUES (?,?,?,?,?,?,?,?)').run('device-b','user-b','','https://fcm.googleapis.com/b','key','auth','kz',Date.now());
 const env={DB:{prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {
 async first(){return stmt.get(...args);},async all(){return {results:stmt.all(...args)};},async run(){return {meta:{changes:stmt.run(...args).changes}};}
 };}};}}};
 const deliveries=[],hash=async endpoint=>endpoint.endsWith('/a')?'device-a':'device-b';
 const deliver=async(env,devices,key,build,options)=>{deliveries.push({devices,key,payload:build(devices[0]),options});return 1;};
 const request=(user,data,path='/test')=>testRequest(env,{uid:user},data,path,hash,deliver);
 return {db,env,deliveries,deliver,request};
}
test('self-test only targets caller device, rate limits and validates delays',async()=>{
 const f=fixture();
 try{
 await assert.rejects(f.request('user-a',{endpoint:'https://fcm.googleapis.com/b',delay:0}),{status:403});
 await assert.rejects(f.request('user-a',{endpoint:'https://fcm.googleapis.com/a',delay:1}),{status:400});
 const r=await f.request('user-a',{endpoint:'https://fcm.googleapis.com/a',delay:0});
 assert.equal(r.test.state,'sent');assert.equal(f.deliveries.length,1);
 assert.deepEqual(f.deliveries[0].devices.map(d=>d.uid),['user-a']);
 assert.equal(f.deliveries[0].payload.kind,'test');
 await assert.rejects(f.request('user-a',{endpoint:'https://fcm.googleapis.com/a',delay:60}),{status:429});
 const own=await f.request('user-a',{endpoint:'https://fcm.googleapis.com/a'},'/test-status');assert.equal(own.tests.length,1);
 await assert.rejects(f.request('user-b',{endpoint:'https://fcm.googleapis.com/a'},'/test-status'),{status:403});
 }finally{f.db.close();}
});
test('delayed tests survive page closure, retry failures and never target reassigned device',async()=>{
 const f=fixture();
 try{
 const result=await f.request('user-a',{endpoint:'https://fcm.googleapis.com/a',delay:60});
 assert.equal(result.test.state,'queued');assert.equal(f.deliveries.length,0);
 await sendDueTests(f.env,f.deliver);assert.equal(f.deliveries.length,0);
 f.db.prepare('UPDATE push_tests SET run_at=?').run(Date.now()-1000);
 await sendDueTests(f.env,async()=>0);assert.equal(f.db.prepare('SELECT state FROM push_tests').get().state,'queued');
 await sendDueTests(f.env,f.deliver);assert.equal(f.deliveries.length,1);
 await sendDueTests(f.env,f.deliver);assert.equal(f.deliveries.length,1);
 f.db.prepare("UPDATE push_tests SET state='queued'").run();
 f.db.prepare("UPDATE devices SET uid='new-user' WHERE id='device-a'").run();
 await sendDueTests(f.env,f.deliver);assert.equal(f.db.prepare('SELECT state FROM push_tests').get().state,'cancelled');
 assert.equal(f.deliveries.length,1);
 }finally{f.db.close();}
});
test('expired test is not sent, accepted receipt recovers final status',async()=>{
 const f=fixture();
 try{
 await f.request('user-a',{endpoint:'https://fcm.googleapis.com/a',delay:60});
 f.db.prepare('UPDATE push_tests SET run_at=?').run(Date.now()-310000);
 await sendDueTests(f.env,f.deliver);assert.equal(f.deliveries.length,0);
 assert.equal(f.db.prepare('SELECT state FROM push_tests').get().state,'expired');
 f.db.prepare("UPDATE push_tests SET state='queued',run_at=?").run(Date.now()-1000);
 await sendDueTests(f.env,async(env,devices,key,build,options)=>{options.status.alreadySent=1;return 0;});
 assert.equal(f.db.prepare('SELECT state FROM push_tests').get().state,'sent');
 }finally{f.db.close();}
});

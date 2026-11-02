// Tests only target the caller's existing device; no broadcast or arbitrary text.
function fail(message,status){return Object.assign(new Error(message),{status});}
export async function testRequest(env,user,data,path,hash,deliver) {
  if(typeof data.endpoint!=='string'||data.endpoint.length>4096)throw fail('Invalid endpoint',400);
  const deviceId=await hash(data.endpoint);
  const device=await env.DB.prepare('SELECT * FROM devices WHERE id=? AND uid=?').bind(deviceId,user.uid).first();
  if(!device)throw fail('Register this device first',403);
  if(path==='/test-status')return {tests:(await env.DB.prepare('SELECT id,created_at,run_at,state,sent_at FROM push_tests WHERE device_id=? AND uid=? ORDER BY created_at DESC LIMIT 5').bind(deviceId,user.uid).all()).results||[]};
  if(![0,60].includes(data.delay))throw fail('Invalid delay',400);
  const now=Date.now(),id=crypto.randomUUID();
  const result=await env.DB.prepare("INSERT INTO push_tests (id,uid,device_id,created_at,run_at) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM push_tests WHERE device_id=? AND created_at>?)")
    .bind(id,user.uid,deviceId,now,now+data.delay*1000,deviceId,now-30000).run();
  if(!result.meta?.changes)throw fail('Wait 30 seconds before another test',429);
  if(data.delay===0)await sendTest(env,{id,uid:user.uid,device_id:deviceId,run_at:now},deliver);
  return {test:await env.DB.prepare('SELECT id,created_at,run_at,state,sent_at FROM push_tests WHERE id=?').bind(id).first()};
}
async function sendTest(env,job,deliver) {
  const device=await env.DB.prepare('SELECT * FROM devices WHERE id=? AND uid=?').bind(job.device_id,job.uid).first();
  if(!device) {
    await env.DB.prepare("UPDATE push_tests SET state='cancelled' WHERE id=?").bind(job.id).run();return;
  }
  const status={failed:0,alreadySent:0};
  const sent=await deliver(env,[device],'test:'+job.id,d=>({
    key:'test:'+job.id,kind:'test',testId:job.id,plannedAt:job.run_at,
    title:d.language==='kz'?'Push тексерісі':'Проверка Push',
    body:d.language==='kz'?'Бұл құрылғы тест хабарландыруын алды. Нәтижені көру үшін ашыңыз.':'Это устройство получило тестовое уведомление. Откройте для просмотра результата.',
    expiresAt:job.run_at+5*60000
  }),{ttl:300,status});
  if(sent || status.alreadySent)await env.DB.prepare("UPDATE push_tests SET state='sent',sent_at=? WHERE id=?").bind(Date.now(),job.id).run();
}
export async function sendDueTests(env,deliver) {
  const now=Date.now();
  await env.DB.prepare("UPDATE push_tests SET state='expired' WHERE state='queued' AND run_at<?").bind(now-5*60000).run();
  const jobs=(await env.DB.prepare("SELECT * FROM push_tests WHERE state='queued' AND run_at<=? ORDER BY run_at LIMIT 10").bind(now).all()).results||[];
  for(const job of jobs)await sendTest(env,job,deliver);
  await env.DB.prepare('DELETE FROM push_tests WHERE created_at<?').bind(now-86400000).run();
}

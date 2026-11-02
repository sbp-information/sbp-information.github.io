// Read only: no device endpoints, names, messages, keys or tokens in output.
import {createSign} from 'node:crypto';
import {kazakhstanClock, activeLessons, dueReminders} from '../cloudflare-push/src/schedule-reminders.js';
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token=process.env.CLOUDFLARE_API_TOKEN;
const api='https://api.cloudflare.com/client/v4';
async function cf(suffix, body) {
  const response=await fetch(api+suffix,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const value=await response.json();
  if(!response.ok||value.success===false)throw Error('Cloudflare HTTP '+response.status+' codes '+(value.errors||[]).map(e=>e.code).join(','));
  return value.result??value;
}
async function section(name, run) {
  try{console.log(name+': '+JSON.stringify(await run()));}
  catch(error){console.log(name+': unavailable ('+error.message+')');}
}
await section('cron',async()=>{
 const data=await cf(`/accounts/${account}/workers/scripts/sbp-information-push/schedules`);
 return (data.schedules||data||[]).map(x=>({cron:x.cron,created_on:x.created_on}));
});
await section('database',async()=>{
 const rows=await cf(`/accounts/${account}/d1/database`);
 const db=rows.find(x=>x.name==='sbp-information-push');if(!db)throw Error('D1 database missing');
 const result=await cf(`/accounts/${account}/d1/database/${db.uuid}/query`,{sql:'SELECT (SELECT COUNT(*) FROM devices) AS devices, (SELECT COUNT(*) FROM devices WHERE email != \'\') AS staff_devices, (SELECT COUNT(*) FROM deliveries) AS reservations, (SELECT COUNT(*) FROM deliveries WHERE created_at >= ?) AS reservations_24h, (SELECT MAX(created_at) FROM deliveries) AS last_reservation',params:[Date.now()-86400000]});
 return result.map(x=>x.results);
});
await section('worker_metrics_24h',async()=>{
 const query=`query($account: string!, $start: Time!, $end: Time!){viewer{accounts(filter:{accountTag:$account}){workersInvocationsAdaptive(limit:20,filter:{scriptName:"sbp-information-push",datetime_geq:$start,datetime_leq:$end}){dimensions{status} sum{requests errors} quantiles{cpuTimeP50 cpuTimeP99}}}}}`;
 const data=await cf('/graphql',{query,variables:{account,start:new Date(Date.now()-86400000).toISOString(),end:new Date().toISOString()}});
 if(data.errors)throw Error('Analytics query unavailable');
 return data.data?.viewer?.accounts?.map(x=>x.workersInvocationsAdaptive);
});
await section('schedule',async()=>{
 const service=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}');
 if(service.project_id!=='sbpgroup-toe-26-9-1')throw Error('Unexpected project');
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const content=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:service.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const assertion=content+'.'+createSign('RSA-SHA256').update(content).sign(service.private_key,'base64url');
 const authResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(20000)});
 if(!authResponse.ok)throw Error('Google authentication HTTP '+authResponse.status);
 const auth=await authResponse.json();
 const response=await fetch('https://firestore.googleapis.com/v1/projects/sbpgroup-toe-26-9-1/databases/(default)/documents/toe_group/shared/schedule/main',{headers:{Authorization:'Bearer '+auth.access_token},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Firestore schedule HTTP '+response.status);
 const doc=await response.json();
 function decode(value){if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,decode(v)]));if('arrayValue'in value)return(value.arrayValue.values||[]).map(decode);return value.stringValue??value.booleanValue??(value.integerValue!==undefined?Number(value.integerValue):null);}
 const schedule=Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)]));
 const clock=kazakhstanClock();const lessons=activeLessons(schedule,clock);
 const times=[];for(let minute=0;minute<1440;minute++)for(const event of dueReminders(schedule,{...clock,minute}))times.push({minute,type:event.type});
 return {date:clock.date,minute:clock.minute,fields:Object.keys(schedule),activeLessonCount:lessons.length,lessonTimes:lessons.map(x=>({start:x.range.start,end:x.range.end})),reminderTimes:times};
});

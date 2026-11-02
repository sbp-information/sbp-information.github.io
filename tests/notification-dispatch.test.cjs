const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../notification-center.js'),'utf8').replace(/^import .*;\r?\n/,'').replaceAll('export function','function');
function fixture(responses) {
  const requests=[], tokens=[], delays=[];
  const context={PUSH_WORKER_URL:'https://push.example.com',console:{warn(){}},AbortSignal,
    localStorage:{getItem(){return null;}},navigator:{userAgent:''},window:{isSecureContext:false,addEventListener(){}},
    document:{getElementById(){return null;},addEventListener(){}},
    setTimeout(fn,ms){delays.push(ms);fn();},
    async fetch(url,options){requests.push({url,options});const response=responses.shift();if(response instanceof Error)throw response;return {ok:response.status===200,status:response.status,json:async()=>({retryable:response.retryable||false})};}};
  vm.createContext(context);vm.runInContext(source,context);
  const center=context.createNotificationCenter({getCloud:()=>({auth:{currentUser:{uid:'test',async getIdToken(refresh){tokens.push(refresh);return 'token';}}}}),translate:x=>x});
  return {center,requests,tokens,delays};
}
test('first transient failure retries immediately with keepalive and timeout',async()=>{
  const f=fixture([{status:503},{status:200}]);
  assert.equal(await f.center.dispatch('support','test'),true);
  assert.equal(f.requests.length,2);assert.deepEqual(f.delays,[500]);
  assert.equal(f.requests[0].options.keepalive,true);assert.ok(f.requests[0].options.signal);
});
test('provider failure returned by server is retried',async()=>{
  const f=fixture([{status:200,retryable:true},{status:200}]);
  assert.equal(await f.center.dispatch('support','test'),true);assert.equal(f.requests.length,2);
});
test('expired token refreshes once, forbidden requests do not retry',async()=>{
  const f=fixture([{status:401},{status:200}]);assert.equal(await f.center.dispatch('support','test'),true);
  assert.deepEqual(f.tokens,[false,true]);
  const denied=fixture([{status:403}]);assert.equal(await denied.center.dispatch('support','test'),false);assert.equal(denied.requests.length,1);
});
test('network retries are bounded and preserve scheduled fallback',async()=>{
  const f=fixture([new Error('offline'),new Error('offline'),new Error('offline')]);
  assert.equal(await f.center.dispatch('support','test'),false);assert.equal(f.requests.length,3);assert.deepEqual(f.delays,[500,1500]);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Evaluate the actual cold-start router cut from app.js rather than duplicating
// its logic. Firebase authentication may finish long after the module loads.
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = app.indexOf('const notificationDeepLink=new URL(location.href).searchParams;');
const end = app.indexOf('const realtimeMaintenanceTimer=', start);
assert.ok(start > -1 && end > start, 'startup notification router is present');
const router = app.slice(start, end);
assert.match(app, /onAuthStateChanged\(auth, user => \{[\s\S]*?syncRealtimeModules\(\);/, 'Firebase restore actively retries routing');
assert.match(app, /await initFirebase\(\);[\s\S]*?syncRealtimeModules\(\);/, 'post-boot retry is not tied to the 90-second maintenance interval');
assert.match(app, /if\(pendingSupportThreadId && isSupportOpen\(\)/, 'staff thread is resolved after the inbox snapshot arrives');

function fixture(kind, { staff = false, threadId = '' } = {}) {
  const url = new URL('https://sbp-information.github.io/');
  url.searchParams.set('notification', kind);
  if (threadId) url.searchParams.set('thread', threadId);
  const calls = [];
  const context = {
    URL, Promise, console,
    location: { href: url.href },
    history: { replaceState(_state, _unused, next) { calls.push(['replace', next.toString()]); } },
    window: {
      refreshSupportNotifications() { calls.push(['refresh-support']); },
      openSupport() { calls.push(['open-support']); return Promise.resolve(); },
      switchView(name) { calls.push(['view',name]); },
      openNotifications() { calls.push(['events']); }
    },
    auth: null,
    db: null,
    notificationsUnsubscribe: null,
    subscribeNotifications() { calls.push(['subscribe']); },
    notificationCenter: { refreshAccount() { calls.push(['refresh-account']); } },
    supportThreadsCache: [],
    isSupportStaff() { return staff; },
    pendingSupportThreadId: ''
  };
  vm.createContext(context);
  vm.runInContext(router, context);
  return { context, calls, sync: () => vm.runInContext('syncRealtimeModules()', context),
    pending: () => vm.runInContext('pendingNotificationLink',context) };
}

test('cold-start support link waits for Firebase user, then opens without 90-second tick', () => {
  const f=fixture('support');
  f.sync();
  assert.equal(f.calls.some(([event])=>event==='open-support'),false,'no login, no misleading navigation');
  assert.equal(f.pending(),'support');
  f.context.auth={currentUser:{uid:'visitor-123'}};
  f.sync();
  assert.equal(f.calls.filter(([event])=>event==='open-support').length,1);
  assert.equal(f.pending(),'');
  assert.equal(f.calls.filter(([event])=>event==='replace').length,1);
  f.sync();
  assert.equal(f.calls.filter(([event])=>event==='open-support').length,1,'a notification opens once');
});

test('staff support link opens inbox immediately and retains thread id while it loads',()=>{
  const f=fixture('support',{staff:true,threadId:'visitor-thread-3'});
  f.context.auth={currentUser:{uid:'staff-123'}};
  f.sync();
  assert.equal(f.calls.filter(([event])=>event==='open-support').length,1);
  assert.equal(f.context.pendingSupportThreadId,'visitor-thread-3');
  assert.equal(f.calls.some(([event])=>event==='replace'),true);
});

test('schedule and events link open correct destination after authentication',()=>{
  for (const [kind, expected] of [['schedule','view'],['events','events']]){
    const f=fixture(kind);
    f.context.auth={currentUser:{uid:'user-123'}};
    f.sync();
    assert.ok(f.calls.some(([event])=>event===expected),kind+' route');
    assert.equal(f.calls.filter(([event])=>event==='replace').length,1);
  }
});

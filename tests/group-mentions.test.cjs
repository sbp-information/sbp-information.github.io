'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('remove diagnostic PWA, links, browser code, server test endpoints and queue',()=>{
 for(const name of ['notification-test.html','notification-test.js','notification-test.css','notification-test.webmanifest','cloudflare-push/src/test-push.js','cloudflare-push/test/test-push.test.mjs'])
  assert.equal(fs.existsSync(path.join(root,name)),false,name);
 for(const name of ['index.html','notifications-sw.js','cloudflare-push/src/index.js'])
  assert.doesNotMatch(read(name),/notification-test|test-push|sendDueTests|\/test-status|push-test-results/);
 assert.match(read('cloudflare-push/migrations/0004_remove_push_tests.sql'),/DROP TABLE IF EXISTS push_tests/);
});
test('mention composer, client and translation are connected',()=>{
 const html=read('index.html'),app=read('app.js'),dict=read('i18n.js');
 assert.match(html,/<option value="mention">Упоминание группы<\/option>/);
 assert.match(app,/type:isMention\?'mention':/);
 assert.match(app,/rawType==='mention'/);
 assert.match(app,/notificationCenter\.dispatch\('announcement', id\)/);
 assert.match(dict,/'Упоминание группы':'Топты атап өту'/);
 assert.match(app,/authorUid:auth\.currentUser\.uid/);
});
test('current release is 19.39 without removed 19.38 test page',()=>{
 const data=read('release-data.js');
 assert.match(data,/version:'19\.39'/);
 assert.doesNotMatch(data,/version:'19\.38'/);
});

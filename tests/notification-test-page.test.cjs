const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('all test-page labels have RU/KZ translations and release notes render',()=>{
 const source=read('notification-test.js');
 const dict=vm.runInNewContext(source.slice(source.indexOf('const words='),source.indexOf('const $=')).replace('const words=','globalThis.words=')+';words');
 assert.deepEqual(Object.keys(dict.ru).sort(),Object.keys(dict.kz).sort());
 for(const match of read('notification-test.html').matchAll(/data-(?:text|aria)="([^"]+)"/g)){
  assert.ok(dict.ru[match[1]],match[1]+' RU');assert.ok(dict.kz[match[1]],match[1]+' KZ');
 }
 const releases=vm.runInNewContext(read('release-data.js').replaceAll('export ','')+';RELEASES');
 assert.equal(releases[0].version,'19.38');
 assert.equal(releases[0].updates.ru.length,3);assert.equal(releases[0].updates.kz.length,3);
 assert.ok(read('index.html').includes('href="./notification-test.html"'));
});

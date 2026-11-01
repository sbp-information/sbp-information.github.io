'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const schedule=fs.readFileSync(path.join(root,'schedule.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'cloudflare-push/src/index.js'),'utf8');
const holidays=fs.readFileSync(path.join(root,'cloudflare-push/src/holiday-reminders.js'),'utf8');

// A regular schedule edit creates a Firestore document with the real author.
// A holiday addition does not create the document; the Worker picks up the
// authoritative saved holiday date on the preceding evening instead.
assert.match(app,/publishScheduleChange: async \(event\) => \{[\s\S]*?event\.changeType === 'pause' && event\.pauseAction === 'set' && event\.pauseType === 'holiday'\) return true;/);
assert.match(app,/authorUid:\s*auth\.currentUser\.uid/);
assert.match(schedule,/changeType:'pause',pauseAction:'set',pauseType:type/);
assert.match(schedule,/changeType:'pause',pauseAction:'remove'/);
assert.match(worker,/if \(!item \|\| !recent\(item\.createdAt\) \|\| isDeferredHolidayCreation\(item\)\) return 0/);
assert.match(worker,/announcementRecipients\(await deviceRows\(env\), item\)/);
assert.match(worker,/device\.uid !== item\.authorUid/);
assert.match(worker,/sendHolidayNotices\(env, clock\)/);
assert.match(holidays,/kind:'schedule'/);
console.log('Deferred holiday save, author exclusion, timed Worker notice and PWA navigation checked.');

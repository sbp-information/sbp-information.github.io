import test from 'node:test';
import assert from 'node:assert/strict';
import { dueHolidayNotices, holidayNoticePayload } from '../src/holiday-reminders.js';

const clock = (date, minute = 18 * 60) => ({ date, minute });

test('announce 12–14 holiday only once on 11th evening, not when admin saves it', () => {
  const schedule = { pause:{ days:{
    '2026-12-12':'holiday','2026-12-13':'holiday','2026-12-14':'holiday',
    '2026-12-20':'holiday','2026-12-23':'maintenance'
  } } };
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-11',1079)),[]);
  const [notice] = dueHolidayNotices(schedule,clock('2026-12-11'));
  assert.deepEqual(notice,{key:'holiday:2026-12-12:2026-12-14',first:'2026-12-12',last:'2026-12-14'});
  assert.equal(dueHolidayNotices(schedule,clock('2026-12-11',18*60+14)).length,1,'retry window uses same D1 delivery key');
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-11',18*60+15)),[],'not resent later in evening');
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-12')),[],'no repeated notification during holiday');
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-13')),[],'no repeated notification before last holiday');
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-14')),[]);
  assert.equal(dueHolidayNotices(schedule,clock('2026-12-19'))[0].first,'2026-12-20','later holiday gets its own notice');
});

test('RU and KZ holidays notify every subscribed role and open the schedule',()=>{
  const notice=dueHolidayNotices({pause:{days:{'2026-12-12':'holiday','2026-12-13':'holiday'}}},clock('2026-12-11'))[0];
  const ru=holidayNoticePayload({language:'ru',email:'owner.toe2691@example.com'},notice);
  const kz=holidayNoticePayload({language:'kz',email:'admin1.toe2691@example.com'},notice);
  assert.equal(ru.kind,'schedule');
  assert.equal(kz.kind,'schedule');
  assert.equal(ru.key,kz.key,'D1 de-duplication key is stable for all roles');
  assert.equal(ru.title,'Завтра начинается праздник');
  assert.match(ru.body,/12 декабря/);
  assert.match(ru.body,/13 декабря/);
  assert.equal(kz.title,'Ертең мереке басталады');
  assert.match(kz.body,/12 желтоқсан/);
  assert.match(kz.body,/13 желтоқсан/);
});

test('never remind for cancelled or changed holidays, or an unrelated nonstudy day',()=>{
  const schedule={pause:{days:{'2026-12-12':'temporary'}}};
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-11')),[]);
  schedule.pause.days['2026-12-12']='holiday';
  assert.equal(dueHolidayNotices(schedule,clock('2026-12-11')).length,1);
  delete schedule.pause.days['2026-12-12'];
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-12-11')),[]);
  assert.deepEqual(dueHolidayNotices(schedule,clock('2026-02-30')),[],'invalid calendar dates blocked');
});

test('holiday blocks across months/years and old saved periods are supported',()=>{
  const multi={pause:{days:{'2026-12-31':'holiday','2027-01-01':'holiday'}}};
  const [notice]=dueHolidayNotices(multi,clock('2026-12-30'));
  assert.equal(notice.last,'2027-01-01');
  const old={pause:{enabled:true,type:'holiday',startDate:'2026-12-31',endDate:'2027-01-01'}};
  assert.deepEqual(dueHolidayNotices(old,clock('2026-12-30')),[notice]);
});

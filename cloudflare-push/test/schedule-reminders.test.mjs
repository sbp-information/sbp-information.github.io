import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kazakhstanClock, weekTypeForDate, parseLessonTime, activeLessons, dueReminders,
  reminderPayload, shouldCheckSchedule
} from '../src/schedule-reminders.js';

const item = (subject, time, room = 'Каб. 301') => ({ subject, time, room });
const normal = {
  denominator: {
    mon: [
      item('Физика', '08:00 - 09:30'),
      item('Иностранный язык', '09:40 - 11:10', 'Каб. 504'),
      item('Физическая культура', '11:30 - 13:00', 'Зал'),
      item('История Казахстана', '13:10 - 14:40', 'Каб. 503')
    ]
  },
  numerator: {
    mon: [item('Математика', '08:00 - 09:30', 'Каб. 505')]
  }
};
function monday(minute, date = '2026-09-21') {
  return { date, dayKey: 'mon', weekday: 1, minute };
}
test('Asia/Almaty time ignores UTC device clock and stays at Kazakhstan UTC+5', () => {
  const clock = kazakhstanClock(new Date('2026-09-21T02:30:04Z'));
  assert.deepEqual(clock, { date: '2026-09-21', dayKey: 'mon', weekday: 1, minute: 450 });
  const next = kazakhstanClock(new Date('2026-09-21T18:59:00Z'));
  assert.equal(next.date, '2026-09-21');
  assert.equal(next.minute, 1439);
});
test('week parity follows exact PWA baseline and works across weekends', () => {
  assert.equal(weekTypeForDate('2026-09-21'), 'denominator');
  assert.equal(weekTypeForDate('2026-09-28'), 'numerator');
  assert.equal(weekTypeForDate('2026-10-05'), 'denominator');
  assert.equal(weekTypeForDate('2026-10-06'), 'denominator');
  assert.equal(weekTypeForDate('2026-11-02'), 'denominator');
});
test('first lesson at 07:30 and not at unrelated times', () => {
  const remind = dueReminders(normal, monday(450));
  assert.equal(remind.length, 1);
  assert.equal(remind[0].type, 'first');
  assert.equal(remind[0].lesson.subject, 'Физика');
  assert.equal(remind[0].key, 'lesson:2026-09-21:first');
  assert.deepEqual(dueReminders(normal, monday(449)), []);
  assert.deepEqual(dueReminders(normal, monday(451)), []);
});
test('next class reminder comes one minute before prior lesson ends', () => {
  const first = dueReminders(normal, monday(9 * 60 + 29));
  assert.equal(first.length, 1);
  assert.equal(first[0].lesson.subject, 'Иностранный язык');
  assert.deepEqual(dueReminders(normal, monday(9 * 60 + 30)), []);
  assert.equal(dueReminders(normal, monday(11 * 60 + 9))[0].lesson.subject, 'Физическая культура');
  assert.equal(dueReminders(normal, monday(12 * 60 + 59))[0].lesson.subject, 'История Казахстана');
  assert.deepEqual(dueReminders(normal, monday(14 * 60 + 39)), [], 'last class has no next-class message');
});
test('actual date overrides, shortened bell schedule and cancellations replace templates', () => {
  const override = structuredClone(normal);
  override.dateOverrides = {
    '2026-09-21': {
      weekType: 'denominator',
      lessons: [
        item('Физика', '08:00 - 09:00'),
        { ...item('Иностранный язык', '09:10 - 10:10', 'Каб. 504'), cancelled: true },
        item('География', '10:30 - 11:30', 'Каб. 506'),
        item('История Казахстана', '11:40 - 12:40', 'Каб. 503')
      ]
    }
  };
  assert.equal(dueReminders(override, monday(8 * 60 + 59))[0].lesson.subject, 'География', 'cancelled class never notified');
  assert.deepEqual(dueReminders(override, monday(9 * 60 + 29)), [], 'old 90-minute bells not used');
  assert.equal(dueReminders(override, monday(11 * 60 + 29))[0].lesson.subject, 'История Казахстана');
});
test('date override only affects matching week, preserve recurring schedule', () => {
  const customized = structuredClone(normal);
  customized.dateOverrides = { '2026-09-28': { weekType: 'denominator', lessons: [item('Биология', '07:00 - 08:00')] } };
  assert.equal(activeLessons(customized, monday(450, '2026-09-28'))[0].subject, 'Математика');
});
test('early first pair warns 30 minutes before actual start rather than after it', () => {
  const customized = structuredClone(normal);
  customized.denominator.mon[0].time = '07:15 - 08:45';
  assert.equal(dueReminders(customized, monday(6 * 60 + 45))[0].type, 'first');
  assert.deepEqual(dueReminders(customized, monday(450)), []);
});
test('holidays, maintenance, temporary pauses and weekends suppress reminders', () => {
  for (const type of ['vacation', 'maintenance', 'temporary']) {
    const suspended = { ...normal, pause: { enabled: true, type, startDate: '2026-09-20', endDate: '2026-09-22' } };
    assert.deepEqual(dueReminders(suspended, monday(450)), []);
  }
  assert.deepEqual(dueReminders(normal, { date: '2026-09-26', weekday: 6, dayKey: 'sat', minute: 450 }), []);
  assert.equal(shouldCheckSchedule(monday(450)), true);
  assert.equal(shouldCheckSchedule({ ...monday(450), weekday: 0 }), false);
});
test('messages have room, precise time, RU/KZ titles and no journal or release wording', () => {
  const event = dueReminders(normal, monday(450))[0];
  const ru = reminderPayload({ language: 'ru' }, event);
  const kz = reminderPayload({ language: 'kz' }, event);
  assert.equal(ru.title, 'Первая пара сегодня');
  assert.equal(ru.body, 'Физика · Каб. 301 · 08:00–09:30');
  assert.equal(kz.title, 'Бүгінгі бірінші сабақ');
  assert.equal(kz.body, 'Физика · 301-кабинет · 08:00–09:30');
  assert.equal(ru.kind, 'schedule');
  assert.equal(reminderPayload({language:'kz'}, dueReminders(normal, monday(11*60+9))[0]).body,
    'Дене шынықтыру · Спорт залы · 11:30–13:00');
  assert.doesNotMatch(JSON.stringify([ru,kz]), /журнал|обновлени|жаңарту|оценк/i);
});
test('invalid, empty or inverted lesson time never generates reminder', () => {
  assert.equal(parseLessonTime('09:45 - 10:00')?.end, 600);
  for (const value of ['bad', '25:00 - 26:00', '10:00 - 09:30']) assert.equal(parseLessonTime(value), null);
  assert.deepEqual(dueReminders({denominator:{mon:[item('Физика','bad')]}},monday(450)),[]);
});

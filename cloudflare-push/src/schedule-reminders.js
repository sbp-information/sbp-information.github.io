// Server-side reminders based solely on the saved SBP schedule, not the journal.
const TIME_ZONE = 'Asia/Almaty';
const WEEK_TYPES = new Set(['numerator', 'denominator']);
const SUBJECT_KZ = Object.freeze({
  'Физика': 'Физика', 'Математика': 'Математика', 'Химия': 'Химия',
  'Биология': 'Биология', 'География': 'География', 'Информатика': 'Информатика',
  'История Казахстана': 'Қазақстан тарихы', 'Всемирная история': 'Дүниежүзі тарихы',
  'Иностранный язык': 'Шет тілі', 'Русский язык': 'Орыс тілі',
  'Русская литература': 'Орыс әдебиеті',
  'Русский язык и литература': 'Орыс тілі мен әдебиеті',
  'Казахский язык и литература': 'Қазақ тілі мен әдебиеті',
  'Физическая культура': 'Дене шынықтыру',
  'Графика и проектирование': 'Графика және жобалау',
  'Глобальные компетенции': 'Жаһандық құзыреттер',
  'Классный час': 'Тәрбие сағаты', 'НВП': 'Алғашқы әскери дайындық'
});
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function kazakhstanClock(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const year = Number(values.year), month = Number(values.month), day = Number(values.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    date: [values.year, values.month, values.day].join('-'),
    weekday,
    dayKey: DAY_KEYS[weekday],
    minute: Number(values.hour) * 60 + Number(values.minute)
  };
}

// Parity is identical to PWA utils.js: Monday 2026-09-21 is denominator.
export function weekTypeForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const [year, month, day] = date.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const weekday = new Date(utc).getUTCDay();
  const monday = utc - ((weekday + 6) % 7) * 86400000;
  const baseline = Date.UTC(2026, 8, 21);
  const weeks = Math.round((monday - baseline) / (7 * 86400000));
  return Math.abs(weeks) % 2 === 0 ? 'denominator' : 'numerator';
}

export function parseLessonTime(value) {
  const match = String(value || '').match(/^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match) return null;
  const [h1, m1, h2, m2] = match.slice(1).map(Number);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;
  const start = h1 * 60 + m1, end = h2 * 60 + m2;
  return end > start
    ? { start, end, label: match[1].padStart(2, '0') + ':' + match[2] + '–' + match[3].padStart(2, '0') + ':' + match[4] }
    : null;
}
function pausedOn(schedule, date) {
  const pause = schedule?.pause;
  return pause?.enabled === true && typeof pause.startDate === 'string' &&
    typeof pause.endDate === 'string' && date >= pause.startDate && date <= pause.endDate;
}

export function activeLessons(schedule, clock) {
  if (!schedule || !clock || clock.weekday === 0 || clock.weekday === 6 ||
      pausedOn(schedule, clock.date)) return [];
  const parity = weekTypeForDate(clock.date);
  if (!WEEK_TYPES.has(parity)) return [];
  const override = schedule.dateOverrides?.[clock.date];
  const rows = override?.weekType === parity && Array.isArray(override.lessons)
    ? override.lessons : schedule[parity]?.[clock.dayKey];
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => ({ ...row, originalIndex: index, range: parseLessonTime(row?.time) }))
    .filter(row => !row.cancelled && row.range && String(row.subject || '').trim())
    .sort((a, b) => a.range.start - b.range.start || a.originalIndex - b.originalIndex);
}

export function dueReminders(schedule, clock) {
  const lessons = activeLessons(schedule, clock);
  if (!lessons.length) return [];
  const events = [];
  const first = lessons[0];
  // 07:30 on normal 08:00+ days. Earlier starts get a 30-minute warning instead.
  const morning = Math.min(7 * 60 + 30, first.range.start - 30);
  if (clock.minute === morning) {
    events.push({ key: 'lesson:' + clock.date + ':first', lesson: first, type: 'first' });
  }
  for (let index = 1; index < lessons.length; index++) {
    const previous = lessons[index - 1], current = lessons[index];
    if (clock.minute === previous.range.end - 1 && current.range.start >= previous.range.end) {
      events.push({
        key: 'lesson:' + clock.date + ':after:' + previous.originalIndex,
        lesson: current,
        type: 'next'
      });
    }
  }
  return events;
}

export function reminderPayload(device, event) {
  const kz = device.language === 'kz', lesson = event.lesson;
  let subject = String(lesson.subject || '').trim();
  let room = String(lesson.room || '').trim();
  if (kz) {
    subject = SUBJECT_KZ[subject] || subject;
    if (/^Каб\.\s*(.+)$/i.test(room)) room = room.replace(/^Каб\.\s*(.+)$/i, '$1-кабинет');
    else if (room === 'Улица') room = 'Дала';
    else if (room === 'Зал' || room === 'Спортзал') room = 'Спорт залы';
  }
  const title = event.type === 'first'
    ? (kz ? 'Бүгінгі бірінші сабақ' : 'Первая пара сегодня')
    : (kz ? 'Келесі сабақ' : 'Следующая пара');
  const body = [subject, room || (kz ? 'Кабинет көрсетілмеген' : 'Кабинет не указан'), lesson.range.label].join(' · ');
  return { key: event.key, kind: 'schedule', title, body: body.slice(0, 240) };
}
export function shouldCheckSchedule(clock) {
  return clock.weekday >= 1 && clock.weekday <= 5 &&
    clock.minute >= 6 * 60 && clock.minute <= 17 * 60;
}

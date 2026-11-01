// One reminder on the evening before the first day of a contiguous holiday block.
// This is an automatic reminder, not an admin's publication: every subscribed
// account (including the owner and the person who set the holiday) receives it.
const HOLIDAY_NOTICE_START = 18 * 60;
const HOLIDAY_NOTICE_END = HOLIDAY_NOTICE_START + 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const check = new Date(date + 'T12:00:00Z');
  return !Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === date;
}
function nextDate(date) {
  const day = new Date(date + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}
function isHoliday(schedule, date) {
  const pause = schedule?.pause;
  const entry = pause?.days?.[date];
  if (entry === 'holiday' || (entry && typeof entry === 'object' && entry.type === 'holiday')) return true;
  // Legacy period format is honored until edited, as with the lesson reminders.
  return !pause?.days && pause?.enabled === true && pause.type === 'holiday' &&
    validDate(pause.startDate) && validDate(pause.endDate) &&
    pause.startDate <= date && date <= pause.endDate;
}
export function dueHolidayNotices(schedule, clock) {
  if (!validDate(clock?.date) || !Number.isInteger(clock?.minute) ||
      clock.minute < HOLIDAY_NOTICE_START || clock.minute >= HOLIDAY_NOTICE_END) return [];
  const first = nextDate(clock.date);
  if (!isHoliday(schedule, first) || isHoliday(schedule, clock.date)) return [];
  let last = first;
  // Limit malformed or very long blocks without losing the initial reminder.
  for (let i = 0; i < 365; i++) {
    const following = nextDate(last);
    if (!isHoliday(schedule, following)) break;
    last = following;
  }
  return [{ key:'holiday:' + first + ':' + last, first, last }];
}
function formatDate(date, language) {
  const d = new Date(date + 'T12:00:00Z');
  return new Intl.DateTimeFormat(language === 'kz' ? 'kk-KZ' : 'ru-RU',
    { timeZone:'UTC', day:'numeric', month:'long', year:'numeric' }).format(d);
}
export function holidayNoticePayload(device, notice) {
  const kz = device.language === 'kz';
  const oneDay = notice.first === notice.last;
  const dates = oneDay ? formatDate(notice.first, device.language)
    : formatDate(notice.first, device.language) + ' – ' + formatDate(notice.last, device.language);
  return {
    key:notice.key,
    kind:'schedule',
    title:kz ? 'Ертең мереке басталады' : 'Завтра начинается праздник',
    body:kz ? dates + ' · сабақ болмайды' : dates + ' · занятий не будет'
  };
}

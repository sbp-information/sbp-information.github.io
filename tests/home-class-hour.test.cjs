'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
const preview = fs.readFileSync(require('node:path').join(__dirname, '..', 'home-overview.js'), 'utf8');

function select(entries, expanded = false) {
  const context = { entries, expanded, result: null };
  vm.runInNewContext(preview.replace(/^export /gm, '') +
    '\nresult = selectHomeOverviewEntries(entries, expanded, entry => !!entry.it.cancelled);', context);
  return context.result;
}
function card(it, pairNumber, lang = 'ru', state = 'next') {
  const first = app.indexOf('function renderHomeLessonCard(');
  const last = app.indexOf('function renderHomeBreakCard(', first);
  assert.ok(first >= 0 && last > first, 'Home card renderer is available');
  const source = app.slice(first, last);
  const entry = { it, index: it.isClassHour ? 0 : pairNumber, pairNumber };
  const context = {
    entry, state, output: '',
    currentLang: () => lang,
    getFloorFromRoom: () => 5,
    translateUI: value => lang === 'kz' && value === 'Классный час' ? 'Тәрбие сағаты' : value,
    homeLiveMetrics: () => ({ current: true, startSec: 8*3600, endSec: 8*3600+1800,
      remainingSec: 1200, elapsedSec: 600, durationSec: 1800, progress: 33.33 }),
    homeDurationLabel: value => value + ' сек'
  };
  vm.runInNewContext(source + '\noutput = renderHomeLessonCard(entry, state === "current" ? 490 : -1, state);', context);
  return context.output;
}

test('Home day selection includes class hours in both current and upcoming lessons', () => {
  const start = app.indexOf('function getLessonsForScheduleDate(');
  const end = app.indexOf('function getFloorFromRoom(', start);
  assert.ok(start > 0 && end > start);
  const helper = app.slice(start, end);
  assert.doesNotMatch(helper, /!item\.isClassHour/, 'class hours must not be excluded from next day checks');
  assert.match(helper, /item\.changeType !== 'cancel'/, 'cancellations are still excluded');
  const timelineStart = app.indexOf('function renderHomeDayTimeline()');
  const timelineEnd = app.indexOf('function updateHomeLiveProgress()', timelineStart);
  const timeline = app.slice(timelineStart, timelineEnd);
  assert.match(timeline, /const raw=source\[dayKey\]\|\|\[\]/);
  assert.doesNotMatch(timeline, /\.filter\(x=>!x\.isClassHour\)/);
  assert.match(timeline, /pairNumber:it\.isClassHour\?null:\+\+regularPairNumber/);
  assert.match(timeline, /renderHomeLessonCard\(entry/);
});

test('Class hour is visible without taking any of the four pair slots', () => {
  const entries = [
    { it: { subject: 'Классный час', isClassHour: true } },
    ...['Физика', 'Математика', 'История Казахстана', 'География', 'Биология']
      .map(subject => ({ it: { subject } }))
  ];
  const result = select(entries);
  assert.equal(result.visible.length, 5, 'class hour plus four normal pairs');
  assert.equal(result.visible[0].it.subject, 'Классный час');
  assert.equal(result.visible.at(-1).it.subject, 'География');
  assert.equal(result.hasMore, true);
  assert.equal(select(entries, true).visible.length, 6, 'expand restores the remaining pair');
});

test('Class hour number is КЧ / ТС, and first regular pair stays 1', () => {
  const lesson = { subject: 'Классный час', time: '08:00 - 08:30',
    room: 'Каб. 503', isClassHour: true };
  const ru = card(lesson, null);
  const kz = card(lesson, null, 'kz');
  assert.match(ru, /class="home-ref-lesson-card class-hour/);
  assert.match(ru, /class="home-ref-lesson-number"[^>]*>КЧ<\/div>/);
  assert.match(ru, /Классный час/);
  assert.match(kz, /class="home-ref-lesson-number"[^>]*>ТС<\/div>/);
  assert.match(kz, /aria-label="Тәрбие сағаты"/);
  const next = card({ subject:'Физика', time:'08:30 - 10:00', room:'Каб. 301' }, 1);
  assert.match(next, /class="home-ref-lesson-number">1<\/div>/);
  assert.doesNotMatch(next, /class-hour/);
});

test('Class hour can be highlighted as the current activity with progress', () => {
  const content = card({subject:'Классный час', time:'08:00 - 08:30',
    room:'Каб. 503', isClassHour:true},null,'ru','current');
  assert.match(content, /home-ref-lesson-card class-hour current/);
  assert.match(content, /data-live-lesson="1"/);
  assert.match(content, /data-live-progress/);
});

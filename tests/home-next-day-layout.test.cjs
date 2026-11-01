'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app.js');
const html=read('index.html');
const worker=read('notifications-sw.js');

test('next study day goes directly to lesson cards without an extra status strip',()=>{
  const start=app.indexOf('if(isNearestStudyDay){',app.indexOf('function renderHomeDayTimeline()'));
  const end=app.indexOf('    const mins=now.getHours()*60+',start);
  assert.ok(start>0&&end>start,'find nearest-day rendering');
  const nearest=app.slice(start,end);
  assert.match(nearest,/let html='';/,'upcoming day should begin without a duplicate status');
  assert.doesNotMatch(nearest,/renderHomeDayStatus\(/,'no top badge/stripe on next-day schedule');
  assert.match(nearest,/renderHomeLessonCard\(entry,-1,pos===0\?'next':''\)/,'first class remains marked upcoming');
  assert.match(nearest,/renderHomeBreakCard\(bi,pos===0\?'nearest':'normal',0\)/,'breaks must remain');
  assert.match(nearest,/box\.innerHTML=html/);
});
test('day heading with correct date and live current-day statuses are retained',()=>{
  assert.match(html, /id="home-reference-title"/);
  assert.match(html, /id="home-reference-date"/);
  assert.match(html, /id="home-day-timeline"/);
  assert.match(app, /renderHomeReferenceDate\(studyDate,isNearestStudyDay\)/);
  for(const mode of ['lesson','break','before'])
    assert.match(app,new RegExp("renderHomeDayStatus\\(\\{mode:'"+mode+"'"),'current-day status retained: '+mode);
  assert.match(app,/if\(pauseState\.active\)/,'vacation/maintenance logic retained');
});
test('the 19.27 release and offline PWA ship the updated app',()=>{
  assert.match(html,/step19\.32-push-coldstart-2026-11-01-v1/);
  assert.match(html,/app\.js\?v=20261101-push-coldstart-v1/);
  assert.match(worker,/app\.js\?v=20261101-push-coldstart-v1/);
  assert.match(worker,/sbp-shell-20261101-push-coldstart-v1/);
  const releases=read('release-data.js');
  const latest=releases.slice(releases.indexOf("version:'19.27'"),releases.indexOf("version:'19.26'"));
  assert.match(latest,/ru:\[/);assert.match(latest,/kz:\[/);
});

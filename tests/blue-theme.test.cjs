'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const css = read('brand-blue.css');
const html = read('index.html');
const worker = read('notifications-sw.js');
const releases = read('release-data.js');

test('the blue brand stylesheet is active in the page and offline PWA', () => {
  assert.match(html, /brand-blue\.css\?v=20261101-day-header-clean-v1/);
  assert.match(worker, /brand-blue\.css\?v=20261101-day-header-clean-v1/);
  assert.match(html, /step19\.28-day-header-clean-2026-11-01-v1/);
  assert.match(worker, /sbp-shell-20261101-day-header-clean-v1/);
});
test('notification, admin, schedule editor and support styling share blue tokens', () => {
  for (const selector of [
    '.notification-preference-row input',
    '.notification-setting-button:not(.primary)',
    '.notification-setting-button.primary',
    '#admin-settings-modal input.accent-indigo-600',
    '#admin-settings-modal :is(#admin-login,#admin-password):focus',
    '#support-active-thread.support-active-thread',
    '#support-staff-inbox .support-reply-label',
    '.schedule-editor-sheet .bg-indigo-50',
    '.schedule-editor-sheet :is(#schedule-editor-scope,.text-indigo-800)',
    '.schedule-pause-manage>span,.schedule-pause-editor-header>span'
  ]) assert.ok(css.includes(selector), 'missing blue override: ' + selector);
  assert.match(css, /--sbp-accent-text:#126a99/);
  assert.match(css, /--sbp-accent-text:#9bdeff/);
  assert.match(css, /--sbp-accent-solid:#126e9e/);
  assert.match(css, /--sbp-accent-solid:#65c7f2/);
});
test('status colours and lesson timing remain outside the brand change', () => {
  assert.doesNotMatch(css, /(?:attendance-status|journal-flat-status|schedule-pause-status|home-schedule-pause-card)/);
  const start = html.indexOf('html.sbp-app-launch #sbp-launch-animation{');
  const end = html.indexOf('html.sbp-app-launch #sbp-launch-animation::before', start);
  assert.ok(start !== -1 && end > start);
  const animation = html.slice(start,end);
  assert.doesNotMatch(animation, /#5d48cf|#7658e8|#667eea|rgba\(156,119,255|rgba\(115,86,231/);
});
test('the release notes describe the same fixes in Russian and Kazakh', () => {
  const top = releases.slice(releases.indexOf("version:'19.18'"), releases.indexOf("version:'19.17'"));
  assert.match(top, /type:'fix'/);
  assert.match(top, /ru:\[/);
  assert.match(top, /kz:\[/);
  assert.match(top, /Көгілдір безендіруді біріздендіру/);
  assert.match(top, /Согласование голубого оформления/);
});


test('upcoming home states are white outlined cards while live lessons keep their green status', () => {
  const start = css.indexOf('/* 19.22:');
  assert.ok(start > 0, 'white-card correction is present after older blue rules');
  const current = css.slice(start);
  const outline = current.match(/:root:root body\.sbp-redesign #view-home :is\(([\s\S]*?)\)\s*\{([\s\S]*?)\}/);
  assert.ok(outline, 'shared upcoming-card outline rule exists');
  for (const selector of [
    '.home-ref-lesson-card.next:not(.current)',
    '.home-ref-break-card.nearest',
    '.home-day-status.nearest',
    '.home-day-status.before'
  ]) assert.ok(outline[1].includes(selector), 'missing outlined state: ' + selector);
  assert.match(outline[2], /background:var\(--sbp-surface\)!important/);
  assert.match(outline[2], /background-image:none!important/);
  assert.match(outline[2], /border:1px solid #b9deef!important/);
  assert.doesNotMatch(outline[1], /\.home-ref-lesson-card\.current\b/);
  const number = current.match(/\.home-ref-lesson-card\.next:not\(\.current\) \.home-ref-lesson-number\s*\{([\s\S]*?)\}/);
  assert.ok(number, 'the first upcoming lesson number is also white');
  assert.match(number[1], /background:var\(--sbp-surface\)!important/);
  assert.match(number[1], /border:1px solid #b9deef!important/);
  assert.match(current, /data-sbp-theme="dark"/);
  assert.match(current, /border-color:#42677c!important/);
});
test('language toggle is white in the light theme and keeps dark-theme contrast', () => {
  const current = css.slice(css.indexOf('/* 19.22:'));
  const language = current.match(/:root:root body\.sbp-redesign > \.sbp-brandbar \.sbp-language,\s*:root:root body\.sbp-redesign > \.sbp-brandbar \.sbp-language #sbp-lang-switch\s*\{([\s\S]*?)\}/);
  assert.ok(language, 'language toggle surface rule exists');
  assert.match(language[1], /background:var\(--sbp-surface\)!important/);
  assert.match(language[1], /background-image:none!important/);
  assert.match(language[1], /color:var\(--sbp-ink\)!important/);
  assert.match(read('redesign.css'), /:root\[data-sbp-theme="dark"\][^\n]*--sbp-surface:#1b1e2a/);
});


test('all non-current breaks share the nearest break white and blue outline', () => {
  const section=css.slice(css.indexOf('/* 19.23:'));
  assert.ok(section.startsWith('/* 19.23:'),'latest border correction must be last');
  const rule=section.match(/#view-home \.home-ref-break-card:not\(\.current\)\s*\{([\s\S]*?)\}/);
  assert.ok(rule,'generic break rule must include nearest and normal breaks');
  assert.match(rule[1], /background:var\(--sbp-surface\)!important/);
  assert.match(rule[1], /background-image:none!important/);
  assert.match(rule[1], /border:1px solid #b9deef!important/);
  assert.match(rule[1], /border-radius:12px!important/);
  const oldNearest=css.match(/#view-home :is\(([\s\S]*?)\)\s*\{[\s\S]*?border:1px solid #b9deef!important/);
  assert.ok(oldNearest?.[1]?.includes('.home-ref-break-card.nearest'));
  const responsive=read('responsive-fit.css');
  assert.match(responsive, /#view-home \.home-ref-break-card\.current\s*\{[\s\S]*?border:1px solid #efd7a2!important/);
  assert.match(section, /data-sbp-theme="dark"/);
  assert.match(section, /border-color:#42677c!important/);
});
test('first and other lesson numbers have matching thin outlines, preserving live green', () => {
  const section=css.slice(css.indexOf('/* 19.23:'));
  const normal=section.match(/#view-home \.home-ref-lesson-card:not\(\.current\):not\(\.cancelled\) \.home-ref-lesson-number\s*\{([\s\S]*?)\}/);
  const current=section.match(/#view-home \.home-ref-lesson-card\.current \.home-ref-lesson-number\s*\{([\s\S]*?)\}/);
  assert.ok(normal,'all ordinary lesson numbers, including the first, share an outline');
  assert.ok(current,'live first lesson also needs an outline');
  assert.match(normal[1], /background:var\(--sbp-surface\)!important/);
  assert.match(normal[1], /border:1px solid #b9deef!important/);
  assert.match(current[1], /border:1px solid var\(--sbp-green-line\)!important/);
  assert.match(normal[0], /:not\(\.cancelled\)/);
  assert.match(read('style.css'), /#view-home \.home-ref-lesson-card\.current \.home-ref-lesson-number\s*\{\s*background:#dff7e8!important/);
});


test('Home day schedule has an actual rounded container with safe inner spacing', () => {
  const section=css.slice(css.indexOf('/* 19.24:'));
  assert.ok(section.startsWith('/* 19.24:'),'latest rounding rule should override old square edges');
  const block=section.match(/#view-home \.home-ref-today\s*\{([\s\S]*?)\}/);
  assert.ok(block,'the complete day schedule should be rounded, not just lessons');
  assert.match(block[1], /border:1px solid var\(--sbp-line\)!important/);
  assert.match(block[1], /border-radius:18px!important/);
  assert.match(block[1], /background:var\(--sbp-surface\)!important/);
  assert.match(block[1], /overflow:hidden!important/);
  assert.match(block[1], /padding:8px 10px 10px!important/);
  const head=section.match(/#view-home \.home-ref-today > \.home-ref-today-head\s*\{([\s\S]*?)\}/);
  const list=section.match(/#view-home \.home-ref-today > #home-day-timeline\s*\{([\s\S]*?)\}/);
  assert.match(head?.[1]||'',/padding:0 2px 9px!important/);
  assert.match(list?.[1]||'',/padding:0 2px 2px!important/);
  assert.match(read('redesign.css'),/#view-home \.home-ref-today \{ border:0!important;border-radius:0!important/);
  assert.match(read('release-data.js'),/version:'19\.24',date:'2026-11-01'/);
});

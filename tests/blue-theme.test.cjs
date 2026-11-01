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
  assert.match(html, /brand-blue\.css\?v=20261101-all-blue-v1/);
  assert.match(worker, /brand-blue\.css\?v=20261101-all-blue-v1/);
  assert.match(html, /step19\.19-all-blue-2026-11-01-v1/);
  assert.match(worker, /sbp-shell-20261101-all-blue-v1/);
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

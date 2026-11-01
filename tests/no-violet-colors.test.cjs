'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sources = [
  ...fs.readdirSync(root).filter(name => name.endsWith('.css')),
  'index.html', 'app.js', 'group-tools.js', 'college-illustration.svg'
];
function violet(rgb) {
  const values = rgb.map(value => value / 255);
  const high = Math.max(...values), low = Math.min(...values);
  const delta = high - low;
  if (delta < 0.014) return false; // detect near-white lavender, not just saturated purple
  const [r, g, b] = values;
  const rawHue = high === r ? 60 * (((g - b) / delta) % 6)
    : high === g ? 60 * ((b - r) / delta + 2)
    : 60 * ((r - g) / delta + 4);
  const hue = (rawHue + 360) % 360;
  return hue >= 236 && hue <= 327;
}
function fromHex(hex) {
  let value = hex.slice(1);
  if (value.length === 8) value = value.slice(0, 6);
  if (value.length === 3) value = [...value].map(ch => ch + ch).join('');
  return value.match(/../g).map(part => parseInt(part, 16));
}
test('user-facing CSS, illustrations and shared images use no violet/indigo RGB colours', () => {
  const errors = [];
  for (const name of sources) {
    const content = fs.readFileSync(path.join(root, name), 'utf8');
    for (const match of content.matchAll(/#(?:[a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{3})(?![a-f0-9])/gi)) {
      if (violet(fromHex(match[0]))) errors.push(name + ' ' + match[0]);
    }
    for (const match of content.matchAll(/\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
      if (violet([Number(match[1]), Number(match[2]), Number(match[3])])) {
        errors.push(name + ' rgb(' + match.slice(1, 4).join(',') + ')');
      }
    }
    if (/\b(?:color|background|border-color|fill|stroke)\s*:\s*(?:purple|violet|indigo|rebeccapurple)\b/i.test(content)) {
      errors.push(name + ' has a named violet CSS colour');
    }
  }
  assert.deepEqual(errors, [], 'remaining violet colours must be replaced');
});
test('19.20 RU/KZ release and offline PWA expose the same blue revision', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'notifications-sw.js'), 'utf8');
  const releases = fs.readFileSync(path.join(root, 'release-data.js'), 'utf8');
  const redesign = fs.readFileSync(path.join(root, 'redesign.js'), 'utf8');
  assert.match(html, /step19\.29-css-bundle-2026-11-01-v1/);
  assert.match(sw, /sbp-shell-20261101-css-bundle-v1/);
  assert.match(redesign, /college-illustration\.svg\?v=20261101-no-violet-v1/);
  assert.match(sw, /college-illustration\.svg\?v=20261101-no-violet-v1/);
  const current = releases.slice(releases.indexOf("version:'19.20'"), releases.indexOf("version:'19.19'"));
  assert.match(current, /ru:\[/);
  assert.match(current, /kz:\[/);
  assert.match(current, /type:'fix'/);
});

test('update button, nearest lesson, lesson numbers, beta and menu hover use solid blue', () => {
  const blue = fs.readFileSync(path.join(root, 'brand-blue.css'), 'utf8');
  for (const selector of [
    '#app-update-now',
    '#menu-update-button:not(:disabled) > i',
    '.native-app-update-actions .update-primary',
    '.drawer-beta-head span',
    '.drawer-beta-card',
    '.drawer-nav-section > button:is(:hover,:focus-visible,.active,[aria-current="page"])',
    '.home-ref-lesson-card.next:not(.current)',
    '.home-ref-lesson-card:not(.current) .home-ref-lesson-number',
    '.home-ref-break-card.nearest'
  ]) assert.ok(blue.includes(selector), 'solid blue rule missing: ' + selector);
  assert.match(blue, /background-image:none!important/);
  assert.match(blue, /data-sbp-theme="dark"/);
});

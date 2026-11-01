'use strict';
// Simulates Service Worker push events with no open site tabs.
// This verifies our app code; it cannot test an actual Android OS push provider.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'notifications-sw.js'), 'utf8');
const scope = 'https://sbp-information.github.io/';

function fixture(openClients = []) {
  const events = new Map();
  const displayed = [];
  const opened = [];
  const registration = {
    scope,
    async showNotification(title, options) {
      displayed.push({ title, options });
    }
  };
  const self = {
    registration,
    clients: {
      async matchAll() { return openClients; },
      async openWindow(url) { opened.push(url); return { url }; }
    },
    addEventListener(name, callback) { events.set(name, callback); },
    skipWaiting() {}
  };
  vm.runInNewContext(script, { self, URL, setTimeout, console }, { filename: 'notifications-sw.js' });
  async function send(name, fields = {}) {
    let promise;
    assert.ok(events.has(name), 'worker must register ' + name);
    events.get(name)({
      ...fields,
      waitUntil(result) { promise = Promise.resolve(result); }
    });
    assert.ok(promise, name + ' must keep the service worker alive using waitUntil');
    await promise;
  }
  return { send, displayed, opened };
}

test('push while the PWA has no open clients still shows an OS notification', async () => {
  const worker = fixture([]);
  await worker.send('push', {
    data: { json: () => ({
      key: 'lesson:2026-11-02:first', kind: 'schedule',
      title: 'Первая пара сегодня', body: 'Физика · Каб. 301 · 08:00–09:30'
    }) }
  });
  assert.equal(worker.displayed.length, 1);
  const notice = worker.displayed[0];
  assert.equal(notice.title, 'Первая пара сегодня');
  assert.equal(notice.options.body, 'Физика · Каб. 301 · 08:00–09:30');
  assert.equal(notice.options.icon, './sbp-icon-192.png');
  assert.equal(notice.options.data.kind, 'schedule');
  assert.equal(notice.options.tag, 'lesson:2026-11-02:first');
});

test('notification click with closed PWA opens the correct section', async () => {
  for (const [kind, section] of [['schedule','schedule'],['support','support'],['events','events']]) {
    const worker = fixture([]);
    let closed = false;
    await worker.send('notificationclick', {
      notification: { data: { kind, threadId: kind === 'support' ? 'thread-12' : '' }, close() { closed = true; } }
    });
    assert.equal(closed, true);
    assert.equal(worker.opened.length, 1);
    const url = new URL(worker.opened[0]);
    assert.equal(url.origin, 'https://sbp-information.github.io');
    assert.equal(url.searchParams.get('notification'), section);
    if (kind === 'support') assert.equal(url.searchParams.get('thread'), 'thread-12');
  }
});

test('notification click focuses an existing PWA window without opening a duplicate', async () => {
  let focused = 0;
  const posted = [];
  const client = {
    url: scope,
    async focus() { focused++; },
    postMessage(data) { posted.push(data); }
  };
  const worker = fixture([client]);
  await worker.send('notificationclick', {
    notification: { data: { kind: 'support', threadId: 'private-12' }, close() {} }
  });
  assert.equal(focused, 1);
  assert.equal(worker.opened.length, 0);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, 'notification-open');
  assert.equal(posted[0].threadId, 'private-12');
});

test('malformed push payload falls back safely to a generic notice', async () => {
  const worker = fixture([]);
  await worker.send('push', { data: { json: () => { throw new Error('invalid JSON'); } } });
  assert.equal(worker.displayed.length, 1);
  assert.equal(worker.displayed[0].title, 'SBP Information');
});

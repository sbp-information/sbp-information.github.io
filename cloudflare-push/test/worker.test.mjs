import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { testing } from '../src/index.js';

const subscription = endpoint => ({
  endpoint,
  keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) }
});

test('restrict push subscription endpoints to genuine vendor hosts', () => {
  for (const host of [
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc'
  ]) assert.equal(testing.validSubscription(subscription(host)), true);
  for (const host of [
    'http://fcm.googleapis.com/abc',
    'https://169.254.169.254/abc',
    'https://fcm.googleapis.com.evil.example/abc',
    'https://evil.example/abc',
    'https://user:pass@fcm.googleapis.com/abc',
    'https://fcm.googleapis.com:444/abc'
  ]) assert.equal(testing.validSubscription(subscription(host)), false);
  assert.equal(testing.validSubscription({ endpoint: 'https://fcm.googleapis.com', keys: {} }), false);
});

test('only owner or staff explicitly permitted for support qualify', () => {
  assert.equal(testing.staffAllowed('owner.toe2691@example.com', {}), true);
  assert.equal(testing.staffAllowed('admin1.toe2691@example.com', { admin1: { support: true } }), true);
  assert.equal(testing.staffAllowed('admin1.toe2691@example.com', { admin1: { support: false } }), false);
  assert.equal(testing.staffAllowed('admin2.toe2691@example.com', { admin1: { support: true } }), false);
  assert.equal(testing.staffAllowed('anonymous@example.com', {}), false);
});

test('Firestore REST mapping extracts private data without exposing it as a notification payload', () => {
  const doc = testing.decodeDocument({
    name: 'projects/p/databases/(default)/documents/toe_group/shared/support/user-1',
    fields: {
      updatedAt: { stringValue: '2026-11-01T10:00:00.000Z' },
      messages: { arrayValue: { values: [{ mapValue: { fields: {
        role: { stringValue: 'visitor' },
        text: { stringValue: 'private' }
      } } }] } }
    }
  });
  assert.equal(doc.id, 'user-1');
  assert.deepEqual(doc.messages, [{ role: 'visitor', text: 'private' }]);
});

test('worker rejects cross-origin callers and unauthenticated registration', async () => {
  const cors = await worker.fetch(new Request('https://worker.example/config', {
    headers: { origin: 'https://evil.example' }
  }), {});
  assert.equal(cors.status, 403);
  const unauthorized = await worker.fetch(new Request('https://worker.example/register', {
    method: 'POST', headers: { origin: 'https://sbp-information.github.io', 'content-type': 'application/json' },
    body: JSON.stringify({ subscription: subscription('https://fcm.googleapis.com/fcm/send/test') })
  }), {});
  assert.equal(unauthorized.status, 401);
});

test('CORS preflight is a valid empty response and config exposes no secret', async () => {
  const preflight = await worker.fetch(new Request('https://worker.example/register', {
    method: 'OPTIONS', headers: { origin: 'https://sbp-information.github.io' }
  }), {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://sbp-information.github.io');
  assert.equal(await preflight.text(), '');
  const response = await worker.fetch(new Request('https://worker.example/config'), {
    DB: {}, VAPID_PUBLIC_KEY: 'test-public', VAPID_PRIVATE_KEY: 'test-private'
  });
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.deepEqual(config, { vapidPublicKey: 'test-public' });
  assert.equal(JSON.stringify(config).includes('test-private'), false);
});

test('notification delivery queries do not stop at 40 registered devices', async () => {
  const rows = Array.from({ length:65 }, (_, i) => ({ id:'device-' + i, uid:'user-' + i }));
  const statements = [];
  const env = { DB: { prepare(sql) {
    statements.push(sql);
    return { bind(uid) { this.uid=uid; return this; }, async all() {
      const matches = this.uid ? rows.filter(row => row.uid === this.uid) : rows;
      const limit = /LIMIT\\s+(\\d+)/i.exec(sql);
      return { results: limit ? matches.slice(0, Number(limit[1])) : matches };
    } };
  } } };
  assert.equal((await testing.deviceRows(env)).length, 65);
  assert.equal((await testing.deviceRows(env, 'user-42'))[0].id, 'device-42');
  assert.ok(statements.every(sql => !/\\bLIMIT\\s+40\\b/i.test(sql)));
});

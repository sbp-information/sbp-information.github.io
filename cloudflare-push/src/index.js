// SBP Information: Cloudflare Workers Free + D1 + Firebase Spark Web Push.
// Private support messages are never included in the push payload.
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { kazakhstanClock, dueReminders, reminderPayload, shouldCheckSchedule } from './schedule-reminders.js';

const PROJECT_ID = 'sbpgroup-toe-26-9-1';
const COLLECTION_ROOT = 'toe_group/shared';
const WINDOW_MS = 25 * 60 * 1000;
const ALLOWED_ORIGINS = new Set([
  'https://sbp-information.github.io',
  'https://sinevbogdan100-jpg.github.io',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
]);
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/' +
  PROJECT_ID + '/databases/(default)/documents';
let oauthCache = null;
let jwksCache = null;

function reply(value, status = 200, origin = '') {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'vary': 'Origin' };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    headers['access-control-allow-headers'] = 'Authorization, Content-Type';
  }
  return new Response(status === 204 ? null : JSON.stringify(value), { status, headers });
}
function error(message, status = 400) {
  const result = new Error(message);
  result.status = status;
  return result;
}
function b64url(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < array.length; i++) binary += String.fromCharCode(array[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function unbase64(value) {
  const base64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}
function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(unbase64(part)));
}
async function hash(value) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}
function validSubscription(value) {
  if (!value || typeof value !== 'object') return false;
  try {
    const url = new URL(value.endpoint);
    const host = url.hostname;
    const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.services.mozilla.com') || host === 'web.push.apple.com' ||
      host.endsWith('.notify.windows.com');
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      allowed && value.endpoint.length < 4096 &&
      /^[A-Za-z0-9_-]{80,100}$/.test(value.keys?.p256dh || '') &&
      /^[A-Za-z0-9_-]{20,30}$/.test(value.keys?.auth || '');
  } catch (_) { return false; }
}
function parseFirestore(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFirestore);
  if ('mapValue' in field) return Object.fromEntries(
    Object.entries(field.mapValue.fields || {}).map(([key, val]) => [key, parseFirestore(val)])
  );
  return null;
}
function decodeDocument(document) {
  if (!document) return null;
  const fields = Object.fromEntries(Object.entries(document.fields || {}).map(([k,v]) => [k, parseFirestore(v)]));
  return { id: document.name?.split('/').at(-1) || '', ...fields };
}
async function firebaseUser(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 10000) throw error('Invalid Firebase token', 401);
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      claims.aud !== PROJECT_ID || claims.iss !== 'https://securetoken.google.com/' + PROJECT_ID ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now) throw error('Invalid Firebase session', 401);
  if (!jwksCache || jwksCache.expires < now) {
    const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if (!res.ok) throw error('Firebase verification unavailable', 503);
    jwksCache = { data: await res.json(), expires: now + 1800 };
  }
  const jwk = jwksCache.data.keys?.find(item => item.kid === header.kid);
  if (!jwk) { jwksCache = null; throw error('Unknown Firebase signing key', 401); }
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, unbase64(parts[2]), signed);
  if (!verified) throw error('Invalid Firebase signature', 401);
  return { uid: claims.sub, email: claims.email || '' };
}
async function authorize(request) {
  const match = /^Bearer (.+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) throw error('Firebase login required', 401);
  return firebaseUser(match[1]);
}
async function googleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (oauthCache && oauthCache.expires > now + 90) return oauthCache.token;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (account.project_id !== PROJECT_ID || !account.private_key || !account.client_email) {
    throw error('Firebase service account is not configured', 503);
  }
  const keyBase64 = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8', unbase64(keyBase64), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const jwtHeader = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const jwtBody = b64url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })));
  const signed = jwtHeader + '.' + jwtBody;
  const signature = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signed)));
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signed + '.' + signature
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form
  });
  if (!response.ok) throw error('Firebase service account was rejected', 503);
  const data = await response.json();
  oauthCache = { token: data.access_token, expires: now + (data.expires_in || 3600) };
  return oauthCache.token;
}
async function firestore(env, suffix, init = {}) {
  const token = await googleAccessToken(env);
  const result = await fetch(FIRESTORE_BASE + suffix, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!result.ok) {
    if (result.status === 404) return null;
    throw error('Firebase read failed (' + result.status + ')', 502);
  }
  return result.json();
}
async function readOne(env, collectionId, id) {
  if (!validId(id)) throw error('Invalid document identifier');
  return decodeDocument(await firestore(env, '/' + COLLECTION_ROOT + '/' + collectionId + '/' + encodeURIComponent(id)));
}
async function readRecent(env, collectionId, field) {
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  const data = await firestore(env, '/' + COLLECTION_ROOT + ':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: cutoff } } },
        orderBy: [{ field: { fieldPath: field }, direction: 'DESCENDING' }],
        limit: 25
      }
    })
  });
  return (Array.isArray(data) ? data : []).filter(item => item.document).map(item => decodeDocument(item.document));
}
function recent(value) {
  const when = Date.parse(value || '');
  return Number.isFinite(when) && when > Date.now() - WINDOW_MS && when <= Date.now() + 60000;
}
function staffAllowed(email, permissions) {
  if (email === 'owner.toe2691@example.com') return true;
  if (email === 'admin1.toe2691@example.com') return permissions.admin1?.support === true;
  if (email === 'admin2.toe2691@example.com') return permissions.admin2?.support === true;
  return false;
}
async function supportPermissions(env) {
  return (await readOne(env, 'access', 'admin_permissions')) || {};
}
async function deviceRows(env, uid = null) {
  const stmt = uid
    ? env.DB.prepare('SELECT * FROM devices WHERE uid = ? LIMIT 40').bind(uid)
    : env.DB.prepare('SELECT * FROM devices LIMIT 40');
  return (await stmt.all()).results || [];
}
function notificationPayload(device, item, key) {
  const kz = device.language === 'kz';
  const isChange = item.type === 'schedule_change';
  const title = isChange
    ? (kz ? item.titleKz || item.title : item.title)
    : (kz ? 'Жаңа хабарландыру' : 'Новое объявление');
  const body = isChange ? (kz ? item.textKz || item.text : item.text)
    : (kz ? item.titleKz || item.title : item.title);
  return { key, kind: 'events', title: String(title || 'SBP Information').slice(0, 120),
    body: String(body || '').slice(0, 200) };
}
function supportPayload(device, item, key, staff) {
  const kz = device.language === 'kz';
  return { key, kind: 'support', threadId: staff ? item.id : '',
    title: staff ? (kz ? 'Қолдауға жаңа өтініш' : 'Новое обращение в поддержку')
      : (kz ? 'Қолдаудың жаңа жауабы' : 'Новый ответ поддержки'),
    body: kz ? 'Хабарламаны оқу үшін қолдауды ашыңыз' : 'Откройте поддержку, чтобы прочитать сообщение' };
}
async function deliver(env, devices, key, build) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY || !env.VAPID_SUBJECT) {
    throw error('VAPID keys are not configured', 503);
  }
  const vapid = { privateKey: env.VAPID_PRIVATE_KEY, publicKey: env.VAPID_PUBLIC_KEY, subject: env.VAPID_SUBJECT };
  let sent = 0;
  // Sequential sending keeps CPU/subrequest use predictable on the free tier.
  for (const device of devices) {
    const receipt = await hash(key + ':' + device.id);
    const reserved = await env.DB.prepare(
      'INSERT OR IGNORE INTO deliveries (id, created_at) VALUES (?, ?)'
    ).bind(receipt, Date.now()).run();
    if ((reserved.meta?.changes || 0) === 0) continue;
    try {
      const subscription = { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } };
      if (!validSubscription(subscription)) throw error('Stored device is invalid');
      const payload = await buildPushPayload(
        { data: JSON.stringify(build(device)), options: { ttl: 86400 } }, subscription, vapid
      );
      const response = await fetch(device.endpoint, payload);
      if (!response.ok) {
        if ([404, 410].includes(response.status)) {
          await env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(device.id).run();
          continue;
        }
        throw error('Push provider returned HTTP ' + response.status, 502);
      }
      sent++;
    } catch (reason) {
      await env.DB.prepare('DELETE FROM deliveries WHERE id = ?').bind(receipt).run();
      console.warn('Push delivery failed: ', reason?.message || 'unknown error');
    }
  }
  return sent;
}
async function sendAnnouncement(env, item) {
  if (!item || !recent(item.createdAt)) return 0;
  const devices = (await deviceRows(env)).filter(device => device.uid !== item.authorUid);
  return deliver(env, devices, 'event:' + item.id,
    device => notificationPayload(device, item, 'event:' + item.id));
}
async function sendSupport(env, item) {
  if (!item || !recent(item.updatedAt) || !Array.isArray(item.messages)) return 0;
  const permissions = await supportPermissions(env);
  const devices = await deviceRows(env);
  const messages = item.messages.slice(-12);
  let sent = 0;
  for (const message of messages) {
    if (!recent(message.at) || !['visitor','staff'].includes(message.role) || !validId(message.id)) continue;
    const key = 'support:' + item.id + ':' + message.id;
    const toStaff = message.role === 'visitor';
    const recipients = devices.filter(device => device.uid !== message.senderUid &&
      (toStaff ? staffAllowed(device.email, permissions) : device.uid === item.id));
    sent += await deliver(env, recipients, key, device => supportPayload(device, item, key, toStaff));
  }
  return sent;
}
async function sendScheduleReminders(env, clock) {
  // Read the one authoritative Firestore schedule immediately before sending.
  // This includes current bell times, cancellations, per-date changes and pauses.
  if (!shouldCheckSchedule(clock)) return 0;
  const schedule = await readOne(env, 'schedule', 'main');
  if (!schedule) return 0;
  const reminders = dueReminders(schedule, clock);
  if (!reminders.length) return 0;
  const devices = await deviceRows(env);
  let sent = 0;
  for (const reminder of reminders) {
    sent += await deliver(env, devices, reminder.key, device => reminderPayload(device, reminder));
  }
  return sent;
}

async function scheduled(env, triggerTime = Date.now()) {
  const clock = kazakhstanClock(new Date(triggerTime));
  const tooLate = Date.now() - triggerTime > 120000;
  // Lesson timings need a one-minute clock. Existing announcement/support
  // polling remains at two-minute intervals to control free-tier usage.
  if (!tooLate) try { await sendScheduleReminders(env, clock); }
  catch (err) { console.error('Lesson reminder delivery failed:', err?.message || 'unknown'); }

  if (clock.minute % 2 === 0) {
    const [notifications, threads] = await Promise.all([
      readRecent(env, 'notifications', 'createdAt'),
      readRecent(env, 'support', 'updatedAt')
    ]);
    for (const notification of notifications.slice(0, 12)) await sendAnnouncement(env, notification);
    for (const thread of threads.slice(0, 12)) await sendSupport(env, thread);
    await env.DB.prepare('DELETE FROM deliveries WHERE created_at < ?')
      .bind(Date.now() - 30 * 86400000).run();
  }
}
async function requestJson(request) {
  if (Number(request.headers.get('content-length') || 0) > 12000) throw error('Request is too large', 413);
  let data;
  try { data = await request.json(); } catch (_) { throw error('Invalid JSON'); }
  if (!data || typeof data !== 'object') throw error('Invalid JSON');
  return data;
}
async function fetchHandler(request, env) {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return reply({}, ALLOWED_ORIGINS.has(origin) ? 204 : 403, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply({ error: 'Origin not allowed' }, 403);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/health') {
    return reply({ service: 'SBP Information Push', configured: !!(env.DB && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.FIREBASE_SERVICE_ACCOUNT_JSON) }, 200, origin);
  }
  if (request.method === 'GET' && url.pathname === '/config') {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.DB) return reply({ error: 'Not configured' }, 503, origin);
    return reply({ vapidPublicKey: env.VAPID_PUBLIC_KEY }, 200, origin);
  }
  if (request.method !== 'POST') return reply({ error: 'Not found' }, 404, origin);
  try {
    const user = await authorize(request);
    const data = await requestJson(request);
    if (url.pathname === '/register') {
      if (!validSubscription(data.subscription)) throw error('Invalid subscription');
      const sub = data.subscription;
      const id = await hash(sub.endpoint);
      await env.DB.prepare(
        'INSERT INTO devices (id, uid, email, endpoint, p256dh, auth, language, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET uid=excluded.uid, email=excluded.email, endpoint=excluded.endpoint, ' +
        'p256dh=excluded.p256dh, auth=excluded.auth, language=excluded.language, updated_at=excluded.updated_at'
      ).bind(id, user.uid, user.email, sub.endpoint, sub.keys.p256dh, sub.keys.auth, data.language === 'kz' ? 'kz' : 'ru', Date.now()).run();
      return reply({ registered: true }, 200, origin);
    }
    if (url.pathname === '/unregister') {
      if (typeof data.endpoint !== 'string' || data.endpoint.length > 4096) throw error('Invalid endpoint');
      await env.DB.prepare('DELETE FROM devices WHERE id = ? AND uid = ?').bind(await hash(data.endpoint), user.uid).run();
      return reply({ removed: true }, 200, origin);
    }
    if (url.pathname === '/dispatch') {
      if (!validId(data.id)) throw error('Invalid event identifier');
      if (data.kind === 'announcement') {
        const doc = await readOne(env, 'notifications', data.id);
        if (!doc || doc.authorUid !== user.uid) throw error('Not allowed', 403);
        const sent = await sendAnnouncement(env, doc);
        return reply({ accepted: true, sent }, 200, origin);
      }
      if (data.kind === 'support') {
        const permissions = await supportPermissions(env);
        if (data.id !== user.uid && !staffAllowed(user.email, permissions)) throw error('Not allowed', 403);
        const doc = await readOne(env, 'support', data.id);
        const sent = await sendSupport(env, doc);
        return reply({ accepted: true, sent }, 200, origin);
      }
      throw error('Invalid event type');
    }
    return reply({ error: 'Not found' }, 404, origin);
  } catch (e) {
    console.warn('Push request rejected: ' + (e?.message || 'unknown'));
    return reply({ error: e.status && e.status < 500 ? e.message : 'Temporary push service error' }, e.status || 503, origin);
  }
}
export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduled(env, event?.scheduledTime || Date.now())
      .catch(e => console.error('Scheduled push failed:', e?.message || 'unknown')));
  }
};

// Pure helpers exposed for unit tests (not HTTP routes).
export const testing = { validSubscription, parseFirestore, decodeDocument, staffAllowed, recent };

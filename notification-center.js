import { PUSH_WORKER_URL } from './push-worker-config.js?v=20261101-cloudflare-push-v1';

const SOUND_KEY = 'toe_notification_sound_v1';
const DEVICE_KEY = 'toe_device_notifications_v1';
const DELIVERY_KEY = 'toe_notification_deliveries_v1';

export function createNotificationCenter({ getCloud, translate, toast, open }) {
  let audio, registration, configuration, registeredContext = '', busy = false;
  let statusOverride = '';
  let audioUnlockedByGesture = false;
  const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const soundEnabled = () => read(SOUND_KEY) === '1';
  const deviceEnabled = () => read(DEVICE_KEY) === '1';
  const context = () => getCloud().auth?.currentUser?.uid || '';
  const supported = () => window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator;
  const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function render() {
    const sound = document.getElementById('notification-sound-toggle');
    if (sound) sound.checked = soundEnabled();
    const enable = document.getElementById('notification-device-enable');
    const disable = document.getElementById('notification-device-disable');
    const active = supported() && Notification.permission === 'granted' && deviceEnabled();
    if (enable) { enable.disabled = busy || !supported(); enable.hidden = active; }
    if (disable) { disable.disabled = busy; disable.hidden = !active; }
    let text = 'Уведомления на устройство выключены';
    if (ios() && !installed()) text = 'На iPhone добавьте сайт на экран «Домой» и откройте его оттуда';
    else if (!supported()) text = 'Этот браузер не поддерживает уведомления на устройство';
    else if (Notification.permission === 'denied') text = 'Уведомления заблокированы. Разрешите их в настройках браузера';
    else if (active) text = registeredContext === context() && registeredContext
      ? 'Включены, в том числе при закрытом сайте'
      : 'Включены, пока сайт открыт. Доставка при закрытом сайте ещё не подключена';
    const status = document.getElementById('notification-device-status');
    if (status) status.textContent = translate(statusOverride || text);
  }

  async function unlockAudio(fromUserGesture = false) {
    if (!soundEnabled()) return;
    if (fromUserGesture) audioUnlockedByGesture = true;
    if (!audioUnlockedByGesture) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      if (audio.state === 'suspended') await audio.resume();
    } catch (_) {}
  }

  async function chime() {
    if (!soundEnabled() || !audioUnlockedByGesture) return;
    await unlockAudio(false);
    if (!audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = now + index * 0.14;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + 0.25);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  async function worker() {
    if (registration) return registration;
    registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration) {
      registration = await navigator.serviceWorker.register('./notifications-sw.js', { scope: './', updateViaCache: 'none' });
    }
    await navigator.serviceWorker.ready;
    return registration;
  }

  const pushEndpoint = typeof PUSH_WORKER_URL === 'string' ? PUSH_WORKER_URL.replace(/\/+$/, '') : '';
  async function pushRequest(path, data = undefined) {
    if (!pushEndpoint || !/^https:\/\/[a-z0-9.-]+$/i.test(pushEndpoint)) throw new Error('push-worker-not-configured');
    const headers = { 'content-type': 'application/json' };
    if (data !== undefined) {
      const user = getCloud().auth?.currentUser;
      if (!user) throw new Error('firebase-login-required');
      headers.authorization = 'Bearer ' + await user.getIdToken();
    }
    const response = await fetch(pushEndpoint + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('push-worker-http-' + response.status);
    return response.json();
  }
  async function requestPush(path, functionName, data) {
    return pushEndpoint ? pushRequest(path, data) : getCloud().callFunction(functionName, data);
  }
  async function dispatch(kind, id) {
    if (!pushEndpoint || !context() || !id) return false;
    try {
      await pushRequest('/dispatch', { kind, id });
      return true;
    } catch (error) {
      // Firestore already saved the change; cron delivery will retry.
      console.warn('Instant push dispatch deferred to scheduled delivery', error?.message || error);
      return false;
    }
  }

  // Keep push registration tied to the authenticated Firebase account.
  const language = () => getCloud().language?.() === 'kz' ? 'kz' : 'ru';
  const vapidBytes = key => {
    const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  };
  async function registerDevice() {
    const cloud = getCloud();
    if (!cloud.auth?.currentUser || !cloud.callFunction) return false;
    const uid = cloud.auth.currentUser.uid;
    const settings = await requestPush('/config', 'getPushConfiguration');
    if (!settings?.vapidPublicKey) throw new Error('push-configuration-missing');
    const sw = await worker();
    let subscription = await sw.pushManager.getSubscription();
    if (!subscription) subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: vapidBytes(settings.vapidPublicKey)
    });
    try {
      await requestPush('/register', 'registerPushDevice', { subscription: subscription.toJSON(), language: language() });
    } catch (error) {
      // Never leave a newly created subscription silently marked as registered.
      console.warn('Push device registration failed', error);
      throw error;
    }
    if (context() !== uid) return false;
    registeredContext = uid;
    configuration = settings;
    return true;
  }
  async function refreshAccount() {
    registeredContext = '';
    configuration = null;
    if (supported() && deviceEnabled() && Notification.permission === 'granted' && context()) {
      try {
        await registerDevice();
        statusOverride = '';
      } catch (_) {
        statusOverride = 'Уведомления разрешены. Фоновая доставка пока недоступна';
      }
    } else statusOverride = '';
    render();
  }
  async function detach() {
    const previousContext = registeredContext;
    registeredContext = '';
    configuration = null;
    if (!supported()) return;
    try {
      const sw = await worker();
      const subscription = await sw.pushManager?.getSubscription();
      if (subscription) {
        if (previousContext && getCloud().callFunction && context() === previousContext) {
          await requestPush('/unregister', 'unregisterPushDevice', { endpoint: subscription.endpoint });
        }
        await subscription.unsubscribe();
      }
    } catch (error) { console.warn('Push unsubscribe failed', error); }
    render();
  }
  async function enableDevice() {
    if (busy || !supported()) return;
    if (ios() && !installed()) { render(); return; }
    busy = true; statusOverride = ''; render();
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        write(DEVICE_KEY, '1');
        await worker();
        if (await registerDevice()) statusOverride = '';
        else statusOverride = 'Уведомления разрешены. Войдите в аккаунт для фоновой доставки';
      }
    } catch (error) {
      console.warn('Push activation failed', error);
      statusOverride = 'Уведомления разрешены. Фоновая доставка пока недоступна';
    } finally {
      busy = false;
      render();
    }
  }
  async function disableDevice() {
    if (busy) return;
    busy = true;
    write(DEVICE_KEY, '0');
    statusOverride = '';
    try { await detach(); }
    catch (_) { statusOverride = 'Не удалось отключить подписку. Проверьте настройки браузера'; }
    finally { busy = false; render(); }
  }

  async function incoming({ key, title, body, kind, threadId = '', push = false }) {
    const deliver = async () => {
      let delivered;
      try { delivered = JSON.parse(read(DELIVERY_KEY) || '{}'); } catch (_) { delivered = {}; }
      if (!delivered || typeof delivered !== 'object' || Array.isArray(delivered)) delivered = {};
      const deliveryId = `${context()}:${key}`;
      if (delivered[deliveryId]) return;
      delivered[deliveryId] = Date.now();
      const entries = Object.entries(delivered).sort((a, b) => b[1] - a[1]).slice(0, 250);
      write(DELIVERY_KEY, JSON.stringify(Object.fromEntries(entries)));
      if (document.visibilityState === 'visible') { await chime(); toast(title); }
      if (!push && deviceEnabled() && supported() && Notification.permission === 'granted' && document.visibilityState !== 'visible' && registeredContext !== context()) {
        try {
          const sw = await worker();
          await sw.showNotification(title, {
            body,
            icon: './sbp-icon-192.png',
            tag: key,
            silent: false,
            renotify: true,
            vibrate: [110, 70, 110],
            data: { kind, threadId }
          });
        } catch (_) {}
      }
    };
    try {
      if (navigator.locks) await navigator.locks.request('toe-notification-delivery', deliver);
      else await deliver();
    } catch (_) {}
  }

  document.getElementById('notification-sound-toggle')?.addEventListener('change', async event => {
    write(SOUND_KEY, event.target.checked ? '1' : '0');
    if (event.target.checked) { await unlockAudio(true); await chime(); }
    render();
  });
  document.getElementById('notification-sound-test')?.addEventListener('click', async () => {
    if (!soundEnabled()) { toast('Сначала включите звук уведомлений'); return; }
    await unlockAudio(true);
    await chime();
  });
  document.getElementById('notification-device-enable')?.addEventListener('click', enableDevice);
  document.getElementById('notification-device-disable')?.addEventListener('click', disableDevice);
  document.addEventListener('visibilitychange', render);
  window.addEventListener('storage', render);
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'notification-open') open(event.data);
    if (event.data?.type === 'notification-arrival') incoming({ ...event.data, push: true });
  });
  if (supported()) worker().catch(() => {});
  render();
  return { incoming, refreshAccount, detach, render, dispatch };
}

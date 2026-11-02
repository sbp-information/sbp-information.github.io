(() => {
  const pageUrl = new URL(location.href);
  if (pageUrl.searchParams.has('app-refresh')) {
    pageUrl.searchParams.delete('app-refresh');
    history.replaceState(history.state, '', pageUrl.href);
  }
  const currentBuild = document.querySelector('meta[name="app-build"]')?.content || '';
  const mobileFast = window.matchMedia?.('(max-width: 767px), (hover: none) and (pointer: coarse)')?.matches === true;
  const saveData = navigator.connection?.saveData === true;
  const updateCheckInterval = saveData ? 600000 : (mobileFast ? 300000 : 60000);
  const initialUpdateDelay = mobileFast ? 8000 : 2500;
  let lastPassiveCheckAt = 0;
  let registration = null;
  let waitingWorker = null;
  let dismissed = '';
  let availableBuild = '';
  let busy = false;
  let checking = false;
  const text = (ru, kz) => localStorage.getItem('toe_ui_language') === 'kz' ? kz : ru;
  const elements = () => ({
    bar: document.getElementById('app-update-bar'),
    now: document.getElementById('app-update-now'),
    later: document.getElementById('app-update-later'),
    manual: document.getElementById('menu-update-button'),
    hint: document.getElementById('menu-update-hint')
  });

  function showUpdatePrompt(worker, build = '') {
    waitingWorker = worker || waitingWorker;
    availableBuild = build || availableBuild;
    if (busy || dismissed === (availableBuild || 'worker')) return;
    elements().bar?.classList.remove('hidden');
    if (elements().hint) elements().hint.textContent = text('Доступна новая версия', 'Жаңа нұсқа қолжетімді');
  }

  async function fetchPage() {
    const response = await fetch(new URL('./index.html', location.href), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!page.querySelector('meta[name="app-build"]')) throw new Error('Invalid app page');
    return page;
  }

  async function checkForUpdate(force = false) {
    if (checking || busy || !navigator.onLine) return;
    const now = Date.now();
    if (!force && mobileFast && now - lastPassiveCheckAt < 120000) return;
    lastPassiveCheckAt = now;
    checking = true;
    try {
      const page = await fetchPage();
      const build = page.querySelector('meta[name="app-build"]').content;
      if (build !== currentBuild) showUpdatePrompt(null, build);
      await registration?.update();
      if (registration?.waiting && navigator.serviceWorker.controller) showUpdatePrompt(registration.waiting);
    } catch (error) { console.debug('Update check unavailable', error.message); }
    finally { checking = false; }
  }

  // Never rewrite the active worker's Cache Storage during a version change.
  // Its app-shell HTML and scripts are a single immutable set. The installing
  // worker precaches the NEW set before it may activate; failure keeps the
  // currently installed app usable offline.
  window.refreshSBPApp = async function() {
    if (busy) return;
    const { now, manual, hint } = elements();
    if (!navigator.onLine) {
      elements().bar?.classList.remove('hidden');
      const copy = document.querySelector('.app-update-copy span');
      if (copy) copy.textContent = text('Для обновления подключитесь к интернету.', 'Жаңарту үшін интернетке қосылыңыз.');
      return;
    }
    busy = true;
    if (now) { now.disabled = true; now.textContent = text('Обновление…', 'Жаңартылуда…'); }
    if (manual) manual.disabled = true;
    if (hint) hint.textContent = text('Загружаем свежую версию…', 'Жаңа нұсқа жүктелуде…');
    try {
      const page = await fetchPage();
      // Registration may still be starting on a very slow Android phone.
      if (!registration && navigator.serviceWorker?.getRegistration) {
        registration = await navigator.serviceWorker.getRegistration('./');
      }
      await registration?.update();
      if (registration?.installing) {
        const worker = registration.installing;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Install timeout')), 45000);
          const done = () => {
            if (!['installed', 'redundant'].includes(worker.state)) return;
            clearTimeout(timeout);
            worker.removeEventListener('statechange', done);
            if (worker.state === 'redundant') reject(new Error('Install failed')); else resolve();
          };
          worker.addEventListener('statechange', done);
          done();
        });
      }
      waitingWorker = registration?.waiting || (waitingWorker?.state === 'installed' ? waitingWorker : null);
      // Refuse to load new HTML through an old active worker. That would
      // strand the next offline launch with mismatched script versions.
      const remoteBuild = page.querySelector('meta[name="app-build"]')?.content || '';
      if (!waitingWorker && navigator.serviceWorker?.controller && remoteBuild !== currentBuild) {
        throw new Error('New offline shell has not installed completely');
      }
      if (waitingWorker) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', done); reject(new Error('Activation timeout')); }, 15000);
          const done = () => { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
          navigator.serviceWorker.addEventListener('controllerchange', done);
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        });
      }
      const url = new URL(location.href);
      url.searchParams.set('app-refresh', Date.now().toString());
      location.replace(url.href);
    } catch (error) {
      console.warn('App update incomplete', error);
      busy = false;
      if (now) { now.disabled = false; now.textContent = text('Повторить обновление', 'Жаңартуды қайталау'); }
      if (manual) manual.disabled = false;
      if (hint) hint.textContent = text('Не удалось обновить. Попробуйте ещё раз.', 'Жаңарту сәтсіз. Қайталап көріңіз.');
      elements().bar?.classList.remove('hidden');
      const copy = document.querySelector('.app-update-copy span');
      if (copy) copy.textContent = text('Не удалось загрузить обновление. Попробуйте ещё раз.', 'Жаңарту жүктелмеді. Қайталап көріңіз.');
    }
  };
  elements().now?.addEventListener('click', window.refreshSBPApp);
  elements().manual?.addEventListener('click', window.refreshSBPApp);
  elements().later?.addEventListener('click', () => {
    dismissed = availableBuild || 'worker';
    elements().bar?.classList.add('hidden');
  });
  function watchInstalling(worker) {
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdatePrompt(registration?.waiting || worker);
    });
  }
  if ('serviceWorker' in navigator) {
    let registrationStarted = false;
    const registerWorker = () => {
      if (registrationStarted) return;
      registrationStarted = true;
      navigator.serviceWorker.register('./notifications-sw.js', { scope: './', updateViaCache: 'none' }).then(reg => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) showUpdatePrompt(reg.waiting);
        watchInstalling(reg.installing);
        reg.addEventListener('updatefound', () => watchInstalling(reg.installing));
      }).catch(error => console.warn('PWA registration unavailable', error));
    };

    // Already-installed PWAs are controlled by the existing worker immediately.
    // On slow phones, do not begin 30+ precache/network requests before first paint.
    // Chrome supports the buffered paint observer; older browsers use a load fallback.
    if (mobileFast && document.visibilityState === 'visible') {
      let scheduled = false;
      const afterPaint = () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(registerWorker, 0);
      };
      try {
        const paints = performance.getEntriesByType?.('paint') || [];
        if (paints.some(entry => entry.name === 'first-contentful-paint')) {
          afterPaint();
        } else if (typeof PerformanceObserver === 'function') {
          const observer = new PerformanceObserver(list => {
            if (list.getEntries().some(entry => entry.name === 'first-contentful-paint')) {
              observer.disconnect();
              afterPaint();
            }
          });
          observer.observe({ type: 'paint', buffered: true });
        }
      } catch (_) { /* load-event fallback below */ }
      const fallback = () => setTimeout(afterPaint, 1600);
      if (document.readyState === 'complete') fallback();
      else window.addEventListener('load', fallback, { once: true });
    } else {
      registerWorker();
    }
  }
  setTimeout(checkForUpdate, initialUpdateDelay);
  window.addEventListener('online', () => checkForUpdate(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { dismissed = ''; checkForUpdate(); }
  });
  window.setInterval(() => { if (document.visibilityState === 'visible') checkForUpdate(); }, updateCheckInterval);
})();

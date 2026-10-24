(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || window.__daminovPortfolioTracker) return;
  window.__daminovPortfolioTracker = true;
  const optedOut = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  if (optedOut() || navigator.webdriver || /bot|spider|crawl|headless|preview|lighthouse|pagespeed/i.test(navigator.userAgent)) return;
  const site = script.dataset.site || location.hostname.toLowerCase().replace(/^www\./, '');
  const endpoint = new URL(script.dataset.endpoint || '/__analytics/collect', location.href).href;
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const cleanPath = () => location.pathname.replace(/\/index\.html$/, '/');
  let previous = null;
  let scheduled = false;
  let forceNext = false;
  let referrer = '';
  try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch { /* Invalid referrer is omitted. */ }
  async function deliver(payload) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (optedOut()) return;
      try {
        const response = await fetch(endpoint, {
          method: 'POST', credentials: 'omit', mode: 'cors', keepalive: true,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          referrerPolicy: 'strict-origin-when-cross-origin',
        });
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return;
      } catch { /* Retry the same event, never create a second visit. */ }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  function record() {
    scheduled = false;
    if (document.visibilityState !== 'visible' || document.prerendering || optedOut()) return;
    const path = cleanPath();
    if (script.dataset.onlyRoot === 'true' && path !== '/') return;
    if (previous === path && !forceNext) return;
    forceNext = false;
    previous = path;
    void deliver({ site_id: site, page: path, referrer, ts: new Date().toISOString(), event_id: uuid() });
    referrer = location.origin;
  }
  function schedule() {
    if (!scheduled) { scheduled = true; queueMicrotask(record); }
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) { const result = original.apply(this, args); schedule(); return result; };
  }
  addEventListener('popstate', schedule);
  addEventListener('pageshow', event => { if (event.persisted) forceNext = true; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('prerenderingchange', schedule);
  schedule();
})();

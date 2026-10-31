/**
 * pwa.js
 * PWA Service Worker 등록 및 설치 상태 관리 모듈
 */

let swInitialized = false;

export function registerPWA() {
  if (swInitialized) return;
  swInitialized = true;

  if (!('serviceWorker' in navigator)) return;

  const register = async () => {
    try {
      const base = import.meta.env.BASE_URL || './';
      const swUrl = `${base}sw.js`;
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: base,
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

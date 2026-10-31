/**
 * Fermata PWA Service Worker (sw.js)
 * - App Shell & MPA HTML: Network-First (오프라인 시 ignoreSearch 캐시 폴백 지원)
 * - Static Assets & UI/Font CDN: Stale-While-Revalidate
 * - Dynamic APIs (Firestore, Kakao Maps, AWS Bedrock, Vite HMR): Network-Only (Bypass)
 */

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `fermata-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fermata-runtime-${CACHE_VERSION}`;

const PRECACHE_PATHS = [
  './',
  './index.html',
  './report.html',
  './detail.html',
  './mypage.html',
  './manifest.webmanifest',
  './favicon.ico',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

// 캐싱을 우회해야 하는 동적 API 및 개발 서버 패턴
const BYPASS_HOST_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'dapi.kakao.com',
  'daumcdn.net',
  'kakao.com',
  'amazonaws.com',
];

const STATIC_CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.tailwindcss.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const scopeUrl = self.registration.scope;
      await Promise.allSettled(
        PRECACHE_PATHS.map((relPath) => {
          const fullUrl = new URL(relPath, scopeUrl).toString();
          return cache.add(new Request(fullUrl, { cache: 'reload' }));
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function shouldBypass(url) {
  if (!url.protocol.startsWith('http')) return true;

  // Vite 개발 서버 내부 모듈/HMR 요청은 우회
  if (
    url.pathname.includes('/@vite') ||
    url.pathname.includes('/@fs') ||
    url.pathname.includes('/@id') ||
    url.pathname.includes('/node_modules/') ||
    url.search.includes('t=') ||
    url.pathname.endsWith('.hot-update.json')
  ) {
    return true;
  }

  return BYPASS_HOST_PATTERNS.some((host) => url.hostname.includes(host));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (shouldBypass(url)) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isStaticCdn = STATIC_CDN_HOSTS.some((host) => url.hostname.includes(host));

  // 1. 페이지 네비게이션 (MPA HTML: index, report, detail?id=..., mypage 등) -> Network-First
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(APP_SHELL_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // 오프라인일 때 쿼리스트링(?clusterId=... 등)을 무시하고 캐시된 HTML 매칭
          const cachedExact = await caches.match(request);
          if (cachedExact) return cachedExact;

          const cachedIgnoreSearch = await caches.match(request, { ignoreSearch: true });
          if (cachedIgnoreSearch) return cachedIgnoreSearch;

          const fallbackIndex = await caches.match(new URL('./index.html', self.registration.scope).toString());
          return fallbackIndex || Response.error();
        }
      })()
    );
    return;
  }

  // 2. 동일 출처 정적 에셋 및 주요 UI/폰트 CDN -> Stale-While-Revalidate
  if (isSameOrigin || isStaticCdn) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              const cache = await caches.open(RUNTIME_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })()
    );
  }
});

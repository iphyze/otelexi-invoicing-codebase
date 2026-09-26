/* Otelex PWA service worker — safe offline/static caching.
 *
 * Security/data rule:
 * - Business/API responses are never cached here.
 * - Only the static frontend shell and same-origin static assets are cached.
 * - Page navigations remain network-first and fall back to a dedicated
 *   offline screen instead of exposing potentially stale business data.
 */
const SW_VERSION = 'otelex-pwa-v3';
const CORE_CACHE = `${SW_VERSION}-core`;
const STATIC_CACHE = `${SW_VERSION}-static`;
const CACHE_PREFIX = 'otelex-pwa-';

const scopedUrl = (path) => new URL(path.replace(/^\//, ''), self.registration.scope).toString();

const CORE_ASSETS = [
  '',
  'offline.html',
  'manifest.webmanifest',
  'pwa/icon-192.png',
  'pwa/icon-512.png',
  'pwa/icon-maskable-512.png',
  'pwa/apple-touch-icon.png',
].map(scopedUrl);

const OFFLINE_URL = scopedUrl('offline.html');

const isSameOrigin = (url) => url.origin === self.location.origin;

const isApiRequest = (url) => {
  const path = url.pathname.toLowerCase();
  return path.includes('/api/') || path.endsWith('/api') || path.startsWith('/api');
};

const isCacheableStaticRequest = (request, url) => {
  if (request.method !== 'GET' || !isSameOrigin(url) || isApiRequest(url)) return false;

  if (url.pathname.includes('/assets/') || url.pathname.includes('/pwa/')) return true;

  return ['style', 'script', 'font', 'image'].includes(request.destination);
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);

    // Cache assets independently so one optional asset cannot prevent the
    // service worker from installing and providing the offline page.
    await Promise.allSettled(
      CORE_ASSETS.map(async (asset) => {
        const response = await fetch(asset, { cache: 'reload' });
        if (response.ok) await cache.put(asset, response);
      }),
    );

    // Do not call skipWaiting() here. Updated workers wait until the user
    // confirms the refresh, avoiding an unexpected mid-session app swap.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && ![CORE_CACHE, STATIC_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache API/business data. This applies to both same-origin API
  // routes and the normal backend API hosted on another origin/path.
  if (isApiRequest(url)) return;

  // Keep document navigation fresh. Bypass HTTP cache so a newly deployed
  // index.html cannot be hidden by an older browser cache entry. If the
  // network is unavailable, show the dedicated offline screen.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request, { cache: 'no-store' });
      } catch {
        const cache = await caches.open(CORE_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (!isCacheableStaticRequest(request, url)) return;

  // Stale-while-revalidate for the immutable/static frontend layer. Vite's
  // production assets are content-hashed, so a changed build receives new
  // asset URLs while unchanged assets stay fast from cache.
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
      .then(async (response) => {
        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(networkFetch);
      return cached;
    }

    const response = await networkFetch;
    if (response) return response;

    return Response.error();
  })());
});

self.__OTELEX_SW_VERSION__ = SW_VERSION;

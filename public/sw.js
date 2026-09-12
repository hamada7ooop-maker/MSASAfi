// ============================================
// مصاريفي — Service Worker v23.0.6
// Strategy: Cache-First | SWR | Network-First
// Note: console calls in SW are NOT stripped by Vite — they survive in production
// ============================================
const CACHE_VERSION = 'masarifi-v23-0-6';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC   = 80; // max entries in dynamic cache

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// ─── Install ──────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // activate new SW immediately
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.warn('[SW] Static cache failed:', err))
  );
});

// ─── Activate — purge ALL old caches ──────────
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map(k => {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        )
      ),
    ])
  );
});

// ─── Helpers ──────────────────────────────────
function isImmutableAsset(pathname) {
  // Vite adds content hashes — safe for Cache-First
  return /\/assets\/.+\.(js|css|woff2?|ttf|otf)$/.test(pathname);
}
function isImage(pathname) {
  return /\.(png|jpg|jpeg|svg|webp|ico|gif)$/.test(pathname);
}
function isNavigation(request) {
  return request.mode === 'navigate';
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (FIFO)
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(k => cache.delete(k)));
  }
}

async function putInDynamic(request, response) {
  const cache = await caches.open(DYNAMIC_CACHE);
  cache.put(request, response);
  trimCache(DYNAMIC_CACHE, MAX_DYNAMIC);
}

// ─── Fetch ────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (AI APIs, Firebase, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // ── 1. Cache-First for hashed JS/CSS/fonts ──────────────────
  if (isImmutableAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // ── 2. Stale-While-Revalidate for images ────────────────────
  if (isImage(url.pathname)) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── 3. Network-First for HTML navigation ────────────────────
  if (isNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            putInDynamic(event.request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached
            || caches.match('/index.html')
            || caches.match('/offline.html');
        })
    );
    return;
  }

  // ── 4. Network-First fallback for everything else ───────────
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          putInDynamic(event.request, response.clone());
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(r => r || caches.match('/index.html'))
      )
  );
});

// ─── Background Sync (future-ready) ───────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'trimCaches') {
    trimCache(DYNAMIC_CACHE, MAX_DYNAMIC);
  }
});

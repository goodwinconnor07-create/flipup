// FlipUp's service worker. After one visit online, the app opens with no connection: Home
// and games against the bots all run on the phone. Online tables still need signal, and
// their sockets and /api calls are never touched here.
//
// - Pages: network first (so a new version arrives at once), the last good copy when offline or slow.
// - Files under /assets (hashed), /sounds and /icons: cached on first use, then served from the cache.
// Bump VERSION if this file's behaviour changes, so old caches are cleared.
const VERSION = 'v4';
const PAGES = `flipup-pages-${VERSION}`;
const FILES = `flipup-files-${VERSION}`;
// A slow page load gives up on the network after this long and opens the saved copy (the loading screen shows meanwhile).
const SLOW_MS = 2500;

self.addEventListener('install', (event) => {
  event.waitUntil(refreshShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== PAGES && name !== FILES) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') event.respondWith(page(request));
  else if (/^\/(assets|sounds|icons)\//.test(url.pathname)) event.respondWith(file(request));
});

/** A real file: not an error, and not the single-page fallback (an HTML page where a script should be). */
const usable = (response) => response.ok && !(response.headers.get('content-type') || '').includes('text/html');

async function page(request) {
  const network = fetch(request);
  network.catch(() => {});
  let timer;
  try {
    const response = await Promise.race([
      network,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('slow')), SLOW_MS);
      }),
    ]);
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      // Every path is the same single page, so one copy serves them all.
      (await caches.open(PAGES)).put('/', response.clone());
      void cacheAssets(response.clone());
    }
    return response;
  } catch {
    // Slow or offline: the last good copy. With no copy yet, keep waiting for the real answer.
    return (await caches.match('/', { cacheName: PAGES })) || network;
  } finally {
    clearTimeout(timer);
  }
}

async function file(request) {
  const cache = await caches.open(FILES);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (usable(response)) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // Partial (range) responses can't be stored; they're served as they are.
    }
  }
  return response;
}

/** Keeps the page and the files it needs, so the very first offline start works. */
async function refreshShell() {
  const response = await fetch('/', { cache: 'reload' });
  if (!response.ok) return;
  (await caches.open(PAGES)).put('/', response.clone());
  await cacheAssets(response);
}

/** Stores the scripts and styles a page points at. When a new version has shipped, forgets the old build's files. */
async function cacheAssets(pageResponse) {
  try {
    const html = await pageResponse.text();
    const wanted = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
    const cache = await caches.open(FILES);
    await Promise.all(
      wanted.map(async (path) => {
        if (await cache.match(path)) return;
        try {
          const response = await fetch(path);
          if (usable(response)) await cache.put(path, response);
        } catch {
          // Offline right now: the next visit fills it in.
        }
      }),
    );
    // Chunks loaded on demand (the QR scanner, the 3D table) aren't in the page, so they're only cleared
    // when the page's own files change, which means a new build.
    const pages = await caches.open(PAGES);
    const signature = wanted.slice().sort().join('\n');
    const known = await pages.match('/__build');
    if (known && (await known.text()) === signature) return;
    for (const key of await cache.keys()) {
      const path = new URL(key.url).pathname;
      if (path.startsWith('/assets/') && !wanted.includes(path)) await cache.delete(key);
    }
    await pages.put('/__build', new Response(signature));
  } catch {
    // Not worth failing a page load over.
  }
}

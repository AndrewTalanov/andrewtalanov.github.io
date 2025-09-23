/* Простенький SW: офлайн-кеш и “standalone” режим */
const CACHE_NAME = 'whalerun-v1';

// добавь сюда свои ассеты (пути относительные к /www)
const ASSETS = [
  './',
  './index.html',
  './phaser.min.js',
  './kit.png',
  './ostrov.png',
  './poplavok.png',
  './volna.png',
  './rud.png',
  './nad.png',
  // если есть другие — добавь:
  // './bonus_clear.png', './styles.css', ...
];

// install: предзагрузка ассетов
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// activate: чистим старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// fetch: 
//  - навигации (index.html) — network-first с откатом в кеш
//  - остальное — cache-first (для офлайна)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // навигация (SPA/страница)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // остальное — cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      // кешируем только GET-успешные ответы
      if (req.method === 'GET' && fresh && fresh.status === 200) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});

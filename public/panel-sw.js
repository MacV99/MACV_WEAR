/* Service worker del Panel MacV (solo /admin).
   Aunque el scope técnico es "/", este SW SOLO intercepta el panel y sus
   assets del mismo origen. Todo lo demás (la tienda, y las llamadas al
   Google Apps Script) pasa directo a la red — la tienda queda intacta y los
   datos del panel nunca se cachean aquí (el propio panel guarda su caché en
   localStorage). Su único fin extra es habilitar la instalación como app. */

const CACHE = 'macv-panel-v1';
const SHELL = [
  '/admin',
  '/img/logo-mark.avif',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // POST al GAS → red directa
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // CDN de íconos, GAS → red directa

  const isPanel = url.pathname === '/admin' || url.pathname === '/admin/';
  const isAsset = url.pathname.startsWith('/img/')
    || url.pathname.startsWith('/_astro/')
    || url.pathname === '/manifest.webmanifest';
  if (!isPanel && !isAsset) return;                    // resto de la tienda → sin tocar

  // Network-first: siempre datos frescos si hay red; si no, el shell cacheado.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('/admin')))
  );
});

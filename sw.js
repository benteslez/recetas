/* Service Worker — Recetas
   - HTML: NETWORK-first (siempre intenta versión nueva; cache como fallback offline).
   - Iconos/manifest: cache-first (no cambian).
   Cambia CACHE_NAME tras un cambio importante para invalidar el cache.
*/
const CACHE_NAME = "recetas-v23";
const ASSETS_ESTATICOS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_ESTATICOS))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Solo same-origin y GET.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  const esHTML = event.request.mode === "navigate"
    || event.request.destination === "document"
    || url.pathname.endsWith(".html")
    || url.pathname === "/" || url.pathname.endsWith("/recetas/");

  if (esHTML) {
    // NETWORK-FIRST para HTML: usuarios reciben siempre la versión más nueva.
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // Actualiza el cache en background
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match("./")))
    );
    return;
  }

  // CACHE-FIRST para iconos/manifest/etc.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return resp;
      });
    })
  );
});

// Service worker mínimo para instalabilidad PWA.
// SEGURIDAD: nunca cachea navegaciones (HTML, que puede estar autenticado y con
// datos fiscales) ni /api. Solo cachea assets estáticos inmutables.
const CACHE = "julia-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico|webmanifest)$/.test(
      url.pathname,
    )
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Nunca interceptar navegaciones (HTML autenticado) → siempre red, sin cachear.
  if (request.mode === "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (!isStaticAsset(url)) return; // solo assets estáticos

  // Cache-first para estáticos (son inmutables / con hash).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});

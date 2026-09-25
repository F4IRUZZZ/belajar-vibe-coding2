// Keuangan Keluarga — service worker v1.
// Navigasi: network-first (data selalu segar), jatuh ke cache, terakhir offline.
// Aset statis: cache-first. API: network-only (tak pernah di-cache).
const VERSI = "keuangan-v1";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSI)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // data selalu network

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const salin = res.clone();
          caches.open(VERSI).then((c) => c.put("/", salin));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ??
        fetch(e.request).then((res) => {
          const salin = res.clone();
          caches.open(VERSI).then((c) => c.put(e.request, salin));
          return res;
        }),
    ),
  );
});

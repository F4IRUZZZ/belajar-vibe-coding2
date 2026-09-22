// Service worker Fase C: cache app-shell (file lokal same-origin).
// API (beda origin) + CDN Chart.js = network saja, data wajib segar.
// Offline = shell tampil, data kosong + pesan 503 existing (jujur).
// Ganti VERSI tiap ada perubahan shell agar klien update otomatis.
const VERSI = 'keuangan-v1';
const ASET = [
  '/',
  'index.html',
  'login.html',
  'register.html',
  'transaksi.html',
  'produk.html',
  'hutang.html',
  'profile.html',
  'css/style.css',
  'js/api.js',
  'js/config.js',
  'js/format.js',
  'js/keuangan.js',
  'js/dashboard.js',
  'js/transaksi.js',
  'js/produk.js',
  'js/hutang.js',
  'js/profile.js',
  'js/login.js',
  'js/register.js',
  'js/pwa.js',
  'manifest.json',
  'ikon-192.png',
  'ikon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(VERSI).then(function(cache) { return cache.addAll(ASET); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(kunci) {
      return Promise.all(kunci.filter(function(k) { return k !== VERSI; })
        .map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Beda origin (API Back4app, CDN) = jangan sentuh, network saja.
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function(cocok) {
      if (cocok) return cocok;
      return fetch(e.request).then(function(res) {
        const salin = res.clone();
        caches.open(VERSI).then(function(cache) { cache.put(e.request, salin); });
        return res;
      }).catch(function() {
        // Offline: halaman -> index (nanti redirect login), aset -> gagal wajar.
        if (e.request.mode === 'navigate') return caches.match('index.html');
        throw new Error('offline');
      });
    })
  );
});

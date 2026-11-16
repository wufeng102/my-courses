// Service Worker My-Courses -- HANYA untuk memenuhi syarat "installable" (Add to Home
// Screen/Install App di Chrome & Android) dan fallback ringan saat offline.
//
// PENTING -- strategi NETWORK-FIRST, bukan cache-first: index.html sudah punya mekanisme
// cek-versi otomatis sendiri (lihat window.BUILD_VERSION di index.html) yang dibuat khusus
// supaya pengguna TIDAK pernah terjebak versi lama. Service worker ini didesain supaya tidak
// merusak mekanisme itu -- selalu coba jaringan dulu, cache cuma dipakai kalau benar-benar
// offline. JANGAN diubah jadi cache-first tanpa pertimbangan ulang, itu akan menghidupkan lagi
// masalah "halaman nyangkut versi lama" yang sudah susah payah diperbaiki.

const CACHE_NAME = 'my-courses-shell-v2';
const APP_SHELL = ['./index.html', './manifest.json', './logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // jangan sampai install gagal total cuma gara2 1 aset gagal di-cache
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Biarkan SEMUA request non-GET (presensi, simpan tugas, nilai, dll -- semua lewat POST ke
  // Google Apps Script) dan semua request cross-origin (script.google.com, Tailwind CDN,
  // Font Awesome, Google Fonts) langsung ke jaringan tanpa campur tangan sama sekali.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Same-origin GET (index.html, manifest, icon) -- NETWORK FIRST, cache cuma fallback offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// Service Worker untuk offline caching - bisa main tanpa internet setelah install
const CACHE_VERSION = "egg-v47";  // bump: admin test-level panel + ad bypass in test mode
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./js/levels.js",
  "./js/shield-draw.js",
  "./js/sound-input.js",
  "./js/engine.js",
  "./js/admob-bridge.js",
  "./js/ads.js",
  "./js/main.js",
  "./js/admin.js",
];

// Install: pre-cache semua aset
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy (cocok untuk game statis)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Admin push pakai URL `?_nocache=N` untuk force network fetch (hindari
  // push stale cached version ke GitHub). Tidak call respondWith → browser
  // handle natively tanpa lewat SW.
  const url = new URL(event.request.url);
  if (url.searchParams.has("_nocache")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        // Cache file yang berhasil di-fetch (untuk request berikutnya)
        if (resp && resp.status === 200 && resp.type === "basic") {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

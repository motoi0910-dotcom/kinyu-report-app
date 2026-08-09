// 最小限のオフラインキャッシュ。閲覧済みページを次回オフライン時にも開けるようにする。
const CACHE = "mr-cache-v2";
const CORE = ["./index.html", "./manifest.json", "./assets/style.css", "./assets/app.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTMLページ（ナビゲーション）はネットワーク優先＝毎回最新版を取得し、
// オフライン時のみキャッシュにフォールバックする（レポート内容が古いまま
// 表示され続ける事故を防ぐため）。CSS/JS/アイコン等の静的資産のみキャッシュ優先。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isNavigation =
    event.request.mode === "navigate" || event.request.destination === "document";

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

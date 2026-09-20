// Minimal service worker: caches the static app shell for installability
// and faster repeat loads. API requests always go to the network - this
// app's data must stay live, never served stale.
const CACHE_NAME = "babymonitor-shell-v2";
const SHELL_ASSETS = [
  "/",
  "/static/style.css",
  "/static/app.js",
  "/static/manifest.webmanifest",
  "/static/icon.svg",
  "/static/icon-192.png",
  "/static/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Web Push: the server sends {title, body, tag, url, nid, sid, renotify}. The
// tag is the chore type, so a newer reminder for the same chore replaces the
// old one instead of stacking up. `renotify` is false only for the server's
// automatic re-send, so that if the original turns up late the copy replaces
// it without buzzing twice.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const show = self.registration.showNotification(data.title || "Baby Monitor", {
    body: data.body || "",
    tag: data.tag || undefined,
    renotify: !!data.tag && data.renotify !== false,
    // a reminder should be noticed in a pocket, and stay until dealt with
    vibrate: [200, 100, 200],
    requireInteraction: true,
    icon: "/static/icon-192.png",
    badge: "/static/icon-192.png",
    data: { url: data.url || "/" },
  });

  // Tell the server this push really reached the device: it stops the
  // automatic re-send and lets Settings show "received". Best-effort - the
  // notification is what matters, so a failed ack must never block it.
  const ack =
    data.nid && data.sid != null
      ? fetch("/api/push/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid: data.sid, nid: data.nid }),
        }).catch(() => {})
      : Promise.resolve();

  event.waitUntil(Promise.all([show, ack]));
});

// The browser can retire a push subscription on its own (expiry, key
// rotation). Re-subscribe and hand the server the new one - it carries over
// this device's chore choices - instead of silently going quiet.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      let sub = event.newSubscription;
      if (!sub) {
        const key = old && old.options && old.options.applicationServerKey;
        if (!key) return;
        sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }
      const json = sub.toJSON();
      await fetch("/api/push/resubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_endpoint: old ? old.endpoint : null, endpoint: json.endpoint, keys: json.keys }),
      });
    })().catch(() => {})
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return; // never intercept writes
  if (url.pathname.startsWith("/api/")) return; // always fetch live data

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* Web Push handlers, imported by the vite-plugin-pwa service worker via
 * workbox.importScripts. Kept tiny + dependency-free so it works in every
 * browser that supports the Push API. */
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  let payload = { title: "Heartify", body: "", url: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  const { title, body, url, tag, icon } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || "heartify",
      icon: icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.postMessage({ type: "navigate", url: target });
            return client.focus();
          }
        } catch {
          /* noop */
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

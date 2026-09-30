/* Loaded into the generated Workbox service worker via importScripts (see vite.config.ts). */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "PNS ERP";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || "pns-erp",
      renotify: true,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        if ("navigate" in client) return client.navigate(target);
        return undefined;
      }
      return self.clients.openWindow(target);
    })
  );
});

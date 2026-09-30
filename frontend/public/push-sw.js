/* Loaded into the generated Workbox service worker via importScripts (see vite.config.ts). */

const DEFAULT_SOUND = "/sounds/money-money.mp3";

function notificationOptions(data) {
  const playSound = data.playSound !== false;
  const soundUrl = data.soundUrl || DEFAULT_SOUND;
  const options = {
    body: data.body || "",
    tag: data.tag || "pns-erp",
    renotify: true,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: data.url || "/", soundUrl, playSound },
    silent: !playSound,
    vibrate: playSound ? [300, 100, 300, 100, 300] : undefined,
  };
  // Non-standard but supported on some Android builds; ignored elsewhere.
  if (playSound) options.sound = soundUrl;
  return options;
}

function notifyOpenClients(data) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "payment-reminder-push",
        playSound: data.playSound !== false,
        soundUrl: data.soundUrl || DEFAULT_SOUND,
      });
    }
  });
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "PNS ERP";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, notificationOptions(data)),
      notifyOpenClients(data),
    ])
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

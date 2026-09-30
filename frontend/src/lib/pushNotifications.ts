import { api } from "@/lib/api";
import { getDeviceName } from "@/lib/deviceName";
import { useAuthStore } from "@/store/authStore";

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const SW_READY_TIMEOUT_MS = 5000;

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hasPushApis(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone/iPad only allow web push for apps added to the Home Screen. */
function supportState(): "unsupported" | "needs-install" | "ok" {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  return hasPushApis() ? "ok" : "unsupported";
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (supportState() !== "ok") return null;
  const registration = await getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function saveSubscription(subscription: PushSubscription) {
  await api.post("/notifications/subscriptions", {
    ...subscription.toJSON(),
    deviceName: getDeviceName(),
  });
}

export async function getPushState(): Promise<PushState> {
  const support = supportState();
  if (support !== "ok") return support;
  if (Notification.permission === "denied") return "denied";
  const subscription = await currentSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

/** Re-registers an existing subscription so the server has it under the signed-in user. */
export async function syncPushSubscription(): Promise<void> {
  const subscription = await currentSubscription();
  if (subscription && Notification.permission === "granted") await saveSubscription(subscription);
}

export async function enablePush(): Promise<PushState> {
  const support = supportState();
  if (support !== "ok") return support;

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "off";

  const { data } = await api.get<{ enabled: boolean; publicKey: string | null }>(
    "/notifications/vapid-public-key"
  );
  if (!data.enabled || !data.publicKey) throw new Error("Reminders are not set up on the server yet");

  const registration = await getRegistration();
  if (!registration) throw new Error("App offline support is not ready. Reload the page and try again.");

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));
  await saveSubscription(subscription);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription();
  if (subscription) {
    await api.delete("/notifications/subscriptions", { data: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
  }
  return getPushState();
}

export async function sendTestPush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) throw new Error("Reminders are not turned on for this device");
  await api.post("/notifications/test", { endpoint: subscription.endpoint });
}

/** Stops reminders on this device at logout. Call before clearing the session; safe to not await. */
export async function unsubscribeOnLogout(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const subscription = await currentSubscription();
  if (!subscription) return;
  void api
    .delete("/notifications/subscriptions", {
      data: { endpoint: subscription.endpoint },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    .catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

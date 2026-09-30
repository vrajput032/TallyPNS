import { api } from "@/lib/api";
import { getDeviceName } from "@/lib/deviceName";
import { useAuthStore } from "@/store/authStore";

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const SW_READY_TIMEOUT_MS = 15000;
/** First paint in settings dialogs — do not block on a slow service worker. */
const SW_READY_QUICK_MS = 2500;
const PUSH_SUBSCRIBE_TIMEOUT_MS = 15000;
const BOOTSTRAP_ATTEMPTS = 4;
const BOOTSTRAP_DELAY_MS = 2000;

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

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

async function getRegistration(timeoutMs = SW_READY_TIMEOUT_MS): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function currentSubscription(swReadyMs = SW_READY_TIMEOUT_MS): Promise<PushSubscription | null> {
  if (supportState() !== "ok") return null;
  const registration = await getRegistration(swReadyMs);
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

async function subscribeWithVapidKey(): Promise<PushSubscription> {
  const { data } = await api.get<{ enabled: boolean; publicKey: string | null }>(
    "/notifications/vapid-public-key"
  );
  if (!data.enabled || !data.publicKey) {
    throw new Error("Reminders are not set up on the server yet");
  }

  const registration = await getRegistration();
  if (!registration) {
    throw new Error("App offline support is not ready. Reload the page and try again.");
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }),
    PUSH_SUBSCRIBE_TIMEOUT_MS,
    "Could not subscribe for push notifications"
  );
}

export type GetPushStateOptions = {
  /** Use a short service-worker wait so UI (dialogs) is not stuck on “Checking…”. */
  quick?: boolean;
};

export async function getPushState(options?: GetPushStateOptions): Promise<PushState> {
  const support = supportState();
  if (support !== "ok") return support;
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "off";
  const swMs = options?.quick ? SW_READY_QUICK_MS : SW_READY_TIMEOUT_MS;
  const subscription = await currentSubscription(swMs);
  return subscription ? "on" : "off";
}

/** True when the browser has not been asked yet (show our Allow dialog). */
export function needsPushPermissionPrompt(): boolean {
  return supportState() === "ok" && Notification.permission === "default";
}

/** After permission is already granted: subscribe and register on the server. */
export async function bootstrapPushIfGranted(): Promise<PushState> {
  const support = supportState();
  if (support !== "ok") return support;
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";

  const subscription = await subscribeWithVapidKey();
  await saveSubscription(subscription);
  return "on";
}

export async function bootstrapPushWithRetry(): Promise<PushState> {
  let last: PushState = "off";
  for (let attempt = 0; attempt < BOOTSTRAP_ATTEMPTS; attempt += 1) {
    try {
      last = await bootstrapPushIfGranted();
      if (last !== "off" || Notification.permission === "default") return last;
    } catch {
      // Service worker or API not ready yet.
    }
    if (attempt < BOOTSTRAP_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_DELAY_MS));
    }
  }
  return last;
}

/** Call from a button click — shows the browser permission prompt, then stays subscribed. */
export async function enablePush(): Promise<PushState> {
  const support = supportState();
  if (support !== "ok") return support;

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "off";

  const subscription = await subscribeWithVapidKey();
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

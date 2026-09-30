const DEFAULT_SOUND = "/sounds/money-money.mp3";

let audio: HTMLAudioElement | null = null;

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** iOS treats PWA HTML5 audio as lock-screen “Now Playing” media — use the push banner only. */
function canPlayInAppReminderSound(): boolean {
  if (typeof document === "undefined") return false;
  if (isIos()) return false;
  return document.visibilityState === "visible";
}

function clearMediaSessionAfterPlayback(audioEl: HTMLAudioElement): void {
  audioEl.addEventListener(
    "ended",
    () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
      }
    },
    { once: true }
  );
}

/** Plays the bundled reminder chime when a push arrives while the app is open (not on iOS). */
export function playReminderSound(url: string = DEFAULT_SOUND): void {
  if (typeof window === "undefined") return;
  if (!canPlayInAppReminderSound()) return;

  if (!audio || audio.src !== new URL(url, window.location.origin).href) {
    audio = new Audio(url);
    audio.preload = "auto";
  }
  clearMediaSessionAfterPlayback(audio);
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function registerReminderSoundFromServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    const data = event.data as { type?: string; playSound?: boolean; soundUrl?: string } | null;
    if (data?.type !== "payment-reminder-push" || data.playSound === false) return;
    playReminderSound(data.soundUrl ?? DEFAULT_SOUND);
  });
}

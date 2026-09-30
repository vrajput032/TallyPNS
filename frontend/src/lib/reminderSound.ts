const DEFAULT_SOUND = "/sounds/money-money.mp3";

let audio: HTMLAudioElement | null = null;

/** Plays the bundled reminder chime (used when a push arrives while the app is open). */
export function playReminderSound(url: string = DEFAULT_SOUND): void {
  if (typeof window === "undefined") return;
  if (!audio || audio.src !== new URL(url, window.location.origin).href) {
    audio = new Audio(url);
    audio.preload = "auto";
  }
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

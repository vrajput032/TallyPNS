import { create } from "zustand";

/** Render free tier sleeps after ~15 minutes of idle time. */
const SERVER_SLEEP_MS = 15 * 60 * 1000;
const WAKEUP_SHOW_DELAY_MS = 1200;

interface ColdStartState {
  visible: boolean;
  forced: boolean;
  show: () => void;
  hide: () => void;
  setForced: (forced: boolean) => void;
}

export const useColdStartStore = create<ColdStartState>((set, get) => ({
  visible: false,
  forced: false,
  show: () => set({ visible: true }),
  hide: () => {
    if (!get().forced) set({ visible: false });
  },
  setForced: (forced) => set({ forced, visible: forced || get().visible }),
}));

let lastSuccessfulApiAt = 0;
let activeColdStartRequests = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;

function isServerAsleep() {
  if (lastSuccessfulApiAt === 0) return true;
  return Date.now() - lastSuccessfulApiAt > SERVER_SLEEP_MS;
}

export function markApiSuccess() {
  lastSuccessfulApiAt = Date.now();
  if (activeColdStartRequests === 0) {
    useColdStartStore.getState().hide();
  }
}

/** Register only when the server may be waking from sleep — not every API call. */
export function registerColdStartRequest(): () => void {
  if (!isServerAsleep()) {
    return () => {};
  }

  activeColdStartRequests += 1;

  if (!showTimer) {
    showTimer = setTimeout(() => {
      showTimer = null;
      if (activeColdStartRequests > 0) {
        useColdStartStore.getState().show();
      }
    }, WAKEUP_SHOW_DELAY_MS);
  }

  let done = false;
  return () => {
    if (done) return;
    done = true;
    activeColdStartRequests = Math.max(0, activeColdStartRequests - 1);

    if (activeColdStartRequests === 0) {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      useColdStartStore.getState().hide();
    }
  };
}

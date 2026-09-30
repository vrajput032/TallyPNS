import { create } from "zustand";

/** Render free tier sleeps after ~15 minutes of idle time. */
const SERVER_SLEEP_MS = 15 * 60 * 1000;
const WAKEUP_SHOW_DELAY_MS = 1200;

interface ColdStartState {
  /** A request has been waiting on a sleeping server for longer than the show delay. */
  waking: boolean;
  forced: boolean;
  /** Mounted queries with nothing cached to show yet. */
  blockingLoaders: number;
  /** Writes (POST/PUT/PATCH/DELETE) waiting on a sleeping server. */
  blockingRequests: number;
  show: () => void;
  hide: () => void;
  setForced: (forced: boolean) => void;
}

export const useColdStartStore = create<ColdStartState>((set, get) => ({
  waking: false,
  forced: false,
  blockingLoaders: 0,
  blockingRequests: 0,
  show: () => set({ waking: true }),
  hide: () => {
    if (!get().forced) set({ waking: false });
  },
  setForced: (forced) => set({ forced, waking: forced || get().waking }),
}));

/** Background refreshes of cached data never show the overlay; only empty screens and writes do. */
export function selectColdStartOverlayVisible(state: ColdStartState) {
  if (state.forced) return true;
  return state.waking && (state.blockingLoaders > 0 || state.blockingRequests > 0);
}

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

/** Call while a screen has no cached data and is waiting for its first response. */
export function registerBlockingLoader(): () => void {
  useColdStartStore.setState((s) => ({ blockingLoaders: s.blockingLoaders + 1 }));
  let done = false;
  return () => {
    if (done) return;
    done = true;
    useColdStartStore.setState((s) => ({ blockingLoaders: Math.max(0, s.blockingLoaders - 1) }));
  };
}

/** Register only when the server may be waking from sleep — not every API call. */
export function registerColdStartRequest(options: { blocking: boolean }): () => void {
  if (!isServerAsleep()) {
    return () => {};
  }

  activeColdStartRequests += 1;
  if (options.blocking) {
    useColdStartStore.setState((s) => ({ blockingRequests: s.blockingRequests + 1 }));
  }

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
    if (options.blocking) {
      useColdStartStore.setState((s) => ({ blockingRequests: Math.max(0, s.blockingRequests - 1) }));
    }

    if (activeColdStartRequests === 0) {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      useColdStartStore.getState().hide();
    }
  };
}

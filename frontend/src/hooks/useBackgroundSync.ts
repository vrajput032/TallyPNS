import { useEffect, useState } from "react";
import {
  selectBackgroundSync,
  useColdStartStore,
  type BackgroundSyncState,
} from "@/store/coldStartStore";

/** Quick refreshes finish before this, so the header does not flicker on every request. */
const REFRESH_SHOW_DELAY_MS = 700;

export function useBackgroundSync(): BackgroundSyncState {
  const state = useColdStartStore(selectBackgroundSync);
  const [settled, setSettled] = useState<BackgroundSyncState>("idle");

  useEffect(() => {
    const timer = setTimeout(
      () => setSettled(state),
      state === "refreshing" ? REFRESH_SHOW_DELAY_MS : 0
    );
    return () => clearTimeout(timer);
  }, [state]);

  return state !== "idle" && settled === state ? state : "idle";
}

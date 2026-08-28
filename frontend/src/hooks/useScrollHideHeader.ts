import { useEffect, useRef, useState } from "react";

const SCROLL_DELTA = 6;
const TOP_REVEAL_Y = 12;

type UseScrollHideHeaderOptions = {
  enabled?: boolean;
  /** Keep header visible (e.g. while a sheet is open). */
  pinned?: boolean;
  /** When this value changes, header is shown again (e.g. route path). */
  resetKey?: string;
};

export function useScrollHideHeader({
  enabled = true,
  pinned = false,
  resetKey,
}: UseScrollHideHeaderOptions = {}) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    setVisible(true);
    lastScrollY.current = window.scrollY;
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }

    lastScrollY.current = window.scrollY;

    const update = () => {
      ticking.current = false;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (pinned || currentY <= TOP_REVEAL_Y) {
        setVisible(true);
      } else if (delta > SCROLL_DELTA) {
        setVisible(false);
      } else if (delta < -SCROLL_DELTA) {
        setVisible(true);
      }

      lastScrollY.current = currentY;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, pinned]);

  return visible;
}

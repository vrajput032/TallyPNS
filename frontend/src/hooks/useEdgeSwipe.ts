import { useEffect, useRef } from "react";

const EDGE_PX = 28;
const MIN_DISTANCE = 48;

type Edge = "left" | "right";

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useEdgeSwipe({
  enabled,
  onSwipeFromLeft,
  onSwipeFromRight,
}: {
  enabled: boolean;
  onSwipeFromLeft: () => void;
  onSwipeFromRight: () => void;
}) {
  const startRef = useRef<{ x: number; y: number; edge: Edge } | null>(null);
  const leftRef = useRef(onSwipeFromLeft);
  const rightRef = useRef(onSwipeFromRight);
  leftRef.current = onSwipeFromLeft;
  rightRef.current = onSwipeFromRight;

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (isInteractive(event.target)) return;
      const x = event.touches[0].clientX;
      const y = event.touches[0].clientY;
      const width = window.innerWidth;
      if (x <= EDGE_PX) {
        startRef.current = { x, y, edge: "left" };
        return;
      }
      if (x >= width - EDGE_PX) {
        startRef.current = { x, y, edge: "right" };
        return;
      }
      startRef.current = null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = startRef.current;
      if (!start || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        startRef.current = null;
        return;
      }
      event.preventDefault();
      if (start.edge === "left" && dx >= MIN_DISTANCE) {
        startRef.current = null;
        leftRef.current();
        return;
      }
      if (start.edge === "right" && dx <= -MIN_DISTANCE) {
        startRef.current = null;
        rightRef.current();
      }
    };

    const onTouchEnd = () => {
      startRef.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled]);
}

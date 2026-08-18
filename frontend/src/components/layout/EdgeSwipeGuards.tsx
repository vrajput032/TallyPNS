import { cn } from "@/lib/utils";

/** Narrow strips that absorb iOS/Android back-swipe so it can open menus instead. */
export function EdgeSwipeGuards({ className }: { className?: string }) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-6 touch-none overscroll-x-none",
          className
        )}
      />
      <div
        aria-hidden
        className={cn(
          "fixed inset-y-0 right-0 z-30 w-6 touch-none overscroll-x-none",
          className
        )}
      />
    </>
  );
}

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 639px)";
const COMPACT_NAV_QUERY = "(max-width: 767px)";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Matches Tailwind `sm` breakpoint — only one mobile/desktop form layout should mount. */
export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

/** Matches the hamburger nav (`md:hidden`), including tablets. */
export function useIsCompactNav() {
  return useMediaQuery(COMPACT_NAV_QUERY);
}

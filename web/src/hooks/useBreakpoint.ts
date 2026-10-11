import * as React from "react";

/**
 * Which layout the screen gets. Matches Tailwind's `md` (768px) and `lg`
 * (1024px), so components that switch structure in JS agree with the CSS.
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

const DESKTOP = "(min-width: 1024px)";
const TABLET = "(min-width: 768px)";

function read(): Breakpoint {
  if (window.matchMedia(DESKTOP).matches) return "desktop";
  if (window.matchMedia(TABLET).matches) return "tablet";
  return "mobile";
}

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(DESKTOP), window.matchMedia(TABLET)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

export function useBreakpoint(): Breakpoint {
  return React.useSyncExternalStore(subscribe, read);
}

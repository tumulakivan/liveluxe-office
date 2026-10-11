import * as React from "react";
import { Link, useLocation, useNavigate, type LinkProps } from "react-router-dom";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { cn } from "@/lib/utils";

/**
 * The booking app and the admin dashboard are two different rooms, and an
 * admin walking between them gets a short, deliberate transition instead of a
 * hard cut: a branded screen fades in over the page they're leaving, the new
 * page mounts (and starts fetching) underneath it, and it fades away again.
 *
 * The hold has a floor (HOLD_MIN_MS) so it reads as a transition rather than
 * a flicker. It doesn't wait for the destination's data: anything still
 * loading after the fade shows its own skeletons.
 */

type Space = "app" | "admin";

const FADE_IN_MS = 180;
const HOLD_MIN_MS = 750;
const FADE_OUT_MS = 260;

const APP_PATHS = new Set(["/", "/bookings", "/account"]);

/** Which side of the product a path belongs to. Sign-in and similar screens belong to neither. */
export function spaceOf(pathname: string): Space | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (APP_PATHS.has(pathname)) return "app";
  return null;
}

interface Overlay {
  to: Space;
  phase: "in" | "hold" | "out";
}

const SpaceContext = React.createContext<((to: string) => void) | null>(null);

export function SpaceTransitionProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);

  const overlayRef = React.useRef<Overlay | null>(null);
  overlayRef.current = overlay;
  const prevSpace = React.useRef(spaceOf(pathname));
  const startedAt = React.useRef(0);
  const timers = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  React.useEffect(() => clearTimers, [clearTimers]);

  const later = React.useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /** Hold for whatever is left of the minimum, then fade out and unmount. */
  const finish = React.useCallback(() => {
    const remaining = Math.max(0, HOLD_MIN_MS - (performance.now() - startedAt.current));
    later(() => setOverlay((o) => (o ? { ...o, phase: "out" } : o)), remaining);
    later(() => setOverlay(null), remaining + FADE_OUT_MS);
  }, [later]);

  const go = React.useCallback(
    (to: string) => {
      const target = spaceOf(to);
      if (!target || target === prevSpace.current) {
        navigate(to);
        return;
      }
      clearTimers();
      startedAt.current = performance.now();
      setOverlay({ to: target, phase: "in" });
      // Let the overlay cover the old page before swapping what's under it.
      later(() => navigate(to), FADE_IN_MS);
    },
    [navigate, clearTimers, later],
  );

  // Every crossing lands here, including browser back/forward, which bypass `go`.
  // A layout effect, so the cover goes up before the new page is painted.
  React.useLayoutEffect(() => {
    const space = spaceOf(pathname);
    const prev = prevSpace.current;
    prevSpace.current = space;
    if (!space || !prev || space === prev) return;

    if (!overlayRef.current) {
      // Not started by `go` (back/forward): there's no old page left to fade
      // over, so cover straight away.
      clearTimers();
      startedAt.current = performance.now();
    }
    setOverlay({ to: space, phase: "hold" });
    finish();
  }, [pathname, clearTimers, finish]);

  return (
    <SpaceContext.Provider value={go}>
      {children}
      {overlay ? (
        <div
          className={cn(
            "fixed inset-0 z-[100]",
            overlay.phase === "in" && "animate-[overlay-in_180ms_ease-out]",
            overlay.phase === "out" && "animate-[fade-out_260ms_ease-in_forwards]",
          )}
        >
          <BrandLoader
            className="h-full"
            dark={overlay.to === "admin"}
            title={overlay.to === "admin" ? "Admin dashboard" : "Booking app"}
            caption={overlay.to === "admin" ? "Opening the admin dashboard…" : "Heading back to the rooms…"}
          />
        </div>
      ) : null}
    </SpaceContext.Provider>
  );
}

/** Navigate anywhere; crossing between the booking app and the admin dashboard plays the transition. */
export function useGo() {
  const go = React.useContext(SpaceContext);
  if (!go) throw new Error("useGo must be used inside <SpaceTransitionProvider>");
  return go;
}

/**
 * A link that plays the transition when it crosses sides. It stays a real
 * link, so ctrl/cmd-click and middle-click still open a new tab.
 */
export function SpaceLink({ to, onClick, ...props }: LinkProps & { to: string }) {
  const go = useGo();
  return (
    <Link
      to={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        go(to);
      }}
      {...props}
    />
  );
}

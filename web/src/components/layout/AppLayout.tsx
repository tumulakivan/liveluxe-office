import { CalendarDays, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from "react-router-dom";

import { Logo, Wordmark } from "@/components/brand/Logo";
import { SpaceLink } from "@/components/layout/SpaceTransition";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/SessionProvider";

const NAV = [
  { to: "/", label: "Schedule", end: true },
  { to: "/bookings", label: "My bookings", end: false },
];

/**
 * The booking app's frame. Deliberately not a dashboard: a light top bar and
 * the page underneath. Most visits are "find a free room, book it, leave",
 * and the chrome should stay out of the way of that.
 *
 * Tablet and up: tabs in the top bar. Phone: the tabs move to a bottom bar
 * within thumb reach, with "Book" in the middle, the way phone apps work.
 */
export function AppLayout() {
  const user = useUser();
  // From tablet up, the schedule fits the window and scrolls its timetable
  // rather than the page. A phone scrolls the page as usual.
  const fitWindow = useMatch({ path: "/", end: true }) !== null;

  return (
    <div className={cn("flex min-h-dvh flex-col", fitWindow && "md:h-dvh")}>
      <header className="border-border/80 bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <Logo />
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <TabLink key={item.to} {...item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user.role === "admin" ? (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <SpaceLink to="/admin">
                  <ShieldCheck /> Admin
                </SpaceLink>
              </Button>
            ) : null}
            <UserMenu where="app" />
          </div>
        </div>
      </header>

      <main
        className={cn(
          // Bottom padding on phones clears the bottom bar.
          "mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:py-8",
          fitWindow && "md:flex md:min-h-0 md:flex-col md:pb-6",
        )}
      >
        <Outlet />
      </main>

      {fitWindow ? null : (
        <footer className="text-muted-foreground mx-auto hidden w-full max-w-7xl px-4 pb-6 text-[12px] sm:px-6 md:block">
          Live Luxe AU · Office
        </footer>
      )}

      <BottomBar />
    </div>
  );
}

/** Phone navigation: Schedule, a prominent Book button, My bookings. */
function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  function book() {
    // The schedule opens the new-booking sheet when it sees ?book=1. Keep the
    // day being viewed, if there is one, so the booking lands on it.
    const params = new URLSearchParams(location.pathname === "/" ? location.search : "");
    params.set("book", "1");
    navigate({ pathname: "/", search: params.toString() });
  }

  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
      isActive ? "text-primary-strong" : "text-muted-foreground",
    );

  return (
    <nav
      aria-label="Main"
      className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-3">
        <NavLink to="/" end className={item}>
          <CalendarDays className="size-5" />
          Schedule
        </NavLink>
        <div className="flex items-start justify-center">
          <button
            type="button"
            onClick={book}
            className="bg-primary text-primary-foreground focus-visible:ring-ring/60 ring-background -mt-5 flex size-14 items-center justify-center rounded-full shadow-[0_8px_20px_-6px_rgb(148_96_13/0.6)] ring-4 outline-none"
            aria-label="Book a room"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </div>
        <NavLink to="/bookings" className={item}>
          <ListChecks className="size-5" />
          My bookings
        </NavLink>
      </div>
    </nav>
  );
}

function TabLink({ to, label, end, className }: { to: string; label: string; end: boolean; className?: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-md px-3 py-2 text-[13.5px] font-semibold transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent",
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          <span
            aria-hidden="true"
            className={cn(
              "bg-primary absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      )}
    </NavLink>
  );
}

/** The heading block at the top of each booking-app page. */
export function PageIntro({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-primary-strong text-[11px] font-bold tracking-[0.16em] uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-display mt-1 text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">{title}</h1>
        {children ? <div className="text-muted-foreground mt-1.5 text-[14px]">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

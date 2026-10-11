import { ArrowUpRight, CalendarRange, LayoutDashboard, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Logo, Wordmark } from "@/components/brand/Logo";
import { SpaceLink } from "@/components/layout/SpaceTransition";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/staff", label: "Staff", icon: Users, end: false },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarRange, end: false },
];

/**
 * The admin dashboard's frame, after adVantage: a fixed dark rail with one
 * accent bar on the active item, a slim header, and a wide content area.
 */
export function AdminShell() {
  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="size-8" />
          <Wordmark inverted className="text-sidebar-foreground" />
        </div>
        <p className="text-sidebar-muted px-5 pt-3 pb-2 text-[10.5px] font-bold tracking-[0.16em] uppercase">Admin</p>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-semibold transition-colors",
                  isActive
                    ? "bg-sidebar-active text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "bg-sidebar-primary absolute left-0 h-4 w-0.5 rounded-r-full transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <item.icon className="size-4 shrink-0" strokeWidth={2.25} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <SpaceLink
            to="/"
            className="border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors"
          >
            Open booking app
            <ArrowUpRight className="size-4" />
          </SpaceLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-card/80 sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <Logo />
            <Wordmark />
          </div>
          <p className="text-muted-foreground hidden min-w-0 truncate text-[12.5px] lg:block">
            Manage staff accounts and keep an eye on the rooms.
          </p>
          <UserMenu where="admin" />
        </header>

        <nav className="bg-card border-border flex items-center gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  isActive ? "bg-primary-soft text-primary-strong" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <item.icon className="size-3.5" />
              {item.label}
            </NavLink>
          ))}
          <SpaceLink to="/" className="text-muted-foreground hover:text-foreground ml-auto flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-[12.5px] font-semibold">
            Booking app <ArrowUpRight className="size-3.5" />
          </SpaceLink>
        </nav>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

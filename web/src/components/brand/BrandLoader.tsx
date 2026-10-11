import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/**
 * The full-screen branded wait: the mark, a title, and a gold bar sweeping a
 * thin track. Used for the first load of the app and for switching between
 * the booking app and the admin dashboard.
 */
export function BrandLoader({
  title,
  caption,
  dark = false,
  className,
}: {
  title?: string;
  caption: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        dark ? "bg-sidebar text-sidebar-foreground" : "bg-background text-foreground",
        className,
      )}
    >
      <Logo className={cn("size-12 animate-[enter_300ms_cubic-bezier(0.16,1,0.3,1)]", dark && "ring-sidebar-border rounded-[10px] ring-1")} />
      {title ? (
        <>
          <p
            className={cn(
              "mt-5 text-[10px] font-bold tracking-[0.2em] uppercase",
              dark ? "text-sidebar-muted" : "text-muted-foreground",
            )}
          >
            Live Luxe AU
          </p>
          <p className="font-display mt-1 text-[24px] font-semibold tracking-tight">{title}</p>
        </>
      ) : null}
      <p className={cn("text-[13px]", title ? "mt-1" : "mt-5", dark ? "text-sidebar-muted" : "text-muted-foreground")}>
        {caption}
      </p>
      <div
        aria-hidden="true"
        className={cn("mt-6 h-[3px] w-44 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-primary/15")}
      >
        <div className={cn("h-full w-2/5 rounded-full animate-[progress_1.1s_ease-in-out_infinite]", dark ? "bg-sidebar-primary" : "bg-primary")} />
      </div>
    </div>
  );
}

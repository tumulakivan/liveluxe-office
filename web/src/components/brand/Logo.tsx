import { cn } from "@/lib/utils";

/**
 * The Office mark: a doorway with its handle, in gold on warm charcoal. A room
 * you can walk into is the whole product.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="#1f1c18" />
      <path
        d="M11 25V9.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 21 9.5V25"
        fill="none"
        stroke="#e3a948"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M8 25h16" stroke="#e3a948" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18" cy="17" r="1.4" fill="#e3a948" />
    </svg>
  );
}

/** "Office" in the display serif, with the company as a small cap line above. */
export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "text-[9.5px] font-bold tracking-[0.18em] uppercase",
          inverted ? "text-sidebar-muted" : "text-muted-foreground",
        )}
      >
        Live Luxe AU
      </span>
      <span className="font-display mt-0.5 text-[19px] font-semibold tracking-tight">Office</span>
    </span>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A placeholder in the shape of what is coming. A slow warm shimmer rather
 * than a pulse, so a page full of them reads as "loading", not "blinking".
 * Hidden from screen readers; wrap a group in <Loading> to announce it once.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,#ebe4d8_50%,var(--muted)_75%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

/** Marks a region as busy for assistive tech, with one spoken label for all the skeletons inside. */
export function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

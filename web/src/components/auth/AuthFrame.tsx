import type * as React from "react";

import { Logo, Wordmark } from "@/components/brand/Logo";

/** The frame every signed-out screen shares. */
export function AuthFrame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* A soft gold wash behind the card; decoration only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(217_160_58/0.18),transparent)]"
      />
      <div className="relative w-full max-w-sm space-y-7">
        <div className="flex items-center justify-center gap-3">
          <Logo className="size-10" />
          <Wordmark className="[&>span:last-child]:text-[24px]" />
        </div>

        <div className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-[0_10px_40px_-12px_rgb(60_40_10/0.18)]">
          {children}
        </div>

        {footer ? <div className="text-muted-foreground text-center text-[12.5px] leading-relaxed">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h1 className="font-display text-[22px] font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-[13px] leading-relaxed">{description}</p>
    </div>
  );
}

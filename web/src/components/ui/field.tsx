import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-muted-foreground block text-[11px] font-bold tracking-wide uppercase select-none", className)}
      {...props}
    />
  );
}

/** Label + control + hint/error: the shape every form row uses. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-[13px] font-medium">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-[12.5px]">{hint}</p>
      ) : null}
    </div>
  );
}

/** A red box for something that went wrong. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="border-destructive/30 bg-destructive/8 text-destructive rounded-lg border px-3 py-2 text-[13px]">
      {children}
    </p>
  );
}

/** A quiet gold confirmation. */
export function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="border-primary/40 bg-primary-soft text-foreground rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed">
      {children}
    </p>
  );
}

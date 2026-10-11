import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        gold: "border-transparent bg-primary-soft text-primary-strong",
        neutral: "border-border bg-muted text-muted-foreground",
        good: "border-transparent bg-good/10 text-good",
        warning: "border-transparent bg-warning/10 text-warning",
        critical: "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

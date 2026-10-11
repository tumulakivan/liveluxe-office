import { CalendarDays, LogOut, ShieldCheck, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGo } from "@/components/layout/SpaceTransition";
import { cn, initials } from "@/lib/utils";
import { useSession, useUser } from "@/providers/SessionProvider";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary-soft text-primary-strong ring-primary/30 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ring-1",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The account button in the top-right of both the booking app and the admin dashboard. */
export function UserMenu({ where }: { where: "app" | "admin" }) {
  const user = useUser();
  const { signOut } = useSession();
  const navigate = useGo();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-accent focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 outline-none focus-visible:ring-2 sm:pr-3"
        aria-label="Account menu"
      >
        <Avatar name={user.name} />
        <span className="hidden text-[13px] font-semibold sm:inline">{user.name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-[13px] font-bold">{user.name}</p>
          <p className="text-muted-foreground truncate text-[12px]">{user.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "admin" ? (
          where === "app" ? (
            <DropdownMenuItem onSelect={() => navigate("/admin")}>
              <ShieldCheck /> Admin dashboard
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => navigate("/")}>
              <CalendarDays /> Booking app
            </DropdownMenuItem>
          )
        ) : null}
        <DropdownMenuItem onSelect={() => navigate("/account")}>
          <UserRound /> Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut().then(() => navigate("/login"))}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

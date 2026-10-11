import { CalendarCheck, CalendarRange, KeyRound, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading, Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { useRooms } from "@/hooks/useRooms";
import { api } from "@/lib/api";
import { formatDateShort, formatRange, nowMinutes, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";

export function AdminOverviewPage() {
  const stats = useQuery(() => api.admin.stats(), []);
  const today = useQuery(() => api.bookings(todayISO(), todayISO()), []);
  const info = useRooms();
  const s = stats.data;

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" description="Who has access, and how the rooms are being used." />

      {s && s.resetRequests > 0 ? (
        <div className="border-warning/30 bg-warning/5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <KeyRound className="text-warning mt-0.5 size-4 shrink-0" />
            <p className="text-[13.5px]">
              <span className="font-bold">
                {s.resetRequests} password reset request{s.resetRequests === 1 ? "" : "s"}
              </span>{" "}
              waiting. Someone can't sign in until you reset them.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/staff">Review requests</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi label="Staff accounts" value={s?.staff} icon={Users} footer={s ? `${s.admins} admin${s.admins === 1 ? "" : "s"}` : undefined} />
        <Kpi label="Bookings today" value={s?.bookingsToday} icon={CalendarCheck} accent />
        <Kpi
          label="This week"
          value={s?.bookingsThisWeek}
          icon={CalendarRange}
          footer={s ? `${formatDateShort(s.week.from)} – ${formatDateShort(s.week.to)}` : undefined}
        />
        <Kpi
          label="On default password"
          value={s?.onDefaultPassword}
          icon={KeyRound}
          footer="Haven't chosen their own yet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="block">
            <CardTitle>Room usage</CardTitle>
            <CardDescription>Share of office hours booked. The week is Monday to Friday.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(s?.rooms ?? []).map((room) => (
              <div key={room.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13.5px] font-bold">{room.name}</p>
                  <p className="text-muted-foreground num text-[12px]">
                    {room.weekBookings} booking{room.weekBookings === 1 ? "" : "s"} this week
                  </p>
                </div>
                <Meter label="Today" value={room.todayUtilisation} />
                <Meter label="This week" value={room.weekUtilisation} muted />
              </div>
            ))}
            {!s && !stats.error ? (
              <Loading label="Loading room usage" className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </Loading>
            ) : null}
            {stats.error ? <p className="text-destructive text-[13px]">{stats.error.message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="block">
            <CardTitle>Today in the rooms</CardTitle>
            <CardDescription>Every booking for today, in order.</CardDescription>
          </CardHeader>
          <CardContent>
            {today.error ? (
              <p className="text-destructive text-[13px]">{today.error.message}</p>
            ) : today.pending ? (
              <Loading label="Loading today's bookings">
                <ul className="divide-border divide-y">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-3.5 w-32 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-40 max-w-full" />
                        <Skeleton className="h-3 w-56 max-w-full" />
                      </div>
                    </li>
                  ))}
                </ul>
              </Loading>
            ) : today.data && today.data.bookings.length === 0 ? (
              <p className="text-muted-foreground bg-muted/60 rounded-lg px-4 py-8 text-center text-[13px]">
                No bookings today.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {(today.data?.bookings ?? []).map((b) => {
                  const now = nowMinutes();
                  const state = b.endMin <= now ? "done" : b.startMin <= now ? "now" : "later";
                  return (
                    <li key={b.id} className={cn("flex items-center gap-3 py-3", state === "done" && "opacity-55")}>
                      <span className="num text-muted-foreground w-36 shrink-0 text-[12.5px] font-semibold">
                        {formatRange(b.startMin, b.endMin)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold">{b.title}</p>
                        <p className="text-muted-foreground truncate text-[12px]">
                          {info?.rooms.find((r) => r.id === b.roomId)?.name} · {b.userName}
                        </p>
                      </div>
                      {state === "now" ? <Badge variant="gold">In progress</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  footer,
  accent,
}: {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  footer?: string;
  accent?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-5">
      {accent ? <span aria-hidden="true" className="bg-primary absolute inset-x-0 top-0 h-0.5" /> : null}
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground min-w-0 text-[11px] font-bold tracking-wide uppercase">{label}</p>
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
      </div>
      {value === undefined ? (
        // Same heights as the real figure and footer, so the tiles don't grow when the numbers land.
        <>
          <Skeleton className="mt-3.5 h-6 w-12" />
          <Skeleton className="mt-2.5 h-3 w-24" />
        </>
      ) : (
        <>
          <p className="num mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
          {footer ? <p className="text-muted-foreground mt-1.5 truncate text-[12px]">{footer}</p> : null}
        </>
      )}
    </Card>
  );
}

function Meter({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  const pct = Math.round(Math.min(1, value) * 100);
  return (
    <div className="mt-2 flex items-center gap-3">
      <span className="text-muted-foreground w-16 shrink-0 text-[11.5px] font-semibold">{label}</span>
      <div
        className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
        role="meter"
        aria-label={`${label}: ${pct}% booked`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full", muted ? "bg-primary/45" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <span className="num w-10 shrink-0 text-right text-[12px] font-bold">{pct}%</span>
    </div>
  );
}

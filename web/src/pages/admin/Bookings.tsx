import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import * as React from "react";

import { BookingDialog } from "@/components/booking/BookingDialog";
import { PageHeader } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { useRooms } from "@/hooks/useRooms";
import { api, type Booking } from "@/lib/api";
import { addDays, formatDateShort, formatDuration, formatRange, nowMinutes, relativeDay, startOfWeek, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Every booking in a week, across all rooms, with an admin's power to change or cancel any of them. */
export function AdminBookingsPage() {
  const info = useRooms();
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(todayISO()));
  const [roomId, setRoomId] = React.useState<number | "all">("all");
  const [editing, setEditing] = React.useState<Booking | null>(null);
  const weekEnd = addDays(weekStart, 6);
  const { data, error, pending, stale, reload } = useQuery(() => api.bookings(weekStart, weekEnd), [weekStart]);
  const loading = pending && !error;

  const bookings = (stale ? [] : (data?.bookings ?? [])).filter((b) => roomId === "all" || b.roomId === roomId);
  const byDay = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => ({
    date,
    list: bookings.filter((b) => b.date === date),
  }));
  const roomName = (id: number) => info?.rooms.find((r) => r.id === id)?.name ?? "Room";
  const today = todayISO();

  return (
    <div className="space-y-5">
      <PageHeader title="Bookings" description="Every booking in the office, a week at a time. Admins can change or cancel any of them." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeft />
          </Button>
          <p className="num min-w-48 text-center text-[14px] font-bold">
            {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
          </p>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(today))} disabled={weekStart === startOfWeek(today)}>
            This week
          </Button>
        </div>
        <Select
          aria-label="Filter by room"
          className="sm:ml-auto sm:w-52"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value === "all" ? "all" : Number(e.target.value))}
        >
          <option value="all">All rooms</option>
          {info?.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <p className="text-destructive text-[13px]">{error.message}</p> : null}

      <Card className="overflow-hidden" aria-busy={loading}>
        {loading ? <span className="sr-only" role="status">Loading bookings…</span> : null}
        {byDay.map(({ date, list }) => (
          <section key={date} className="border-border border-b last:border-b-0">
            <h2
              className={cn(
                "bg-muted/50 flex items-center justify-between px-5 py-2 text-[12px] font-bold",
                date === today && "bg-primary-soft text-primary-strong",
              )}
            >
              {relativeDay(date) === "Today" ? `Today · ${formatDateShort(date)}` : formatDateShort(date)}
              {loading ? (
                <Skeleton className="h-3 w-16" />
              ) : (
                <span className="text-muted-foreground font-semibold">
                  {list.length === 0 ? "—" : `${list.length} booking${list.length === 1 ? "" : "s"}`}
                </span>
              )}
            </h2>
            {loading ? (
              <ul className="divide-border divide-y" aria-hidden="true">
                {/* Vary the count per day so the placeholder looks like a week, not a pattern. */}
                {Array.from({ length: [2, 1, 3, 1, 2, 0, 0][byDay.findIndex((d) => d.date === date)] }, (_, i) => (
                  <li key={i} className="flex items-center gap-4 px-5 py-3">
                    <Skeleton className="hidden h-3.5 w-36 shrink-0 sm:block" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-44 max-w-full" />
                      <Skeleton className="h-3 w-64 max-w-full" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : list.length > 0 ? (
              <ul className="divide-border divide-y">
                {list.map((b) => {
                  const finished = b.date < today || (b.date === today && b.endMin <= nowMinutes());
                  return (
                    <li key={b.id} className={cn("flex items-center gap-4 px-5 py-3", finished && "opacity-55")}>
                      <span className="num text-muted-foreground hidden w-40 shrink-0 text-[12.5px] font-semibold sm:block">
                        {formatRange(b.startMin, b.endMin)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold">{b.title}</p>
                        <p className="text-muted-foreground truncate text-[12px]">
                          <span className="sm:hidden">{formatRange(b.startMin, b.endMin)} · </span>
                          {roomName(b.roomId)} · {b.userName} · {formatDuration(b.endMin - b.startMin)}
                        </p>
                      </div>
                      {finished ? null : (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(b)} disabled={!info}>
                          <Pencil /> <span className="hidden sm:inline">Manage</span>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ))}
      </Card>

      {info ? (
        <BookingDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          info={info}
          booking={editing ?? undefined}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

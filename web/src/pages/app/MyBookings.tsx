import { CalendarPlus, Clock, DoorOpen, Pencil } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

import { BookingDialog } from "@/components/booking/BookingDialog";
import { PageIntro } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading, Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { useRooms } from "@/hooks/useRooms";
import { api, type Booking } from "@/lib/api";
import { formatDuration, formatRange, nowMinutes, relativeDay, todayISO } from "@/lib/time";

export function MyBookingsPage() {
  const info = useRooms();
  const { data, pending, error, reload } = useQuery(() => api.myBookings(), []);
  const loading = pending && !error;
  const [editing, setEditing] = React.useState<Booking | null>(null);

  const groups = React.useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of data?.bookings ?? []) map.set(b.date, [...(map.get(b.date) ?? []), b]);
    return [...map.entries()];
  }, [data]);

  const roomName = (id: number) => info?.rooms.find((r) => r.id === id)?.name ?? "Room";
  const total = data?.bookings.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Upcoming"
        title="My bookings"
        actions={
          // Phones have Book in the bottom bar.
          <Button asChild variant="outline" className="max-md:hidden">
            <Link to="/">
              <CalendarPlus /> Book a room
            </Link>
          </Button>
        }
      >
        {loading ? (
          <Skeleton className="mt-1 h-4 w-40" />
        ) : total === 0 ? (
          "Nothing booked."
        ) : (
          `${total} upcoming booking${total === 1 ? "" : "s"}.`
        )}
      </PageIntro>

      {error ? <p className="text-destructive text-[13px]">{error.message}</p> : null}

      {loading ? <MyBookingsSkeleton /> : null}

      {!loading && data && total === 0 ? (
        <div className="border-border bg-card flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="bg-primary-soft text-primary-strong flex size-12 items-center justify-center rounded-full">
            <CalendarPlus className="size-5" />
          </span>
          <p className="font-display mt-4 text-[20px] font-semibold">No upcoming bookings</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-[13.5px]">
            When you book a meeting room or the boardroom, it will show up here so you can change or cancel it.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Find a free room</Link>
          </Button>
        </div>
      ) : null}

      <div className="space-y-7">
        {groups.map(([date, list]) => (
          <section key={date}>
            <h2 className="text-muted-foreground mb-2.5 text-[11px] font-bold tracking-[0.14em] uppercase">{relativeDay(date)}</h2>
            <ul className="space-y-2.5">
              {list.map((b) => {
                const happening = b.date === todayISO() && b.startMin <= nowMinutes();
                return (
                  <li
                    key={b.id}
                    className="border-border bg-card flex items-center gap-4 rounded-xl border p-4 shadow-xs"
                  >
                    <span className="bg-primary h-12 w-1 shrink-0 rounded-full" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-bold">{b.title}</p>
                        {happening ? <Badge variant="gold">Now</Badge> : null}
                      </div>
                      <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <DoorOpen className="size-3.5" /> {roomName(b.roomId)}
                        </span>
                        <span className="num flex items-center gap-1.5">
                          <Clock className="size-3.5" /> {formatRange(b.startMin, b.endMin)} · {formatDuration(b.endMin - b.startMin)}
                        </span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(b)} disabled={!info}>
                      <Pencil /> <span className="hidden sm:inline">Change</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

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

/** Two days of booking cards, the most common shape of this list. */
function MyBookingsSkeleton() {
  return (
    <Loading label="Loading your bookings" className="space-y-7">
      {[2, 1].map((count, group) => (
        <section key={group}>
          <Skeleton className="mb-3 h-3 w-24" />
          <ul className="space-y-2.5">
            {Array.from({ length: count }, (_, i) => (
              <li key={i} className="border-border bg-card flex items-center gap-4 rounded-xl border p-4 shadow-xs">
                <Skeleton className="h-12 w-1 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-8 w-8 sm:w-24" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Loading>
  );
}

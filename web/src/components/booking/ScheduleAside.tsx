import { ChevronLeft, ChevronRight, Clock, DoorOpen } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading, Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { api, type Booking, type RoomsInfo } from "@/lib/api";
import { roomStatus } from "@/lib/schedule";
import { addDays, formatDateShort, formatRange, formatTime, parseISODate, relativeDay, startOfWeek, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * The PC schedule's left column. A wide screen has room to answer the three
 * questions people actually arrive with, without any clicking: what day am I
 * looking at, is a room free right now, and what have I got coming up.
 *
 * Each panel fetches its own data. `version` goes up whenever the page knows
 * bookings have changed (one was made, or the minute timer ticked), and each
 * panel quietly refetches.
 */

const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" });
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function useReloadOn(query: { reload: () => void }, version: number) {
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    query.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
}

// ---------------------------------------------------------------- month calendar

export function MonthCalendar({
  date,
  onSelect,
  version,
}: {
  date: string;
  onSelect: (date: string) => void;
  version: number;
}) {
  const today = todayISO();
  const [month, setMonth] = React.useState(() => date.slice(0, 7) + "-01");

  // Picking a day elsewhere (arrows, Today) brings its month into view.
  React.useEffect(() => {
    setMonth(date.slice(0, 7) + "-01");
  }, [date]);

  // Always six weeks, so the card never changes height between months.
  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const query = useQuery(() => api.bookings(gridStart, days[41]), [gridStart]);
  useReloadOn(query, version);
  const bookings = query.stale ? [] : (query.data?.bookings ?? []);
  const loading = query.pending && !query.error;

  function shiftMonth(delta: number) {
    const d = parseISODate(month);
    d.setMonth(d.getMonth() + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[17px] font-semibold">{monthFmt.format(parseISODate(month))}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground mb-1 grid grid-cols-7 text-center text-[10.5px] font-bold" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5" aria-busy={loading}>
        {days.map((d) => {
          const inMonth = d.slice(0, 7) === month.slice(0, 7);
          const selected = d === date;
          const dayBookings = bookings.filter((b) => b.date === d);
          const mine = dayBookings.some((b) => b.mine);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={selected}
              aria-label={`${formatDateShort(d)}${loading ? "" : `, ${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`}`}
              className={cn(
                "focus-visible:ring-ring/60 relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2",
                selected ? "bg-foreground text-background" : "hover:bg-accent",
                !selected && !inMonth && "text-muted-foreground/45",
                !selected && inMonth && d < today && "text-muted-foreground",
                !selected && d === today && "ring-primary text-primary-strong ring-[1.5px] ring-inset",
              )}
            >
              <span className="num leading-none">{parseISODate(d).getDate()}</span>
              <span className="absolute bottom-1.5 flex h-1 gap-0.5" aria-hidden="true">
                {!loading && dayBookings.length > 0 ? (
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      mine ? "bg-primary" : selected ? "bg-background/60" : "bg-muted-foreground/45",
                    )}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground mt-3 flex items-center gap-4 text-[11.5px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary size-1.5 rounded-full" /> You have a booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-muted-foreground/45 size-1.5 rounded-full" /> Others
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- right now

export function RightNow({
  info,
  version,
  onBookNow,
  onPickBooking,
}: {
  info: RoomsInfo;
  version: number;
  onBookNow: (roomId: number, todayBookings: Booking[]) => void;
  onPickBooking: (booking: Booking) => void;
}) {
  const today = todayISO();
  const now = useNow();
  const query = useQuery(() => api.bookings(today, today), [today]);
  useReloadOn(query, version);
  const loading = query.pending && !query.error;
  const bookings = query.data?.bookings ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <p className="text-[13px] font-bold">Right now</p>
        <p className="text-muted-foreground num text-[12px]">{formatTime(now)}</p>
      </div>
      {loading ? (
        <Loading label="Checking which rooms are free" className="divide-border divide-y">
          {info.rooms.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </Loading>
      ) : (
        <ul className="divide-border divide-y">
          {info.rooms.map((room) => {
            const status = roomStatus(
              bookings.filter((b) => b.roomId === room.id),
              now,
              info.hours,
            );
            return (
              <li key={room.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    status.kind === "free" ? "bg-good" : status.kind === "busy" ? "bg-warning" : "bg-muted-foreground/40",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{room.name}</p>
                  <p className="text-muted-foreground truncate text-[12px]">
                    {status.kind === "closed"
                      ? "Closed for today"
                      : status.kind === "busy"
                        ? `In use until ${formatTime(status.until)}`
                        : status.until === null
                          ? "Free for the rest of the day"
                          : `Free until ${formatTime(status.until)}`}
                  </p>
                </div>
                {status.kind === "free" ? (
                  <Button size="sm" variant="outline" onClick={() => onBookNow(room.id, bookings)}>
                    Book
                  </Button>
                ) : status.kind === "busy" ? (
                  <Button size="sm" variant="ghost" onClick={() => onPickBooking(status.booking)}>
                    View
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {query.error ? <p className="text-destructive px-4 pb-3 text-[12.5px]">{query.error.message}</p> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- up next

export function UpNext({
  info,
  version,
  onPickBooking,
}: {
  info: RoomsInfo;
  version: number;
  onPickBooking: (booking: Booking) => void;
}) {
  const query = useQuery(() => api.myBookings(), []);
  useReloadOn(query, version);
  const loading = query.pending && !query.error;
  const upcoming = (query.data?.bookings ?? []).slice(0, 3);
  const total = query.data?.bookings.length ?? 0;
  const roomName = (id: number) => info.rooms.find((r) => r.id === id)?.name ?? "Room";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <p className="text-[13px] font-bold">Your next bookings</p>
        {total > 3 ? (
          <Link to="/bookings" className="text-primary-strong text-[12px] font-semibold hover:underline">
            All {total}
          </Link>
        ) : null}
      </div>
      {loading ? (
        <Loading label="Loading your bookings" className="space-y-2 px-4 pb-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5 py-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
          ))}
        </Loading>
      ) : upcoming.length === 0 ? (
        <p className="text-muted-foreground px-4 pb-4 text-[12.5px] leading-relaxed">
          Nothing booked. Click a free time in the timetable to book a room.
        </p>
      ) : (
        <ul className="px-2 pb-2">
          {upcoming.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPickBooking(b)}
                className="hover:bg-accent focus-visible:ring-ring/60 flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2"
              >
                <span className="bg-primary mt-1 h-8 w-1 shrink-0 rounded-full" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{b.title}</span>
                  <span className="text-muted-foreground flex items-center gap-1 truncate text-[11.5px]">
                    <Clock className="size-3 shrink-0" />
                    {relativeDay(b.date) === "Today" || relativeDay(b.date) === "Tomorrow" ? relativeDay(b.date) : formatDateShort(b.date)} ·{" "}
                    {formatRange(b.startMin, b.endMin)}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 truncate text-[11.5px]">
                    <DoorOpen className="size-3 shrink-0" />
                    {roomName(b.roomId)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

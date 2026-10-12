import { Plus } from "lucide-react";
import * as React from "react";

import { Loading, Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/useNow";
import type { Booking, Room, RoomsInfo } from "@/lib/api";
import { formatRange, formatTime, formatTimeShort, nowMinutes, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";

const HOUR_PX = 64;
const PX_PER_MIN = HOUR_PX / 60;

/**
 * One day, every room side by side, office hours top to bottom. Click any free
 * spot to book it; click a booking to see or change it.
 */
export function RoomTimeline({
  info,
  date,
  bookings,
  loading = false,
  fill = true,
  showHeader = true,
  onPickSlot,
  onPickBooking,
}: {
  /** Pass a subset of `info.rooms` to show only those (a phone shows one room at a time). */
  info: RoomsInfo;
  date: string;
  bookings: Booking[];
  /** The day's bookings are still on their way: draw placeholders and take no clicks. */
  loading?: boolean;
  /**
   * Fill the parent's height and scroll inside (PC and tablet), or take the
   * full height of the day and let the page scroll (phone).
   */
  fill?: boolean;
  /** The room-name row. A phone names the room in its tabs instead. */
  showHeader?: boolean;
  onPickSlot: (roomId: number, startMin: number) => void;
  onPickBooking: (booking: Booking) => void;
}) {
  const { openMin, closeMin } = info.hours;
  const isToday = date === todayISO();
  const isPast = date < todayISO();
  const now = useNow();
  const height = (closeMin - openMin) * PX_PER_MIN;

  const hours: number[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hours.push(m);

  // Bookable from here on. Matches the server, which allows the slot in progress.
  const firstBookable = isPast ? closeMin : isToday ? now - (now % info.hours.slotMin) : openMin;

  // The timetable scrolls inside itself, so open each day somewhere useful:
  // today, an hour before now; any other day, opening time.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? Math.max(0, (nowMinutes() - 60 - openMin) * PX_PER_MIN) : 0;
    el.scrollTo({ top: target });
  }, [date, isToday, openMin]);

  return (
    <div
      className={cn("border-border bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm", fill && "h-full")}
      aria-busy={loading}
    >
      {loading ? <span className="sr-only" role="status">Loading bookings…</span> : null}
      <div
        ref={scrollRef}
        className={cn(fill ? "min-h-0 flex-1 overflow-auto overscroll-contain" : "overflow-x-auto")}
        tabIndex={-1}
      >
        {/* Several rooms need room to breathe; below this they scroll sideways. */}
        <div className={cn(info.rooms.length > 1 && "min-w-[640px]")}>
          {/* Room headers, pinned to the top of the scrolling timetable */}
          <div
            className={cn(
              "border-border bg-card/95 sticky top-0 z-30 grid grid-cols-[64px_repeat(var(--rooms),minmax(0,1fr))] border-b backdrop-blur-sm",
              !showHeader && "hidden",
            )}
            style={{ "--rooms": info.rooms.length } as React.CSSProperties}
          >
            <div className="bg-card sticky left-0" />
            {info.rooms.map((room) => (
              <RoomHeader
                key={room.id}
                room={room}
                bookings={bookings.filter((b) => b.roomId === room.id)}
                loading={loading}
                isToday={isToday}
                now={now}
              />
            ))}
          </div>

          {/* Grid */}
          <div
            className="relative grid grid-cols-[64px_repeat(var(--rooms),minmax(0,1fr))]"
            style={{ "--rooms": info.rooms.length, height: height + 16 } as React.CSSProperties}
          >
            {/* Hour labels, pinned to the left when the rooms scroll sideways on a phone */}
            <div className="bg-card sticky left-0 z-20">
              {hours.map((m) => (
                <span
                  key={m}
                  className="text-muted-foreground num absolute right-3 -translate-y-1/2 text-[11px] font-semibold"
                  style={{ top: (m - openMin) * PX_PER_MIN + 8 }}
                >
                  {formatTimeShort(m)}
                  <span className="ml-0.5 text-[9.5px] font-bold uppercase">{m < 720 ? "am" : "pm"}</span>
                </span>
              ))}
            </div>

            {info.rooms.map((room, index) =>
              loading ? (
                <PlaceholderColumn key={room.id} index={index} />
              ) : (
                <RoomColumn
                  key={room.id}
                  room={room}
                  info={info}
                  bookings={bookings.filter((b) => b.roomId === room.id)}
                  firstBookable={firstBookable}
                  onPickSlot={onPickSlot}
                  onPickBooking={onPickBooking}
                />
              ),
            )}

            {/* Hour lines, drawn once across every column */}
            <div className="pointer-events-none absolute inset-x-0 top-2" aria-hidden="true">
              {hours.map((m) => (
                <div key={m} className="border-border absolute right-0 left-16 border-t" style={{ top: (m - openMin) * PX_PER_MIN }} />
              ))}
              {hours.slice(0, -1).map((m) => (
                <div
                  key={`h${m}`}
                  className="border-border/60 absolute right-0 left-16 border-t border-dashed"
                  style={{ top: (m + 30 - openMin) * PX_PER_MIN }}
                />
              ))}
            </div>

            {/* The current time */}
            {isToday && now >= openMin && now <= closeMin ? (
              <div
                className="pointer-events-none absolute right-0 left-14 z-20 flex items-center"
                style={{ top: (now - openMin) * PX_PER_MIN + 8 }}
                aria-hidden="true"
              >
                <span className="bg-primary-strong size-2.5 -translate-x-1/2 rounded-full ring-2 ring-white" />
                <span className="bg-primary-strong h-0.5 flex-1" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomHeader({
  room,
  bookings,
  loading,
  isToday,
  now,
}: {
  room: Room;
  bookings: Booking[];
  loading: boolean;
  isToday: boolean;
  now: number;
}) {
  if (loading) {
    return (
      <div className="border-border min-w-0 border-l px-4 py-3.5">
        <p className="truncate text-[14px] font-bold">{room.name}</p>
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>
    );
  }

  let status: React.ReactNode = (
    <span className="text-muted-foreground">
      {bookings.length === 0 ? "No bookings" : `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}
    </span>
  );
  if (isToday) {
    const current = bookings.find((b) => b.startMin <= now && b.endMin > now);
    status = current ? (
      <span className="text-warning flex items-center gap-1.5">
        <span className="bg-warning size-1.5 rounded-full" /> In use until {formatTime(current.endMin)}
      </span>
    ) : (
      <span className="text-good flex items-center gap-1.5">
        <span className="bg-good size-1.5 rounded-full" /> Free now
      </span>
    );
  }

  return (
    <div className="border-border min-w-0 border-l px-4 py-3.5">
      <p className="truncate text-[14px] font-bold">{room.name}</p>
      <p className="mt-0.5 truncate text-[12px] font-medium">{status}</p>
    </div>
  );
}

function RoomColumn({
  room,
  info,
  bookings,
  firstBookable,
  onPickSlot,
  onPickBooking,
}: {
  room: Room;
  info: RoomsInfo;
  bookings: Booking[];
  firstBookable: number;
  onPickSlot: (roomId: number, startMin: number) => void;
  onPickBooking: (booking: Booking) => void;
}) {
  const { openMin, closeMin, slotMin } = info.hours;
  const [hover, setHover] = React.useState<number | null>(null);

  function slotAt(event: React.MouseEvent<HTMLDivElement>) {
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const minute = openMin + Math.floor(y / PX_PER_MIN / slotMin) * slotMin;
    if (minute < openMin || minute >= closeMin || minute < firstBookable) return null;
    if (bookings.some((b) => b.startMin <= minute && b.endMin > minute)) return null;
    return minute;
  }

  const pastHeight = Math.max(0, Math.min(firstBookable, closeMin) - openMin) * PX_PER_MIN;

  return (
    <div className="border-border relative border-l">
      <div
        className="absolute inset-x-0 top-2"
        style={{ height: (closeMin - openMin) * PX_PER_MIN }}
        onMouseMove={(e) => setHover(slotAt(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const minute = slotAt(e);
          if (minute !== null) onPickSlot(room.id, minute);
        }}
      >
        {/* Time that has gone by */}
        {pastHeight > 0 ? (
          <div
            className="absolute inset-x-0 top-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(28_25_21/0.035)_6px_7px)]"
            style={{ height: pastHeight }}
            aria-hidden="true"
          />
        ) : null}

        {hover !== null ? (
          <div
            className="border-primary/60 bg-primary-soft/70 text-primary-strong pointer-events-none absolute inset-x-1.5 z-10 flex items-center gap-1 rounded-md border border-dashed px-2 text-[11.5px] font-bold"
            style={{ top: (hover - openMin) * PX_PER_MIN, height: Math.min(60, closeMin - hover) * PX_PER_MIN - 2 }}
            aria-hidden="true"
          >
            <Plus className="size-3.5" /> {formatTime(hover)}
          </div>
        ) : null}

        {bookings.map((b) => (
          <BookingBlock key={b.id} booking={b} openMin={openMin} past={b.endMin <= firstBookable} onPick={onPickBooking} />
        ))}
      </div>
    </div>
  );
}

function BookingBlock({
  booking,
  openMin,
  past,
  onPick,
}: {
  booking: Booking;
  openMin: number;
  past: boolean;
  onPick: (booking: Booking) => void;
}) {
  const height = (booking.endMin - booking.startMin) * PX_PER_MIN - 3;
  const compact = height < 44;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPick(booking);
      }}
      onMouseMove={(e) => e.stopPropagation()}
      className={cn(
        "focus-visible:ring-ring/60 absolute inset-x-1.5 z-10 overflow-hidden rounded-md border-l-[3px] px-2.5 text-left shadow-xs transition-[box-shadow,transform] outline-none hover:shadow-md focus-visible:ring-2",
        booking.mine
          ? "border-primary bg-primary-soft text-foreground"
          : "border-muted-foreground/40 bg-secondary text-foreground",
        past && "opacity-55",
        compact ? "flex items-center gap-2 py-0" : "py-1.5",
      )}
      style={{ top: (booking.startMin - openMin) * PX_PER_MIN + 1, height }}
      aria-label={`${booking.title}, ${formatRange(booking.startMin, booking.endMin)}, booked by ${booking.userName}`}
    >
      <p className="truncate text-[12.5px] leading-snug font-bold">{booking.title}</p>
      <p className={cn("text-muted-foreground num truncate text-[11.5px] leading-snug", compact && "shrink-0")}>
        {compact ? formatTime(booking.startMin) : formatRange(booking.startMin, booking.endMin)}
      </p>
      {height >= 64 ? (
        <p className={cn("mt-0.5 truncate text-[11.5px] font-semibold", booking.mine ? "text-primary-strong" : "text-muted-foreground")}>
          {booking.mine ? "You" : booking.userName}
        </p>
      ) : null}
    </button>
  );
}

/**
 * Booking-shaped shimmer blocks, at fixed positions that differ per column so
 * the grid looks like a day's schedule rather than three identical stripes.
 * Offsets are in minutes after opening.
 */
const PLACEHOLDER_BLOCKS = [
  [
    [120, 60],
    [300, 90],
  ],
  [
    [60, 45],
    [210, 60],
    [450, 60],
  ],
  [
    [150, 120],
    [390, 75],
  ],
];

function PlaceholderColumn({ index }: { index: number }) {
  const blocks = PLACEHOLDER_BLOCKS[index % PLACEHOLDER_BLOCKS.length];
  return (
    <div className="border-border relative border-l" aria-hidden="true">
      <div className="absolute inset-x-0 top-2">
        {blocks.map(([start, length]) => (
          <Skeleton
            key={start}
            className="absolute inset-x-1.5 rounded-md"
            style={{ top: start * PX_PER_MIN + 1, height: length * PX_PER_MIN - 3 }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The whole timeline before even the room list has arrived (the very first
 * paint). Shaped like the real thing so nothing jumps when it lands.
 */
export function TimelineSkeleton({ rooms = 2, fill = true }: { rooms?: number; fill?: boolean }) {
  const hours = 12;
  return (
    <Loading
      label="Loading the schedule"
      className={cn("border-border bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm", fill && "h-full")}
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn(rooms > 1 && "min-w-[640px]")}>
          <div
            className="border-border grid grid-cols-[64px_repeat(var(--rooms),minmax(0,1fr))] border-b"
            style={{ "--rooms": rooms } as React.CSSProperties}
          >
            <div />
            {Array.from({ length: rooms }, (_, i) => (
              <div key={i} className="border-border border-l px-4 py-3.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
          <div
            className="relative grid grid-cols-[64px_repeat(var(--rooms),minmax(0,1fr))]"
            style={{ "--rooms": rooms, height: hours * HOUR_PX + 16 } as React.CSSProperties}
          >
            <div className="relative">
              {Array.from({ length: hours + 1 }, (_, i) => (
                <Skeleton key={i} className="absolute right-3 h-2.5 w-8" style={{ top: i * HOUR_PX + 3 }} />
              ))}
            </div>
            {Array.from({ length: rooms }, (_, i) => (
              <PlaceholderColumn key={i} index={i} />
            ))}
            <div className="pointer-events-none absolute inset-x-0 top-2">
              {Array.from({ length: hours + 1 }, (_, i) => (
                <div key={i} className="border-border absolute right-0 left-16 border-t" style={{ top: i * HOUR_PX }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Loading>
  );
}

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";

import { BookingDialog, type BookingDraft } from "@/components/booking/BookingDialog";
import { RoomTimeline, TimelineSkeleton } from "@/components/booking/RoomTimeline";
import { MonthCalendar, RightNow, UpNext } from "@/components/booking/ScheduleAside";
import { PageIntro } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreakpoint, type Breakpoint } from "@/hooks/useBreakpoint";
import { useNow } from "@/hooks/useNow";
import { useQuery } from "@/hooks/useQuery";
import { useRooms } from "@/hooks/useRooms";
import { api, type Booking, type Room, type RoomsInfo } from "@/lib/api";
import { draftAt, nextSlot, quickDraft, roomStatus } from "@/lib/schedule";
import { addDays, formatDateLong, formatTime, parseISODate, relativeDay, startOfWeek, todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";

const weekdayFmt = new Intl.DateTimeFormat("en-AU", { weekday: "short" });

/**
 * The schedule, in three shapes:
 *
 * - PC: a sidebar (month calendar, which rooms are free right now, your next
 *   bookings) beside the day's timetable with every room side by side.
 * - Tablet: the week strip above the same all-rooms timetable.
 * - Phone: one room at a time, picked with tabs, so the timetable gets the
 *   whole width and nothing scrolls sideways. Booking starts from the bottom
 *   bar's "Book" button or by tapping a free time.
 *
 * All three share the state here (the date, the open dialog, the data), so
 * rotating a tablet or resizing a window keeps your place.
 */
export function SchedulePage() {
  const bp = useBreakpoint();
  const info = useRooms();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? todayISO();
  const setDate = React.useCallback(
    (next: string) => setParams(next === todayISO() ? {} : { date: next }, { replace: true }),
    [setParams],
  );

  // PC shows one day (its calendar fetches its own dots); the others show a
  // week strip with dots, so they fetch the week.
  const weekStart = startOfWeek(date);
  const from = bp === "desktop" ? date : weekStart;
  const to = bp === "desktop" ? date : addDays(weekStart, 6);
  const query = useQuery(() => api.bookings(from, to), [from, to]);
  // Until this range's bookings arrive, show none rather than the last
  // range's: a timetable that looks empty would read as "every room is free".
  const loading = query.pending && !query.error;
  const bookings = React.useMemo(() => (query.stale ? [] : (query.data?.bookings ?? [])), [query.data, query.stale]);
  const dayBookings = React.useMemo(() => bookings.filter((b) => b.date === date), [bookings, date]);

  // Everything on the page that shows bookings refetches when `version` moves.
  const [version, setVersion] = React.useState(0);
  const { reload } = query;
  const refresh = React.useCallback(() => {
    reload();
    setVersion((v) => v + 1);
  }, [reload]);
  React.useEffect(() => {
    // Keep it current when someone else books while this is open.
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const [dialog, setDialog] = React.useState<{ draft?: BookingDraft; booking?: Booking } | null>(null);
  const [phoneRoomId, setPhoneRoomId] = React.useState<number | null>(null);
  const phoneRoom = info?.rooms.find((r) => r.id === phoneRoomId) ?? info?.rooms[0];

  const openNew = React.useCallback(() => {
    if (!info) return;
    setDialog({ draft: quickDraft(info, date, dayBookings, bp === "mobile" ? phoneRoom?.id : undefined) });
  }, [info, date, dayBookings, bp, phoneRoom]);

  // The phone's bottom-bar "Book" button lands here with ?book=1, from any page.
  React.useEffect(() => {
    if (!params.get("book") || !info || loading) return;
    openNew();
    const next = new URLSearchParams(params);
    next.delete("book");
    setParams(next, { replace: true });
  }, [params, info, loading, openNew, setParams]);

  const pickSlot = (roomId: number, startMin: number) =>
    info && setDialog({ draft: draftAt(info.hours, dayBookings, roomId, date, startMin) });
  const pickBooking = (booking: Booking) => setDialog({ booking });

  const shared: LayoutProps = {
    bp,
    info,
    date,
    setDate,
    bookings,
    dayBookings,
    loading,
    error: query.error,
    version,
    openNew,
    pickSlot,
    pickBooking,
  };

  return (
    <>
      {bp === "desktop" ? (
        <DesktopSchedule
          {...shared}
          onBookNow={(roomId, todayBookings) =>
            info && setDialog({ draft: draftAt(info.hours, todayBookings, roomId, todayISO(), nextSlot(info.hours)) })
          }
        />
      ) : bp === "tablet" ? (
        <TabletSchedule {...shared} />
      ) : (
        <PhoneSchedule {...shared} room={phoneRoom} onRoomChange={setPhoneRoomId} />
      )}

      {info ? (
        <BookingDialog
          open={dialog !== null}
          onOpenChange={(open) => !open && setDialog(null)}
          info={info}
          draft={dialog?.draft}
          booking={dialog?.booking}
          onChanged={refresh}
        />
      ) : null}
    </>
  );
}

interface LayoutProps {
  bp: Breakpoint;
  info: RoomsInfo | null;
  date: string;
  setDate: (date: string) => void;
  bookings: Booking[];
  dayBookings: Booking[];
  loading: boolean;
  error: Error | null;
  version: number;
  openNew: () => void;
  pickSlot: (roomId: number, startMin: number) => void;
  pickBooking: (booking: Booking) => void;
}

// ---------------------------------------------------------------- PC

function DesktopSchedule({
  info,
  date,
  setDate,
  dayBookings,
  loading,
  error,
  version,
  openNew,
  pickSlot,
  pickBooking,
  onBookNow,
}: LayoutProps & { onBookNow: (roomId: number, todayBookings: Booking[]) => void }) {
  const today = todayISO();

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[296px_minmax(0,1fr)] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* Scrolls on its own if the window is too short for all three cards. */}
      {/* Cards keep their full height (no shrinking to fit); the column scrolls instead. */}
      <aside className="-mr-2 flex min-h-0 flex-col gap-4 overflow-y-auto pr-2 pb-1 [&>*]:shrink-0">
        <MonthCalendar date={date} onSelect={setDate} version={version} />
        {info ? (
          <>
            <RightNow info={info} version={version} onBookNow={onBookNow} onPickBooking={pickBooking} />
            <UpNext info={info} version={version} onPickBooking={pickBooking} />
          </>
        ) : (
          <>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </>
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-primary-strong text-[11px] font-bold tracking-[0.16em] uppercase">
              {relativeDay(date) === formatDateLong(date) ? "Schedule" : relativeDay(date)}
            </p>
            <h1 className="font-display mt-1 truncate text-[30px] leading-tight font-semibold tracking-tight">
              {formatDateLong(date)}
            </h1>
            <div className="text-muted-foreground mt-1 text-[13.5px]">
              <Summary loading={loading} dayBookings={dayBookings} verb="Click" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center">
              <Button variant="outline" size="icon" className="rounded-r-none" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
                <ChevronLeft />
              </Button>
              <Button variant="outline" className="-ml-px rounded-none" onClick={() => setDate(today)} disabled={date === today}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="-ml-px rounded-l-none" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
                <ChevronRight />
              </Button>
            </div>
            <Button size="lg" disabled={!info || loading} onClick={openNew}>
              <Plus /> New booking
            </Button>
          </div>
        </div>

        <div className="flex min-h-[380px] flex-1 flex-col">
          {info ? (
            <RoomTimeline
              info={info}
              date={date}
              bookings={dayBookings}
              loading={loading}
              onPickSlot={pickSlot}
              onPickBooking={pickBooking}
            />
          ) : (
            <TimelineSkeleton />
          )}
        </div>
        {error ? <p className="text-destructive mt-3 text-[13px]">{error.message}</p> : null}
        <Legend hint="Click an empty spot to book it." />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- tablet

function TabletSchedule({ info, date, setDate, bookings, dayBookings, loading, error, openNew, pickSlot, pickBooking }: LayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageIntro
        eyebrow={relativeDay(date) === formatDateLong(date) ? "Schedule" : relativeDay(date)}
        title={formatDateLong(date)}
        actions={
          // Disabled until the day is in, since it picks a room that is free.
          <Button size="lg" disabled={!info || loading} onClick={openNew}>
            <Plus /> New booking
          </Button>
        }
      >
        <Summary loading={loading} dayBookings={dayBookings} verb="Tap" />
      </PageIntro>

      <WeekStrip date={date} bookings={bookings} loading={loading} onSelect={setDate} showJump />

      {/* The floor keeps the timetable usable on a short window; below it, the page scrolls instead. */}
      <div className="mt-5 flex min-h-[380px] flex-1 flex-col">
        {info ? (
          <RoomTimeline info={info} date={date} bookings={dayBookings} loading={loading} onPickSlot={pickSlot} onPickBooking={pickBooking} />
        ) : (
          <TimelineSkeleton />
        )}
        {error ? <p className="text-destructive mt-3 text-[13px]">{error.message}</p> : null}
      </div>

      <Legend hint="Tap an empty spot to book it." />
    </div>
  );
}

// ---------------------------------------------------------------- phone

function PhoneSchedule({
  info,
  date,
  setDate,
  bookings,
  dayBookings,
  loading,
  error,
  pickSlot,
  pickBooking,
  room,
  onRoomChange,
}: LayoutProps & { room: Room | undefined; onRoomChange: (roomId: number) => void }) {
  const today = todayISO();
  const roomBookings = room ? dayBookings.filter((b) => b.roomId === room.id) : [];

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-primary-strong text-[10.5px] font-bold tracking-[0.16em] uppercase">
            {relativeDay(date) === formatDateLong(date) ? "Schedule" : relativeDay(date)}
          </p>
          <h1 className="font-display mt-0.5 text-[24px] leading-tight font-semibold tracking-tight">{formatDateLong(date)}</h1>
        </div>
        {date !== today ? (
          <Button variant="outline" size="sm" onClick={() => setDate(today)}>
            Today
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        <WeekStrip date={date} bookings={bookings} loading={loading} onSelect={setDate} />
      </div>

      {/* Pinned under the top bar while the day scrolls past. */}
      <div className="bg-background/90 sticky top-16 z-20 -mx-4 mt-3 px-4 py-2.5 backdrop-blur-md">
        {info ? (
          <RoomTabs info={info} date={date} dayBookings={dayBookings} loading={loading} selected={room?.id} onSelect={onRoomChange} />
        ) : (
          <Skeleton className="h-12 rounded-xl" />
        )}
      </div>

      <div className="mt-1">
        {info && room ? (
          <RoomTimeline
            info={{ ...info, rooms: [room] }}
            date={date}
            bookings={roomBookings}
            loading={loading}
            fill={false}
            showHeader={false}
            onPickSlot={pickSlot}
            onPickBooking={pickBooking}
          />
        ) : (
          <TimelineSkeleton rooms={1} fill={false} />
        )}
        {error ? <p className="text-destructive mt-3 text-[13px]">{error.message}</p> : null}
      </div>

      <Legend hint="Tap a free time to book it." />
    </div>
  );
}

/** A segmented control of rooms, each with its state today (or its booking count on other days). */
function RoomTabs({
  info,
  date,
  dayBookings,
  loading,
  selected,
  onSelect,
}: {
  info: RoomsInfo;
  date: string;
  dayBookings: Booking[];
  loading: boolean;
  selected: number | undefined;
  onSelect: (roomId: number) => void;
}) {
  const now = useNow();
  const isToday = date === todayISO();

  return (
    <div role="tablist" aria-label="Rooms" className="bg-muted grid grid-cols-[repeat(var(--rooms),minmax(0,1fr))] gap-1 rounded-xl p-1" style={{ "--rooms": info.rooms.length } as React.CSSProperties}>
      {info.rooms.map((room) => {
        const active = room.id === selected;
        const roomBookings = dayBookings.filter((b) => b.roomId === room.id);
        const status = isToday ? roomStatus(roomBookings, now, info.hours) : null;
        const line = loading
          ? null
          : status
            ? status.kind === "busy"
              ? `Busy till ${formatTime(status.until).replace(":00", "")}`
              : status.kind === "free"
                ? "Free now"
                : "Closed"
            : roomBookings.length === 0
              ? "All free"
              : `${roomBookings.length} booked`;
        return (
          <button
            key={room.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(room.id)}
            className={cn(
              "focus-visible:ring-ring/60 min-w-0 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2",
              active ? "bg-card shadow-sm" : "hover:bg-card/50",
            )}
          >
            <span className={cn("block truncate text-[12.5px] font-bold", !active && "text-muted-foreground")}>{room.name}</span>
            <span className="mt-0.5 flex h-4 items-center gap-1 text-[11px] font-medium">
              {loading ? (
                <Skeleton className="h-2.5 w-14" />
              ) : (
                <>
                  {status ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        status.kind === "free" ? "bg-good" : status.kind === "busy" ? "bg-warning" : "bg-muted-foreground/40",
                      )}
                    />
                  ) : null}
                  <span className="text-muted-foreground truncate">{line}</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- shared pieces

function Summary({ loading, dayBookings, verb }: { loading: boolean; dayBookings: Booking[]; verb: "Click" | "Tap" }) {
  if (loading) return <Skeleton className="mt-1 h-4 w-64 max-w-full" />;
  if (dayBookings.length === 0) return <>Every room is free. {verb} any time below to book it.</>;
  const mine = dayBookings.filter((b) => b.mine).length;
  return (
    <>
      {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"} across the rooms{mine ? `, ${mine} of them yours` : ""}.
    </>
  );
}

function WeekStrip({
  date,
  bookings,
  loading,
  onSelect,
  showJump = false,
}: {
  date: string;
  bookings: Booking[];
  loading: boolean;
  onSelect: (date: string) => void;
  /** The Today button and date field beside the strip. A phone has a Today button in its heading instead. */
  showJump?: boolean;
}) {
  const today = todayISO();
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
        <Button variant="outline" size="icon" className="shrink-0 max-sm:size-8" onClick={() => onSelect(addDays(date, -7))} aria-label="Previous week">
          <ChevronLeft />
        </Button>
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((d) => {
            const selected = d === date;
            const count = bookings.filter((b) => b.date === d).length;
            const mine = bookings.some((b) => b.date === d && b.mine);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelect(d)}
                aria-pressed={selected}
                aria-label={`${formatDateLong(d)}${loading ? "" : `, ${count} booking${count === 1 ? "" : "s"}`}`}
                className={cn(
                  "focus-visible:ring-ring/60 relative flex min-w-0 flex-col items-center rounded-xl border py-2 transition-colors outline-none focus-visible:ring-2",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-primary/60 hover:bg-primary-soft/50",
                  d < today && !selected && "text-muted-foreground",
                )}
              >
                <span className={cn("text-[10px] font-bold tracking-wide uppercase sm:text-[10.5px]", selected ? "text-background/70" : "text-muted-foreground")}>
                  {d === today ? (
                    <>
                      <span className="sm:hidden">Now</span>
                      <span className="max-sm:hidden">Today</span>
                    </>
                  ) : (
                    weekdayFmt.format(parseISODate(d))
                  )}
                </span>
                <span className="font-display num mt-0.5 text-[18px] leading-none font-semibold sm:text-[19px]">{parseISODate(d).getDate()}</span>
                <span className="mt-1.5 flex h-1.5 gap-0.5" aria-hidden="true">
                  {loading ? (
                    <span className={cn("size-1.5 animate-pulse rounded-full", selected ? "bg-background/30" : "bg-muted-foreground/20")} />
                  ) : count > 0 ? (
                    <span className={cn("size-1.5 rounded-full", mine ? "bg-primary" : selected ? "bg-background/50" : "bg-muted-foreground/40")} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="outline" size="icon" className="shrink-0 max-sm:size-8" onClick={() => onSelect(addDays(date, 7))} aria-label="Next week">
          <ChevronRight />
        </Button>
      </div>

      {showJump ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onSelect(today)} disabled={date === today}>
            Today
          </Button>
          <Input type="date" aria-label="Jump to date" className="w-auto" value={date} onChange={(e) => e.target.value && onSelect(e.target.value)} />
        </div>
      ) : null}
    </div>
  );
}

function Legend({ hint }: { hint: string }) {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
      <span className="flex items-center gap-2">
        <span className="border-primary bg-primary-soft h-3.5 w-5 rounded-sm border-l-[3px]" /> Your bookings
      </span>
      <span className="flex items-center gap-2">
        <span className="border-muted-foreground/40 bg-secondary h-3.5 w-5 rounded-sm border-l-[3px]" /> Someone else's
      </span>
      <span>{hint}</span>
    </div>
  );
}

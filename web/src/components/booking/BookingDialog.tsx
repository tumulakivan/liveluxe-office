import { CalendarDays, Clock, DoorOpen, Loader2, Trash2, UserRound } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { api, type Booking, type RoomsInfo } from "@/lib/api";
import { addDays, formatDateLong, formatDuration, formatRange, formatTime, todayISO } from "@/lib/time";
import { useUser } from "@/providers/SessionProvider";

export interface BookingDraft {
  roomId: number;
  date: string;
  startMin: number;
  endMin: number;
}

/**
 * One dialog for every booking interaction. Given a draft it creates; given a
 * booking it edits (yours, or anyone's if you are an admin) or just shows who
 * has the room (someone else's).
 */
export function BookingDialog({
  open,
  onOpenChange,
  info,
  draft,
  booking,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: RoomsInfo;
  draft?: BookingDraft;
  booking?: Booking;
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so each opening starts from the booking or draft it was opened with. */}
        {open ? (
          <Body
            key={booking ? `b${booking.id}` : `d${draft?.roomId}-${draft?.date}-${draft?.startMin}`}
            info={info}
            draft={draft}
            booking={booking}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  info,
  draft,
  booking,
  onClose,
  onChanged,
}: {
  info: RoomsInfo;
  draft?: BookingDraft;
  booking?: Booking;
  onClose: () => void;
  onChanged: () => void;
}) {
  const user = useUser();
  const canEdit = !booking || booking.mine || user.role === "admin";
  const room = (id: number) => info.rooms.find((r) => r.id === id);

  if (booking && !canEdit) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{booking.title}</DialogTitle>
          <DialogDescription>This room is booked. Ask {booking.userName.split(" ")[0]} if you need it.</DialogDescription>
        </DialogHeader>
        <dl className="bg-muted/60 space-y-2.5 rounded-xl p-4 text-[13.5px]">
          <Detail icon={DoorOpen}>{room(booking.roomId)?.name}</Detail>
          <Detail icon={CalendarDays}>{formatDateLong(booking.date)}</Detail>
          <Detail icon={Clock}>
            {formatRange(booking.startMin, booking.endMin)}{" "}
            <span className="text-muted-foreground">({formatDuration(booking.endMin - booking.startMin)})</span>
          </Detail>
          <Detail icon={UserRound}>{booking.userName}</Detail>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <EditForm info={info} draft={draft} booking={booking} onClose={onClose} onChanged={onChanged} />;
}

function Detail({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="text-primary-strong size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function EditForm({
  info,
  draft,
  booking,
  onClose,
  onChanged,
}: {
  info: RoomsInfo;
  draft?: BookingDraft;
  booking?: Booking;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { openMin, closeMin, slotMin } = info.hours;
  const initial = booking ?? draft ?? { roomId: info.rooms[0]?.id ?? 0, date: todayISO(), startMin: openMin, endMin: openMin + 60 };

  const [title, setTitle] = React.useState(booking?.title ?? "");
  const [roomId, setRoomId] = React.useState(initial.roomId);
  const [date, setDate] = React.useState(initial.date);
  const [startMin, setStartMin] = React.useState(initial.startMin);
  const [endMin, setEndMin] = React.useState(initial.endMin);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"save" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const times = React.useMemo(() => {
    const list: number[] = [];
    for (let m = openMin; m <= closeMin; m += slotMin) list.push(m);
    return list;
  }, [openMin, closeMin, slotMin]);

  function changeStart(value: number) {
    // Keep the same length when the start moves, as far as closing time allows.
    const length = endMin - startMin;
    setStartMin(value);
    setEndMin(Math.min(value + length, closeMin));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy("save");
    setError(null);
    const input = { roomId, title, date, startMin, endMin };
    try {
      if (booking) {
        await api.updateBooking(booking.id, input);
        toast.success("Booking updated.");
      } else {
        await api.createBooking(input);
        const roomName = info.rooms.find((r) => r.id === roomId)?.name ?? "Room";
        toast.success(`${roomName} booked, ${formatTime(startMin)} ${date === todayISO() ? "today" : formatDateLong(date)}.`);
      }
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    setBusy("cancel");
    try {
      await api.cancelBooking(booking.id);
      toast.success("Booking cancelled.");
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const someoneElses = booking && !booking.mine;

  return (
    <form onSubmit={save} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{booking ? "Edit booking" : "Book a room"}</DialogTitle>
        <DialogDescription>
          {someoneElses
            ? `This is ${booking.userName}'s booking. As an admin you can change or cancel it.`
            : booking
              ? "Change the details, or cancel it to free the room."
              : "Rooms are booked in 15-minute steps between opening and closing time."}
        </DialogDescription>
      </DialogHeader>

      <FormError>{error}</FormError>

      <Field label="What's it for?" htmlFor="booking-title">
        <Input
          id="booking-title"
          placeholder="e.g. Vendor meeting, Team catch-up"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Field label="Room" htmlFor="booking-room">
          <Select id="booking-room" value={roomId} onChange={(e) => setRoomId(Number(e.target.value))}>
            {info.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="booking-date">
          <Input
            id="booking-date"
            type="date"
            min={todayISO()}
            max={addDays(todayISO(), info.horizonDays)}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="From" htmlFor="booking-start">
          <Select id="booking-start" value={startMin} onChange={(e) => changeStart(Number(e.target.value))}>
            {times.slice(0, -1).map((m) => (
              <option key={m} value={m}>
                {formatTime(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Until" htmlFor="booking-end">
          <Select id="booking-end" value={endMin} onChange={(e) => setEndMin(Number(e.target.value))}>
            {times
              .filter((m) => m > startMin)
              .map((m) => (
                <option key={m} value={m}>
                  {formatTime(m)} ({formatDuration(m - startMin)})
                </option>
              ))}
          </Select>
        </Field>
      </div>

      {confirmCancel ? (
        <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px]">
            Cancel this booking{someoneElses ? ` for ${booking!.userName}` : ""}? The room becomes free for anyone.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
            <Button variant="destructive" size="sm" disabled={busy !== null} onClick={cancelBooking}>
              {busy === "cancel" ? <Loader2 className="animate-spin" /> : null}
              Cancel booking
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className="sm:justify-between">
          {booking ? (
            <Button variant="destructive-ghost" onClick={() => setConfirmCancel(true)}>
              <Trash2 /> Cancel booking
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={busy !== null}>
              {busy === "save" ? <Loader2 className="animate-spin" /> : null}
              {booking ? "Save changes" : "Book room"}
            </Button>
          </div>
        </DialogFooter>
      )}
    </form>
  );
}

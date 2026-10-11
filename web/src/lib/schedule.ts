import type { BookingDraft } from "@/components/booking/BookingDialog";
import type { Booking, RoomsInfo } from "@/lib/api";
import { nowMinutes, todayISO } from "@/lib/time";

/**
 * The booking rules every layout shares: what a room is doing right now, and
 * what a new booking should be pre-filled with.
 */

export type RoomStatus =
  | { kind: "busy"; until: number; booking: Booking }
  | { kind: "free"; until: number | null }
  | { kind: "closed" };

/** A room's state at minute `now`, given that room's bookings for today. */
export function roomStatus(roomBookings: Booking[], now: number, hours: RoomsInfo["hours"]): RoomStatus {
  if (now >= hours.closeMin) return { kind: "closed" };
  const current = roomBookings.find((b) => b.startMin <= now && b.endMin > now);
  if (current) {
    // Back-to-back bookings read as one busy stretch.
    let until = current.endMin;
    for (const b of [...roomBookings].sort((a, z) => a.startMin - z.startMin)) {
      if (b.startMin <= until && b.endMin > until) until = b.endMin;
    }
    return { kind: "busy", until, booking: current };
  }
  const next = roomBookings.filter((b) => b.startMin > now).sort((a, z) => a.startMin - z.startMin)[0];
  return { kind: "free", until: next?.startMin ?? null };
}

/** The first slot that hasn't started yet, today. */
export function nextSlot(hours: RoomsInfo["hours"]) {
  const { openMin, closeMin, slotMin } = hours;
  return Math.min(Math.max(openMin, Math.ceil(nowMinutes() / slotMin) * slotMin), closeMin - slotMin);
}

/** A booking starting at `startMin`: an hour long, cut short by the next booking or closing time. */
export function draftAt(
  hours: RoomsInfo["hours"],
  dayBookings: Booking[],
  roomId: number,
  date: string,
  startMin: number,
): BookingDraft {
  const nextStart = dayBookings
    .filter((b) => b.roomId === roomId && b.startMin > startMin)
    .reduce((min, b) => Math.min(min, b.startMin), hours.closeMin);
  return { roomId, date, startMin, endMin: Math.min(startMin + 60, nextStart) };
}

/**
 * "New booking" with nothing picked: the next free hour on the day being
 * viewed (today if that day is past), in the first room that is free for it.
 * `preferRoomId` wins if it's free, e.g. the room tab open on a phone.
 */
export function quickDraft(info: RoomsInfo, date: string, dayBookings: Booking[], preferRoomId?: number): BookingDraft {
  const today = todayISO();
  const bookingDate = date < today ? today : date;
  const start = bookingDate === today ? nextSlot(info.hours) : 9 * 60;
  const known = bookingDate === date ? dayBookings : [];
  const isFree = (roomId: number) =>
    !known.some((b) => b.roomId === roomId && b.startMin < start + 60 && b.endMin > start);
  const ordered = [...info.rooms].sort((a, z) => Number(z.id === preferRoomId) - Number(a.id === preferRoomId));
  const room = ordered.find((r) => isFree(r.id)) ?? ordered[0];
  return draftAt(info.hours, known, room.id, bookingDate, start);
}

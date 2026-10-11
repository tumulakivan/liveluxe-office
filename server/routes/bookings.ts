import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";

import { config } from "../config.ts";
import { db, transaction } from "../db.ts";
import { HttpError, idParam, parse } from "../http.ts";
import { addDays, isRealDate, nowMinutes, today } from "../time.ts";

export const bookingsRouter = Router();

interface BookingRow {
  id: number;
  room_id: number;
  user_id: number;
  user_name: string;
  title: string;
  date: string;
  start_min: number;
  end_min: number;
}

const SELECT_BOOKING = `
  SELECT b.id, b.room_id, b.user_id, u.name AS user_name, b.title, b.date, b.start_min, b.end_min
    FROM bookings b JOIN users u ON u.id = b.user_id`;

function toDto(row: BookingRow, req: Request) {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    userName: row.user_name,
    title: row.title,
    date: row.date,
    startMin: row.start_min,
    endMin: row.end_min,
    mine: row.user_id === req.user!.id,
  };
}

const dateSchema = z.string().refine(isRealDate, "Pick a valid date.");

const bookingSchema = z
  .object({
    roomId: z.number().int().positive(),
    title: z.string().trim().min(1, "Give the booking a title.").max(80, "Keep the title under 80 characters."),
    date: dateSchema,
    startMin: z.number().int(),
    endMin: z.number().int(),
  })
  .refine((b) => b.endMin > b.startMin, "The booking has to end after it starts.")
  .refine(
    (b) => b.startMin % config.slotMin === 0 && b.endMin % config.slotMin === 0,
    `Bookings run in ${config.slotMin}-minute steps.`,
  )
  .refine(
    (b) => b.startMin >= config.openMin && b.endMin <= config.closeMin,
    "Rooms can only be booked during office hours.",
  );

type BookingInput = z.infer<typeof bookingSchema>;

/** Everything a booking must satisfy beyond its own shape. Throws on the first problem. */
function checkBookable(input: BookingInput, ignoreId: number | null) {
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(input.roomId);
  if (!room) throw new HttpError(400, "That room does not exist.");

  const now = today();
  if (input.date < now || (input.date === now && input.startMin < nowMinutes() - config.slotMin)) {
    throw new HttpError(400, "That time has already passed.");
  }
  if (input.date > addDays(now, config.horizonDays)) {
    throw new HttpError(400, `Bookings can be made up to ${config.horizonDays} days ahead.`);
  }

  const clash = db
    .prepare(
      `${SELECT_BOOKING}
        WHERE b.room_id = ? AND b.date = ? AND b.start_min < ? AND b.end_min > ? AND b.id != ?
        LIMIT 1`,
    )
    .get(input.roomId, input.date, input.endMin, input.startMin, ignoreId ?? 0) as BookingRow | undefined;
  if (clash) {
    throw new HttpError(409, `That clashes with "${clash.title}" (${clash.user_name}).`, "CLASH");
  }
}

/** The booking, if the person asking may change it. */
function loadOwnBooking(req: Request): BookingRow {
  const row = db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(idParam(req)) as BookingRow | undefined;
  if (!row) throw new HttpError(404, "That booking no longer exists.");
  if (row.user_id !== req.user!.id && req.user!.role !== "admin") {
    throw new HttpError(403, "Only the person who made a booking can change it.");
  }
  const now = today();
  if (row.date < now || (row.date === now && row.end_min <= nowMinutes())) {
    throw new HttpError(400, "That booking has already finished.");
  }
  return row;
}

bookingsRouter.get("/rooms", (_req, res) => {
  const rooms = db.prepare("SELECT id, name, kind FROM rooms ORDER BY sort, id").all();
  res.json({
    rooms,
    hours: { openMin: config.openMin, closeMin: config.closeMin, slotMin: config.slotMin },
    horizonDays: config.horizonDays,
  });
});

bookingsRouter.get("/bookings", (req, res) => {
  const { from, to } = parse(z.object({ from: dateSchema, to: dateSchema }), req.query);
  if (to < from || to > addDays(from, 62)) throw new HttpError(400, "Ask for at most two months at a time.");
  const rows = db
    .prepare(`${SELECT_BOOKING} WHERE b.date BETWEEN ? AND ? ORDER BY b.date, b.start_min`)
    .all(from, to) as unknown as BookingRow[];
  res.json({ bookings: rows.map((row) => toDto(row, req)) });
});

/** The signed-in person's bookings that have not finished yet. */
bookingsRouter.get("/bookings/mine", (req, res) => {
  const rows = db
    .prepare(
      `${SELECT_BOOKING}
        WHERE b.user_id = ? AND (b.date > ? OR (b.date = ? AND b.end_min > ?))
        ORDER BY b.date, b.start_min`,
    )
    .all(req.user!.id, today(), today(), nowMinutes()) as unknown as BookingRow[];
  res.json({ bookings: rows.map((row) => toDto(row, req)) });
});

bookingsRouter.post("/bookings", (req, res) => {
  const input = parse(bookingSchema, req.body);
  const id = transaction(() => {
    checkBookable(input, null);
    return db
      .prepare("INSERT INTO bookings (room_id, user_id, title, date, start_min, end_min) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.roomId, req.user!.id, input.title, input.date, input.startMin, input.endMin).lastInsertRowid;
  });
  const row = db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(id) as unknown as BookingRow;
  res.status(201).json({ booking: toDto(row, req) });
});

bookingsRouter.patch("/bookings/:id", (req, res) => {
  const input = parse(bookingSchema, req.body);
  const id = transaction(() => {
    const existing = loadOwnBooking(req);
    checkBookable(input, existing.id);
    db.prepare("UPDATE bookings SET room_id = ?, title = ?, date = ?, start_min = ?, end_min = ? WHERE id = ?").run(
      input.roomId,
      input.title,
      input.date,
      input.startMin,
      input.endMin,
      existing.id,
    );
    return existing.id;
  });
  const row = db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).get(id) as unknown as BookingRow;
  res.json({ booking: toDto(row, req) });
});

bookingsRouter.delete("/bookings/:id", (req, res) => {
  const existing = loadOwnBooking(req);
  db.prepare("DELETE FROM bookings WHERE id = ?").run(existing.id);
  res.json({ ok: true });
});

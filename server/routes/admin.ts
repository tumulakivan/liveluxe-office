import { Router } from "express";
import { z } from "zod";

import { endOtherSessions, hashPassword } from "../auth.ts";
import { config } from "../config.ts";
import { db, transaction } from "../db.ts";
import { HttpError, idParam, nameSchema, parse, usernameSchema } from "../http.ts";
import { addDays, nowMinutes, startOfWeek, today } from "../time.ts";

export const adminRouter = Router();

interface UserRow {
  id: number;
  name: string;
  username: string;
  role: "admin" | "staff";
  must_change_password: number;
  demo: number;
  created_at: string;
  last_login_at: string | null;
  reset_requested_at: string | null;
  upcoming: number;
}

function listUsers() {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.role, u.must_change_password, u.demo, u.created_at, u.last_login_at,
              r.requested_at AS reset_requested_at,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.user_id = u.id AND (b.date > ? OR (b.date = ? AND b.end_min > ?))) AS upcoming
         FROM users u LEFT JOIN reset_requests r ON r.user_id = u.id
        ORDER BY u.name COLLATE NOCASE`,
    )
    .all(today(), today(), nowMinutes()) as unknown as UserRow[];

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    onDefaultPassword: u.must_change_password === 1,
    demo: u.demo === 1,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    resetRequestedAt: u.reset_requested_at,
    upcomingBookings: u.upcoming,
  }));
}

function adminCount() {
  return (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number }).n;
}

function findUser(id: number) {
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as
    | { id: number; role: "admin" | "staff" }
    | undefined;
  if (!user) throw new HttpError(404, "That account no longer exists.");
  return user;
}

adminRouter.get("/users", (_req, res) => {
  res.json({ users: listUsers() });
});

adminRouter.post("/users", async (req, res) => {
  const input = parse(
    z.object({ name: nameSchema, username: usernameSchema, role: z.enum(["admin", "staff"]) }),
    req.body,
  );
  const taken = db.prepare("SELECT 1 FROM users WHERE username = ?").get(input.username);
  if (taken) throw new HttpError(409, `The username "${input.username}" is already in use.`);

  db.prepare(
    "INSERT INTO users (name, username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)",
  ).run(input.name, input.username, await hashPassword(config.defaultPassword), input.role);
  res.status(201).json({ users: listUsers() });
});

adminRouter.patch("/users/:id", (req, res) => {
  const id = idParam(req);
  const input = parse(
    z.object({ name: nameSchema.optional(), username: usernameSchema.optional(), role: z.enum(["admin", "staff"]).optional() }),
    req.body,
  );

  transaction(() => {
    const user = findUser(id);
    if (input.role && input.role !== user.role) {
      if (id === req.user!.id) throw new HttpError(400, "You cannot change your own role.");
      if (user.role === "admin" && adminCount() <= 1) throw new HttpError(400, "There must always be at least one admin.");
    }
    if (input.username) {
      const taken = db.prepare("SELECT 1 FROM users WHERE username = ? AND id != ?").get(input.username, id);
      if (taken) throw new HttpError(409, `The username "${input.username}" is already in use.`);
    }
    db.prepare(
      `UPDATE users SET name = COALESCE(?, name), username = COALESCE(?, username), role = COALESCE(?, role)
        WHERE id = ?`,
    ).run(input.name ?? null, input.username ?? null, input.role ?? null, id);
  });
  res.json({ users: listUsers() });
});

adminRouter.delete("/users/:id", (req, res) => {
  const id = idParam(req);
  transaction(() => {
    const user = findUser(id);
    if (id === req.user!.id) throw new HttpError(400, "You cannot remove your own account.");
    if (user.role === "admin" && adminCount() <= 1) throw new HttpError(400, "There must always be at least one admin.");
    // Sessions, bookings and any reset request go with the account (ON DELETE CASCADE).
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  res.json({ users: listUsers() });
});

/** Put an account back on the default password; they choose a new one at next sign-in. */
adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const id = idParam(req);
  findUser(id);
  const hash = await hashPassword(config.defaultPassword);
  transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?").run(hash, id);
    db.prepare("DELETE FROM reset_requests WHERE user_id = ?").run(id);
    endOtherSessions(id);
  });
  res.json({ users: listUsers() });
});

adminRouter.delete("/users/:id/reset-request", (req, res) => {
  db.prepare("DELETE FROM reset_requests WHERE user_id = ?").run(idParam(req));
  res.json({ users: listUsers() });
});

/** The numbers on the overview page. */
adminRouter.get("/stats", (_req, res) => {
  const now = today();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const count = (sql: string, ...params: (string | number)[]) =>
    (db.prepare(sql).get(...params) as { n: number }).n;

  const openMinutes = config.closeMin - config.openMin;
  const rooms = db
    .prepare(
      `SELECT r.id, r.name, r.kind,
              COALESCE(SUM(CASE WHEN b.date = ? THEN b.end_min - b.start_min END), 0) AS today_minutes,
              COALESCE(SUM(CASE WHEN b.date BETWEEN ? AND ? THEN b.end_min - b.start_min END), 0) AS week_minutes,
              COUNT(CASE WHEN b.date BETWEEN ? AND ? THEN 1 END) AS week_bookings
         FROM rooms r LEFT JOIN bookings b ON b.room_id = r.id
        GROUP BY r.id ORDER BY r.sort, r.id`,
    )
    .all(now, weekStart, weekEnd, weekStart, weekEnd) as {
    id: number;
    name: string;
    kind: string;
    today_minutes: number;
    week_minutes: number;
    week_bookings: number;
  }[];

  res.json({
    staff: count("SELECT COUNT(*) AS n FROM users"),
    admins: count("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    onDefaultPassword: count("SELECT COUNT(*) AS n FROM users WHERE must_change_password = 1"),
    resetRequests: count("SELECT COUNT(*) AS n FROM reset_requests"),
    bookingsToday: count("SELECT COUNT(*) AS n FROM bookings WHERE date = ?", now),
    bookingsThisWeek: count("SELECT COUNT(*) AS n FROM bookings WHERE date BETWEEN ? AND ?", weekStart, weekEnd),
    week: { from: weekStart, to: weekEnd },
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      todayUtilisation: r.today_minutes / openMinutes,
      weekUtilisation: r.week_minutes / (openMinutes * 5),
      weekBookings: r.week_bookings,
    })),
  });
});

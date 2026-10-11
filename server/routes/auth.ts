import { Router } from "express";
import { z } from "zod";

import {
  burnPasswordCheck,
  clearFailures,
  endOtherSessions,
  endSession,
  hashPassword,
  isThrottled,
  recordFailure,
  startSession,
  verifyPassword,
} from "../auth.ts";
import { config } from "../config.ts";
import { db } from "../db.ts";
import { HttpError, parse, passwordSchema } from "../http.ts";

export const authRouter = Router();

interface UserRow {
  id: number;
  password_hash: string;
}

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = parse(
    z.object({
      username: z.string().trim().toLowerCase().min(1, "Enter your username."),
      password: z.string().min(1, "Enter your password."),
    }),
    req.body,
  );

  const key = `${req.ip}|${username}`;
  if (isThrottled(key)) {
    throw new HttpError(429, "Too many attempts. Wait 15 minutes and try again.");
  }

  const user = db.prepare("SELECT id, password_hash FROM users WHERE username = ?").get(username) as
    | UserRow
    | undefined;

  const ok = user ? await verifyPassword(password, user.password_hash) : (await burnPasswordCheck(password), false);
  if (!user || !ok) {
    recordFailure(key);
    throw new HttpError(401, "That username and password do not match.");
  }

  clearFailures(key);
  startSession(res, user.id);
  res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

/**
 * Change your own password. This is also the forced step after signing in on
 * the default password, which is why it does not sit behind `requireUser`.
 */
authRouter.post("/password", async (req, res) => {
  if (!req.user) throw new HttpError(401, "Please sign in.");

  const { current, next } = parse(
    z.object({ current: z.string().min(1, "Enter your current password."), next: passwordSchema }),
    req.body,
  );

  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id) as {
    password_hash: string;
  };
  if (!(await verifyPassword(current, row.password_hash))) {
    throw new HttpError(400, "Your current password is not right.");
  }
  if (next === config.defaultPassword) {
    throw new HttpError(400, "Choose something other than the default password.");
  }
  if (next === current) {
    throw new HttpError(400, "That is the password you already have.");
  }

  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(
    await hashPassword(next),
    req.user.id,
  );
  db.prepare("DELETE FROM reset_requests WHERE user_id = ?").run(req.user.id);
  // Anywhere else still signed in on the old password is signed out.
  endOtherSessions(req.user.id, req);
  res.json({ ok: true });
});

/**
 * Forgot password. With no email there is nothing to send, so this raises a
 * request on the admin dashboard instead, and an admin resets the account to
 * the default password. The answer is the same whether or not the username
 * exists, so this cannot be used to find out who works here.
 */
authRouter.post("/forgot", (req, res) => {
  const { username } = parse(
    z.object({ username: z.string().trim().toLowerCase().min(1, "Enter your username.") }),
    req.body,
  );
  const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as
    | { id: number }
    | undefined;
  if (user) {
    db.prepare(
      `INSERT INTO reset_requests (user_id) VALUES (?)
       ON CONFLICT (user_id) DO UPDATE SET requested_at = datetime('now')`,
    ).run(user.id);
  }
  res.json({ ok: true });
});

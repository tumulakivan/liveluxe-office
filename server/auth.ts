import crypto from "node:crypto";
import { promisify } from "node:util";

import type { NextFunction, Request, Response } from "express";

import { config } from "./config.ts";
import { db } from "./db.ts";

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
export const SESSION_COOKIE = "office_session";

// ---------------------------------------------------------------- passwords

/** Stored as `scrypt$N$r$p$salt$hash` so the cost can be raised later without breaking old hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return crypto.timingSafeEqual(actual, expected);
}

// A real hash of nothing in particular, checked when the username is unknown
// so a miss takes as long as a wrong password and does not reveal who exists.
const decoyHash = hashPassword(crypto.randomBytes(16).toString("hex"));
export async function burnPasswordCheck(password: string) {
  await verifyPassword(password, await decoyHash);
}

// ---------------------------------------------------------------- sessions

export type Role = "admin" | "staff";

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Only a hash of the token is stored, so a copy of the database cannot be used to sign in. */
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function startSession(res: Response, userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.sessionDays * 86_400_000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expires.toISOString(),
  );
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    expires,
    path: "/",
  });
}

export function endSession(req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** Sign a user out everywhere, except the session making this request if one is given. */
export function endOtherSessions(userId: number, req?: Request) {
  const token = req ? readCookie(req, SESSION_COOKIE) : undefined;
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(
    userId,
    token ? hashToken(token) : "",
  );
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Attaches `req.user` when the cookie names a live session. Never rejects. */
export function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.username, u.role, u.must_change_password
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(hashToken(token), new Date().toISOString()) as
      | { id: number; name: string; username: string; role: Role; must_change_password: number }
      | undefined;
    if (row) {
      req.user = {
        id: row.id,
        name: row.name,
        username: row.username,
        role: row.role,
        mustChangePassword: row.must_change_password === 1,
      };
    }
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  // Someone still on the default password can do nothing until they choose their own.
  if (req.user.mustChangePassword) {
    res.status(403).json({ error: "Choose a new password first.", code: "MUST_CHANGE_PASSWORD" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireUser(req, res, () => {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Admins only." });
      return;
    }
    next();
  });
}

export function pruneExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

// ---------------------------------------------------------------- throttling

/**
 * A small in-memory limiter for sign-in attempts. Twenty people do not need
 * Redis; they need someone guessing passwords to be slowed to a crawl.
 */
const failures = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;

export function isThrottled(key: string) {
  const entry = failures.get(key);
  return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function clearFailures(key: string) {
  failures.delete(key);
}

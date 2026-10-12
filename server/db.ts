import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { config } from "./config.ts";

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new DatabaseSync(config.dbFile);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

/**
 * Schema changes are appended, never edited: each entry runs once, in order,
 * and `user_version` records how far a database has got.
 */
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE rooms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('meeting', 'boardroom')),
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_min INTEGER NOT NULL,
    end_min INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (end_min > start_min)
  );
  CREATE INDEX bookings_room_date ON bookings(room_id, date);
  CREATE INDEX bookings_user_date ON bookings(user_id, date);

  CREATE TABLE reset_requests (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    requested_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  // Accounts made by `npm run seed:demo`, so `npm run seed:demo -- --clear` can
  // remove them (and, by cascade, their bookings) without touching real staff.
  `ALTER TABLE users ADD COLUMN demo INTEGER NOT NULL DEFAULT 0;`,
  // Demo bookings are flagged too: the seeder also books for real admins, and
  // those must go on a clear even though the admin account stays.
  `ALTER TABLE bookings ADD COLUMN demo INTEGER NOT NULL DEFAULT 0;`,
  // The office lost Meeting Room 2. Its bookings go with it, by cascade.
  `DELETE FROM rooms WHERE name = 'Meeting Room 2';`,
];

function migrate() {
  const { user_version: current } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let version = current; version < MIGRATIONS.length; version++) {
    transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/** Run `fn` inside a transaction, rolling back if it throws. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

migrate();

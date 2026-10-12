import { hashPassword } from "./auth.ts";
import { db } from "./db.ts";

/**
 * First-run data: the two rooms, and the owner's admin account. Both only
 * happen on an empty database, so restarting never resurrects a removed
 * account or undoes a renamed room.
 */
export async function seed() {
  const { rooms } = db.prepare("SELECT COUNT(*) AS rooms FROM rooms").get() as { rooms: number };
  if (rooms === 0) {
    const insert = db.prepare("INSERT INTO rooms (name, kind, sort) VALUES (?, ?, ?)");
    insert.run("Meeting Room 1", "meeting", 1);
    insert.run("Boardroom", "boardroom", 2);
    console.log("[seed] created 2 rooms");
  }

  const { users } = db.prepare("SELECT COUNT(*) AS users FROM users").get() as { users: number };
  if (users === 0) {
    db.prepare(
      `INSERT INTO users (name, username, password_hash, role, must_change_password)
       VALUES (?, ?, ?, 'admin', 0)`,
    ).run("Claudio Pistone", "claudio.pistone", await hashPassword("claudeclaudioclaudest"));
    console.log("[seed] created admin account claudio.pistone");
  }
}

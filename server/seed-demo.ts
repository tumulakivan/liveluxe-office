/**
 * Demo data: made-up staff and a few weeks of bookings, for trying the app
 * before real people are added.
 *
 *   npm run seed:demo              replace any demo data with a fresh random set
 *   npm run seed:demo -- --clear   remove all demo staff and their bookings
 *
 * Demo accounts are flagged (users.demo = 1), so clearing never touches real
 * staff or the admin. They sign in with the default password and are asked to
 * choose their own, like any new account.
 *
 * Guarantees: bookings fall on weekdays between DEMO_FROM and DEMO_TO; no room
 * is double-booked; no one is in two rooms at once; and nothing clashes with
 * bookings already in the database.
 */
import { hashPassword } from "./auth.ts";
import { config } from "./config.ts";
import { db, transaction } from "./db.ts";
import { seed } from "./seed.ts";
import { addDays, parseDate, today } from "./time.ts";

const DEMO_FROM = 8 * 60; // 8:00 am
const DEMO_TO = 17 * 60; // 5:00 pm
const DAYS_BACK = 7;
const DAYS_AHEAD = 21;
const STAFF_WANTED = 12;
const MAX_USERS = 20; // the office's expected ceiling

const FIRST = [
  "Olivia", "Liam", "Charlotte", "Noah", "Amelia", "Jack", "Isla", "William", "Mia", "Oliver",
  "Ava", "Thomas", "Grace", "Lucas", "Chloe", "Henry", "Zara", "Ethan", "Sienna", "Mason",
  "Ruby", "Leo", "Harper", "Hugo", "Matilda", "Arjun", "Mei", "Daniel", "Priya", "Marco",
];
const LAST = [
  "Nguyen", "Smith", "Kelly", "Rossi", "Patel", "Walker", "Chen", "Murphy", "Taylor", "Romano",
  "Brown", "Wilson", "Martin", "Anderson", "Singh", "Thompson", "White", "Harris", "Lee", "Costa",
  "Clarke", "Baker", "Russo", "Kim", "Evans", "Hughes", "Ferrari", "Wright", "Tran", "Moretti",
];

const MEETING_TITLES = [
  "Vendor meeting", "Buyer consult", "Listing presentation", "Contract review", "Team catch-up",
  "Appraisal prep", "Marketing review", "Client call", "Property walkthrough debrief", "Offer negotiation",
  "Photographer briefing", "Open home planning", "Settlement check-in", "Leasing review", "1:1",
  "Pricing strategy", "Campaign sign-off", "Auction prep", "Investor consult", "Training session",
];
const BOARDROOM_TITLES = [
  "Sales meeting", "Quarterly review", "Leadership meeting", "Auction strategy", "Partner presentation",
  "All-hands", "Developer pitch", "Board meeting", "Agency planning", "Project marketing review",
];

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

interface Interval {
  start: number;
  end: number;
}
const overlaps = (list: Interval[] | undefined, start: number, end: number) =>
  (list ?? []).some((i) => i.start < end && i.end > start);

function clearDemo() {
  return transaction(() => {
    const counts = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM users WHERE demo = 1) AS users,
                (SELECT COUNT(*) FROM bookings WHERE demo = 1) AS bookings`,
      )
      .get() as { users: number; bookings: number };
    // Every demo booking, including ones made in a real admin's name; then
    // the demo accounts (anything they booked by hand goes with them).
    db.prepare("DELETE FROM bookings WHERE demo = 1").run();
    db.prepare("DELETE FROM users WHERE demo = 1").run();
    return counts;
  });
}

async function createStaff() {
  const existing = new Set(
    (db.prepare("SELECT username FROM users").all() as { username: string }[]).map((u) => u.username),
  );
  const room = MAX_USERS - existing.size;
  const wanted = Math.max(0, Math.min(STAFF_WANTED, room));
  const people: { name: string; username: string }[] = [];
  for (let tries = 0; people.length < wanted && tries < 500; tries++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const username = `${first}.${last}`.toLowerCase();
    if (existing.has(username)) continue;
    existing.add(username);
    people.push({ name: `${first} ${last}`, username });
  }

  // Hashed one by one: identical hashes would show at a glance which accounts share a password.
  const hashes = await Promise.all(people.map(() => hashPassword(config.defaultPassword)));
  const insert = db.prepare(
    "INSERT INTO users (name, username, password_hash, role, must_change_password, demo) VALUES (?, ?, ?, 'staff', 1, 1)",
  );
  return transaction(() =>
    people.map((p, i) => ({ id: Number(insert.run(p.name, p.username, hashes[i]).lastInsertRowid), name: p.name })),
  );
}

function createBookings(staffIds: number[]) {
  const rooms = db.prepare("SELECT id, kind FROM rooms ORDER BY sort, id").all() as { id: number; kind: string }[];
  const admins = (db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: number }[]).map((u) => u.id);
  // Admins book too, just less often than everyone else.
  const people = [...staffIds, ...staffIds, ...admins];

  const first = addDays(today(), -DAYS_BACK);
  const last = addDays(today(), DAYS_AHEAD);
  const existing = db
    .prepare("SELECT room_id, user_id, date, start_min, end_min FROM bookings WHERE date BETWEEN ? AND ?")
    .all(first, last) as { room_id: number; user_id: number; date: string; start_min: number; end_min: number }[];

  const insert = db.prepare(
    "INSERT INTO bookings (room_id, user_id, title, date, start_min, end_min, demo) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );

  return transaction(() => {
    let made = 0;
    for (let date = first; date <= last; date = addDays(date, 1)) {
      const weekday = parseDate(date).getDay();
      if (weekday === 0 || weekday === 6) continue;

      // Who and what is already taken today, starting from real bookings.
      const byRoom = new Map<number, Interval[]>();
      const byUser = new Map<number, Interval[]>();
      const take = (roomId: number, userId: number, start: number, end: number) => {
        byRoom.set(roomId, [...(byRoom.get(roomId) ?? []), { start, end }]);
        byUser.set(userId, [...(byUser.get(userId) ?? []), { start, end }]);
      };
      for (const b of existing) if (b.date === date) take(b.room_id, b.user_id, b.start_min, b.end_min);

      for (const room of rooms) {
        const boardroom = room.kind === "boardroom";
        let cursor = DEMO_FROM + pick([0, 0, 30, 60, 90, 120]);
        while (cursor < DEMO_TO) {
          const length = boardroom ? pick([60, 90, 120, 180]) : pick([30, 45, 60, 60, 90, 120]);
          const end = cursor + length;
          if (end > DEMO_TO) break;
          if (overlaps(byRoom.get(room.id), cursor, end)) {
            cursor += 15;
            continue;
          }
          const free = people.filter((id) => !overlaps(byUser.get(id), cursor, end));
          if (free.length === 0) {
            cursor += 30;
            continue;
          }
          const userId = pick(free);
          insert.run(room.id, userId, pick(boardroom ? BOARDROOM_TITLES : MEETING_TITLES), date, cursor, end);
          take(room.id, userId, cursor, end);
          made++;
          // Leave gaps so there are always free slots to try booking.
          cursor = end + (boardroom ? pick([60, 120, 180, 240]) : pick([0, 15, 30, 60, 90, 120, 180]));
        }
      }
    }
    return made;
  });
}

/** Re-checks the whole table, independently of how the bookings above were made. */
function verify() {
  const q = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    roomClashes: q(`SELECT COUNT(*) AS n FROM bookings a JOIN bookings b
                     ON a.id < b.id AND a.room_id = b.room_id AND a.date = b.date
                    AND a.start_min < b.end_min AND a.end_min > b.start_min`),
    personClashes: q(`SELECT COUNT(*) AS n FROM bookings a JOIN bookings b
                       ON a.id < b.id AND a.user_id = b.user_id AND a.date = b.date
                      AND a.start_min < b.end_min AND a.end_min > b.start_min`),
    outsideHours: q(`SELECT COUNT(*) AS n FROM bookings b JOIN users u ON u.id = b.user_id
                      WHERE b.demo = 1 AND (b.start_min < ${DEMO_FROM} OR b.end_min > ${DEMO_TO})`),
  };
}

await seed(); // make sure the rooms and admin exist on a brand-new database

if (process.argv.includes("--clear")) {
  const removed = clearDemo();
  console.log(`[demo] removed ${removed.users} demo staff and ${removed.bookings} of their bookings`);
} else {
  const removed = clearDemo();
  if (removed.users) console.log(`[demo] replaced the previous demo data (${removed.users} staff, ${removed.bookings} bookings)`);
  const staff = await createStaff();
  const made = createBookings(staff.map((s) => s.id));
  const check = verify();
  console.log(`[demo] created ${staff.length} staff: ${staff.map((s) => s.name).join(", ")}`);
  console.log(`[demo] created ${made} bookings, weekdays ${addDays(today(), -DAYS_BACK)} to ${addDays(today(), DAYS_AHEAD)}, 8am-5pm`);
  console.log(
    `[demo] check: ${check.roomClashes} room clashes, ${check.personClashes} double-booked people, ${check.outsideHours} outside 8am-5pm`,
  );
  if (check.roomClashes || check.personClashes || check.outsideHours) process.exitCode = 1;
}

import path from "node:path";

/**
 * Everything the office can tune lives here. The defaults suit one office in
 * one city; change them with environment variables rather than editing code.
 */

// Booking times are wall-clock times in the office, not instants. Pin the
// server's clock to the office's zone so "today" and "already started" mean
// what the people in the building think they mean.
process.env.TZ = process.env.OFFICE_TZ || "Australia/Sydney";

const root = path.resolve(import.meta.dirname, "..");

export const config = {
  port: Number(process.env.PORT) || 4100,
  dbFile: process.env.DB_FILE || path.join(root, "data", "office.db"),
  distDir: path.join(root, "dist"),
  production: process.env.NODE_ENV === "production",
  /** Set to "true" once the app is served over HTTPS. */
  secureCookies: process.env.COOKIE_SECURE === "true",

  /** Every new account, and every reset, starts with this password. */
  defaultPassword: "liveluxeau",
  sessionDays: 30,

  /** Bookable hours, in minutes after midnight, and the grid they snap to. */
  openMin: 7 * 60,
  closeMin: 19 * 60,
  slotMin: 15,
  /** How far ahead a booking can be made. */
  horizonDays: 90,
} as const;

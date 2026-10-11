/**
 * Mirrors server/time.ts: dates are `YYYY-MM-DD`, times are minutes after
 * midnight, both in office time. The browser is assumed to be in the office.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return formatISODate(new Date());
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function parseISODate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(date: string, days: number) {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

export function startOfWeek(date: string) {
  const day = parseISODate(date).getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** 570 -> "9:30 am" */
export function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** 570 -> "9:30", for tight spaces where am/pm is obvious from context. */
export function formatTimeShort(min: number) {
  const h = Math.floor(min / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min % 60 === 0 ? `${h12}` : `${h12}:${pad(min % 60)}`;
}

export function formatRange(start: number, end: number) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

const longFmt = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short" });

/** "Thursday 8 October" */
export function formatDateLong(date: string) {
  return longFmt.format(parseISODate(date));
}

/** "Thu 8 Oct" */
export function formatDateShort(date: string) {
  return shortFmt.format(parseISODate(date));
}

/** "Today", "Tomorrow", or the long date. */
export function relativeDay(date: string) {
  const today = todayISO();
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return formatDateLong(date);
}

/** SQLite's `datetime('now')` is UTC without a zone marker. */
export function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  const d = new Date(value.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

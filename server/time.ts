/**
 * Dates are `YYYY-MM-DD` strings and times are minutes after midnight, both in
 * office time (see config.ts). There are no instants in a booking, so there is
 * nothing for a timezone to shift.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() {
  return formatDate(new Date());
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Noon, so a daylight-saving jump can never push the result onto a different day. */
export function parseDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(date: string, days: number) {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function isRealDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && formatDate(parseDate(date)) === date;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string) {
  const day = parseDate(date).getDay(); // 0 = Sunday
  return addDays(date, day === 0 ? -6 : 1 - day);
}

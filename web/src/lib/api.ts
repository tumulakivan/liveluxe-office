/** Typed calls to the Office API. Everything is same-origin, so the session cookie just rides along. */

export type Role = "admin" | "staff";

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface Room {
  id: number;
  name: string;
  kind: "meeting" | "boardroom";
}

export interface RoomsInfo {
  rooms: Room[];
  hours: { openMin: number; closeMin: number; slotMin: number };
  horizonDays: number;
}

export interface Booking {
  id: number;
  roomId: number;
  userId: number;
  userName: string;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
  mine: boolean;
}

export interface BookingInput {
  roomId: number;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
}

export interface StaffMember {
  id: number;
  name: string;
  username: string;
  role: Role;
  onDefaultPassword: boolean;
  /** Made by `npm run seed:demo`; not a real person. */
  demo: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  resetRequestedAt: string | null;
  upcomingBookings: number;
}

export interface AdminStats {
  staff: number;
  admins: number;
  onDefaultPassword: number;
  resetRequests: number;
  bookingsToday: number;
  bookingsThisWeek: number;
  week: { from: string; to: string };
  rooms: { id: number; name: string; kind: string; todayUtilisation: number; weekUtilisation: number; weekBookings: number }[];
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: method === "GET" ? undefined : { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new ApiError(res.status, data.error ?? "Something went wrong. Try again.", data.code);
    if (res.status === 401 || data.code === "MUST_CHANGE_PASSWORD") {
      window.dispatchEvent(new CustomEvent("office:session-changed"));
    }
    throw error;
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null }>("GET", "/auth/me"),
  login: (username: string, password: string) => request<{ ok: true }>("POST", "/auth/login", { username, password }),
  logout: () => request<{ ok: true }>("POST", "/auth/logout"),
  changePassword: (current: string, next: string) =>
    request<{ ok: true }>("POST", "/auth/password", { current, next }),
  forgotPassword: (username: string) => request<{ ok: true }>("POST", "/auth/forgot", { username }),

  rooms: () => request<RoomsInfo>("GET", "/rooms"),
  bookings: (from: string, to: string) =>
    request<{ bookings: Booking[] }>("GET", `/bookings?from=${from}&to=${to}`),
  myBookings: () => request<{ bookings: Booking[] }>("GET", "/bookings/mine"),
  createBooking: (input: BookingInput) => request<{ booking: Booking }>("POST", "/bookings", input),
  updateBooking: (id: number, input: BookingInput) => request<{ booking: Booking }>("PATCH", `/bookings/${id}`, input),
  cancelBooking: (id: number) => request<{ ok: true }>("DELETE", `/bookings/${id}`),

  admin: {
    stats: () => request<AdminStats>("GET", "/admin/stats"),
    users: () => request<{ users: StaffMember[] }>("GET", "/admin/users"),
    addUser: (input: { name: string; username: string; role: Role }) =>
      request<{ users: StaffMember[] }>("POST", "/admin/users", input),
    updateUser: (id: number, input: Partial<{ name: string; username: string; role: Role }>) =>
      request<{ users: StaffMember[] }>("PATCH", `/admin/users/${id}`, input),
    removeUser: (id: number) => request<{ users: StaffMember[] }>("DELETE", `/admin/users/${id}`),
    resetPassword: (id: number) => request<{ users: StaffMember[] }>("POST", `/admin/users/${id}/reset-password`),
    dismissResetRequest: (id: number) =>
      request<{ users: StaffMember[] }>("DELETE", `/admin/users/${id}/reset-request`),
  },
};

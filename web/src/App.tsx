import { Link, Navigate, Route, Routes } from "react-router-dom";

import { RequireSignedOut, RequireUser } from "@/components/auth/Guards";
import { AdminShell } from "@/components/layout/AdminShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { SpaceTransitionProvider } from "@/components/layout/SpaceTransition";
import { AdminBookingsPage } from "@/pages/admin/Bookings";
import { AdminOverviewPage } from "@/pages/admin/Overview";
import { AdminStaffPage } from "@/pages/admin/Staff";
import { AccountPage } from "@/pages/app/Account";
import { MyBookingsPage } from "@/pages/app/MyBookings";
import { SchedulePage } from "@/pages/app/Schedule";
import { ChangePasswordPage } from "@/pages/auth/ChangePassword";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPassword";
import { SignInPage } from "@/pages/auth/SignIn";

export function App() {
  return (
    <SpaceTransitionProvider>
    <Routes>
      <Route element={<RequireSignedOut />}>
        <Route path="/login" element={<SignInPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route element={<RequireUser />}>
        <Route element={<AppLayout />}>
          <Route index element={<SchedulePage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="/admin" element={<RequireUser admin />}>
        <Route element={<AdminShell />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </SpaceTransitionProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display text-[28px] font-semibold">This room doesn't exist</p>
      <Link to="/" className="text-primary-strong font-semibold hover:underline">
        Back to the schedule
      </Link>
    </div>
  );
}

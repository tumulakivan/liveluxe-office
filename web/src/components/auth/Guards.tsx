import { Navigate, Outlet, useLocation } from "react-router-dom";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { useSession } from "@/providers/SessionProvider";

/** While we find out who is signed in: the first thing anyone sees on a cold load. */
export function Splash() {
  return <BrandLoader className="min-h-screen" caption="Getting the office ready…" />;
}

/** Signed in, on their own password, and (optionally) an admin. */
export function RequireUser({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Sign-in and forgot-password: nothing to do here once you are signed in. */
export function RequireSignedOut() {
  const { user, loading } = useSession();
  if (loading) return <Splash />;
  if (user) return <Navigate to={user.mustChangePassword ? "/change-password" : "/"} replace />;
  return <Outlet />;
}

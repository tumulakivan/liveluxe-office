import * as React from "react";

import { api, type User } from "@/lib/api";

interface SessionValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    // The API client fires this when a call comes back 401 or "change your
    // password first", e.g. because an admin removed or reset this account.
    const onChange = () => void refresh();
    window.addEventListener("office:session-changed", onChange);
    return () => window.removeEventListener("office:session-changed", onChange);
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({ user, loading, refresh, signOut }), [user, loading, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = React.useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/** The signed-in user, for screens that are only rendered behind a guard. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useUser called without a signed-in user");
  return user;
}

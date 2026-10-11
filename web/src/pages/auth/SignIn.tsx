import { Loader2 } from "lucide-react";
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthFrame, AuthHeading } from "@/components/auth/AuthFrame";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useSession } from "@/providers/SessionProvider";

export function SignInPage() {
  const { refresh } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(username, password);
      const user = await refresh();
      if (user?.mustChangePassword) {
        // Carry the password they just typed so the next screen need not ask again.
        navigate("/change-password", { replace: true, state: { current: password } });
      } else {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from && from !== "/login" ? from : "/", { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthFrame footer="New here? Ask an admin to add you, then sign in with the password they give you.">
      <AuthHeading title="Welcome back" description="Sign in to book a meeting room or the boardroom." />
      <form onSubmit={submit} className="space-y-4">
        <FormError>{error}</FormError>
        <Field label="Username" htmlFor="username">
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="firstname.lastname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>
      <div className="text-center">
        <Link to="/forgot-password" className="text-primary-strong text-[13px] font-semibold hover:underline">
          Forgot your password?
        </Link>
      </div>
    </AuthFrame>
  );
}

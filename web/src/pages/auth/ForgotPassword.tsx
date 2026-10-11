import { ArrowLeft, Loader2 } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

import { AuthFrame, AuthHeading } from "@/components/auth/AuthFrame";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormNotice } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

/**
 * There is no email to send a link to, so "forgot password" asks an admin to
 * reset the account. The request shows up on the admin dashboard.
 */
export function ForgotPasswordPage() {
  const [username, setUsername] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(username);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      footer={
        <Link to="/login" className="text-foreground inline-flex items-center gap-1.5 font-semibold hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      }
    >
      <AuthHeading
        title="Forgot your password?"
        description="Tell us your username and we'll ask an admin to reset it."
      />
      {sent ? (
        <FormNotice>
          Request sent. Once an admin has reset your account, sign in with the office's default password. You'll
          then be asked to choose a new one.
        </FormNotice>
      ) : (
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
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Request a reset
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

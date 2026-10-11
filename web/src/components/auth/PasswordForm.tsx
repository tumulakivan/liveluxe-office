import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

/**
 * Change password: used both for the forced step after signing in on the
 * default password and in account settings. When the current password is
 * already known (they just typed it to sign in) that field is skipped.
 */
export function PasswordForm({
  knownCurrent,
  submitLabel = "Save new password",
  onDone,
}: {
  knownCurrent?: string;
  submitLabel?: string;
  onDone: () => void;
}) {
  const [current, setCurrent] = React.useState(knownCurrent ?? "");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      setNext("");
      setConfirm("");
      if (!knownCurrent) setCurrent("");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError>{error}</FormError>
      {/* Lets password managers pair the new password with the right account. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      {knownCurrent ? null : (
        <Field label="Current password" htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </Field>
      )}
      <Field label="New password" htmlFor="new-password" hint="At least 8 characters.">
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm-password" error={mismatch ? "Does not match yet." : null}>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={mismatch || undefined}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}

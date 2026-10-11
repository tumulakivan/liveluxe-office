import { KeyRound, Loader2, MoreHorizontal, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/AdminShell";
import { Avatar } from "@/components/layout/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/useQuery";
import { api, type Role, type StaffMember } from "@/lib/api";
import { formatTimestamp } from "@/lib/time";
import { suggestUsername } from "@/lib/utils";
import { useUser } from "@/providers/SessionProvider";

const DEFAULT_PASSWORD = "liveluxeau";

type Pending = { kind: "reset" | "remove"; member: StaffMember } | null;

export function AdminStaffPage() {
  const me = useUser();
  const usersQuery = useQuery(() => api.admin.users(), []);
  const { data, error, setData } = usersQuery;
  const loading = usersQuery.pending && !error;
  const users = React.useMemo(() => data?.users ?? [], [data]);
  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffMember | null>(null);
  const [pending, setPending] = React.useState<Pending>(null);
  const [busy, setBusy] = React.useState(false);

  const requests = users.filter((u) => u.resetRequestedAt);
  const q = query.trim().toLowerCase();
  const visible = q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.username.includes(q)) : users;

  /** Run an admin action that answers with the fresh user list. */
  async function act(run: () => Promise<{ users: StaffMember[] }>, success: string) {
    setBusy(true);
    try {
      const result = await run();
      setData(result);
      toast.success(success);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, member } = pending;
    const ok =
      kind === "reset"
        ? await act(() => api.admin.resetPassword(member.id), `${member.name}'s password is back to the default.`)
        : await act(() => api.admin.removeUser(member.id), `${member.name} has been removed.`);
    if (ok) setPending(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        description={`Everyone who can sign in. New accounts start on the default password, "${DEFAULT_PASSWORD}", and must choose their own at first sign-in.`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Add staff
          </Button>
        }
      />

      {requests.length > 0 ? (
        <Card className="border-warning/30 overflow-hidden">
          <div className="bg-warning/5 border-warning/20 flex items-center gap-2.5 border-b px-5 py-3">
            <KeyRound className="text-warning size-4" />
            <p className="text-[13.5px] font-bold">Password reset requests</p>
            <Badge variant="warning">{requests.length}</Badge>
          </div>
          <ul className="divide-border divide-y">
            {requests.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold">{u.name}</p>
                    <p className="text-muted-foreground truncate text-[12px]">
                      {u.username} · asked {formatTimestamp(u.resetRequestedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => act(() => api.admin.dismissResetRequest(u.id), "Request dismissed.")}
                  >
                    <X /> Dismiss
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => setPending({ kind: "reset", member: u })}>
                    <KeyRound /> Reset password
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground border-border border-t px-5 py-2.5 text-[12px]">
            Only reset someone you've confirmed in person or by phone actually asked. Anyone can type a username here.
          </p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-border flex items-center gap-3 border-b px-4 py-3">
          <div className="relative max-w-xs flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="h-9 pl-9" placeholder="Search staff" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search staff" />
          </div>
          {loading ? (
            <Skeleton className="ml-auto h-3.5 w-20" />
          ) : (
            <p className="text-muted-foreground ml-auto text-[12.5px]">
              {users.length} account{users.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {error ? <p className="text-destructive px-5 py-4 text-[13px]">{error.message}</p> : null}

        {/* Phone: one card per person. A six-column table can't fit, and sideways scrolling hides the actions. */}
        <ul className="divide-border divide-y md:hidden" aria-busy={loading}>
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3.5" aria-hidden="true">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </li>
              ))
            : null}
          {visible.map((u) => (
            <li key={u.id} className="flex items-start gap-3 px-4 py-3.5">
              <Avatar name={u.name} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">
                  {u.name}
                  {u.id === me.id ? <span className="text-muted-foreground font-medium"> (you)</span> : null}
                </p>
                <p className="text-muted-foreground truncate text-[12.5px]">{u.username}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={u.role === "admin" ? "gold" : "neutral"}>{u.role === "admin" ? "Admin" : "Staff"}</Badge>
                    {u.demo ? <Badge variant="neutral" className="ml-1.5 border-dashed">Demo</Badge> : null}
                  <StatusBadge member={u} />
                </div>
                <p className="text-muted-foreground mt-2 text-[12px]">
                  Last sign-in {formatTimestamp(u.lastLoginAt)} · {u.upcomingBookings} upcoming
                </p>
              </div>
              <StaffActions
                member={u}
                isSelf={u.id === me.id}
                onEdit={() => setEditing(u)}
                onReset={() => setPending({ kind: "reset", member: u })}
                onRemove={() => setPending({ kind: "remove", member: u })}
              />
            </li>
          ))}
          {data && visible.length === 0 ? (
            <li className="text-muted-foreground px-4 py-10 text-center text-[13px]">No one matches "{query}".</li>
          ) : null}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-[11px] font-bold tracking-wide uppercase">
                <th className="px-5 py-2.5 font-bold">Name</th>
                <th className="px-3 py-2.5 font-bold">Role</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-3 py-2.5 font-bold">Last sign-in</th>
                <th className="px-3 py-2.5 text-right font-bold">Upcoming</th>
                <th className="w-14 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y" aria-busy={loading}>
              {loading
                ? [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} aria-hidden="true">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="ml-auto h-3.5 w-5" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="ml-auto size-8" />
                      </td>
                    </tr>
                  ))
                : null}
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="truncate font-bold">
                          {u.name}
                          {u.id === me.id ? <span className="text-muted-foreground font-medium"> (you)</span> : null}
                        </p>
                        <p className="text-muted-foreground truncate text-[12px]">{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={u.role === "admin" ? "gold" : "neutral"}>{u.role === "admin" ? "Admin" : "Staff"}</Badge>
                    {u.demo ? <Badge variant="neutral" className="ml-1.5 border-dashed">Demo</Badge> : null}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge member={u} />
                  </td>
                  <td className="text-muted-foreground num px-3 py-3 text-[13px]">{formatTimestamp(u.lastLoginAt)}</td>
                  <td className="num px-3 py-3 text-right font-semibold">{u.upcomingBookings}</td>
                  <td className="px-3 py-3 text-right">
                    <StaffActions
                      member={u}
                      isSelf={u.id === me.id}
                      onEdit={() => setEditing(u)}
                      onReset={() => setPending({ kind: "reset", member: u })}
                      onRemove={() => setPending({ kind: "remove", member: u })}
                    />
                  </td>
                </tr>
              ))}
              {data && visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-5 py-10 text-center">
                    No one matches "{query}".
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <StaffDialog
        open={adding}
        onOpenChange={setAdding}
        onSubmit={async (input) => {
          const ok = await act(
            () => api.admin.addUser(input),
            `${input.name} added. They sign in as ${input.username} with "${DEFAULT_PASSWORD}".`,
          );
          if (ok) setAdding(false);
        }}
        busy={busy}
      />

      <StaffDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        member={editing ?? undefined}
        isSelf={editing?.id === me.id}
        onSubmit={async (input) => {
          const ok = await act(() => api.admin.updateUser(editing!.id, input), "Changes saved.");
          if (ok) setEditing(null);
        }}
        busy={busy}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        busy={busy}
        destructive={pending?.kind === "remove"}
        title={pending?.kind === "remove" ? `Remove ${pending.member.name}?` : `Reset ${pending?.member.name}'s password?`}
        confirmLabel={pending?.kind === "remove" ? "Remove account" : "Reset password"}
        description={
          pending?.kind === "remove" ? (
            <>
              They'll be signed out and can no longer sign in.{" "}
              {pending.member.upcomingBookings > 0
                ? `Their ${pending.member.upcomingBookings} upcoming booking${pending.member.upcomingBookings === 1 ? "" : "s"} will be cancelled. `
                : ""}
              This can't be undone.
            </>
          ) : (
            <>
              Their password goes back to <span className="text-foreground font-semibold">"{DEFAULT_PASSWORD}"</span> and
              they're signed out everywhere. They'll choose a new password the next time they sign in.
            </>
          )
        }
        onConfirm={confirmPending}
      />
    </div>
  );
}

function StaffDialog({
  open,
  onOpenChange,
  member,
  isSelf,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: StaffMember;
  isSelf?: boolean;
  busy: boolean;
  onSubmit: (input: { name: string; username: string; role: Role }) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <StaffForm key={member?.id ?? "new"} member={member} isSelf={isSelf} busy={busy} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StaffForm({
  member,
  isSelf,
  busy,
  onSubmit,
  onCancel,
}: {
  member?: StaffMember;
  isSelf?: boolean;
  busy: boolean;
  onSubmit: (input: { name: string; username: string; role: Role }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(member?.name ?? "");
  const [username, setUsername] = React.useState(member?.username ?? "");
  // Until the username is typed in by hand, it follows the name.
  const [usernameTouched, setUsernameTouched] = React.useState(!!member);
  const [role, setRole] = React.useState<Role>(member?.role ?? "staff");
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(username)) {
      setError("Usernames can use lowercase letters, numbers, and single dots, dashes or underscores between them.");
      return;
    }
    void onSubmit({ name: name.trim(), username, role });
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{member ? `Edit ${member.name}` : "Add a staff member"}</DialogTitle>
        <DialogDescription>
          {member
            ? "Changing the username changes what they type to sign in, so let them know."
            : `They'll sign in with this username and the default password, "${DEFAULT_PASSWORD}", then choose their own.`}
        </DialogDescription>
      </DialogHeader>

      <FormError>{error}</FormError>

      <Field label="Full name" htmlFor="staff-name">
        <Input
          id="staff-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!usernameTouched) setUsername(suggestUsername(e.target.value));
          }}
          placeholder="Jane Citizen"
          maxLength={80}
          required
          autoFocus
        />
      </Field>
      <Field label="Username" htmlFor="staff-username" hint="Usually firstname.lastname.">
        <Input
          id="staff-username"
          value={username}
          onChange={(e) => {
            setUsernameTouched(true);
            setUsername(e.target.value.toLowerCase().replace(/\s/g, ""));
          }}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          required
        />
      </Field>
      <Field
        label="Account type"
        htmlFor="staff-role"
        hint={isSelf ? "You can't change your own account type." : "Admins can also add and remove staff, and change anyone's bookings."}
      >
        <Select id="staff-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {member ? "Save changes" : "Add staff member"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function StatusBadge({ member }: { member: StaffMember }) {
  if (member.resetRequestedAt) return <Badge variant="warning">Reset requested</Badge>;
  if (member.onDefaultPassword) return <Badge variant="neutral">Default password</Badge>;
  return <Badge variant="good">Active</Badge>;
}

/** The ⋯ menu for one person, shared by the table (PC, tablet) and the cards (phone). */
function StaffActions({
  member,
  isSelf,
  onEdit,
  onReset,
  onRemove,
}: {
  member: StaffMember;
  isSelf: boolean;
  onEdit: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReset} disabled={isSelf}>
          <KeyRound /> Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onRemove} disabled={isSelf}>
          <Trash2 /> Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

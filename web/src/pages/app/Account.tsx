import { toast } from "sonner";

import { PasswordForm } from "@/components/auth/PasswordForm";
import { PageIntro } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/layout/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/providers/SessionProvider";

export function AccountPage() {
  const user = useUser();

  return (
    <div className="mx-auto max-w-2xl">
      <PageIntro eyebrow="Account" title="Account settings" />

      <div className="space-y-5">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <Avatar name={user.name} className="size-14 text-[18px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold">{user.name}</p>
              <p className="text-muted-foreground truncate text-[13px]">
                Signs in as <span className="text-foreground font-semibold">{user.username}</span>
              </p>
            </div>
            <Badge variant={user.role === "admin" ? "gold" : "neutral"}>{user.role === "admin" ? "Admin" : "Staff"}</Badge>
          </CardContent>
          <p className="border-border text-muted-foreground border-t px-5 py-3 text-[12.5px]">
            To change your name or username, ask an admin.
          </p>
        </Card>

        <Card>
          <CardHeader className="block">
            <CardTitle>Change password</CardTitle>
            <CardDescription>You'll stay signed in here; anywhere else you're signed in will be signed out.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm onDone={() => toast.success("Password changed.")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

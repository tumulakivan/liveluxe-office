import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthFrame, AuthHeading } from "@/components/auth/AuthFrame";
import { Splash } from "@/components/auth/Guards";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { useSession } from "@/providers/SessionProvider";

/** The forced stop after signing in with the default password. */
export function ChangePasswordPage() {
  const { user, loading, refresh, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const knownCurrent = (location.state as { current?: string } | null)?.current;

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/" replace />;

  return (
    <AuthFrame
      footer={
        <button type="button" className="text-foreground font-semibold hover:underline" onClick={() => void signOut()}>
          Sign out instead
        </button>
      }
    >
      <AuthHeading
        title={`Hi ${user.name.split(" ")[0]}, choose a password`}
        description="You're signed in with the office's default password. Pick one of your own to continue."
      />
      <PasswordForm
        knownCurrent={knownCurrent}
        submitLabel="Save and continue"
        onDone={async () => {
          await refresh();
          toast.success("Password saved. You're all set.");
          navigate("/", { replace: true });
        }}
      />
    </AuthFrame>
  );
}

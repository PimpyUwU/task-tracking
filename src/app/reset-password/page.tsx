import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — FluxWork",
  description: "Choose a new password for your FluxWork account.",
};

/**
 * Landing page for the password-recovery link. /auth/confirm has already
 * redeemed the recovery token and established a session by the time the user
 * arrives here, so the form just needs to set the new password.
 */
export default function ResetPasswordPage() {
  return (
    <div className="auth-standalone">
      <div className="auth-shell">
        <div className="auth-formwrap">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}

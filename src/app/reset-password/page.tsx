import type { Metadata } from "next";
import { AuthAside } from "@/components/auth-overlay";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — FluxWork",
  description: "Choose a new password for your FluxWork account.",
};

/**
 * Landing point for the emailed password-reset link. /auth/confirm redeems the
 * recovery token, establishing a short-lived session, then redirects here where
 * the user sets a new password (updatePassword server action).
 */
export default function ResetPasswordPage() {
  return (
    <div className="auth-standalone">
      <div className="auth-shell">
        <div className="auth-content">
          <AuthAside brand />
          <div className="auth-formwrap">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}

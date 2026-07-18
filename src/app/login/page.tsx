import Link from "next/link";
import type { Metadata } from "next";
import { AuthContent } from "@/components/auth-overlay";

export const metadata: Metadata = {
  title: "Sign in — FluxWork",
  description: "Sign in to FluxWork, or create a free account.",
};

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

// Redirect-carried error codes → human-readable copy.
const ERRORS: Record<string, string> = {
  oauth: "That sign-in couldn't be completed. Please try again.",
  activation: "This activation link is invalid or has expired. Try signing in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-standalone">
      <div className="auth-shell">
        <AuthContent
          mode="in"
          initialError={error ? ERRORS[error] : undefined}
          topRight={
            <Link href="/welcome" className="auth-close auth-close-wide">
              <BackIcon /> Back to site
            </Link>
          }
        />
      </div>
    </div>
  );
}

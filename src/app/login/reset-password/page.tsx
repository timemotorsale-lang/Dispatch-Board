import Link from "next/link";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { PasswordResetForm } from "@/features/auth/password-reset-form";
import { getPasswordResetPreview } from "@/server/auth/password-recovery";

import { APP_NAME } from "../../config";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams.token[0]
    : resolvedSearchParams?.token;
  const reset = token ? await getPasswordResetPreview(token).catch(() => null) : null;
  const usable = reset?.status === "APPROVED";

  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <TimeMotorSalesLogo className="auth-brand-logo" priority />
          <span className="eyebrow">Account recovery</span>
          <h1>{APP_NAME}</h1>
          <p>Manager-approved reset links are one-use and expire quickly.</p>
        </div>

        <div className="panel-card">
          <strong>Password reset</strong>
          <h2>{usable ? "Create a new password" : "Reset link cannot be used"}</h2>
          {usable && token ? (
            <PasswordResetForm email={reset.email} token={token} />
          ) : (
            <>
              <div className="notice notice-warning" role="status">
                <p>{reset ? `Reset status: ${reset.status.toLowerCase()}. Ask a manager to issue a fresh reset link if needed.` : "Reset link is missing or invalid."}</p>
              </div>
              <div className="placeholder-actions auth-secondary-actions">
                <Link className="pill pill-primary" href="/login/forgot-password">Request recovery</Link>
                <Link className="pill pill-secondary" href="/login">Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

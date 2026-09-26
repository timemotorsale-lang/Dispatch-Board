import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

import { APP_NAME } from "../config";
import { redirectAuthenticatedUser } from "@/server/auth/current-user";

type LoginPageProps = {
  searchParams?: Promise<{
    email?: string | string[];
    reason?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const returnTo = Array.isArray(resolvedSearchParams?.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams?.returnTo;
  await redirectAuthenticatedUser(returnTo);
  const reason = Array.isArray(resolvedSearchParams?.reason)
    ? resolvedSearchParams.reason[0]
    : resolvedSearchParams?.reason;
  const email = Array.isArray(resolvedSearchParams?.email)
    ? resolvedSearchParams.email[0]
    : resolvedSearchParams?.email;

  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <TimeMotorSalesLogo className="auth-brand-logo" priority />
          <span className="eyebrow">Secure sign-in</span>
          <h1>{APP_NAME}</h1>
          <p>
            Staff access is invite-only. Sign in to continue to your assigned workspace or accept
            a manager-issued invite to create your password.
          </p>
        </div>

        <div className="panel-card">
          <strong>Staff sign-in</strong>
          <h2>Identity, roles, and permissions</h2>
          <p>
            Internal dashboards stay protected until staff identity, account status, role assignment,
            and workspace permissions are verified.
          </p>
          {reason === "entry" ? (
            <div className="notice notice-warning" role="status">
              <p>Sign in before opening the internal command center.</p>
            </div>
          ) : null}
          <LoginForm initialEmail={email} passwordReset={reason === "password-reset"} returnTo={returnTo} setupAccepted={reason === "invite-accepted"} sessionExpired={reason === "session-expired"} />
          <div className="placeholder-actions auth-secondary-actions">
            <Link className="pill pill-secondary" href="/login/invite">
              Accept invite / Create password
            </Link>
            <Link className="pill pill-secondary" href="/login/forgot-password">
              Forgot password
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


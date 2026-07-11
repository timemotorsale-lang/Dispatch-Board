import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";

import { APP_NAME } from "../config";
import { redirectAuthenticatedUser } from "@/server/auth/current-user";

type LoginPageProps = {
  searchParams?: Promise<{
    reason?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectAuthenticatedUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const returnTo = Array.isArray(resolvedSearchParams?.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams?.returnTo;
  const reason = Array.isArray(resolvedSearchParams?.reason)
    ? resolvedSearchParams.reason[0]
    : resolvedSearchParams?.reason;

  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Secure sign-in</span>
          <h1>{APP_NAME}</h1>
          <p>
            Sign in with a seeded local-development account to reach the protected app shell for
            the dispatch board.
          </p>
        </div>

        <div className="panel-card">
          <strong>Login</strong>
          <h2>Identity, roles, and permissions</h2>
          <p>
            Sessions are stored server-side, protected routes redirect unauthenticated users, and
            permission checks now live on the server for later workflows to reuse.
          </p>
          <LoginForm returnTo={returnTo} sessionExpired={reason === "session-expired"} />
          <div className="placeholder-actions auth-secondary-actions">
            <Link className="pill pill-primary" href="/">
              Back to home
            </Link>
            <Link className="pill pill-secondary" href="/board">
              Open protected board
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


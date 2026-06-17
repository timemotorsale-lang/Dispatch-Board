import Link from "next/link";

import { LoginForm } from "@/features/auth/login-form";

import { APP_NAME } from "../config";
import { redirectAuthenticatedUser } from "@/server/auth/current-user";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

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
          <LoginForm />
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


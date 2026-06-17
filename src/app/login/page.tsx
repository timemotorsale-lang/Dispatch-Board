import Link from "next/link";

import { APP_NAME } from "../config";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Login placeholder</span>
          <h1>{APP_NAME}</h1>
          <p>
            Authentication is intentionally deferred to the v0.2.0 milestone. This page keeps the
            planned route in place so later auth work can land without reshaping the app.
          </p>
        </div>

        <div className="panel-card">
          <strong>Next milestone</strong>
          <h2>Identity, roles, and permissions</h2>
          <p>
            The next phase will add real sign-in, protected routes, and server-side permission
            helpers for managers and staff.
          </p>
          <div className="placeholder-actions">
            <Link className="pill pill-primary" href="/">
              Back to foundation home
            </Link>
            <Link className="pill pill-secondary" href="/board">
              View app shell placeholder
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


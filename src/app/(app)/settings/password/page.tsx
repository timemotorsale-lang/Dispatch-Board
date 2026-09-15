import Link from "next/link";

import { PasswordChangeForm } from "@/features/auth/password-change-form";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function PasswordSettingsPage() {
  const user = await requireCurrentUser();

  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Account security</span>
        <h1>Change password</h1>
        <p>Update the password used to sign in to the operating console.</p>
      </div>

      <article className="panel-card">
        <strong>{user.name}</strong>
        <h2>Password protection</h2>
        <PasswordChangeForm mustChangePassword={Boolean(user.mustChangePassword)} />
        <div className="placeholder-actions auth-secondary-actions">
          <Link className="pill pill-secondary" href="/my-tasks">
            Continue to my work
          </Link>
        </div>
      </article>
    </section>
  );
}

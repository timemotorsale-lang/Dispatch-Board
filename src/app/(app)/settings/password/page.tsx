import Link from "next/link";
import { cookies } from "next/headers";

import { PasswordChangeForm } from "@/features/auth/password-change-form";
import { SessionSecurityPanel } from "@/features/auth/session-security-panel";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getOwnSessionSecurity } from "@/server/auth/service";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { createPrismaAuthStore } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

const authStore = createPrismaAuthStore(prisma);

function serializeSessionSecurity(security: Awaited<ReturnType<typeof getOwnSessionSecurity>>) {
  return {
    currentSession: security.currentSession
      ? {
          ...security.currentSession,
          createdAt: security.currentSession.createdAt.toISOString(),
          expiresAt: security.currentSession.expiresAt.toISOString()
        }
      : null,
    sessions: security.sessions.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString()
    }))
  };
}

export default async function PasswordSettingsPage() {
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionSecurity = serializeSessionSecurity(
    await getOwnSessionSecurity(authStore, user, sessionToken)
  );

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

      <SessionSecurityPanel
        initialCurrentSession={sessionSecurity.currentSession}
        initialSessions={sessionSecurity.sessions}
      />
    </section>
  );
}

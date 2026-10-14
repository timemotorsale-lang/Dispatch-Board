import Link from "next/link";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { InviteAcceptForm } from "@/features/auth/invite-accept-form";
import { getStaffInvitePreview } from "@/server/auth/staff-invite";

import { APP_NAME } from "../../config";

type InvitePageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const token = first(params?.token) ?? "";
  const invite = token ? await getStaffInvitePreview(token).catch(() => null) : null;
  const usable = invite?.status === "PENDING";

  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <TimeMotorSalesLogo className="auth-brand-logo" priority />
          <span className="eyebrow">Staff invite</span>
          <h1>{APP_NAME}</h1>
          <p>Staff accounts are invite-only. Create your password from a valid manager-issued invite, then sign in.</p>
        </div>

        <div className="panel-card">
          <strong>Invite-only access</strong>
          <h2>{usable ? `Welcome, ${invite.name}` : "Invite cannot be used"}</h2>
          {usable ? (
            <>
              <p>This invite grants staff access for {invite.email}. It expires {new Date(invite.expiresAt).toLocaleString()}.</p>
              <InviteAcceptForm email={invite.email} token={token} />
            </>
          ) : (
            <>
              <div className="notice notice-warning">
                <p>{invite ? `Invite status: ${invite.status.toLowerCase()}. Ask a manager to resend access if needed.` : "Invite link is missing or invalid."}</p>
              </div>
              <div className="placeholder-actions auth-secondary-actions">
                <Link className="pill pill-primary" href="/login">Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

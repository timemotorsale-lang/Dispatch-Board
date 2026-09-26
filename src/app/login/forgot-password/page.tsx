import Link from "next/link";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

import { APP_NAME } from "../../config";

export default function ForgotPasswordPage() {
  return (
    <main className="page-shell">
      <section className="page-stack">
        <div className="page-copy">
          <TimeMotorSalesLogo className="auth-brand-logo" priority />
          <span className="eyebrow">Account recovery</span>
          <h1>{APP_NAME}</h1>
          <p>Staff password recovery is manager-controlled so internal access is never opened through public self-service.</p>
        </div>

        <div className="panel-card">
          <strong>Forgot password</strong>
          <h2>Ask a manager to reset access</h2>
          <p>
            For now, a manager should reset your staff access or resend an invite from Staff / Roles.
            This keeps the internal command center invite-only while reset delivery is finalized.
          </p>
          <div className="placeholder-actions auth-secondary-actions">
            <Link className="pill pill-primary" href="/login">Back to sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

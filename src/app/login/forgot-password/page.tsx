import Link from "next/link";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { PasswordRecoveryRequestForm } from "@/features/auth/password-recovery-request-form";

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
          <h2>Request manager recovery</h2>
          <p>
            Enter your staff email. If it belongs to an active staff account, a manager can approve
            a one-use reset link from Staff / Roles.
          </p>
          <PasswordRecoveryRequestForm />
          <div className="placeholder-actions auth-secondary-actions">
            <Link className="pill pill-secondary" href="/login">Back to sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

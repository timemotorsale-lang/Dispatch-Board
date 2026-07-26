import { ArrowLeft, BriefcaseBusiness, RefreshCw } from "lucide-react";
import Link from "next/link";

import { AvailableWorkCard } from "@/features/tasks/available-work-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";

export default async function AvailableWorkPage() {
  const user = await requireCurrentUser();
  const flags = getStaffExecutionFlags();
  const boardDate = new Date().toISOString().slice(0, 10);

  return (
    <section className="page-stack technician-available-work-page">
      <header className="technician-page-header">
        <div>
          <span className="eyebrow">Technician Workspace</span>
          <h1>Available Work</h1>
          <p>Only eligible, ready-to-claim work appears here. Every recommendation explains why it fits.</p>
        </div>
        <Link className="pill pill-secondary" href="/my-tasks"><ArrowLeft size={16} /> Back to My Work</Link>
      </header>

      <section className="technician-availability-assurance">
        <BriefcaseBusiness aria-hidden="true" size={22} />
        <div>
          <strong>Eligibility before ranking</strong>
          <p>Role, duty, location, current workload, dependencies, and blockers are checked before work is offered.</p>
        </div>
        <span><RefreshCw size={14} /> Live when requested</span>
      </section>

      {flags.enabled && flags.availableWorkEnabled ? (
        <AvailableWorkCard boardDate={boardDate} />
      ) : (
        <div className="technician-assignment-empty">
          <BriefcaseBusiness aria-hidden="true" size={28} />
          <div>
            <h2>Available Work is not enabled</h2>
            <p>Your assigned work is unchanged. Return to My Work or ask the shop manager for direction.</p>
          </div>
          <Link className="pill pill-primary" href="/my-tasks">Return to My Work</Link>
        </div>
      )}
      <p className="technician-page-footnote">Signed in as {user.name}. Claiming work is atomic; if another technician gets it first, the queue will tell you instead of creating a duplicate assignment.</p>
    </section>
  );
}

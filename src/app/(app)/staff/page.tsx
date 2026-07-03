import Link from "next/link";

import { StaffDutyStrip } from "@/features/board/board-dashboard";
import { listActiveUserSummaries } from "@/server/services/user-summary";

function countStaffWithCustomDuties(staff: Awaited<ReturnType<typeof listActiveUserSummaries>>) {
  return staff.filter((person) => person.dutySource === "custom").length;
}

function countUnassignedDutyProfiles(staff: Awaited<ReturnType<typeof listActiveUserSummaries>>) {
  return staff.filter((person) => person.dutySource === "none").length;
}

export default async function StaffPage() {
  const staff = await listActiveUserSummaries();
  const customDutyCount = countStaffWithCustomDuties(staff);
  const unassignedDutyCount = countUnassignedDutyProfiles(staff);

  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Team</span>
          <h1>Staff and duties</h1>
          <p>
            Keep team ownership, role coverage, and custom duties in one place without crowding the
            live board.
          </p>
        </div>
      </div>

      <div className="hero-actions">
        <Link className="pill pill-primary" href="/board">
          Open board
        </Link>
        <Link className="pill pill-secondary" href="/my-tasks">
          Open My Tasks
        </Link>
      </div>

      <section className="operations-strip">
        <article>
          <header>
            <span>Active team</span>
            <small>Today</small>
          </header>
          <div className="context-count">
            <strong>{staff.length}</strong>
            <span>active staff members are currently available in the MVP roster</span>
          </div>
        </article>
        <article>
          <header>
            <span>Custom duty coverage</span>
            <small>Overrides</small>
          </header>
          <div className="context-count">
            <strong>{customDutyCount}</strong>
            <span>staff members are running custom duties instead of only role defaults</span>
          </div>
        </article>
        <article>
          <header>
            <span>Needs setup</span>
            <small>Review</small>
          </header>
          <div className="context-count">
            <strong>{unassignedDutyCount}</strong>
            <span>staff members currently have no duty profile assigned</span>
          </div>
        </article>
      </section>

      <StaffDutyStrip staff={staff} />
    </section>
  );
}

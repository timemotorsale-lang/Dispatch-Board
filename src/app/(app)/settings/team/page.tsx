import Link from "next/link";

import { TeamManagementPanel } from "@/features/settings/team-management-panel";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";

async function loadTeamManagementPageData(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  try {
    const snapshot = await getTeamManagementSnapshotForManager(user);

    return {
      snapshot,
      errorMessage: ""
    };
  } catch (error) {
    return {
      snapshot: null,
      errorMessage:
        error instanceof Error ? error.message : "Unable to load team management right now."
    };
  }
}

export default async function TeamManagementSettingsPage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Team management</h1>
          <p>Only managers can add staff accounts, assign roles, or adjust duty coverage.</p>
        </div>

        <div className="notice notice-danger">
          <p>Manager access is required to open team management.</p>
        </div>
      </section>
    );
  }

  const { snapshot, errorMessage } = await loadTeamManagementPageData(user);

  if (!snapshot) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Team management</h1>
          <p>The manager workspace is available, but the current team setup could not be loaded.</p>
        </div>

        <div className="notice notice-danger">
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected settings</span>
        <h1>Team management</h1>
        <p>
          Add staff logins, assign role coverage, and attach direct duties from the same manager
          settings area that controls daily generation.
        </p>
      </div>

      <div className="hero-actions">
        <Link className="pill pill-secondary" href="/settings">
          Back to settings
        </Link>
        <Link className="pill pill-primary" href="/staff">
          Open team view
        </Link>
      </div>

      <TeamManagementPanel
        duties={snapshot.duties}
        initialUsers={snapshot.users}
        roles={snapshot.roles}
      />
    </section>
  );
}

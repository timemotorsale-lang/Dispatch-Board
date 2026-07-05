import Link from "next/link";

import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { TeamManagementPanel } from "@/features/settings/team-management-panel";
import { requireCurrentUser } from "@/server/auth/current-user";
import {
  DELEGATED_MANAGER_DUTY_NAME,
  canGrantManagerPowers,
  canManageSettings
} from "@/server/policies/access";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";
import { listTaskTemplatesForManager } from "@/server/services/task-template-service";

async function loadTeamManagementPageData(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  try {
    const [snapshot, templates] = await Promise.all([
      getTeamManagementSnapshotForManager(user),
      listTaskTemplatesForManager(user, { includeInactive: true })
    ]);

    return {
      snapshot,
      templates,
      errorMessage: ""
    };
  } catch (error) {
    return {
      snapshot: null,
      templates: [],
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

  const { snapshot, templates, errorMessage } = await loadTeamManagementPageData(user);

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

  const visibleDutyCount = snapshot.duties.filter(
    (duty) => duty.name.trim().toLowerCase() !== DELEGATED_MANAGER_DUTY_NAME.toLowerCase()
  ).length;

  return (
    <section className="settings-workspace">
      <SettingsWorkspaceNav
        active="admin"
        counts={{
          duties: visibleDutyCount,
          roles: snapshot.roles.length,
          users: snapshot.users.length
        }}
      />

      <div className="settings-stage">
        <div className="page-copy settings-page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Team management</h1>
          <p>
            This admin workspace keeps staff accounts, roles, duties, templates, and delegated
            manager powers together without crowding the board settings area.
          </p>
        </div>

        <div className="settings-path">
          <span>Admin</span>
          <strong>Team management</strong>
        </div>

        <section className="settings-overview-grid">
          <article className="panel-card settings-callout-card">
            <strong>Admin workspace</strong>
            <h2>What you can manage here</h2>
            <div className="settings-checklist">
              <p>Users: create logins, activate staff, and keep the roster current.</p>
              <p>Roles and duties: align coverage with the actual workflow and daily ownership.</p>
              <p>Templates: control what work appears automatically on each new board.</p>
              <p>Manager powers: only the General Manager can delegate elevated access.</p>
            </div>
          </article>

          <article className="panel-card settings-callout-card">
            <strong>Quick links</strong>
            <h2>Move between admin and settings</h2>
            <p>
              Keep operational settings separate from staffing administration so each page stays
              easier to scan.
            </p>
            <div className="form-actions">
              <Link className="pill pill-secondary" href="/settings">
                Open board settings
              </Link>
              <Link className="pill pill-primary" href="/staff">
                Open team view
              </Link>
            </div>
          </article>
        </section>

        <TeamManagementPanel
          canGrantManagerPowers={canGrantManagerPowers(user)}
          duties={snapshot.duties}
          initialUsers={snapshot.users}
          roles={snapshot.roles}
          templates={templates}
        />
      </div>
    </section>
  );
}

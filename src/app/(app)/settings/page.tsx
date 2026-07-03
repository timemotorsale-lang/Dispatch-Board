import Link from "next/link";

import { SettingsForm } from "@/features/settings/settings-form";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";

async function loadSettingsPageData(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  try {
    const [settings, teamManagement] = await Promise.all([
      getGenerationSettings(),
      getTeamManagementSnapshotForManager(user)
    ]);

    return {
      settings,
      teamManagement,
      errorMessage: ""
    };
  } catch (error) {
    return {
      settings: null,
      teamManagement: null,
      errorMessage:
        error instanceof Error ? error.message : "Unable to load settings right now. Please try again."
    };
  }
}

export default async function SettingsPage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Application settings</h1>
          <p>
            Generation settings can only be updated by managers. Your account can still access the
            rest of the protected app shell, but this page is read-only for now.
          </p>
        </div>

        <div className="notice notice-danger">
          <p>Manager access is required to change daily generation settings.</p>
        </div>
      </section>
    );
  }

  const { settings, teamManagement, errorMessage } = await loadSettingsPageData(user);

  if (settings && teamManagement) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Application settings</h1>
          <p>
            Managers can adjust the daily board generation time, timezone, and business-day rules
            here, while team management covers staff logins, role coverage, and direct duty setup.
          </p>
        </div>

        <section className="settings-admin-grid">
          <article className="panel-card">
            <strong>Manager administration</strong>
            <h2>Team and role management</h2>
            <p>
              The roadmap and architecture both expect manager-controlled users, roles, duties, and
              staffing setup. Use this path to add staff accounts and assign coverage without leaving
              protected settings.
            </p>
            <div className="settings-summary-grid">
              <div className="settings-summary-card">
                <span>Users</span>
                <strong>{teamManagement.users.length}</strong>
                <small>team accounts currently in the roster</small>
              </div>
              <div className="settings-summary-card">
                <span>Roles</span>
                <strong>{teamManagement.roles.length}</strong>
                <small>available role definitions ready for assignment</small>
              </div>
              <div className="settings-summary-card">
                <span>Duties</span>
                <strong>{teamManagement.duties.length}</strong>
                <small>direct-duty options available for overrides</small>
              </div>
            </div>
            <div className="form-actions">
              <Link className="pill pill-primary" href="/settings/team">
                Manage team, roles, and duties
              </Link>
              <Link className="pill pill-secondary" href="/staff">
                Open team view
              </Link>
            </div>
          </article>

          <article className="panel-card">
            <strong>Architecture alignment</strong>
            <h2>What this manager path controls</h2>
            <p>
              Staff accounts, role assignments, and direct duties all influence daily generation,
              recommendations, and team visibility on the board.
            </p>
            <div className="settings-checklist">
              <p>Users: create login-ready team members for the protected app.</p>
              <p>Roles: assign job coverage that drives permissions and default duty matching.</p>
              <p>Duties: add direct-duty overrides when a staff member owns specific daily work.</p>
            </div>
          </article>
        </section>

        <article className="panel-card">
          <strong>Daily generation defaults</strong>
          <h2>Board generation settings</h2>
          <p>Update the schedule foundation that later daily generation work will read from.</p>
          <SettingsForm
            initialSettings={{
              dailyGenerationTime: settings.dailyGenerationTime,
              timezone: settings.timezone,
              businessDays: settings.businessDays
            }}
          />
        </article>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected settings</span>
        <h1>Application settings</h1>
        <p>The settings page is available, but the current configuration could not be loaded.</p>
      </div>

      <div className="notice notice-danger">
        <p>{errorMessage}</p>
      </div>
    </section>
  );
}


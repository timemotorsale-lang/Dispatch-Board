import Link from "next/link";

import { SettingsForm } from "@/features/settings/settings-form";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { requireCurrentUser } from "@/server/auth/current-user";
import { DELEGATED_MANAGER_DUTY_NAME, canManageSettings } from "@/server/policies/access";
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
  const visibleDutyCount = teamManagement
    ? teamManagement.duties.filter(
        (duty) => duty.name.trim().toLowerCase() !== DELEGATED_MANAGER_DUTY_NAME.toLowerCase()
      ).length
    : 0;

  if (settings && teamManagement) {
    return (
      <section className="settings-workspace">
        <SettingsWorkspaceNav
          active="settings"
          counts={{
            duties: visibleDutyCount,
            roles: teamManagement.roles.length,
            users: teamManagement.users.length
          }}
        />

        <div className="settings-stage">
          <div className="page-copy settings-page-copy">
            <span className="eyebrow">Protected settings</span>
            <h1>Application settings</h1>
            <p>
              Keep the operating schedule cleanly separated from manager administration. Adjust
              board behavior here, and jump into the admin workspace only when you need to manage
              staff, roles, duties, or delegated manager access.
            </p>
          </div>

          <div className="settings-path">
            <span>Settings</span>
            <strong>Board generation</strong>
          </div>

          <section className="settings-overview-grid">
            <article className="panel-card settings-callout-card">
              <strong>Settings</strong>
              <h2>Daily board controls</h2>
              <p>
                These controls define when a new board is generated, which timezone it follows,
                and which days count as working days.
              </p>
              <div className="settings-checklist">
                <p>Daily generation time controls when the automatic board is created.</p>
                <p>Timezone keeps scheduling aligned with the dealership's actual operating day.</p>
                <p>Business days prevent weekend or off-day board creation when it should not run.</p>
              </div>
            </article>

            <article className="panel-card settings-callout-card">
              <strong>Admin</strong>
              <h2>Manager administration</h2>
              <p>
                Staffing setup lives in its own admin area so operational settings stay focused and
                easier to scan.
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
                  <strong>{visibleDutyCount}</strong>
                  <small>direct-duty options available for overrides</small>
                </div>
              </div>
              <div className="form-actions">
                <Link className="pill pill-primary" href="/settings/team">
                  Open admin workspace
                </Link>
                <Link className="pill pill-secondary" href="/staff">
                  Open team view
                </Link>
              </div>
            </article>
          </section>

          <article className="panel-card settings-main-card">
            <strong>Board settings</strong>
            <h2>Generation schedule</h2>
            <p>Update the schedule foundation that future daily board generation reads from.</p>
            <SettingsForm
              initialSettings={{
                dailyGenerationTime: settings.dailyGenerationTime,
                timezone: settings.timezone,
                businessDays: settings.businessDays
              }}
            />
          </article>
        </div>
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


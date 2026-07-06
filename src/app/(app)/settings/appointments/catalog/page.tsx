import Link from "next/link";

import { AppointmentCatalogAutomationPanel } from "@/features/settings/appointment-catalog-automation-panel";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { requireCurrentUser } from "@/server/auth/current-user";
import { DELEGATED_MANAGER_DUTY_NAME, canManageSettings } from "@/server/policies/access";
import { getAppointmentCatalogAutomationAdminForManager } from "@/server/services/appointment-catalog-automation-admin";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";

async function loadCatalogAutomationPageData(
  user: Awaited<ReturnType<typeof requireCurrentUser>>
) {
  try {
    const [catalog, teamManagement] = await Promise.all([
      getAppointmentCatalogAutomationAdminForManager(user),
      getTeamManagementSnapshotForManager(user)
    ]);

    return {
      catalog,
      teamManagement,
      errorMessage: ""
    };
  } catch (error) {
    return {
      catalog: null,
      teamManagement: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to load appointment catalog automation right now."
    };
  }
}

export default async function AppointmentCatalogAutomationSettingsPage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment catalog and automation</h1>
          <p>Only managers can review appointment catalog and automation administration.</p>
        </div>

        <div className="notice notice-danger">
          <p>Manager access is required to open appointment catalog automation.</p>
        </div>
      </section>
    );
  }

  const { catalog, teamManagement, errorMessage } = await loadCatalogAutomationPageData(user);

  if (!catalog || !teamManagement) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment catalog and automation</h1>
          <p>The catalog workspace is available, but the current setup could not load.</p>
        </div>

        <div className="notice notice-danger">
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  const visibleDutyCount = teamManagement.duties.filter(
    (duty) => duty.name.trim().toLowerCase() !== DELEGATED_MANAGER_DUTY_NAME.toLowerCase()
  ).length;

  return (
    <section className="settings-workspace">
      <SettingsWorkspaceNav
        active="appointment-catalog"
        counts={{
          duties: visibleDutyCount,
          roles: teamManagement.roles.length,
          users: teamManagement.users.length
        }}
      />

      <div className="settings-stage">
        <div className="page-copy settings-page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment catalog and automation</h1>
          <p>
            Review day-one purpose templates, outcomes, follow-up dispositions, reason codes, and
            automation hooks before deeper activation/versioning controls are added.
          </p>
        </div>

        <div className="settings-path">
          <span>Settings</span>
          <strong>Catalog + automation</strong>
        </div>

        <section className="settings-overview-grid">
          <article className="panel-card settings-callout-card">
            <strong>Business rules</strong>
            <h2>Purpose and outcome governance</h2>
            <p>
              This workspace makes the approved appointment rules visible to managers: categories,
              required context, duration policy, outcomes, follow-up dispositions, and audit reason
              coverage.
            </p>
          </article>

          <article className="panel-card settings-callout-card">
            <strong>Quick links</strong>
            <h2>Move between admin layers</h2>
            <p>
              Location/resource settings stay separate from catalog and automation controls so each
              admin area remains readable.
            </p>
            <div className="form-actions">
              <Link className="pill pill-secondary" href="/settings/appointments">
                Open appointment settings
              </Link>
              <Link className="pill pill-primary" href="/appointments">
                Open Appointment Board
              </Link>
            </div>
          </article>
        </section>

        <AppointmentCatalogAutomationPanel initialCatalog={catalog} />
      </div>
    </section>
  );
}

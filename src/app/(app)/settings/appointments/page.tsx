import Link from "next/link";

import { AppointmentAdminSettingsPanel } from "@/features/settings/appointment-admin-settings-panel";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { requireCurrentUser } from "@/server/auth/current-user";
import { DELEGATED_MANAGER_DUTY_NAME, canManageSettings } from "@/server/policies/access";
import { getAppointmentAdminSettingsForManager } from "@/server/services/appointment-admin-settings";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";

async function loadAppointmentSettingsPageData(
  user: Awaited<ReturnType<typeof requireCurrentUser>>
) {
  try {
    const [appointmentSettings, teamManagement] = await Promise.all([
      getAppointmentAdminSettingsForManager(user),
      getTeamManagementSnapshotForManager(user)
    ]);

    return {
      appointmentSettings,
      teamManagement,
      errorMessage: ""
    };
  } catch (error) {
    return {
      appointmentSettings: null,
      teamManagement: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to load appointment settings right now. Please try again."
    };
  }
}

export default async function AppointmentSettingsPage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment settings</h1>
          <p>
            Appointment location, hours, resource, catalog, and automation settings can only be
            updated by managers.
          </p>
        </div>

        <div className="notice notice-danger">
          <p>Manager access is required to change appointment settings.</p>
        </div>
      </section>
    );
  }

  const { appointmentSettings, teamManagement, errorMessage } =
    await loadAppointmentSettingsPageData(user);

  if (!appointmentSettings || !teamManagement) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment settings</h1>
          <p>The appointment settings workspace is available, but the current setup could not load.</p>
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
        active="appointments"
        counts={{
          duties: visibleDutyCount,
          roles: teamManagement.roles.length,
          users: teamManagement.users.length
        }}
      />

      <div className="settings-stage">
        <div className="page-copy settings-page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment settings</h1>
          <p>
            Manage the enterprise foundation behind the Appointment Board: dealership profile,
            operating hours, resource readiness, approved categories, and automation hooks.
          </p>
        </div>

        <div className="settings-path">
          <span>Settings</span>
          <strong>Appointment settings</strong>
        </div>

        <section className="settings-overview-grid">
          <article className="panel-card settings-callout-card">
            <strong>Day-one foundation</strong>
            <h2>Board source of truth</h2>
            <p>
              The Appointment Board now reads its location identity from this admin foundation
              instead of relying only on static screen text.
            </p>
            <div className="settings-checklist">
              <p>Manager-only updates for location profile, phone, address, timezone, and status.</p>
              <p>Operating windows for appointment scheduling and resource availability defaults.</p>
              <p>Approved catalogs and automation hooks visible before deeper editors are added.</p>
            </div>
          </article>

          <article className="panel-card settings-callout-card">
            <strong>Quick links</strong>
            <h2>Move between board and admin</h2>
            <p>
              Use this settings page for configuration and the Appointment Board for day-to-day
              execution.
            </p>
            <div className="form-actions">
              <Link className="pill pill-primary" href="/appointments">
                Open Appointment Board
              </Link>
              <Link className="pill pill-secondary" href="/settings/team">
                Open team management
              </Link>
            </div>
          </article>
        </section>

        <AppointmentAdminSettingsPanel initialSettings={appointmentSettings} />
      </div>
    </section>
  );
}

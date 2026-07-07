import Link from "next/link";

import { AppointmentAutomationOperationsConsolePanel } from "@/features/settings/appointment-automation-operations-console-panel";
import { SettingsWorkspaceNav } from "@/features/settings/settings-workspace-nav";
import { requireCurrentUser } from "@/server/auth/current-user";
import { DELEGATED_MANAGER_DUTY_NAME, canManageSettings } from "@/server/policies/access";
import { getAppointmentAutomationOperationsConsoleForManager } from "@/server/services/appointment-automation-operations-console";
import { getTeamManagementSnapshotForManager } from "@/server/services/team-management";

async function loadAutomationConsolePageData(user: Awaited<ReturnType<typeof requireCurrentUser>>) {
  try {
    const [consoleModel, teamManagement] = await Promise.all([
      getAppointmentAutomationOperationsConsoleForManager(user),
      getTeamManagementSnapshotForManager(user)
    ]);

    return { consoleModel, teamManagement, errorMessage: "" };
  } catch (error) {
    return {
      consoleModel: null,
      teamManagement: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to load appointment automation operations console right now."
    };
  }
}

export default async function AppointmentAutomationOperationsConsolePage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment automation operations console</h1>
          <p>Only managers can operate appointment automation rules.</p>
        </div>
        <div className="notice notice-danger">
          <p>Manager access is required to open appointment automation operations.</p>
        </div>
      </section>
    );
  }

  const { consoleModel, teamManagement, errorMessage } = await loadAutomationConsolePageData(user);

  if (!consoleModel || !teamManagement) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment automation operations console</h1>
          <p>The console is available, but the current setup could not load.</p>
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
        active="appointment-automation"
        counts={{
          duties: visibleDutyCount,
          roles: teamManagement.roles.length,
          users: teamManagement.users.length
        }}
      />

      <div className="settings-stage">
        <div className="page-copy settings-page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Appointment automation operations console</h1>
          <p>
            Govern rule lifecycle, health, failure queues, retry/replay readiness, and audit
            controls before automation is allowed to operate unattended.
          </p>
        </div>

        <div className="settings-path">
          <span>Settings</span>
          <strong>Automation console</strong>
        </div>

        <section className="settings-overview-grid">
          <article className="panel-card settings-callout-card">
            <strong>Control tower</strong>
            <h2>Rule lifecycle and safety</h2>
            <p>
              Managers can draft, validate, activate, pause, and retire automation rules with
              documented reasons and audit history.
            </p>
          </article>
          <article className="panel-card settings-callout-card">
            <strong>Quick links</strong>
            <h2>Related appointment admin areas</h2>
            <p>Catalog versions remain the source of truth for purposes, outcomes, and hooks.</p>
            <div className="form-actions">
              <Link className="pill pill-secondary" href="/settings/appointments/catalog">
                Open catalog
              </Link>
              <Link className="pill pill-primary" href="/appointments">
                Open Appointment Board
              </Link>
            </div>
          </article>
        </section>

        <AppointmentAutomationOperationsConsolePanel initialConsole={consoleModel} />
      </div>
    </section>
  );
}

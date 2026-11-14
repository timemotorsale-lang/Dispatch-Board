import Link from "next/link";
import styles from "./settings-workspace-nav.module.css";

type SettingsWorkspaceNavProps = {
  active: "settings" | "appointments" | "appointment-catalog" | "appointment-automation" | "vehicle-operations" | "admin" | "labor-rate" | "labor-catalog";
  counts?: {
    duties: number;
    roles: number;
    users: number;
  };
};

export function SettingsWorkspaceNav({ active, counts }: SettingsWorkspaceNavProps) {
  const directory = (
    <nav aria-label="Settings directory" className={styles.directory}>
      <div className="settings-rail-group">
        <Link className="settings-rail-link" href="/settings/team/company-access"><span>Staff company access</span><small>Review company assignments for staff spending and scoped work.</small></Link>
        <p className="settings-rail-label">Settings</p>
        <Link className={active === "labor-catalog" ? "settings-rail-link settings-rail-link-active" : "settings-rail-link"} aria-current={active === "labor-catalog" ? "page" : undefined} href="/settings/labor-catalog"><span>Catalog approvals</span><small>Scope review, capability requirements and controlled activation.</small></Link>
        <Link className={active === "labor-rate" ? "settings-rail-link settings-rail-link-active" : "settings-rail-link"} aria-current={active === "labor-rate" ? "page" : undefined} href="/settings/labor-rate"><span>Labor rate</span><small>Shop estimating default, reviewed changes and activation.</small></Link>
        <Link
          className={active === "vehicle-operations" ? "settings-rail-link settings-rail-link-active" : "settings-rail-link"}
          aria-current={active === "vehicle-operations" ? "page" : undefined}
          href="/settings/vehicle-operations"
        >
          <span>Vehicle Operations</span>
          <small>Command health, rollout, outbox, projections, and enterprise safeguards.</small>
        </Link>
        <Link
          className={
            active === "settings"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
          aria-current={active === "settings" ? "page" : undefined}
          href="/settings"
        >
          <span>Board generation</span>
          <small>Schedule, timezone, and business-day rules.</small>
        </Link>
        <Link
          className={
            active === "appointments"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
          aria-current={active === "appointments" ? "page" : undefined}
          href="/settings/appointments"
        >
          <span>Appointment settings</span>
          <small>Location profile, hours, resources, catalogs, and automation readiness.</small>
        </Link>
        <Link
          className={
            active === "appointment-catalog"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
          aria-current={active === "appointment-catalog" ? "page" : undefined}
          href="/settings/appointments/catalog"
        >
          <span>Catalog + automation</span>
          <small>Purpose templates, outcomes, reasons, rule hooks, and simulation.</small>
        </Link>
        <Link
          className={
            active === "appointment-automation"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
          aria-current={active === "appointment-automation" ? "page" : undefined}
          href="/settings/appointments/automation"
        >
          <span>Automation console</span>
          <small>Rule lifecycle, health, failures, retry, replay, and audit controls.</small>
        </Link>
      </div>

      <div className="settings-rail-group">
        <p className="settings-rail-label">Admin</p>
        <Link
          className={
            active === "admin"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
          aria-current={active === "admin" ? "page" : undefined}
          href="/settings/team"
        >
          <span>Team management</span>
          <small>Staff accounts, roles, duties, templates, and delegated manager powers.</small>
        </Link>
      </div>

      {counts ? (
        <div className="settings-rail-summary">
          <div>
            <strong>{counts.users}</strong>
            <span>staff accounts</span>
          </div>
          <div>
            <strong>{counts.roles}</strong>
            <span>roles</span>
          </div>
          <div>
            <strong>{counts.duties}</strong>
            <span>duties</span>
          </div>
        </div>
      ) : null}
    </nav>
  );

  return (
    <>
      <aside className={`settings-rail ${styles.desktopRail}`}>
        <div className="settings-rail-copy">
          <span className="eyebrow">Settings workspace</span>
          <h2>Admin and settings</h2>
          <p>
            Use the left rail to move between operational settings and manager administration without
            crowding the main workspace.
          </p>
        </div>
        {directory}
      </aside>

      <details className={`settings-rail ${styles.mobileRail}`}>
        <summary>Settings directory</summary>
        {directory}
      </details>
    </>
  );
}

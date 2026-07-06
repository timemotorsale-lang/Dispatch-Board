import Link from "next/link";

type SettingsWorkspaceNavProps = {
  active: "settings" | "appointments" | "appointment-catalog" | "admin";
  counts?: {
    duties: number;
    roles: number;
    users: number;
  };
};

export function SettingsWorkspaceNav({ active, counts }: SettingsWorkspaceNavProps) {
  return (
    <aside className="settings-rail">
      <div className="settings-rail-copy">
        <span className="eyebrow">Settings workspace</span>
        <h2>Admin and settings</h2>
        <p>
          Use the left rail to move between operational settings and manager administration without
          crowding the main workspace.
        </p>
      </div>

      <div className="settings-rail-group">
        <p className="settings-rail-label">Settings</p>
        <Link
          className={
            active === "settings"
              ? "settings-rail-link settings-rail-link-active"
              : "settings-rail-link"
          }
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
          href="/settings/appointments/catalog"
        >
          <span>Catalog + automation</span>
          <small>Purpose templates, outcomes, reasons, rule hooks, and simulation.</small>
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
    </aside>
  );
}

"use client";

import { useState, useTransition } from "react";

import type {
  ManagedTeamUser,
  TeamManagementDutyOption,
  TeamManagementReferenceOption
} from "@/server/services/team-management";

type TeamManagementPanelProps = {
  duties: TeamManagementDutyOption[];
  initialUsers: ManagedTeamUser[];
  roles: TeamManagementReferenceOption[];
};

type TeamMemberFormState = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds: string[];
  isActive: boolean;
};

type RoleFormState = {
  name: string;
  description: string;
  dutyIds: string[];
};

type DutyFormState = {
  name: string;
  workflowArea: string;
  description: string;
};

const workflowAreaOptions = [
  { value: "INVENTORY", label: "Inventory" },
  { value: "ADVERTISING", label: "Advertising" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SALES", label: "Sales" },
  { value: "ADMIN", label: "Admin" },
  { value: "COLLECTIONS", label: "Collections" },
  { value: "SHOP", label: "Shop" },
  { value: "GENERAL_MANAGER", label: "General Manager" }
] as const;

const initialTeamMemberFormState: TeamMemberFormState = {
  name: "",
  email: "",
  password: "",
  roleIds: [],
  dutyIds: [],
  isActive: true
};

const initialRoleFormState: RoleFormState = {
  name: "",
  description: "",
  dutyIds: []
};

const initialDutyFormState: DutyFormState = {
  name: "",
  workflowArea: "SALES",
  description: ""
};

function formatCreatedAt(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function toggleSelection(values: string[], nextValue: string, checked: boolean) {
  if (checked) {
    return values.includes(nextValue) ? values : [...values, nextValue];
  }

  return values.filter((value) => value !== nextValue);
}

export function TeamManagementPanel({
  duties,
  initialUsers,
  roles
}: TeamManagementPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);
  const [roleOptions, setRoleOptions] = useState(roles);
  const [dutyOptions, setDutyOptions] = useState(duties);
  const [teamMemberFormState, setTeamMemberFormState] = useState(initialTeamMemberFormState);
  const [roleFormState, setRoleFormState] = useState(initialRoleFormState);
  const [dutyFormState, setDutyFormState] = useState(initialDutyFormState);
  const [teamMemberErrorMessage, setTeamMemberErrorMessage] = useState("");
  const [teamMemberSuccessMessage, setTeamMemberSuccessMessage] = useState("");
  const [roleErrorMessage, setRoleErrorMessage] = useState("");
  const [roleSuccessMessage, setRoleSuccessMessage] = useState("");
  const [dutyErrorMessage, setDutyErrorMessage] = useState("");
  const [dutySuccessMessage, setDutySuccessMessage] = useState("");

  function handleSubmitTeamMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamMemberErrorMessage("");
    setTeamMemberSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(teamMemberFormState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            user?: ManagedTeamUser;
          }
        | null;

      if (!response.ok || !payload?.user) {
        setTeamMemberErrorMessage(payload?.error ?? "Unable to add the team member right now.");
        return;
      }

      const createdUser = payload.user;

      setUsers((currentUsers) =>
        [...currentUsers, createdUser].sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
          }

          return left.name.localeCompare(right.name);
        })
      );
      setTeamMemberFormState(initialTeamMemberFormState);
      setTeamMemberSuccessMessage("Team member added.");
    });
  }

  function handleSubmitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleErrorMessage("");
    setRoleSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(roleFormState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            role?: TeamManagementReferenceOption;
          }
        | null;

      if (!response.ok || !payload?.role) {
        setRoleErrorMessage(payload?.error ?? "Unable to add the role right now.");
        return;
      }

      const createdRole = payload.role;

      setRoleOptions((currentRoles) =>
        [...currentRoles, createdRole].sort((left, right) => left.name.localeCompare(right.name))
      );
      setRoleFormState(initialRoleFormState);
      setRoleSuccessMessage("Role added.");
    });
  }

  function handleSubmitDuty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDutyErrorMessage("");
    setDutySuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/duties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dutyFormState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            duty?: TeamManagementDutyOption;
          }
        | null;

      if (!response.ok || !payload?.duty) {
        setDutyErrorMessage(payload?.error ?? "Unable to add the duty right now.");
        return;
      }

      const createdDuty = payload.duty;

      setDutyOptions((currentDuties) =>
        [...currentDuties, createdDuty].sort((left, right) => left.name.localeCompare(right.name))
      );
      setDutyFormState(initialDutyFormState);
      setDutySuccessMessage("Duty added.");
    });
  }

  return (
    <div className="settings-admin-grid">
      <article className="panel-card">
        <strong>Duty library</strong>
        <h2>Create duty definitions</h2>
        <p>
          Duties represent responsibility units that can be assigned directly to staff or attached
          as role defaults during board generation.
        </p>

        <form className="settings-form" onSubmit={handleSubmitDuty}>
          <div className="settings-grid">
            <label className="field">
              <span>Duty name</span>
              <input
                name="duty-name"
                type="text"
                value={dutyFormState.name}
                onChange={(event) =>
                  setDutyFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="Confirm lender document package"
                required
              />
            </label>

            <label className="field">
              <span>Workflow area</span>
              <select
                value={dutyFormState.workflowArea}
                onChange={(event) =>
                  setDutyFormState((current) => ({
                    ...current,
                    workflowArea: event.target.value
                  }))
                }
              >
                {workflowAreaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <input
              name="duty-description"
              type="text"
              value={dutyFormState.description}
              onChange={(event) =>
                setDutyFormState((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="Optional manager-facing description for this duty."
            />
          </label>

          {dutyErrorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{dutyErrorMessage}</p>
            </div>
          ) : null}

          {dutySuccessMessage ? (
            <div className="notice" role="status">
              <p>{dutySuccessMessage}</p>
            </div>
          ) : null}

          <div className="form-actions">
            <button className="pill pill-primary" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Add duty"}
            </button>
          </div>
        </form>

        <div className="team-roster-list">
          {dutyOptions.map((duty) => (
            <section className="team-roster-card" key={duty.id}>
              <div className="team-roster-header">
                <div>
                  <h3>{duty.name}</h3>
                  <p>{duty.description || "No description yet."}</p>
                </div>
                <span className="status-pill status-neutral">{duty.workflowArea}</span>
              </div>
            </section>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <strong>Role coverage</strong>
        <h2>Create roles and default duties</h2>
        <p>
          Add a role definition and optionally attach default duties so daily generation has a clean
          fallback when a staff member has no direct-duty overrides.
        </p>

        <form className="settings-form" onSubmit={handleSubmitRole}>
          <div className="settings-grid">
            <label className="field">
              <span>Role name</span>
              <input
                name="role-name"
                type="text"
                value={roleFormState.name}
                onChange={(event) =>
                  setRoleFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="Finance Manager"
                required
              />
            </label>

            <label className="field">
              <span>Description</span>
              <input
                name="role-description"
                type="text"
                value={roleFormState.description}
                onChange={(event) =>
                  setRoleFormState((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Owns finance workflow coverage."
              />
            </label>
          </div>

          <fieldset className="business-day-group">
            <legend>Default duties for this role</legend>
            <p className="field-hint">
              These become role-default duties when a user on this role has no direct-duty overrides.
            </p>
            <div className="checkbox-list">
              {dutyOptions.map((duty) => (
                <label className="checkbox-item" key={`role-duty-${duty.id}`}>
                  <input
                    checked={roleFormState.dutyIds.includes(duty.id)}
                    type="checkbox"
                    value={duty.id}
                    onChange={(event) =>
                      setRoleFormState((current) => ({
                        ...current,
                        dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked)
                      }))
                    }
                  />
                  <span>
                    {duty.name}
                    <small>{duty.workflowArea}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {roleErrorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{roleErrorMessage}</p>
            </div>
          ) : null}

          {roleSuccessMessage ? (
            <div className="notice" role="status">
              <p>{roleSuccessMessage}</p>
            </div>
          ) : null}

          <div className="form-actions">
            <button className="pill pill-primary" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Add role"}
            </button>
          </div>
        </form>

        <div className="team-roster-list">
          {roleOptions.map((role) => (
            <section className="team-roster-card" key={role.id}>
              <div className="team-roster-header">
                <div>
                  <h3>{role.name}</h3>
                  <p>{role.description || "No description yet."}</p>
                </div>
              </div>
              <dl className="team-roster-details">
                <div>
                  <dt>Default duties</dt>
                  <dd>{role.dutyNames?.join(" • ") || "No default duties assigned"}</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <strong>Manager workflow</strong>
        <h2>Add staff, users, and role coverage</h2>
        <p>
          Create a new login, assign one or more roles, and optionally attach direct duties during
          setup.
        </p>

        <form className="settings-form" onSubmit={handleSubmitTeamMember}>
          <div className="settings-grid">
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                type="text"
                value={teamMemberFormState.name}
                onChange={(event) =>
                  setTeamMemberFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="Alex Staff"
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={teamMemberFormState.email}
                onChange={(event) =>
                  setTeamMemberFormState((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                placeholder="alex.staff@local.test"
                required
              />
            </label>
          </div>

          <div className="settings-grid">
            <label className="field">
              <span>Temporary password</span>
              <input
                name="password"
                type="text"
                value={teamMemberFormState.password}
                onChange={(event) =>
                  setTeamMemberFormState((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                placeholder="dispatch123!"
                required
              />
              <small className="field-hint">Use at least 8 characters for the initial sign-in.</small>
            </label>

            <label className="checkbox-item checkbox-item-inline">
              <input
                checked={teamMemberFormState.isActive}
                type="checkbox"
                onChange={(event) =>
                  setTeamMemberFormState((current) => ({
                    ...current,
                    isActive: event.target.checked
                  }))
                }
              />
              <span>Create as active staff</span>
            </label>
          </div>

          <fieldset className="business-day-group">
            <legend>Roles</legend>
            <p className="field-hint">
              Assign at least one role so board permissions and defaults stay clear.
            </p>
            <div className="checkbox-list">
              {roleOptions.map((role) => (
                <label className="checkbox-item" key={role.id}>
                  <input
                    checked={teamMemberFormState.roleIds.includes(role.id)}
                    type="checkbox"
                    value={role.id}
                    onChange={(event) =>
                      setTeamMemberFormState((current) => ({
                        ...current,
                        roleIds: toggleSelection(
                          current.roleIds,
                          role.id,
                          event.target.checked
                        )
                      }))
                    }
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="business-day-group">
            <legend>Direct duties</legend>
            <p className="field-hint">
              Optional direct duties override pure role-default duty coverage during daily generation.
            </p>
            <div className="checkbox-list">
              {dutyOptions.map((duty) => (
                <label className="checkbox-item" key={duty.id}>
                  <input
                    checked={teamMemberFormState.dutyIds.includes(duty.id)}
                    type="checkbox"
                    value={duty.id}
                    onChange={(event) =>
                      setTeamMemberFormState((current) => ({
                        ...current,
                        dutyIds: toggleSelection(
                          current.dutyIds,
                          duty.id,
                          event.target.checked
                        )
                      }))
                    }
                  />
                  <span>
                    {duty.name}
                    <small>{duty.workflowArea}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {teamMemberErrorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{teamMemberErrorMessage}</p>
            </div>
          ) : null}

          {teamMemberSuccessMessage ? (
            <div className="notice" role="status">
              <p>{teamMemberSuccessMessage}</p>
            </div>
          ) : null}

          <div className="form-actions">
            <button className="pill pill-primary" disabled={isPending} type="submit">
              {isPending ? "Adding..." : "Add team member"}
            </button>
          </div>
        </form>
      </article>

      <article className="panel-card">
        <strong>Current roster</strong>
        <h2>Team members</h2>
        <p>
          This live roster reflects the manager-controlled user directory, role coverage, and direct
          duty setup that the board reads from.
        </p>

        <div className="team-roster-list">
          {users.map((user) => (
            <section className="team-roster-card" key={user.id}>
              <div className="team-roster-header">
                <div>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                </div>
                <span className={user.isActive ? "status-pill status-success" : "status-pill status-neutral"}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="team-roster-meta">Added {formatCreatedAt(user.createdAt)}</p>
              <dl className="team-roster-details">
                <div>
                  <dt>Roles</dt>
                  <dd>{user.roles.map((role) => role.name).join(" / ") || "No roles assigned"}</dd>
                </div>
                <div>
                  <dt>Direct duties</dt>
                  <dd>{user.duties.map((duty) => duty.name).join(" • ") || "Role defaults only"}</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

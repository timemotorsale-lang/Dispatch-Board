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

const initialFormState: TeamMemberFormState = {
  name: "",
  email: "",
  password: "",
  roleIds: [],
  dutyIds: [],
  isActive: true
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
  const [formState, setFormState] = useState<TeamMemberFormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            user?: ManagedTeamUser;
          }
        | null;

      if (!response.ok || !payload?.user) {
        setErrorMessage(payload?.error ?? "Unable to add the team member right now.");
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
      setFormState(initialFormState);
      setSuccessMessage("Team member added.");
    });
  }

  return (
    <div className="settings-admin-grid">
      <article className="panel-card">
        <strong>Manager workflow</strong>
        <h2>Add staff, users, and role coverage</h2>
        <p>
          Create a new login, assign one or more roles, and optionally attach direct duties during
          setup.
        </p>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-grid">
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
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
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
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
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
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
                checked={formState.isActive}
                type="checkbox"
                onChange={(event) =>
                  setFormState((current) => ({
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
            <p className="field-hint">Assign at least one role so board permissions and defaults stay clear.</p>
            <div className="checkbox-list">
              {roles.map((role) => (
                <label className="checkbox-item" key={role.id}>
                  <input
                    checked={formState.roleIds.includes(role.id)}
                    type="checkbox"
                    value={role.id}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        roleIds: toggleSelection(current.roleIds, role.id, event.target.checked)
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
              {duties.map((duty) => (
                <label className="checkbox-item" key={duty.id}>
                  <input
                    checked={formState.dutyIds.includes(duty.id)}
                    type="checkbox"
                    value={duty.id}
                    onChange={(event) =>
                      setFormState((current) => ({
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

          {errorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {successMessage ? (
            <div className="notice" role="status">
              <p>{successMessage}</p>
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

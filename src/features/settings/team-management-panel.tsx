"use client";

import { WorkflowArea } from "@prisma/client";
import { useState, useTransition } from "react";

import { DELEGATED_MANAGER_DUTY_NAME } from "@/server/policies/access";
import type {
  ManagedTeamUser,
  TeamManagementDutyOption,
  TeamManagementReferenceOption
} from "@/server/services/team-management";
import type { TaskTemplateSummary } from "@/server/services/task-template-service";

type TeamManagementPanelProps = {
  canGrantManagerPowers: boolean;
  duties: TeamManagementDutyOption[];
  initialUsers: ManagedTeamUser[];
  roles: TeamManagementReferenceOption[];
  templates: TaskTemplateSummary[];
};

type TeamMemberFormState = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds: string[];
  isActive: boolean;
};

type UserEditFormState = Omit<TeamMemberFormState, "password">;

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

type TemplateFormState = {
  title: string;
  description: string;
  workflowArea: WorkflowArea;
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  roleId: string;
  dutyId: string;
  isActive: boolean;
};

const workflowAreaOptions = [
  { value: WorkflowArea.INVENTORY, label: "Inventory" },
  { value: WorkflowArea.ADVERTISING, label: "Advertising" },
  { value: WorkflowArea.MARKETING, label: "Marketing" },
  { value: WorkflowArea.SALES, label: "Sales" },
  { value: WorkflowArea.ADMIN, label: "Admin" },
  { value: WorkflowArea.COLLECTIONS, label: "Collections" },
  { value: WorkflowArea.SHOP, label: "Shop" },
  { value: WorkflowArea.GENERAL_MANAGER, label: "General Manager" }
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
  workflowArea: WorkflowArea.SALES,
  description: ""
};

const initialTemplateFormState: TemplateFormState = {
  title: "",
  description: "",
  workflowArea: WorkflowArea.SALES,
  defaultDueTime: "09:00",
  requiresManagerApproval: false,
  roleId: "",
  dutyId: "",
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

function sortUsers(users: ManagedTeamUser[]) {
  return [...users].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function sortRoles(roles: TeamManagementReferenceOption[]) {
  return [...roles].sort((left, right) => left.name.localeCompare(right.name));
}

function sortDuties(duties: TeamManagementDutyOption[]) {
  return [...duties].sort((left, right) => left.name.localeCompare(right.name));
}

function sortTemplates(templates: TaskTemplateSummary[]) {
  return [...templates].sort(
    (left, right) =>
      left.workflowArea.localeCompare(right.workflowArea) ||
      left.title.localeCompare(right.title) ||
      left.createdAt.getTime() - right.createdAt.getTime()
  );
}

function createUserEditFormState(user: ManagedTeamUser): UserEditFormState {
  return {
    name: user.name,
    email: user.email,
    roleIds: user.roles.map((role) => role.id),
    dutyIds: user.duties.map((duty) => duty.id),
    isActive: user.isActive
  };
}

function createRoleEditFormState(role: TeamManagementReferenceOption, duties: TeamManagementDutyOption[]): RoleFormState {
  const dutyIds = duties
    .filter((duty) => role.dutyNames?.includes(duty.name))
    .map((duty) => duty.id);

  return {
    name: role.name,
    description: role.description ?? "",
    dutyIds
  };
}

function createDutyEditFormState(duty: TeamManagementDutyOption): DutyFormState {
  return {
    name: duty.name,
    workflowArea: duty.workflowArea,
    description: duty.description ?? ""
  };
}

function createTemplateEditFormState(template: TaskTemplateSummary): TemplateFormState {
  return {
    title: template.title,
    description: template.description ?? "",
    workflowArea: template.workflowArea,
    defaultDueTime: template.defaultDueTime,
    requiresManagerApproval: template.requiresManagerApproval,
    roleId: template.roleId ?? "",
    dutyId: template.dutyId ?? "",
    isActive: template.isActive
  };
}

function toTemplateRequestBody(formState: TemplateFormState) {
  return {
    title: formState.title,
    description: formState.description || null,
    workflowArea: formState.workflowArea,
    defaultDueTime: formState.defaultDueTime,
    requiresManagerApproval: formState.requiresManagerApproval,
    roleId: formState.roleId || null,
    dutyId: formState.dutyId || null,
    isActive: formState.isActive
  };
}

function isDelegatedManagerDuty(duty: { name: string }) {
  return duty.name.trim().toLowerCase() === DELEGATED_MANAGER_DUTY_NAME.toLowerCase();
}

function setManagerPowerAssignment(dutyIds: string[], delegatedDutyId: string | null, shouldGrant: boolean) {
  if (!delegatedDutyId) {
    return dutyIds;
  }

  return shouldGrant
    ? toggleSelection(dutyIds, delegatedDutyId, true)
    : toggleSelection(dutyIds, delegatedDutyId, false);
}

function hasDelegatedManagerPowers(dutyIds: string[], delegatedDutyId: string | null) {
  return delegatedDutyId ? dutyIds.includes(delegatedDutyId) : false;
}

export function TeamManagementPanel({
  canGrantManagerPowers,
  duties,
  initialUsers,
  roles,
  templates
}: TeamManagementPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState(sortUsers(initialUsers));
  const [roleOptions, setRoleOptions] = useState(sortRoles(roles));
  const [dutyOptions, setDutyOptions] = useState(sortDuties(duties));
  const [templateOptions, setTemplateOptions] = useState(sortTemplates(templates));
  const [teamMemberFormState, setTeamMemberFormState] = useState(initialTeamMemberFormState);
  const [roleFormState, setRoleFormState] = useState(initialRoleFormState);
  const [dutyFormState, setDutyFormState] = useState(initialDutyFormState);
  const [templateFormState, setTemplateFormState] = useState(initialTemplateFormState);
  const [editingUserId, setEditingUserId] = useState("");
  const [editingRoleId, setEditingRoleId] = useState("");
  const [editingDutyId, setEditingDutyId] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [userEditFormState, setUserEditFormState] = useState<UserEditFormState | null>(null);
  const [roleEditFormState, setRoleEditFormState] = useState<RoleFormState | null>(null);
  const [dutyEditFormState, setDutyEditFormState] = useState<DutyFormState | null>(null);
  const [templateEditFormState, setTemplateEditFormState] = useState<TemplateFormState | null>(null);
  const [teamMemberMessage, setTeamMemberMessage] = useState({ error: "", success: "" });
  const [roleMessage, setRoleMessage] = useState({ error: "", success: "" });
  const [dutyMessage, setDutyMessage] = useState({ error: "", success: "" });
  const [templateMessage, setTemplateMessage] = useState({ error: "", success: "" });
  const [editMessage, setEditMessage] = useState({ error: "", success: "" });
  const delegatedManagerDuty = dutyOptions.find(isDelegatedManagerDuty) ?? null;
  const standardDutyOptions = dutyOptions.filter((duty) => !isDelegatedManagerDuty(duty));
  const delegatedManagerDutyId = delegatedManagerDuty?.id ?? null;

  function resetEditMessage() {
    setEditMessage({ error: "", success: "" });
  }

  function handleCreateTeamMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamMemberMessage({ error: "", success: "" });

    startTransition(async () => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamMemberFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: ManagedTeamUser } | null;

      if (!response.ok || !payload?.user) {
        setTeamMemberMessage({ error: payload?.error ?? "Unable to add the team member right now.", success: "" });
        return;
      }

      setUsers((current) => sortUsers([...current, payload.user!]));
      setTeamMemberFormState(initialTeamMemberFormState);
      setTeamMemberMessage({ error: "", success: "Team member added." });
    });
  }

  function handleCreateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleMessage({ error: "", success: "" });

    startTransition(async () => {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; role?: TeamManagementReferenceOption } | null;

      if (!response.ok || !payload?.role) {
        setRoleMessage({ error: payload?.error ?? "Unable to add the role right now.", success: "" });
        return;
      }

      setRoleOptions((current) => sortRoles([...current, payload.role!]));
      setRoleFormState(initialRoleFormState);
      setRoleMessage({ error: "", success: "Role added." });
    });
  }

  function handleCreateDuty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDutyMessage({ error: "", success: "" });

    startTransition(async () => {
      const response = await fetch("/api/duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dutyFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; duty?: TeamManagementDutyOption } | null;

      if (!response.ok || !payload?.duty) {
        setDutyMessage({ error: payload?.error ?? "Unable to add the duty right now.", success: "" });
        return;
      }

      setDutyOptions((current) => sortDuties([...current, payload.duty!]));
      setDutyFormState(initialDutyFormState);
      setDutyMessage({ error: "", success: "Duty added." });
    });
  }

  function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTemplateMessage({ error: "", success: "" });

    startTransition(async () => {
      const response = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toTemplateRequestBody(templateFormState))
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; template?: TaskTemplateSummary } | null;

      if (!response.ok || !payload?.template) {
        setTemplateMessage({ error: payload?.error ?? "Unable to add the task template right now.", success: "" });
        return;
      }

      setTemplateOptions((current) => sortTemplates([...current, payload.template!]));
      setTemplateFormState(initialTemplateFormState);
      setTemplateMessage({ error: "", success: "Task template added." });
    });
  }

  function saveUserEdit(userId: string) {
    if (!userEditFormState) {
      return;
    }

    resetEditMessage();

    startTransition(async () => {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userEditFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: ManagedTeamUser } | null;

      if (!response.ok || !payload?.user) {
        setEditMessage({ error: payload?.error ?? "Unable to update the team member right now.", success: "" });
        return;
      }

      setUsers((current) => sortUsers(current.map((user) => (user.id === userId ? payload.user! : user))));
      setEditingUserId("");
      setUserEditFormState(null);
      setEditMessage({ error: "", success: "Team member updated." });
    });
  }

  function toggleUserActivation(user: ManagedTeamUser) {
    resetEditMessage();

    startTransition(async () => {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: ManagedTeamUser } | null;

      if (!response.ok || !payload?.user) {
        setEditMessage({ error: payload?.error ?? "Unable to update activation right now.", success: "" });
        return;
      }

      setUsers((current) => sortUsers(current.map((candidate) => (candidate.id === user.id ? payload.user! : candidate))));
      setEditMessage({ error: "", success: payload.user.isActive ? "Team member activated." : "Team member deactivated." });
    });
  }

  function saveRoleEdit(roleId: string) {
    if (!roleEditFormState) {
      return;
    }

    resetEditMessage();

    startTransition(async () => {
      const response = await fetch(`/api/roles/${encodeURIComponent(roleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleEditFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; role?: TeamManagementReferenceOption } | null;

      if (!response.ok || !payload?.role) {
        setEditMessage({ error: payload?.error ?? "Unable to update the role right now.", success: "" });
        return;
      }

      setRoleOptions((current) => sortRoles(current.map((role) => (role.id === roleId ? payload.role! : role))));
      setEditingRoleId("");
      setRoleEditFormState(null);
      setEditMessage({ error: "", success: "Role updated." });
    });
  }

  function saveDutyEdit(dutyId: string) {
    if (!dutyEditFormState) {
      return;
    }

    resetEditMessage();

    startTransition(async () => {
      const response = await fetch(`/api/duties/${encodeURIComponent(dutyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dutyEditFormState)
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; duty?: TeamManagementDutyOption } | null;

      if (!response.ok || !payload?.duty) {
        setEditMessage({ error: payload?.error ?? "Unable to update the duty right now.", success: "" });
        return;
      }

      setDutyOptions((current) => sortDuties(current.map((duty) => (duty.id === dutyId ? payload.duty! : duty))));
      setEditingDutyId("");
      setDutyEditFormState(null);
      setEditMessage({ error: "", success: "Duty updated." });
    });
  }

  function saveTemplateEdit(templateId: string) {
    if (!templateEditFormState) {
      return;
    }

    resetEditMessage();

    startTransition(async () => {
      const response = await fetch(`/api/task-templates/${encodeURIComponent(templateId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toTemplateRequestBody(templateEditFormState))
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; template?: TaskTemplateSummary } | null;

      if (!response.ok || !payload?.template) {
        setEditMessage({ error: payload?.error ?? "Unable to update the task template right now.", success: "" });
        return;
      }

      setTemplateOptions((current) =>
        sortTemplates(current.map((template) => (template.id === templateId ? payload.template! : template)))
      );
      setEditingTemplateId("");
      setTemplateEditFormState(null);
      setEditMessage({ error: "", success: "Task template updated." });
    });
  }

  return (
    <div className="settings-admin-grid">
      {editMessage.error ? <div className="notice notice-danger"><p>{editMessage.error}</p></div> : null}
      {editMessage.success ? <div className="notice"><p>{editMessage.success}</p></div> : null}

      <article className="panel-card">
        <strong>Duty library</strong>
        <h2>Create and edit duties</h2>
        <p>Duties define the work responsibility units managers can assign directly or through role defaults.</p>
        <form className="settings-form" onSubmit={handleCreateDuty}>
          <div className="settings-grid">
            <label className="field">
              <span>Duty name</span>
              <input value={dutyFormState.name} onChange={(event) => setDutyFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Confirm lender document package" required />
            </label>
            <label className="field">
              <span>Workflow area</span>
              <select value={dutyFormState.workflowArea} onChange={(event) => setDutyFormState((current) => ({ ...current, workflowArea: event.target.value }))}>
                {workflowAreaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <input value={dutyFormState.description} onChange={(event) => setDutyFormState((current) => ({ ...current, description: event.target.value }))} placeholder="Optional manager-facing description." />
          </label>
          {dutyMessage.error ? <div className="notice notice-danger"><p>{dutyMessage.error}</p></div> : null}
          {dutyMessage.success ? <div className="notice"><p>{dutyMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isPending} type="submit">{isPending ? "Saving..." : "Add duty"}</button></div>
        </form>
        <div className="team-roster-list">
          {standardDutyOptions.map((duty) => {
            const isEditing = editingDutyId === duty.id && dutyEditFormState;

            return (
              <section className="team-roster-card" key={duty.id}>
                {isEditing ? (
                  <>
                    <div className="settings-grid">
                      <label className="field">
                        <span>Duty name</span>
                        <input value={dutyEditFormState.name} onChange={(event) => setDutyEditFormState((current) => current ? { ...current, name: event.target.value } : current)} />
                      </label>
                      <label className="field">
                        <span>Workflow area</span>
                        <select value={dutyEditFormState.workflowArea} onChange={(event) => setDutyEditFormState((current) => current ? { ...current, workflowArea: event.target.value } : current)}>
                          {workflowAreaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>Description</span>
                      <input value={dutyEditFormState.description} onChange={(event) => setDutyEditFormState((current) => current ? { ...current, description: event.target.value } : current)} />
                    </label>
                    <div className="form-actions">
                      <button className="pill pill-primary" disabled={isPending} onClick={() => saveDutyEdit(duty.id)} type="button">Save duty</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingDutyId(""); setDutyEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{duty.name}</h3><p>{duty.description || "No description yet."}</p></div>
                      <span className="status-pill status-neutral">{duty.workflowArea}</span>
                    </div>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingDutyId(duty.id); setDutyEditFormState(createDutyEditFormState(duty)); }} type="button">Edit duty</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </article>

      <article className="panel-card">
        <strong>Role coverage</strong>
        <h2>Create and edit roles</h2>
        <p>Roles carry permission coverage and default-duty fallbacks when staff do not have direct-duty overrides.</p>
        <form className="settings-form" onSubmit={handleCreateRole}>
          <div className="settings-grid">
            <label className="field">
              <span>Role name</span>
              <input value={roleFormState.name} onChange={(event) => setRoleFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Finance Manager" required />
            </label>
            <label className="field">
              <span>Description</span>
              <input value={roleFormState.description} onChange={(event) => setRoleFormState((current) => ({ ...current, description: event.target.value }))} placeholder="Owns finance workflow coverage." />
            </label>
          </div>
          <fieldset className="business-day-group">
            <legend>Default duties</legend>
            <div className="checkbox-list">
              {standardDutyOptions.map((duty) => (
                <label className="checkbox-item" key={`new-role-${duty.id}`}>
                  <input checked={roleFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setRoleFormState((current) => ({ ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) }))} />
                  <span>{duty.name}<small>{duty.workflowArea}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          {roleMessage.error ? <div className="notice notice-danger"><p>{roleMessage.error}</p></div> : null}
          {roleMessage.success ? <div className="notice"><p>{roleMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isPending} type="submit">{isPending ? "Saving..." : "Add role"}</button></div>
        </form>
        <div className="team-roster-list">
          {roleOptions.map((role) => {
            const isEditing = editingRoleId === role.id && roleEditFormState;

            return (
              <section className="team-roster-card" key={role.id}>
                {isEditing ? (
                  <>
                    <div className="settings-grid">
                      <label className="field">
                        <span>Role name</span>
                        <input value={roleEditFormState.name} onChange={(event) => setRoleEditFormState((current) => current ? { ...current, name: event.target.value } : current)} />
                      </label>
                      <label className="field">
                        <span>Description</span>
                        <input value={roleEditFormState.description} onChange={(event) => setRoleEditFormState((current) => current ? { ...current, description: event.target.value } : current)} />
                      </label>
                    </div>
                    <fieldset className="business-day-group">
                      <legend>Default duties</legend>
                      <div className="checkbox-list">
                        {standardDutyOptions.map((duty) => (
                          <label className="checkbox-item" key={`edit-role-${role.id}-${duty.id}`}>
                            <input checked={roleEditFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setRoleEditFormState((current) => current ? { ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) } : current)} />
                            <span>{duty.name}<small>{duty.workflowArea}</small></span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="form-actions">
                      <button className="pill pill-primary" disabled={isPending} onClick={() => saveRoleEdit(role.id)} type="button">Save role</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingRoleId(""); setRoleEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{role.name}</h3><p>{role.description || "No description yet."}</p></div>
                    </div>
                    <dl className="team-roster-details"><div><dt>Default duties</dt><dd>{role.dutyNames?.join(" • ") || "No default duties assigned"}</dd></div></dl>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingRoleId(role.id); setRoleEditFormState(createRoleEditFormState(role, dutyOptions)); }} type="button">Edit role</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </article>

      <article className="panel-card">
        <strong>Task templates</strong>
        <h2>Create and optimize daily work generation</h2>
        <p>Templates define what the board generates each day, which workflow it belongs to, and whether it needs manager approval.</p>
        <form className="settings-form" onSubmit={handleCreateTemplate}>
          <div className="settings-grid">
            <label className="field"><span>Title</span><input value={templateFormState.title} onChange={(event) => setTemplateFormState((current) => ({ ...current, title: event.target.value }))} placeholder="Morning inventory status review" required /></label>
            <label className="field"><span>Default due time</span><input type="time" value={templateFormState.defaultDueTime} onChange={(event) => setTemplateFormState((current) => ({ ...current, defaultDueTime: event.target.value }))} required /></label>
          </div>
          <label className="field"><span>Description</span><input value={templateFormState.description} onChange={(event) => setTemplateFormState((current) => ({ ...current, description: event.target.value }))} placeholder="Optional template description." /></label>
          <div className="settings-grid">
            <label className="field"><span>Workflow area</span><select value={templateFormState.workflowArea} onChange={(event) => setTemplateFormState((current) => ({ ...current, workflowArea: event.target.value as WorkflowArea }))}>{workflowAreaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="field"><span>Role match</span><select value={templateFormState.roleId} onChange={(event) => setTemplateFormState((current) => ({ ...current, roleId: event.target.value }))}><option value="">No role link</option>{roleOptions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          </div>
          <div className="settings-grid">
            <label className="field"><span>Duty match</span><select value={templateFormState.dutyId} onChange={(event) => setTemplateFormState((current) => ({ ...current, dutyId: event.target.value }))}><option value="">No duty link</option>{standardDutyOptions.map((duty) => <option key={duty.id} value={duty.id}>{duty.name}</option>)}</select></label>
            <label className="checkbox-item checkbox-item-inline"><input checked={templateFormState.requiresManagerApproval} type="checkbox" onChange={(event) => setTemplateFormState((current) => ({ ...current, requiresManagerApproval: event.target.checked }))} /><span>Requires manager approval</span></label>
          </div>
          {templateMessage.error ? <div className="notice notice-danger"><p>{templateMessage.error}</p></div> : null}
          {templateMessage.success ? <div className="notice"><p>{templateMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isPending} type="submit">{isPending ? "Saving..." : "Add template"}</button></div>
        </form>
        <div className="team-roster-list">
          {templateOptions.map((template) => {
            const isEditing = editingTemplateId === template.id && templateEditFormState;

            return (
              <section className="team-roster-card" key={template.id}>
                {isEditing ? (
                  <>
                    <div className="settings-grid">
                      <label className="field"><span>Title</span><input value={templateEditFormState.title} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, title: event.target.value } : current)} /></label>
                      <label className="field"><span>Due time</span><input type="time" value={templateEditFormState.defaultDueTime} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, defaultDueTime: event.target.value } : current)} /></label>
                    </div>
                    <label className="field"><span>Description</span><input value={templateEditFormState.description} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, description: event.target.value } : current)} /></label>
                    <div className="settings-grid">
                      <label className="field"><span>Workflow</span><select value={templateEditFormState.workflowArea} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, workflowArea: event.target.value as WorkflowArea } : current)}>{workflowAreaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                      <label className="field"><span>Role link</span><select value={templateEditFormState.roleId} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, roleId: event.target.value } : current)}><option value="">No role link</option>{roleOptions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
                    </div>
                    <div className="settings-grid">
                      <label className="field"><span>Duty link</span><select value={templateEditFormState.dutyId} onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, dutyId: event.target.value } : current)}><option value="">No duty link</option>{standardDutyOptions.map((duty) => <option key={duty.id} value={duty.id}>{duty.name}</option>)}</select></label>
                      <label className="checkbox-item checkbox-item-inline"><input checked={templateEditFormState.requiresManagerApproval} type="checkbox" onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, requiresManagerApproval: event.target.checked } : current)} /><span>Requires manager approval</span></label>
                    </div>
                    <label className="checkbox-item checkbox-item-inline"><input checked={templateEditFormState.isActive} type="checkbox" onChange={(event) => setTemplateEditFormState((current) => current ? { ...current, isActive: event.target.checked } : current)} /><span>Template active</span></label>
                    <div className="form-actions">
                      <button className="pill pill-primary" disabled={isPending} onClick={() => saveTemplateEdit(template.id)} type="button">Save template</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingTemplateId(""); setTemplateEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{template.title}</h3><p>{template.description || "No description yet."}</p></div>
                      <span className={template.isActive ? "status-pill status-success" : "status-pill status-neutral"}>{template.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <dl className="team-roster-details">
                      <div><dt>Workflow / due time</dt><dd>{template.workflowArea} • {template.defaultDueTime}</dd></div>
                      <div><dt>Matching rules</dt><dd>{template.roleName || "No role link"} • {template.dutyName?.trim().toLowerCase() === DELEGATED_MANAGER_DUTY_NAME.toLowerCase() ? "No duty link" : template.dutyName || "No duty link"}</dd></div>
                    </dl>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingTemplateId(template.id); setTemplateEditFormState(createTemplateEditFormState(template)); }} type="button">Edit template</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </article>

      <article className="panel-card">
        <strong>Manager workflow</strong>
        <h2>Add and manage staff accounts</h2>
        <p>Create staff logins, assign roles, and control who is active on the team roster.</p>
        <form className="settings-form" onSubmit={handleCreateTeamMember}>
          <div className="settings-grid">
            <label className="field"><span>Full name</span><input value={teamMemberFormState.name} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Alex Staff" required /></label>
            <label className="field"><span>Email</span><input type="email" value={teamMemberFormState.email} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, email: event.target.value }))} placeholder="alex.staff@local.test" required /></label>
          </div>
          <div className="settings-grid">
            <label className="field"><span>Temporary password</span><input value={teamMemberFormState.password} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, password: event.target.value }))} placeholder="dispatch123!" required /></label>
            <label className="checkbox-item checkbox-item-inline"><input checked={teamMemberFormState.isActive} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, isActive: event.target.checked }))} /><span>Create as active staff</span></label>
          </div>
          <fieldset className="business-day-group">
            <legend>Roles</legend>
            <div className="checkbox-list">{roleOptions.map((role) => <label className="checkbox-item" key={`user-role-${role.id}`}><input checked={teamMemberFormState.roleIds.includes(role.id)} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, roleIds: toggleSelection(current.roleIds, role.id, event.target.checked) }))} /><span>{role.name}</span></label>)}</div>
          </fieldset>
          <fieldset className="business-day-group">
            <legend>Direct duties</legend>
            <div className="checkbox-list">{standardDutyOptions.map((duty) => <label className="checkbox-item" key={`user-duty-${duty.id}`}><input checked={teamMemberFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) }))} /><span>{duty.name}<small>{duty.workflowArea}</small></span></label>)}</div>
          </fieldset>
          <fieldset className="business-day-group">
            <legend>Manager powers</legend>
            <label className="checkbox-item">
              <input
                checked={hasDelegatedManagerPowers(teamMemberFormState.dutyIds, delegatedManagerDutyId)}
                disabled={!canGrantManagerPowers || !delegatedManagerDutyId}
                type="checkbox"
                onChange={(event) =>
                  setTeamMemberFormState((current) => ({
                    ...current,
                    dutyIds: setManagerPowerAssignment(
                      current.dutyIds,
                      delegatedManagerDutyId,
                      event.target.checked
                    )
                  }))
                }
              />
              <span>
                Grant manager powers
                <small>
                  {canGrantManagerPowers
                    ? "Lets this team member manage staff, duties, roles, templates, and board settings."
                    : "Only the General Manager can grant or revoke elevated manager capabilities."}
                </small>
              </span>
            </label>
          </fieldset>
          {teamMemberMessage.error ? <div className="notice notice-danger"><p>{teamMemberMessage.error}</p></div> : null}
          {teamMemberMessage.success ? <div className="notice"><p>{teamMemberMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isPending} type="submit">{isPending ? "Adding..." : "Add team member"}</button></div>
        </form>
        <div className="team-roster-list">
          {users.map((user) => {
            const isEditing = editingUserId === user.id && userEditFormState;

            return (
              <section className="team-roster-card" key={user.id}>
                {isEditing ? (
                  <>
                    <div className="settings-grid">
                      <label className="field"><span>Name</span><input value={userEditFormState.name} onChange={(event) => setUserEditFormState((current) => current ? { ...current, name: event.target.value } : current)} /></label>
                      <label className="field"><span>Email</span><input type="email" value={userEditFormState.email} onChange={(event) => setUserEditFormState((current) => current ? { ...current, email: event.target.value } : current)} /></label>
                    </div>
                    <label className="checkbox-item checkbox-item-inline"><input checked={userEditFormState.isActive} type="checkbox" onChange={(event) => setUserEditFormState((current) => current ? { ...current, isActive: event.target.checked } : current)} /><span>Active staff member</span></label>
                    <fieldset className="business-day-group">
                      <legend>Roles</legend>
                      <div className="checkbox-list">{roleOptions.map((role) => <label className="checkbox-item" key={`edit-user-role-${user.id}-${role.id}`}><input checked={userEditFormState.roleIds.includes(role.id)} type="checkbox" onChange={(event) => setUserEditFormState((current) => current ? { ...current, roleIds: toggleSelection(current.roleIds, role.id, event.target.checked) } : current)} /><span>{role.name}</span></label>)}</div>
                    </fieldset>
                    <fieldset className="business-day-group">
                      <legend>Direct duties</legend>
                      <div className="checkbox-list">{standardDutyOptions.map((duty) => <label className="checkbox-item" key={`edit-user-duty-${user.id}-${duty.id}`}><input checked={userEditFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setUserEditFormState((current) => current ? { ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) } : current)} /><span>{duty.name}<small>{duty.workflowArea}</small></span></label>)}</div>
                    </fieldset>
                    <fieldset className="business-day-group">
                      <legend>Manager powers</legend>
                      <label className="checkbox-item">
                        <input
                          checked={hasDelegatedManagerPowers(userEditFormState.dutyIds, delegatedManagerDutyId)}
                          disabled={!canGrantManagerPowers || !delegatedManagerDutyId}
                          type="checkbox"
                          onChange={(event) =>
                            setUserEditFormState((current) =>
                              current
                                ? {
                                    ...current,
                                    dutyIds: setManagerPowerAssignment(
                                      current.dutyIds,
                                      delegatedManagerDutyId,
                                      event.target.checked
                                    )
                                  }
                                : current
                            )
                          }
                        />
                        <span>
                          Grant manager powers
                          <small>
                            {canGrantManagerPowers
                              ? "Lets this team member manage staff, duties, roles, templates, and board settings."
                              : "Only the General Manager can grant or revoke elevated manager capabilities."}
                          </small>
                        </span>
                      </label>
                    </fieldset>
                    <div className="form-actions">
                      <button className="pill pill-primary" disabled={isPending} onClick={() => saveUserEdit(user.id)} type="button">Save team member</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingUserId(""); setUserEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{user.name}</h3><p>{user.email}</p></div>
                      <span className={user.isActive ? "status-pill status-success" : "status-pill status-neutral"}>{user.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="team-roster-meta">Added {formatCreatedAt(user.createdAt)}</p>
                    <dl className="team-roster-details">
                      <div><dt>Roles</dt><dd>{user.roles.map((role) => role.name).join(" / ") || "No roles assigned"}</dd></div>
                      <div><dt>Direct duties</dt><dd>{user.duties.filter((duty) => !isDelegatedManagerDuty(duty)).map((duty) => duty.name).join(" • ") || "Role defaults only"}</dd></div>
                      <div><dt>Manager powers</dt><dd>{user.duties.some(isDelegatedManagerDuty) ? "Granted by General Manager" : "No delegated manager powers"}</dd></div>
                    </dl>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingUserId(user.id); setUserEditFormState(createUserEditFormState(user)); }} type="button">Edit member</button>
                      <button className={user.isActive ? "pill pill-secondary" : "pill pill-primary"} disabled={isPending} onClick={() => toggleUserActivation(user)} type="button">{user.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </article>
    </div>
  );
}

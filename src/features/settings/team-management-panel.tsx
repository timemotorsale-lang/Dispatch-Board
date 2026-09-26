"use client";

import { WorkflowArea } from "@prisma/client";
import { useState } from "react";

import type { PasswordResetPreview } from "@/server/auth/password-recovery";
import type { StaffInvitePreview } from "@/server/auth/staff-invite";
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
  initialInvites: StaffInvitePreview[];
  initialPasswordRecoveryRequests: PasswordResetPreview[];
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

type StaffInviteFormState = {
  name: string;
  email: string;
  roleIds: string[];
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

type UserSortMode = "name" | "status" | "role" | "newest" | "updated";

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

const initialStaffInviteFormState: StaffInviteFormState = {
  name: "",
  email: "",
  roleIds: []
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

function sortUsersForView(users: ManagedTeamUser[], sortMode: UserSortMode) {
  return [...users].sort((left, right) => {
    if (sortMode === "status") {
      return Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name);
    }

    if (sortMode === "role") {
      const leftRole = left.roles[0]?.name ?? "";
      const rightRole = right.roles[0]?.name ?? "";

      return leftRole.localeCompare(rightRole) || left.name.localeCompare(right.name);
    }

    if (sortMode === "newest") {
      return getCreatedAtTime(right.createdAt) - getCreatedAtTime(left.createdAt) || left.name.localeCompare(right.name);
    }

    if (sortMode === "updated") {
      return getCreatedAtTime(right.updatedAt) - getCreatedAtTime(left.updatedAt) || left.name.localeCompare(right.name);
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

function getCreatedAtTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  return Number.isFinite(time) ? time : 0;
}

function sortTemplates(templates: TaskTemplateSummary[]) {
  return [...templates].sort(
    (left, right) =>
      left.workflowArea.localeCompare(right.workflowArea) ||
      left.title.localeCompare(right.title) ||
      getCreatedAtTime(left.createdAt as Date | string) - getCreatedAtTime(right.createdAt as Date | string)
  );
}

function sortInvites(invites: StaffInvitePreview[]) {
  return [...invites].sort(
    (left, right) => getCreatedAtTime(right.createdAt) - getCreatedAtTime(left.createdAt)
  );
}

function sortPasswordRecoveryRequests(requests: PasswordResetPreview[]) {
  return [...requests].sort(
    (left, right) => getCreatedAtTime(right.createdAt) - getCreatedAtTime(left.createdAt)
  );
}

function inviteStatusClass(status: StaffInvitePreview["status"]) {
  if (status === "PENDING") return "status-pill status-success";
  if (status === "ACCEPTED") return "status-pill status-neutral";
  if (status === "EXPIRED") return "status-pill status-warning";
  return "status-pill status-danger";
}

function recoveryStatusClass(status: PasswordResetPreview["status"]) {
  if (status === "REQUESTED" || status === "APPROVED") return "status-pill status-warning";
  if (status === "COMPLETED") return "status-pill status-success";
  if (status === "EXPIRED") return "status-pill status-neutral";
  return "status-pill status-danger";
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

function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
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

function getEmptyStateCopy(itemName: string, hasFilter: boolean) {
  return hasFilter
    ? `No ${itemName} match the current filter. Clear the search or choose another status.`
    : `No ${itemName} have been set up yet. Add one above to make it available here.`;
}

function getUserAttentionItems(user: ManagedTeamUser) {
  const items: string[] = [];

  if (isUserLocked(user)) {
    items.push("Unlock");
  }

  if (!user.isActive) {
    items.push("Reactivate");
  }

  if (user.roles.length === 0) {
    items.push("Assign role");
  }

  if (user.roles.length === 0 && user.duties.filter((duty) => !isDelegatedManagerDuty(duty)).length === 0) {
    items.push("Add coverage");
  }

  return items;
}

function isUserLocked(user: ManagedTeamUser) {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
}

function getTemplateAttentionItems(template: TaskTemplateSummary) {
  const items: string[] = [];

  if (!template.isActive) {
    items.push("Reactivate template");
  }

  if (!template.roleName && (!template.dutyName || template.dutyName.trim().toLowerCase() === DELEGATED_MANAGER_DUTY_NAME.toLowerCase())) {
    items.push("Add match rule");
  }

  return items;
}

function getRoleAttentionItems(role: TeamManagementReferenceOption) {
  const defaultDutyCount =
    role.dutyNames?.filter((dutyName) => dutyName.trim().toLowerCase() !== DELEGATED_MANAGER_DUTY_NAME.toLowerCase()).length ?? 0;

  return defaultDutyCount === 0 ? ["Add default duty"] : [];
}

export function TeamManagementPanel({
  canGrantManagerPowers,
  duties,
  initialInvites,
  initialPasswordRecoveryRequests,
  initialUsers,
  roles,
  templates
}: TeamManagementPanelProps) {
  const [pendingAction, setPendingAction] = useState("");
  const [users, setUsers] = useState(sortUsers(initialUsers));
  const [staffInvites, setStaffInvites] = useState(sortInvites(initialInvites));
  const [passwordRecoveryRequests, setPasswordRecoveryRequests] = useState(sortPasswordRecoveryRequests(initialPasswordRecoveryRequests));
  const [roleOptions, setRoleOptions] = useState(sortRoles(roles));
  const [dutyOptions, setDutyOptions] = useState(sortDuties(duties));
  const [templateOptions, setTemplateOptions] = useState(sortTemplates(templates));
  const [staffInviteFormState, setStaffInviteFormState] = useState(initialStaffInviteFormState);
  const [inviteLinksById, setInviteLinksById] = useState<Record<string, string>>({});
  const [resetLinksById, setResetLinksById] = useState<Record<string, string>>({});
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
  const [staffInviteMessage, setStaffInviteMessage] = useState({ error: "", inviteUrl: "", success: "" });
  const [passwordRecoveryMessage, setPasswordRecoveryMessage] = useState({ error: "", resetUrl: "", success: "" });
  const [teamMemberMessage, setTeamMemberMessage] = useState({ error: "", success: "" });
  const [roleMessage, setRoleMessage] = useState({ error: "", success: "" });
  const [dutyMessage, setDutyMessage] = useState({ error: "", success: "" });
  const [templateMessage, setTemplateMessage] = useState({ error: "", success: "" });
  const [editMessage, setEditMessage] = useState({ error: "", success: "" });
  const [passwordResetByUserId, setPasswordResetByUserId] = useState<Record<string, string>>({});
  const [openPasswordResetUserId, setOpenPasswordResetUserId] = useState("");
  const [confirmActionId, setConfirmActionId] = useState("");
  const [openUserActionId, setOpenUserActionId] = useState("");
  const [userSearchText, setUserSearchText] = useState("");
  const [roleSearchText, setRoleSearchText] = useState("");
  const [dutySearchText, setDutySearchText] = useState("");
  const [templateSearchText, setTemplateSearchText] = useState("");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [userSortMode, setUserSortMode] = useState<UserSortMode>("name");
  const delegatedManagerDuty = dutyOptions.find(isDelegatedManagerDuty) ?? null;
  const standardDutyOptions = dutyOptions.filter((duty) => !isDelegatedManagerDuty(duty));
  const delegatedManagerDutyId = delegatedManagerDuty?.id ?? null;

  function resetEditMessage() {
    setEditMessage({ error: "", success: "" });
  }

  async function runAction(actionId: string, action: () => Promise<void>) {
    setPendingAction(actionId);

    try {
      await action();
    } finally {
      setPendingAction("");
      setConfirmActionId((current) => (current === actionId ? "" : current));
    }
  }

  function handleCreateStaffInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffInviteMessage({ error: "", inviteUrl: "", success: "" });

    const roleNames = staffInviteFormState.roleIds
      .map((roleId) => roleOptions.find((role) => role.id === roleId)?.name)
      .filter((roleName): roleName is string => Boolean(roleName));

    void runAction("create-staff-invite", async () => {
      const response = await fetch("/api/auth/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: staffInviteFormState.email,
          name: staffInviteFormState.name,
          roleNames
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; invite?: StaffInvitePreview; inviteUrl?: string } | null;

      if (!response.ok || !payload?.inviteUrl) {
        setStaffInviteMessage({ error: payload?.error ?? "Unable to create the staff invite right now.", inviteUrl: "", success: "" });
        return;
      }

      const inviteUrl = `${window.location.origin}${payload.inviteUrl}`;
      setStaffInviteFormState(initialStaffInviteFormState);
      const invite = "invite" in payload ? payload.invite : null;
      if (invite) {
        setStaffInvites((current) => sortInvites([invite, ...current.filter((item) => item.id !== invite.id)]));
        setInviteLinksById((current) => ({ ...current, [invite.id]: inviteUrl }));
      }
      setStaffInviteMessage({ error: "", inviteUrl, success: "Staff invite created. Send this link to the approved staff member." });
    });
  }

  function updateInvite(invite: StaffInvitePreview) {
    setStaffInvites((current) => sortInvites(current.map((item) => (item.id === invite.id ? invite : item))));
  }

  function revokeInvite(invite: StaffInvitePreview) {
    setStaffInviteMessage({ error: "", inviteUrl: "", success: "" });

    void runAction(`invite:${invite.id}:revoke`, async () => {
      const response = await fetch(`/api/auth/invites/${encodeURIComponent(invite.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; invite?: StaffInvitePreview } | null;

      if (!response.ok || !payload?.invite) {
        setStaffInviteMessage({ error: payload?.error ?? "Unable to revoke the staff invite right now.", inviteUrl: "", success: "" });
        return;
      }

      updateInvite(payload.invite);
      setInviteLinksById((current) => {
        const next = { ...current };
        delete next[payload.invite!.id];
        return next;
      });
      setStaffInviteMessage({ error: "", inviteUrl: "", success: `Invite revoked for ${payload.invite.email}.` });
    });
  }

  function resendInvite(invite: StaffInvitePreview) {
    setStaffInviteMessage({ error: "", inviteUrl: "", success: "" });

    void runAction(`invite:${invite.id}:resend`, async () => {
      const response = await fetch(`/api/auth/invites/${encodeURIComponent(invite.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; invite?: StaffInvitePreview; inviteUrl?: string } | null;

      if (!response.ok || !payload?.invite || !payload.inviteUrl) {
        setStaffInviteMessage({ error: payload?.error ?? "Unable to resend the staff invite right now.", inviteUrl: "", success: "" });
        return;
      }

      const inviteUrl = `${window.location.origin}${payload.inviteUrl}`;
      updateInvite(payload.invite);
      setInviteLinksById((current) => ({ ...current, [payload.invite!.id]: inviteUrl }));
      setStaffInviteMessage({ error: "", inviteUrl, success: `Invite resent for ${payload.invite.email}. Send the new link below.` });
    });
  }

  function copyInviteLink(inviteId: string) {
    const inviteUrl = inviteLinksById[inviteId];
    if (!inviteUrl) return;

    void navigator.clipboard?.writeText(inviteUrl);
    setStaffInviteMessage({ error: "", inviteUrl, success: "Invite link copied." });
  }

  function updatePasswordRecoveryRequest(reset: PasswordResetPreview) {
    setPasswordRecoveryRequests((current) => sortPasswordRecoveryRequests(current.map((item) => (item.id === reset.id ? reset : item))));
  }

  function issuePasswordResetLink(reset: PasswordResetPreview) {
    setPasswordRecoveryMessage({ error: "", resetUrl: "", success: "" });

    void runAction(`password-reset:${reset.id}:issue`, async () => {
      const response = await fetch(`/api/auth/password-recovery/${encodeURIComponent(reset.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue" })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; reset?: PasswordResetPreview; resetUrl?: string } | null;

      if (!response.ok || !payload?.reset || !payload.resetUrl) {
        setPasswordRecoveryMessage({ error: payload?.error ?? "Unable to issue the password reset link right now.", resetUrl: "", success: "" });
        return;
      }

      const resetUrl = `${window.location.origin}${payload.resetUrl}`;
      updatePasswordRecoveryRequest(payload.reset);
      setResetLinksById((current) => ({ ...current, [payload.reset!.id]: resetUrl }));
      setPasswordRecoveryMessage({ error: "", resetUrl, success: `Password reset link issued for ${payload.reset.email}.` });
    });
  }

  function revokePasswordRecovery(reset: PasswordResetPreview) {
    setPasswordRecoveryMessage({ error: "", resetUrl: "", success: "" });

    void runAction(`password-reset:${reset.id}:revoke`, async () => {
      const response = await fetch(`/api/auth/password-recovery/${encodeURIComponent(reset.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; reset?: PasswordResetPreview } | null;

      if (!response.ok || !payload?.reset) {
        setPasswordRecoveryMessage({ error: payload?.error ?? "Unable to revoke the password recovery request right now.", resetUrl: "", success: "" });
        return;
      }

      updatePasswordRecoveryRequest(payload.reset);
      setResetLinksById((current) => {
        const next = { ...current };
        delete next[payload.reset!.id];
        return next;
      });
      setPasswordRecoveryMessage({ error: "", resetUrl: "", success: `Password recovery revoked for ${payload.reset.email}.` });
    });
  }

  function copyResetLink(resetId: string) {
    const resetUrl = resetLinksById[resetId];
    if (!resetUrl) return;

    void navigator.clipboard?.writeText(resetUrl);
    setPasswordRecoveryMessage({ error: "", resetUrl, success: "Password reset link copied." });
  }

  function handleCreateTeamMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamMemberMessage({ error: "", success: "" });

    void runAction("create-user", async () => {
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

    void runAction("create-role", async () => {
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

    void runAction("create-duty", async () => {
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

    void runAction("create-template", async () => {
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

    void runAction(`user:${userId}`, async () => {
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
      setOpenUserActionId("");
      setEditMessage({ error: "", success: "Team member updated." });
    });
  }

  function toggleUserActivation(user: ManagedTeamUser) {
    resetEditMessage();

    void runAction(`user:${user.id}:activation`, async () => {
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
      setOpenUserActionId("");
      setEditMessage({ error: "", success: payload.user.isActive ? "Team member activated." : "Team member deactivated." });
    });
  }

  function resetUserPassword(user: ManagedTeamUser) {
    const temporaryPassword = passwordResetByUserId[user.id]?.trim() ?? "";

    resetEditMessage();

    if (!temporaryPassword) {
      setEditMessage({ error: "Temporary password is required.", success: "" });
      return;
    }

    void runAction(`user:${user.id}:password`, async () => {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: ManagedTeamUser } | null;

      if (!response.ok || !payload?.user) {
        setEditMessage({ error: payload?.error ?? "Unable to reset the password right now.", success: "" });
        return;
      }

      setUsers((current) => sortUsers(current.map((candidate) => (candidate.id === user.id ? payload.user! : candidate))));
      setPasswordResetByUserId((current) => ({ ...current, [user.id]: "" }));
      setOpenPasswordResetUserId("");
      setOpenUserActionId("");
      setEditMessage({ error: "", success: `Temporary password set for ${payload.user.name}. They will be asked to change it at sign-in.` });
    });
  }

  function clearUserLockout(user: ManagedTeamUser) {
    resetEditMessage();

    void runAction(`user:${user.id}:unlock`, async () => {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearLockout: true })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: ManagedTeamUser } | null;

      if (!response.ok || !payload?.user) {
        setEditMessage({ error: payload?.error ?? "Unable to unlock the team member right now.", success: "" });
        return;
      }

      setUsers((current) => sortUsers(current.map((candidate) => (candidate.id === user.id ? payload.user! : candidate))));
      setOpenUserActionId("");
      setEditMessage({ error: "", success: `${payload.user.name} can try signing in again.` });
    });
  }

  function saveRoleEdit(roleId: string) {
    if (!roleEditFormState) {
      return;
    }

    resetEditMessage();

    void runAction(`role:${roleId}`, async () => {
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

    void runAction(`duty:${dutyId}`, async () => {
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

    void runAction(`template:${templateId}`, async () => {
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

  function toggleTemplateActivation(template: TaskTemplateSummary) {
    resetEditMessage();

    void runAction(`template:${template.id}:activation`, async () => {
      const response = await fetch(`/api/task-templates/${encodeURIComponent(template.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !template.isActive
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; template?: TaskTemplateSummary } | null;

      if (!response.ok || !payload?.template) {
        setEditMessage({ error: payload?.error ?? "Unable to update the template right now.", success: "" });
        return;
      }

      setTemplateOptions((current) =>
        sortTemplates(current.map((candidate) => (candidate.id === template.id ? payload.template! : candidate)))
      );
      setEditMessage({
        error: "",
        success: payload.template.isActive ? "Template activated." : "Template archived."
      });
    });
  }

  const filteredDutyOptions = standardDutyOptions.filter((duty) =>
    !dutySearchText.trim()
      ? true
      : matchesSearch(`${duty.name} ${duty.workflowArea} ${duty.description ?? ""}`, dutySearchText)
  );

  const filteredRoleOptions = roleOptions.filter((role) =>
    !roleSearchText.trim()
      ? true
      : matchesSearch(`${role.name} ${role.description ?? ""} ${role.dutyNames?.join(" ") ?? ""}`, roleSearchText)
  );

  const filteredTemplateOptions = templateOptions.filter((template) => {
    const matchesStatus =
      templateStatusFilter === "all" ||
      (templateStatusFilter === "active" && template.isActive) ||
      (templateStatusFilter === "inactive" && !template.isActive);

    const matchesText =
      !templateSearchText.trim() ||
      matchesSearch(
        `${template.title} ${template.description ?? ""} ${template.workflowArea} ${template.roleName ?? ""} ${template.dutyName ?? ""}`,
        templateSearchText
      );

    return matchesStatus && matchesText;
  });

  const filteredUsers = sortUsersForView(
    users.filter((user) => {
      const matchesStatus =
        userStatusFilter === "all" ||
        (userStatusFilter === "active" && user.isActive) ||
        (userStatusFilter === "inactive" && !user.isActive);

      const matchesText =
        !userSearchText.trim() ||
        matchesSearch(
          `${user.name} ${user.email} ${user.roles.map((role) => role.name).join(" ")} ${user.duties.map((duty) => duty.name).join(" ")}`,
          userSearchText
        );

      return matchesStatus && matchesText;
    }),
    userSortMode
  );

  const activeUserCount = users.filter((user) => user.isActive).length;
  const managerPowerCount = users.filter((user) => user.duties.some(isDelegatedManagerDuty)).length;
  const activeTemplateCount = templateOptions.filter((template) => template.isActive).length;
  const hasDutyFilter = Boolean(dutySearchText.trim());
  const hasRoleFilter = Boolean(roleSearchText.trim());
  const hasTemplateFilter = Boolean(templateSearchText.trim()) || templateStatusFilter !== "all";
  const hasUserFilter = Boolean(userSearchText.trim()) || userStatusFilter !== "all";
  const isCreatingStaffInvite = pendingAction === "create-staff-invite";
  const isCreatingUser = pendingAction === "create-user";
  const isCreatingDuty = pendingAction === "create-duty";
  const isCreatingRole = pendingAction === "create-role";
  const isCreatingTemplate = pendingAction === "create-template";
  const shouldShowSetupGuide =
    users.length === 0 && roleOptions.length === 0 && standardDutyOptions.length === 0 && templateOptions.length === 0;

  return (
    <div className="settings-admin-grid">
      {editMessage.error ? <div className="notice notice-danger" role="alert"><p>{editMessage.error}</p></div> : null}
      {editMessage.success ? <div className="notice" role="status"><p>{editMessage.success}</p></div> : null}

      <section className="team-admin-command-strip">
        <div>
          <span className="eyebrow">Team operations</span>
          <h2>Roster first. Coverage second.</h2>
          <p>Make the common move fast: add a person, adjust access, and confirm daily work coverage.</p>
        </div>
        <dl>
          <div>
            <dt>Active staff</dt>
            <dd>{activeUserCount}</dd>
          </div>
          <div>
            <dt>Manager powers</dt>
            <dd>{managerPowerCount}</dd>
          </div>
          <div>
            <dt>Roles</dt>
            <dd>{roleOptions.length}</dd>
          </div>
          <div>
            <dt>Active templates</dt>
            <dd>{activeTemplateCount}</dd>
          </div>
        </dl>
      </section>

      {shouldShowSetupGuide ? (
        <section className="panel-card team-admin-setup-guide">
          <div>
            <strong>Recommended setup path</strong>
            <h2>Build coverage in order</h2>
          </div>
          <ol>
            <li><span>1</span><strong>Add duties</strong><small>Define the work the board needs covered.</small></li>
            <li><span>2</span><strong>Create roles</strong><small>Bundle default coverage for common staff positions.</small></li>
            <li><span>3</span><strong>Add staff</strong><small>Create accounts and adjust any direct ownership.</small></li>
            <li><span>4</span><strong>Attach templates</strong><small>Link generated work to the right role or duty.</small></li>
          </ol>
        </section>
      ) : null}

      <details className="panel-card team-admin-card team-admin-duty-card">
        <summary className="team-admin-setup-summary">
          <span>
            <strong>Duty library</strong>
            <h2>Create and edit duties</h2>
            <p>Duties define the work responsibility units managers can assign directly or through role defaults.</p>
          </span>
          <small>{standardDutyOptions.length} duties</small>
        </summary>
        <form aria-busy={isCreatingDuty} className="settings-form" onSubmit={handleCreateDuty}>
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
          {dutyMessage.error ? <div className="notice notice-danger" role="alert"><p>{dutyMessage.error}</p></div> : null}
          {dutyMessage.success ? <div className="notice" role="status"><p>{dutyMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isCreatingDuty} type="submit">{isCreatingDuty ? "Saving..." : "Add duty"}</button></div>
        </form>
        <div className="settings-manager-toolbar">
          <label className="board-search">
            <input
              aria-label="Search duties"
              placeholder="Search duties or workflow areas"
              type="search"
              value={dutySearchText}
              onChange={(event) => setDutySearchText(event.target.value)}
            />
          </label>
          <small>{filteredDutyOptions.length} duties shown</small>
        </div>
        <div className="team-roster-list">
          {filteredDutyOptions.length === 0 ? (
            <p className="team-admin-empty">{getEmptyStateCopy("duties", hasDutyFilter)}</p>
          ) : null}
          {filteredDutyOptions.map((duty) => {
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
                      <button className="pill pill-primary" disabled={pendingAction === `duty:${duty.id}`} onClick={() => saveDutyEdit(duty.id)} type="button">{pendingAction === `duty:${duty.id}` ? "Saving..." : "Save duty"}</button>
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
      </details>

      <details className="panel-card team-admin-card team-admin-role-card">
        <summary className="team-admin-setup-summary">
          <span>
            <strong>Role coverage</strong>
            <h2>Create and edit roles</h2>
            <p>Roles carry permission coverage and default-duty fallbacks when staff do not have direct-duty overrides.</p>
          </span>
          <small>{roleOptions.length} roles</small>
        </summary>
        <form aria-busy={isCreatingRole} className="settings-form" onSubmit={handleCreateRole}>
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
              {standardDutyOptions.length ? (
                standardDutyOptions.map((duty) => (
                  <label className="checkbox-item" key={`new-role-${duty.id}`}>
                    <input checked={roleFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setRoleFormState((current) => ({ ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) }))} />
                    <span>{duty.name}<small>{duty.workflowArea}</small></span>
                  </label>
                ))
              ) : (
                <p className="team-admin-empty">Add duties first if this role should carry default coverage.</p>
              )}
            </div>
          </fieldset>
          {roleMessage.error ? <div className="notice notice-danger" role="alert"><p>{roleMessage.error}</p></div> : null}
          {roleMessage.success ? <div className="notice" role="status"><p>{roleMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isCreatingRole} type="submit">{isCreatingRole ? "Saving..." : "Add role"}</button></div>
        </form>
        <div className="settings-manager-toolbar">
          <label className="board-search">
            <input
              aria-label="Search roles"
              placeholder="Search roles or default duties"
              type="search"
              value={roleSearchText}
              onChange={(event) => setRoleSearchText(event.target.value)}
            />
          </label>
          <small>{filteredRoleOptions.length} roles shown</small>
        </div>
        <div className="team-roster-list">
          {filteredRoleOptions.length === 0 ? (
            <p className="team-admin-empty">{getEmptyStateCopy("roles", hasRoleFilter)}</p>
          ) : null}
          {filteredRoleOptions.map((role) => {
            const isEditing = editingRoleId === role.id && roleEditFormState;
            const attentionItems = getRoleAttentionItems(role);

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
                      <button className="pill pill-primary" disabled={pendingAction === `role:${role.id}`} onClick={() => saveRoleEdit(role.id)} type="button">{pendingAction === `role:${role.id}` ? "Saving..." : "Save role"}</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingRoleId(""); setRoleEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{role.name}</h3><p>{role.description || "No description yet."}</p></div>
                      {attentionItems.length ? (
                        <span className="team-admin-attention-list">{attentionItems.map((item) => <em key={item}>{item}</em>)}</span>
                      ) : null}
                    </div>
                    <dl className="team-roster-details"><div><dt>Default duties</dt><dd>{role.dutyNames?.filter((dutyName) => dutyName.trim().toLowerCase() !== DELEGATED_MANAGER_DUTY_NAME.toLowerCase()).join(" • ") || "No default duties assigned"}</dd></div></dl>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingRoleId(role.id); setRoleEditFormState(createRoleEditFormState(role, standardDutyOptions)); }} type="button">Edit role</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </details>

      <details className="panel-card team-admin-card team-admin-template-card">
        <summary className="team-admin-setup-summary">
          <span>
            <strong>Task templates</strong>
            <h2>Create and optimize daily work generation</h2>
            <p>Templates define what the board generates each day, which workflow it belongs to, and whether it needs manager approval.</p>
          </span>
          <small>{activeTemplateCount} active</small>
        </summary>
        <form aria-busy={isCreatingTemplate} className="settings-form" onSubmit={handleCreateTemplate}>
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
          {templateMessage.error ? <div className="notice notice-danger" role="alert"><p>{templateMessage.error}</p></div> : null}
          {templateMessage.success ? <div className="notice" role="status"><p>{templateMessage.success}</p></div> : null}
          <div className="form-actions"><button className="pill pill-primary" disabled={isCreatingTemplate} type="submit">{isCreatingTemplate ? "Saving..." : "Add template"}</button></div>
        </form>
        <div className="settings-manager-toolbar">
          <label className="board-search">
            <input
              aria-label="Search templates"
              placeholder="Search templates, roles, or duties"
              type="search"
              value={templateSearchText}
              onChange={(event) => setTemplateSearchText(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter templates by status"
            value={templateStatusFilter}
            onChange={(event) => setTemplateStatusFilter(event.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">All templates</option>
            <option value="active">Active only</option>
            <option value="inactive">Archived only</option>
          </select>
          <small>{filteredTemplateOptions.length} templates shown</small>
        </div>
        <div className="team-roster-list">
          {filteredTemplateOptions.length === 0 ? (
            <p className="team-admin-empty">{getEmptyStateCopy("templates", hasTemplateFilter)}</p>
          ) : null}
          {filteredTemplateOptions.map((template) => {
            const isEditing = editingTemplateId === template.id && templateEditFormState;
            const attentionItems = getTemplateAttentionItems(template);

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
                      <button className="pill pill-primary" disabled={pendingAction === `template:${template.id}`} onClick={() => saveTemplateEdit(template.id)} type="button">{pendingAction === `template:${template.id}` ? "Saving..." : "Save template"}</button>
                      <button className="pill pill-secondary" onClick={() => { setEditingTemplateId(""); setTemplateEditFormState(null); }} type="button">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="team-roster-header">
                      <div><h3>{template.title}</h3><p>{template.description || "No description yet."}</p></div>
                      <span className={template.isActive ? "status-pill status-success" : "status-pill status-neutral"}>{template.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    {attentionItems.length ? (
                      <span className="team-admin-attention-list">{attentionItems.map((item) => <em key={item}>{item}</em>)}</span>
                    ) : null}
                    <dl className="team-roster-details">
                      <div><dt>Workflow / due time</dt><dd>{template.workflowArea} • {template.defaultDueTime}</dd></div>
                      <div><dt>Matching rules</dt><dd>{template.roleName || "No role link"} • {template.dutyName?.trim().toLowerCase() === DELEGATED_MANAGER_DUTY_NAME.toLowerCase() ? "No duty link" : template.dutyName || "No duty link"}</dd></div>
                    </dl>
                    <div className="form-actions">
                      <button className="pill pill-secondary" onClick={() => { setEditingTemplateId(template.id); setTemplateEditFormState(createTemplateEditFormState(template)); }} type="button">Edit template</button>
                      <button className={template.isActive ? "pill pill-secondary" : "pill pill-primary"} disabled={pendingAction === `template:${template.id}:activation`} onClick={() => toggleTemplateActivation(template)} type="button">{template.isActive ? "Archive" : "Activate"}</button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </details>

      <article className="panel-card team-admin-card team-admin-staff-card">
        <section className="team-admin-add-member-panel">
          <div>
            <strong>Staff access</strong>
            <h2>Invite staff</h2>
            <p>Send an approved staff member a one-use invite so they create their own password.</p>
          </div>
          <form aria-busy={isCreatingStaffInvite} className="settings-form team-admin-add-form" onSubmit={handleCreateStaffInvite}>
            <div className="settings-grid">
              <label className="field"><span>Full name</span><input value={staffInviteFormState.name} onChange={(event) => setStaffInviteFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Alex Staff" required /></label>
              <label className="field"><span>Email</span><input type="email" value={staffInviteFormState.email} onChange={(event) => setStaffInviteFormState((current) => ({ ...current, email: event.target.value }))} placeholder="alex.staff@company.com" required /></label>
            </div>
            <fieldset className="business-day-group">
              <legend>Roles</legend>
              <div className="checkbox-list">
                {roleOptions.length ? (
                  roleOptions.map((role) => <label className="checkbox-item" key={`invite-role-${role.id}`}><input checked={staffInviteFormState.roleIds.includes(role.id)} type="checkbox" onChange={(event) => setStaffInviteFormState((current) => ({ ...current, roleIds: toggleSelection(current.roleIds, role.id, event.target.checked) }))} /><span>{role.name}</span></label>)
                ) : (
                  <p className="team-admin-empty">Create at least one role before inviting staff.</p>
                )}
              </div>
            </fieldset>
            {staffInviteMessage.error ? <div className="notice notice-danger" role="alert"><p>{staffInviteMessage.error}</p></div> : null}
            {staffInviteMessage.success ? (
              <div className="notice" role="status">
                <p>{staffInviteMessage.success}</p>
                {staffInviteMessage.inviteUrl ? (
                  <label className="field">
                    <span>Invite link</span>
                    <input readOnly value={staffInviteMessage.inviteUrl} onFocus={(event) => event.currentTarget.select()} />
                  </label>
                ) : null}
              </div>
            ) : null}
            <div className="form-actions"><button className="pill pill-primary" disabled={isCreatingStaffInvite || roleOptions.length === 0 || staffInviteFormState.roleIds.length === 0} type="submit">{isCreatingStaffInvite ? "Creating invite..." : "Create invite"}</button></div>
          </form>
        </section>

        <section className="team-admin-roster-panel">
          <div className="team-admin-roster-heading">
            <div>
              <strong>Invite lifecycle</strong>
              <h2>Manage staff invitations</h2>
              <p>Track open invites, revoke stale access, or resend a fresh one-use link.</p>
            </div>
            <small>{staffInvites.length} invites</small>
          </div>
          <div className="team-admin-roster-list">
            {staffInvites.length ? (
              <div className="team-admin-roster-columns" aria-hidden="true">
                <span>Invitee</span>
                <span>Status</span>
                <span>Roles</span>
                <span>Timing</span>
                <span>Actions</span>
              </div>
            ) : null}
            {staffInvites.length === 0 ? (
              <p className="team-admin-empty">No staff invites have been created yet.</p>
            ) : null}
            {staffInvites.map((invite) => {
              const canResend = invite.status !== "ACCEPTED";
              const canRevoke = invite.status !== "ACCEPTED" && invite.status !== "REVOKED";
              const latestLink = inviteLinksById[invite.id];
              const resendActionId = `invite:${invite.id}:resend`;
              const revokeActionId = `invite:${invite.id}:revoke`;

              return (
                <section className="team-admin-roster-row" key={invite.id}>
                  <div className="team-admin-roster-identity">
                    <span className="team-admin-avatar">{invite.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{invite.name}</strong>
                      <small>{invite.email}</small>
                    </span>
                  </div>
                  <div className="team-admin-roster-cell">
                    <span className={inviteStatusClass(invite.status)}>{invite.status.toLowerCase()}</span>
                    <small>{invite.acceptedByUserId ? "Account created" : "No account yet"}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>{invite.roleNames.join(" / ") || "No roles"}</strong>
                    <small>{invite.workspaceKey ?? "Default workspace"}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>Expires {formatCreatedAt(invite.expiresAt)}</strong>
                    <small>Created {formatCreatedAt(invite.createdAt)}</small>
                  </div>
                  <div className="team-admin-row-actions">
                    {latestLink ? <button className="pill pill-secondary" onClick={() => copyInviteLink(invite.id)} type="button">Copy link</button> : null}
                    <button className="pill pill-secondary" disabled={!canResend || pendingAction === resendActionId} onClick={() => resendInvite(invite)} type="button">{pendingAction === resendActionId ? "Resending..." : "Resend"}</button>
                    <button className="pill pill-secondary" disabled={!canRevoke || pendingAction === revokeActionId} onClick={() => revokeInvite(invite)} type="button">{pendingAction === revokeActionId ? "Revoking..." : "Revoke"}</button>
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="team-admin-roster-panel">
          <div className="team-admin-roster-heading">
            <div>
              <strong>Password recovery</strong>
              <h2>Manager-approved reset links</h2>
              <p>Issue one-use reset links for verified staff and revoke requests that should not proceed.</p>
            </div>
            <small>{passwordRecoveryRequests.length} requests</small>
          </div>
          {passwordRecoveryMessage.error ? <div className="notice notice-danger" role="alert"><p>{passwordRecoveryMessage.error}</p></div> : null}
          {passwordRecoveryMessage.success ? (
            <div className="notice" role="status">
              <p>{passwordRecoveryMessage.success}</p>
              {passwordRecoveryMessage.resetUrl ? (
                <label className="field">
                  <span>Reset link</span>
                  <input readOnly value={passwordRecoveryMessage.resetUrl} onFocus={(event) => event.currentTarget.select()} />
                </label>
              ) : null}
            </div>
          ) : null}
          <div className="team-admin-roster-list">
            {passwordRecoveryRequests.length ? (
              <div className="team-admin-roster-columns" aria-hidden="true">
                <span>Staff</span>
                <span>Status</span>
                <span>Account</span>
                <span>Timing</span>
                <span>Actions</span>
              </div>
            ) : null}
            {passwordRecoveryRequests.length === 0 ? (
              <p className="team-admin-empty">No password recovery requests yet.</p>
            ) : null}
            {passwordRecoveryRequests.map((reset) => {
              const resetUrl = resetLinksById[reset.id];
              const canIssue = reset.status !== "COMPLETED" && reset.status !== "REVOKED" && Boolean(reset.userId) && reset.userIsActive !== false;
              const canRevoke = reset.status !== "COMPLETED" && reset.status !== "REVOKED";
              const issueActionId = `password-reset:${reset.id}:issue`;
              const revokeActionId = `password-reset:${reset.id}:revoke`;

              return (
                <section className="team-admin-roster-row" key={reset.id}>
                  <div className="team-admin-roster-identity">
                    <span className="team-admin-avatar">{(reset.userName ?? reset.email).slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{reset.userName ?? "Unmatched email"}</strong>
                      <small>{reset.email}</small>
                    </span>
                  </div>
                  <div className="team-admin-roster-cell">
                    <span className={recoveryStatusClass(reset.status)}>{reset.status.toLowerCase()}</span>
                    <small>{reset.approvedByUserId ? "Manager reviewed" : "Waiting review"}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>{reset.userId ? reset.userIsActive === false ? "Inactive staff account" : "Matched staff account" : "No matching staff"}</strong>
                    <small>{reset.userId ?? "Do not issue reset"}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>Requested {formatCreatedAt(reset.requestedAt)}</strong>
                    <small>{reset.expiresAt ? `Expires ${formatCreatedAt(reset.expiresAt)}` : "No link issued"}</small>
                  </div>
                  <div className="team-admin-row-actions">
                    {resetUrl ? <button className="pill pill-secondary" onClick={() => copyResetLink(reset.id)} type="button">Copy link</button> : null}
                    <button className="pill pill-secondary" disabled={!canIssue || pendingAction === issueActionId} onClick={() => issuePasswordResetLink(reset)} type="button">{pendingAction === issueActionId ? "Issuing..." : reset.status === "APPROVED" ? "Reissue" : "Issue link"}</button>
                    <button className="pill pill-secondary" disabled={!canRevoke || pendingAction === revokeActionId} onClick={() => revokePasswordRecovery(reset)} type="button">{pendingAction === revokeActionId ? "Revoking..." : "Revoke"}</button>
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="team-admin-add-member-panel">
          <div>
            <strong>Manager fallback</strong>
            <h2>Add staff account directly</h2>
            <p>Use only when a manager must issue a temporary password instead of sending an invite.</p>
          </div>
          <form aria-busy={isCreatingUser} className="settings-form team-admin-add-form" onSubmit={handleCreateTeamMember}>
            <div className="settings-grid">
              <label className="field"><span>Full name</span><input value={teamMemberFormState.name} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Alex Staff" required /></label>
              <label className="field"><span>Email</span><input type="email" value={teamMemberFormState.email} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, email: event.target.value }))} placeholder="alex.staff@local.test" required /></label>
            </div>
            <div className="settings-grid">
              <label className="field"><span>Temporary password</span><input autoComplete="new-password" type="password" value={teamMemberFormState.password} onChange={(event) => setTeamMemberFormState((current) => ({ ...current, password: event.target.value }))} placeholder="At least 12 characters" required /><small>Staff will change it at first sign-in.</small></label>
              <label className="checkbox-item checkbox-item-inline"><input checked={teamMemberFormState.isActive} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, isActive: event.target.checked }))} /><span>Create as active staff</span></label>
            </div>
            <div className="team-admin-coverage-row">
              <fieldset className="business-day-group">
                <legend>Roles</legend>
                <div className="checkbox-list">
                  {roleOptions.length ? (
                    roleOptions.map((role) => <label className="checkbox-item" key={`user-role-${role.id}`}><input checked={teamMemberFormState.roleIds.includes(role.id)} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, roleIds: toggleSelection(current.roleIds, role.id, event.target.checked) }))} /><span>{role.name}</span></label>)
                  ) : (
                    <p className="team-admin-empty">Create at least one role before adding staff.</p>
                  )}
                </div>
              </fieldset>
              <fieldset className="business-day-group">
                <legend>Direct duties</legend>
                <div className="checkbox-list">
                  {standardDutyOptions.length ? (
                    standardDutyOptions.map((duty) => <label className="checkbox-item" key={`user-duty-${duty.id}`}><input checked={teamMemberFormState.dutyIds.includes(duty.id)} type="checkbox" onChange={(event) => setTeamMemberFormState((current) => ({ ...current, dutyIds: toggleSelection(current.dutyIds, duty.id, event.target.checked) }))} /><span>{duty.name}<small>{duty.workflowArea}</small></span></label>)
                  ) : (
                    <p className="team-admin-empty">Direct duties are optional. Add duties above when direct ownership is needed.</p>
                  )}
                </div>
              </fieldset>
            </div>
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
            {teamMemberMessage.error ? <div className="notice notice-danger" role="alert"><p>{teamMemberMessage.error}</p></div> : null}
            {teamMemberMessage.success ? <div className="notice" role="status"><p>{teamMemberMessage.success}</p></div> : null}
            <div className="form-actions"><button className="pill pill-primary" disabled={isCreatingUser || roleOptions.length === 0} type="submit">{isCreatingUser ? "Adding..." : "Add team member"}</button></div>
          </form>
        </section>

        <section className="team-admin-roster-panel">
          <div className="team-admin-roster-heading">
            <div>
              <strong>Staff roster</strong>
              <h2>Manage team access</h2>
              <p>Scan status, coverage, and manager powers without opening every record.</p>
            </div>
            <small>{filteredUsers.length} shown</small>
          </div>
          <div className="settings-manager-toolbar">
            <label className="board-search">
              <input
                aria-label="Search team members"
                placeholder="Search team members, emails, roles, or duties"
                type="search"
                value={userSearchText}
                onChange={(event) => setUserSearchText(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter users by status"
              value={userStatusFilter}
              onChange={(event) => setUserStatusFilter(event.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">All staff</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              aria-label="Sort team members"
              value={userSortMode}
              onChange={(event) => setUserSortMode(event.target.value as UserSortMode)}
            >
              <option value="name">Sort by name</option>
              <option value="status">Sort by status</option>
              <option value="role">Sort by role</option>
              <option value="newest">Sort by newest</option>
              <option value="updated">Sort by updated</option>
            </select>
            <small>{filteredUsers.length} team members shown</small>
          </div>
          <div className="team-admin-roster-list">
            {filteredUsers.length ? (
              <div className="team-admin-roster-columns" aria-hidden="true">
                <span>Person</span>
                <span>Status</span>
                <span>Coverage</span>
                <span>Access</span>
                <span>Actions</span>
              </div>
            ) : null}
            {filteredUsers.length === 0 ? (
              <p className="team-admin-empty">{getEmptyStateCopy("team members", hasUserFilter)}</p>
            ) : null}
            {filteredUsers.map((user) => {
              const isEditing = editingUserId === user.id && userEditFormState;
              const attentionItems = getUserAttentionItems(user);
              const directDutyNames = user.duties.filter((duty) => !isDelegatedManagerDuty(duty)).map((duty) => duty.name);
              const resetOpen = openPasswordResetUserId === user.id;
              const deactivateActionId = `user:${user.id}:activation`;
              const unlockActionId = `user:${user.id}:unlock`;
              const passwordActionId = `user:${user.id}:password`;
              const needsDeactivateConfirm = user.isActive && confirmActionId === deactivateActionId;
              const needsPasswordConfirm = confirmActionId === passwordActionId;
              const locked = isUserLocked(user);
              const actionsOpen = openUserActionId === user.id || Boolean(isEditing) || resetOpen || needsDeactivateConfirm;

              return (
                <section className="team-admin-roster-row" key={user.id}>
                  <div className="team-admin-roster-identity">
                    <span className="team-admin-avatar">{user.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <div className="team-admin-roster-cell">
                    <span className={locked ? "status-pill status-danger" : user.isActive ? "status-pill status-success" : "status-pill status-neutral"}>{locked ? "Locked" : user.isActive ? "Active" : "Inactive"}</span>
                    <small>{locked && user.lockedUntil ? `Until ${formatCreatedAt(user.lockedUntil)}` : `Updated ${formatCreatedAt(user.updatedAt)}`}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>{user.roles.map((role) => role.name).join(" / ") || "No roles assigned"}</strong>
                    <small>{directDutyNames.join(" • ") || "Role defaults only"}</small>
                  </div>
                  <div className="team-admin-roster-cell">
                    <strong>{user.duties.some(isDelegatedManagerDuty) ? "Manager powers" : "Standard access"}</strong>
                    {attentionItems.length ? (
                      <span className="team-admin-attention-list">{attentionItems.map((item) => <em key={item}>{item}</em>)}</span>
                    ) : (
                      <small>{user.failedLoginCount > 0 ? `${user.failedLoginCount} failed sign-in attempts` : user.mustChangePassword ? "Password change required" : "Ready"}</small>
                    )}
                  </div>
                  <div className="team-admin-row-actions">
                    <button
                      aria-expanded={actionsOpen}
                      className="pill pill-secondary"
                      onClick={() => {
                        const nextOpen = actionsOpen ? "" : user.id;
                        setOpenUserActionId(nextOpen);
                        setConfirmActionId("");
                        setOpenPasswordResetUserId("");
                        setEditingUserId("");
                        setUserEditFormState(null);
                      }}
                      type="button"
                    >
                      {actionsOpen ? "Close" : "Manage"}
                    </button>
                  </div>
                  {actionsOpen ? (
                    <div className="team-admin-actions-panel">
                      <div className="team-admin-action-menu">
                        <button className="pill pill-secondary" onClick={() => { setConfirmActionId(""); setOpenPasswordResetUserId(""); setEditingUserId(user.id); setUserEditFormState(createUserEditFormState(user)); }} type="button">Edit details</button>
                        <button className="pill pill-secondary" onClick={() => { setConfirmActionId(""); setEditingUserId(""); setUserEditFormState(null); setOpenPasswordResetUserId(resetOpen ? "" : user.id); }} type="button">Reset password</button>
                        <button className="pill pill-secondary" disabled={pendingAction === unlockActionId || (!locked && user.failedLoginCount === 0)} onClick={() => { setConfirmActionId(""); setEditingUserId(""); setUserEditFormState(null); setOpenPasswordResetUserId(""); clearUserLockout(user); }} type="button">{pendingAction === unlockActionId ? "Unlocking..." : "Unlock"}</button>
                        <button
                          className={user.isActive ? "pill pill-secondary" : "pill pill-primary"}
                          disabled={pendingAction === deactivateActionId}
                          onClick={() => {
                            setEditingUserId("");
                            setUserEditFormState(null);
                            setOpenPasswordResetUserId("");

                            if (user.isActive && !needsDeactivateConfirm) {
                              setConfirmActionId(deactivateActionId);
                              return;
                            }

                            toggleUserActivation(user);
                          }}
                          type="button"
                        >
                          {needsDeactivateConfirm ? "Confirm deactivate" : user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                      {isEditing ? (
                        <div className="team-admin-edit-panel">
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
                            <button className="pill pill-primary" disabled={pendingAction === `user:${user.id}`} onClick={() => saveUserEdit(user.id)} type="button">{pendingAction === `user:${user.id}` ? "Saving..." : "Save team member"}</button>
                            <button className="pill pill-secondary" onClick={() => { setEditingUserId(""); setUserEditFormState(null); }} type="button">Cancel</button>
                          </div>
                        </div>
                      ) : null}
                      {resetOpen ? (
                        <div className="team-admin-password-panel">
                          <label className="field">
                            <span>New temporary password</span>
                            <input
                              autoComplete="new-password"
                              type="password"
                              value={passwordResetByUserId[user.id] ?? ""}
                              onChange={(event) => {
                                setConfirmActionId((current) => (current === passwordActionId ? "" : current));
                                setPasswordResetByUserId((current) => ({ ...current, [user.id]: event.target.value }));
                              }}
                              placeholder="At least 12 characters"
                            />
                            <small>This sets a temporary password and requires the person to change it at sign-in.</small>
                          </label>
                          <div className="form-actions">
                            <button
                              className="pill pill-primary"
                              disabled={pendingAction === passwordActionId || !passwordResetByUserId[user.id]?.trim()}
                              onClick={() => {
                                if (!needsPasswordConfirm) {
                                  setConfirmActionId(passwordActionId);
                                  return;
                                }

                                resetUserPassword(user);
                              }}
                              type="button"
                            >
                              {pendingAction === passwordActionId ? "Saving..." : needsPasswordConfirm ? "Confirm reset" : "Set temporary password"}
                            </button>
                            <button className="pill pill-secondary" onClick={() => { setConfirmActionId(""); setOpenPasswordResetUserId(""); }} type="button">Cancel</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
}

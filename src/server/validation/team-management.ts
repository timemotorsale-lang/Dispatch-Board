import { normalizeEmail } from "@/server/auth/service";

export type TeamMemberCreateInput = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds?: string[];
  isActive?: boolean;
};

export type ManagedRoleCreateInput = {
  name: string;
  description?: string;
  dutyIds?: string[];
};

export type ManagedDutyCreateInput = {
  name: string;
  workflowArea: string;
  description?: string;
};

export type NormalizedTeamMemberCreateInput = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds: string[];
  isActive: boolean;
};

export type NormalizedManagedRoleCreateInput = {
  name: string;
  description: string | null;
  dutyIds: string[];
};

export type NormalizedManagedDutyCreateInput = {
  name: string;
  workflowArea: string;
  description: string | null;
};

function uniqueTrimmedIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function isTeamMemberCreateInput(value: unknown): value is TeamMemberCreateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TeamMemberCreateInput>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.password === "string" &&
    Array.isArray(candidate.roleIds) &&
    candidate.roleIds.every((roleId) => typeof roleId === "string") &&
    (!candidate.dutyIds ||
      (Array.isArray(candidate.dutyIds) &&
        candidate.dutyIds.every((dutyId) => typeof dutyId === "string"))) &&
    (candidate.isActive === undefined || typeof candidate.isActive === "boolean")
  );
}

export function normalizeTeamMemberCreateInput(input: unknown): NormalizedTeamMemberCreateInput {
  if (!isTeamMemberCreateInput(input)) {
    throw new Error("Name, email, password, and at least one role are required.");
  }

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const roleIds = uniqueTrimmedIds(input.roleIds);
  const dutyIds = uniqueTrimmedIds(input.dutyIds ?? []);

  if (!name) {
    throw new Error("Team member name is required.");
  }

  if (!email) {
    throw new Error("Team member email is required.");
  }

  if (!password) {
    throw new Error("Temporary password is required.");
  }

  if (password.length < 8) {
    throw new Error("Temporary password must be at least 8 characters.");
  }

  if (roleIds.length === 0) {
    throw new Error("At least one role must be assigned.");
  }

  return {
    name,
    email,
    password,
    roleIds,
    dutyIds,
    isActive: input.isActive ?? true
  };
}

export function isManagedRoleCreateInput(value: unknown): value is ManagedRoleCreateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ManagedRoleCreateInput>;

  return (
    typeof candidate.name === "string" &&
    (candidate.description === undefined || typeof candidate.description === "string") &&
    (!candidate.dutyIds ||
      (Array.isArray(candidate.dutyIds) &&
        candidate.dutyIds.every((dutyId) => typeof dutyId === "string")))
  );
}

export function normalizeManagedRoleCreateInput(input: unknown): NormalizedManagedRoleCreateInput {
  if (!isManagedRoleCreateInput(input)) {
    throw new Error("Role name is required.");
  }

  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const dutyIds = uniqueTrimmedIds(input.dutyIds ?? []);

  if (!name) {
    throw new Error("Role name is required.");
  }

  return {
    name,
    description,
    dutyIds
  };
}

export function isManagedDutyCreateInput(value: unknown): value is ManagedDutyCreateInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ManagedDutyCreateInput>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.workflowArea === "string" &&
    (candidate.description === undefined || typeof candidate.description === "string")
  );
}

export function normalizeManagedDutyCreateInput(input: unknown): NormalizedManagedDutyCreateInput {
  if (!isManagedDutyCreateInput(input)) {
    throw new Error("Duty name and workflow area are required.");
  }

  const name = input.name.trim();
  const workflowArea = input.workflowArea.trim().toUpperCase();
  const description = input.description?.trim() || null;

  if (!name) {
    throw new Error("Duty name is required.");
  }

  if (!workflowArea) {
    throw new Error("Duty workflow area is required.");
  }

  return {
    name,
    workflowArea,
    description
  };
}

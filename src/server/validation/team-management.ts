import { normalizeEmail } from "@/server/auth/service";
import {
  PASSWORD_POLICY_DESCRIPTION,
  validateStaffPassword
} from "@/server/auth/password-policy";

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

export type TeamMemberPasswordResetInput = {
  temporaryPassword: string;
};
export type TeamMemberUpdateInput = Partial<Omit<TeamMemberCreateInput, "password">> &
  Partial<TeamMemberPasswordResetInput> & {
    clearLockout?: boolean;
  };
export type ManagedRoleUpdateInput = Partial<ManagedRoleCreateInput>;
export type ManagedDutyUpdateInput = Partial<ManagedDutyCreateInput>;

export type NormalizedTeamMemberUpdateInput = {
  name?: string;
  email?: string;
  roleIds?: string[];
  dutyIds?: string[];
  isActive?: boolean;
  temporaryPassword?: string;
  clearLockout?: boolean;
};

export type NormalizedTeamMemberPasswordResetInput = {
  temporaryPassword: string;
};

export type NormalizedManagedRoleUpdateInput = {
  name?: string;
  description?: string | null;
  dutyIds?: string[];
};

export type NormalizedManagedDutyUpdateInput = {
  name?: string;
  workflowArea?: string;
  description?: string | null;
};

function uniqueTrimmedIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export { PASSWORD_POLICY_DESCRIPTION, validateStaffPassword };

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

  validateStaffPassword(password, "Temporary password");

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

export function normalizeTeamMemberUpdateInput(input: unknown): NormalizedTeamMemberUpdateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Team member update payload must be an object.");
  }

  const candidate = input as Partial<TeamMemberUpdateInput>;
  const normalized: NormalizedTeamMemberUpdateInput = {};

  if ("name" in candidate) {
    if (typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error("Team member name is required.");
    }

    normalized.name = candidate.name.trim();
  }

  if ("email" in candidate) {
    if (typeof candidate.email !== "string" || !candidate.email.trim()) {
      throw new Error("Team member email is required.");
    }

    normalized.email = normalizeEmail(candidate.email);
  }

  if ("roleIds" in candidate) {
    if (!Array.isArray(candidate.roleIds)) {
      throw new Error("Team member roleIds must be a string array.");
    }

    normalized.roleIds = uniqueTrimmedIds(candidate.roleIds);

    if (normalized.roleIds.length === 0) {
      throw new Error("At least one role must be assigned.");
    }
  }

  if ("dutyIds" in candidate) {
    if (!Array.isArray(candidate.dutyIds)) {
      throw new Error("Team member dutyIds must be a string array.");
    }

    normalized.dutyIds = uniqueTrimmedIds(candidate.dutyIds);
  }

  if ("isActive" in candidate) {
    if (typeof candidate.isActive !== "boolean") {
      throw new Error("Team member isActive must be boolean.");
    }

    normalized.isActive = candidate.isActive;
  }

  if ("temporaryPassword" in candidate) {
    if (typeof candidate.temporaryPassword !== "string" || !candidate.temporaryPassword.trim()) {
      throw new Error("Temporary password is required.");
    }

    normalized.temporaryPassword = candidate.temporaryPassword.trim();
    validateStaffPassword(normalized.temporaryPassword, "Temporary password");
  }

  if ("clearLockout" in candidate) {
    if (typeof candidate.clearLockout !== "boolean") {
      throw new Error("Team member clearLockout must be boolean.");
    }

    normalized.clearLockout = candidate.clearLockout;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("Team member updates require at least one field.");
  }

  return normalized;
}

export function normalizeTeamMemberPasswordResetInput(input: unknown): NormalizedTeamMemberPasswordResetInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Temporary password is required.");
  }

  const candidate = input as Partial<TeamMemberPasswordResetInput>;

  if (typeof candidate.temporaryPassword !== "string" || !candidate.temporaryPassword.trim()) {
    throw new Error("Temporary password is required.");
  }

  const temporaryPassword = candidate.temporaryPassword.trim();
  validateStaffPassword(temporaryPassword, "Temporary password");

  return { temporaryPassword };
}

export function normalizeManagedRoleUpdateInput(input: unknown): NormalizedManagedRoleUpdateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Role update payload must be an object.");
  }

  const candidate = input as Partial<ManagedRoleUpdateInput>;
  const normalized: NormalizedManagedRoleUpdateInput = {};

  if ("name" in candidate) {
    if (typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error("Role name is required.");
    }

    normalized.name = candidate.name.trim();
  }

  if ("description" in candidate) {
    if (candidate.description !== undefined && candidate.description !== null && typeof candidate.description !== "string") {
      throw new Error("Role description must be a string when provided.");
    }

    normalized.description = candidate.description?.trim() || null;
  }

  if ("dutyIds" in candidate) {
    if (!Array.isArray(candidate.dutyIds)) {
      throw new Error("Role dutyIds must be a string array.");
    }

    normalized.dutyIds = uniqueTrimmedIds(candidate.dutyIds);
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("Role updates require at least one field.");
  }

  return normalized;
}

export function normalizeManagedDutyUpdateInput(input: unknown): NormalizedManagedDutyUpdateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Duty update payload must be an object.");
  }

  const candidate = input as Partial<ManagedDutyUpdateInput>;
  const normalized: NormalizedManagedDutyUpdateInput = {};

  if ("name" in candidate) {
    if (typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error("Duty name is required.");
    }

    normalized.name = candidate.name.trim();
  }

  if ("workflowArea" in candidate) {
    if (typeof candidate.workflowArea !== "string" || !candidate.workflowArea.trim()) {
      throw new Error("Duty workflow area is required.");
    }

    normalized.workflowArea = candidate.workflowArea.trim().toUpperCase();
  }

  if ("description" in candidate) {
    if (candidate.description !== undefined && candidate.description !== null && typeof candidate.description !== "string") {
      throw new Error("Duty description must be a string when provided.");
    }

    normalized.description = candidate.description?.trim() || null;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("Duty updates require at least one field.");
  }

  return normalized;
}

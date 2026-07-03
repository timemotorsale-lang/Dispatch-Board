import { normalizeEmail } from "@/server/auth/service";

export type TeamMemberCreateInput = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds?: string[];
  isActive?: boolean;
};

export type NormalizedTeamMemberCreateInput = {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  dutyIds: string[];
  isActive: boolean;
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

import type { AuthenticatedUser } from "@/server/auth/store";
import { hashPassword } from "@/server/auth/password";
import {
  canGrantManagerPowers,
  canManageUsers,
  DELEGATED_MANAGER_DUTY_NAME,
  isGeneralManager
} from "@/server/policies/access";
import {
  createTeamManagementRepository,
  type ManagedDutyRecord,
  type ManagedRoleRecord,
  type ManagedUserRecord
} from "@/server/repositories/team-management-repository";
import {
  normalizeManagedDutyCreateInput,
  normalizeManagedDutyUpdateInput,
  normalizeManagedRoleCreateInput,
  normalizeManagedRoleUpdateInput,
  normalizeTeamMemberCreateInput
  ,
  normalizeTeamMemberUpdateInput
} from "@/server/validation/team-management";

export type TeamManagementRepository = ReturnType<typeof createTeamManagementRepository>;

export type ManagedTeamUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  roles: Array<{ id: string; name: string }>;
  duties: Array<{ id: string; name: string }>;
};

export type TeamManagementReferenceOption = {
  id: string;
  name: string;
  description?: string | null;
  dutyNames?: string[];
};

export type TeamManagementDutyOption = TeamManagementReferenceOption & {
  workflowArea: string;
};

export type TeamManagementSnapshot = {
  users: ManagedTeamUser[];
  roles: TeamManagementReferenceOption[];
  duties: TeamManagementDutyOption[];
};

const delegatedManagerDutyDefaults = {
  name: DELEGATED_MANAGER_DUTY_NAME,
  workflowArea: "GENERAL_MANAGER",
  description: "Reserved system duty that grants delegated manager capabilities."
} as const;

function toManagedTeamUser(user: ManagedUserRecord): ManagedTeamUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
    roles: user.userRoles.map((assignment) => assignment.role),
    duties: user.userDuties.map((assignment) => assignment.duty)
  };
}

function toManagedRole(role: ManagedRoleRecord): TeamManagementReferenceOption {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    dutyNames: role.roleDuties.map((assignment) => assignment.duty.name)
  };
}

function toManagedDuty(duty: ManagedDutyRecord): TeamManagementDutyOption {
  return {
    id: duty.id,
    name: duty.name,
    workflowArea: duty.workflowArea,
    description: duty.description
  };
}

function assertCanManageTeam(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageUsers(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

function isDelegatedManagerDutyName(name: string) {
  return name.trim().toLowerCase() === DELEGATED_MANAGER_DUTY_NAME.toLowerCase();
}

async function ensureDelegatedManagerDuty(repository: TeamManagementRepository) {
  const existingDuties = await repository.listDuties();
  const existingDuty = existingDuties.find((duty) => isDelegatedManagerDutyName(duty.name));

  if (existingDuty) {
    return existingDuty;
  }

  return repository.createDuty(delegatedManagerDutyDefaults);
}

async function assertCanAssignManagerPowers(
  user: AuthenticatedUser | null,
  dutyIds: string[] | undefined,
  repository: TeamManagementRepository
) {
  if (!dutyIds || dutyIds.length === 0) {
    return;
  }

  const duties = await repository.findDutiesByIds(dutyIds);
  const includesDelegatedManagerDuty = duties.some((duty) => isDelegatedManagerDutyName(duty.name));

  if (includesDelegatedManagerDuty && !canGrantManagerPowers(user)) {
    throw new Error("Only the General Manager can grant delegated manager capabilities.");
  }
}

async function assertCanCreateOrRenameDelegatedManagerDuty(
  user: AuthenticatedUser | null,
  nextDutyName: string | undefined,
  repository: TeamManagementRepository,
  dutyId?: string
) {
  if (!nextDutyName || !isDelegatedManagerDutyName(nextDutyName)) {
    if (!dutyId) {
      return;
    }

    const [currentDuty] = await repository.findDutiesByIds([dutyId]);

    if (currentDuty && isDelegatedManagerDutyName(currentDuty.name) && !canGrantManagerPowers(user)) {
      throw new Error("Only the General Manager can modify delegated manager capabilities.");
    }

    return;
  }

  if (!canGrantManagerPowers(user)) {
    throw new Error("Only the General Manager can grant delegated manager capabilities.");
  }
}

export async function getTeamManagementSnapshotForManager(
  user: AuthenticatedUser | null,
  repository: TeamManagementRepository = createTeamManagementRepository()
): Promise<TeamManagementSnapshot> {
  const authenticatedUser = assertCanManageTeam(user);
  const [users, roles] = await Promise.all([repository.listUsers(), repository.listRoles()]);
  const existingDuties = await repository.listDuties();
  const delegatedManagerDuty = existingDuties.find((duty) => isDelegatedManagerDutyName(duty.name));
  const duties =
    delegatedManagerDuty || !isGeneralManager(authenticatedUser)
      ? sortManagedDuties(existingDuties)
      : sortManagedDuties([...existingDuties, await ensureDelegatedManagerDuty(repository)]);

  return {
    users: users.map(toManagedTeamUser),
    roles: roles.map(toManagedRole),
    duties: duties.map(toManagedDuty)
  };
}

function sortManagedDuties<T extends { name: string }>(duties: T[]) {
  return [...duties].sort((left, right) => left.name.localeCompare(right.name));
}

export async function createManagedTeamUser(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedInput = normalizeTeamMemberCreateInput(input);
  await assertCanAssignManagerPowers(user, normalizedInput.dutyIds, repository);
  const [roles, duties] = await Promise.all([
    repository.findRolesByIds(normalizedInput.roleIds),
    normalizedInput.dutyIds.length > 0 ? repository.findDutiesByIds(normalizedInput.dutyIds) : []
  ]);

  if (roles.length !== normalizedInput.roleIds.length) {
    throw new Error("Every assigned role must reference an existing role.");
  }

  if (duties.length !== normalizedInput.dutyIds.length) {
    throw new Error("Every assigned duty must reference an existing duty.");
  }

  const passwordHash = await hashPassword(normalizedInput.password);
  const createdUser = await repository.createUser({
    name: normalizedInput.name,
    email: normalizedInput.email,
    passwordHash,
    isActive: normalizedInput.isActive,
    roleIds: normalizedInput.roleIds,
    dutyIds: normalizedInput.dutyIds
  });

  return toManagedTeamUser(createdUser);
}

export async function updateManagedTeamUser(
  user: AuthenticatedUser | null,
  teamUserId: string,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedTeamUserId = teamUserId.trim();

  if (!normalizedTeamUserId) {
    throw new Error("Team member id is required.");
  }

  const normalizedInput = normalizeTeamMemberUpdateInput(input);
  await assertCanAssignManagerPowers(user, normalizedInput.dutyIds, repository);

  if (normalizedInput.roleIds) {
    const roles = await repository.findRolesByIds(normalizedInput.roleIds);

    if (roles.length !== normalizedInput.roleIds.length) {
      throw new Error("Every assigned role must reference an existing role.");
    }
  }

  if (normalizedInput.dutyIds) {
    const duties = await repository.findDutiesByIds(normalizedInput.dutyIds);

    if (duties.length !== normalizedInput.dutyIds.length) {
      throw new Error("Every assigned duty must reference an existing duty.");
    }
  }

  const updatedUser = await repository.updateUser(normalizedTeamUserId, normalizedInput);

  if (!updatedUser) {
    throw new Error("Team member not found.");
  }

  return toManagedTeamUser(updatedUser);
}

export async function createManagedRole(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedInput = normalizeManagedRoleCreateInput(input);
  const duties = normalizedInput.dutyIds.length > 0 ? await repository.findDutiesByIds(normalizedInput.dutyIds) : [];

  if (duties.length !== normalizedInput.dutyIds.length) {
    throw new Error("Every default duty must reference an existing duty.");
  }

  const createdRole = await repository.createRole(normalizedInput);

  return toManagedRole(createdRole);
}

export async function updateManagedRole(
  user: AuthenticatedUser | null,
  roleId: string,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedRoleId = roleId.trim();

  if (!normalizedRoleId) {
    throw new Error("Role id is required.");
  }

  const normalizedInput = normalizeManagedRoleUpdateInput(input);

  if (normalizedInput.dutyIds) {
    const duties = await repository.findDutiesByIds(normalizedInput.dutyIds);

    if (duties.length !== normalizedInput.dutyIds.length) {
      throw new Error("Every default duty must reference an existing duty.");
    }
  }

  const updatedRole = await repository.updateRole(normalizedRoleId, normalizedInput);

  if (!updatedRole) {
    throw new Error("Role not found.");
  }

  return toManagedRole(updatedRole);
}

export async function createManagedDuty(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedInput = normalizeManagedDutyCreateInput(input);
  await assertCanCreateOrRenameDelegatedManagerDuty(user, normalizedInput.name, repository);
  const createdDuty = await repository.createDuty(normalizedInput);

  return toManagedDuty(createdDuty);
}

export async function updateManagedDuty(
  user: AuthenticatedUser | null,
  dutyId: string,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedDutyId = dutyId.trim();

  if (!normalizedDutyId) {
    throw new Error("Duty id is required.");
  }

  const normalizedInput = normalizeManagedDutyUpdateInput(input);
  await assertCanCreateOrRenameDelegatedManagerDuty(
    user,
    normalizedInput.name,
    repository,
    normalizedDutyId
  );
  const updatedDuty = await repository.updateDuty(normalizedDutyId, normalizedInput);

  if (!updatedDuty) {
    throw new Error("Duty not found.");
  }

  return toManagedDuty(updatedDuty);
}

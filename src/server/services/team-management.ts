import type { AuthenticatedUser } from "@/server/auth/store";
import { hashPassword } from "@/server/auth/password";
import { canManageUsers } from "@/server/policies/access";
import {
  createTeamManagementRepository,
  type ManagedUserRecord
} from "@/server/repositories/team-management-repository";
import { normalizeTeamMemberCreateInput } from "@/server/validation/team-management";

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
};

export type TeamManagementDutyOption = TeamManagementReferenceOption & {
  workflowArea: string;
};

export type TeamManagementSnapshot = {
  users: ManagedTeamUser[];
  roles: TeamManagementReferenceOption[];
  duties: TeamManagementDutyOption[];
};

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

function assertCanManageTeam(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageUsers(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

export async function getTeamManagementSnapshotForManager(
  user: AuthenticatedUser | null,
  repository: TeamManagementRepository = createTeamManagementRepository()
): Promise<TeamManagementSnapshot> {
  assertCanManageTeam(user);

  const [users, roles, duties] = await Promise.all([
    repository.listUsers(),
    repository.listRoles(),
    repository.listDuties()
  ]);

  return {
    users: users.map(toManagedTeamUser),
    roles,
    duties
  };
}

export async function createManagedTeamUser(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: TeamManagementRepository = createTeamManagementRepository()
) {
  assertCanManageTeam(user);

  const normalizedInput = normalizeTeamMemberCreateInput(input);
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

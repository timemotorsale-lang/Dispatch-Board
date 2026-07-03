import {
  createUserSummaryRepository,
  type UserSummaryRepository
} from "@/server/repositories/user-summary-repository";

export type ActiveUserSummary = {
  id: string;
  name: string;
  email?: string;
  roles: string[];
  dutySource: "custom" | "role_default" | "none";
  dutyPreview: string[];
  dutyCount: number;
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toActiveUserSummary(user: {
  id: string;
  name: string;
  email: string;
  userRoles: Array<{
    role: {
      name: string;
      roleDuties: Array<{
        duty: {
          name: string;
        };
      }>;
    };
  }>;
  userDuties: Array<{
    duty: {
      name: string;
    };
  }>;
}): ActiveUserSummary {
  const directDutyNames = uniqueSorted(user.userDuties.map((assignment) => assignment.duty.name));
  const roleNames = uniqueSorted(user.userRoles.map((assignment) => assignment.role.name));
  const roleDefaultDutyNames = uniqueSorted(
    user.userRoles.flatMap((assignment) => assignment.role.roleDuties.map((roleDuty) => roleDuty.duty.name))
  );
  const dutyPreview = directDutyNames.length > 0 ? directDutyNames : roleDefaultDutyNames;

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined,
    roles: roleNames,
    dutySource:
      directDutyNames.length > 0 ? "custom" : roleDefaultDutyNames.length > 0 ? "role_default" : "none",
    dutyPreview,
    dutyCount: dutyPreview.length
  };
}

export async function listActiveUserSummaries(
  repository: UserSummaryRepository = createUserSummaryRepository()
) {
  const users = await repository.listActiveUsers();

  return users.map(toActiveUserSummary);
}

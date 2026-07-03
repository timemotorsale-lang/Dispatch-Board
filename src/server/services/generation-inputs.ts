import {
  createGenerationInputsRepository,
  type GenerationInputsRepository,
  type GenerationTemplateRecord,
  type GenerationUserRecord
} from "@/server/repositories/generation-inputs-repository";

export type { GenerationInputsRepository } from "@/server/repositories/generation-inputs-repository";

export type GenerationInputDutySource = "custom" | "role_default" | "none";

export type GenerationInputRole = {
  roleId: string;
  roleName: string;
};

export type GenerationInputDuty = {
  dutyId: string;
  title: string;
  workflowArea: string;
  source: Exclude<GenerationInputDutySource, "none">;
  roleIds: string[];
  roleNames: string[];
};

export type GenerationInputTemplate = {
  templateId: string;
  title: string;
  description: string | null;
  workflowArea: GenerationTemplateRecord["workflowArea"];
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  roleId: string | null;
  roleName: string | null;
  dutyId: string | null;
  dutyName: string | null;
  matchedByRole: boolean;
  matchedByDuty: boolean;
};

export type GenerationInputWarning = {
  userId?: string;
  code: "USER_HAS_NO_ELIGIBLE_DUTIES" | "USER_HAS_NO_ELIGIBLE_TEMPLATES";
  message: string;
};

export type GenerationInputUser = {
  userId: string;
  userName: string;
  userEmail: string;
  roles: GenerationInputRole[];
  directDuties: GenerationInputDuty[];
  dutySource: GenerationInputDutySource;
  resolvedDuties: GenerationInputDuty[];
  templates: GenerationInputTemplate[];
};

export type GenerationInput = {
  boardDate: string;
  users: GenerationInputUser[];
  warnings: GenerationInputWarning[];
};

type PreparedGenerationUser = {
  userId: string;
  userName: string;
  userEmail: string;
  roles: GenerationInputRole[];
  directDuties: GenerationInputDuty[];
  roleDefaultDuties: GenerationInputDuty[];
};

function compareText(left: string, right: string) {
  return left.localeCompare(right);
}

function sortRoles(roles: GenerationInputRole[]) {
  return [...roles].sort(
    (left, right) => compareText(left.roleName, right.roleName) || compareText(left.roleId, right.roleId)
  );
}

function sortDuties(duties: GenerationInputDuty[]) {
  return [...duties].sort(
    (left, right) =>
      compareText(left.title, right.title) ||
      compareText(left.workflowArea, right.workflowArea) ||
      compareText(left.dutyId, right.dutyId)
  );
}

function sortTemplates(templates: GenerationInputTemplate[]) {
  return [...templates].sort(
    (left, right) =>
      compareText(left.workflowArea, right.workflowArea) ||
      compareText(left.title, right.title) ||
      compareText(left.templateId, right.templateId)
  );
}

function sortWarnings(warnings: GenerationInputWarning[]) {
  return [...warnings].sort(
    (left, right) =>
      compareText(left.userId ?? "", right.userId ?? "") ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message)
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort(compareText);
}

function normalizeBoardDate(boardDate: string) {
  const normalizedBoardDate = boardDate.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBoardDate)) {
    throw new Error("Board date must use YYYY-MM-DD format.");
  }

  const parsedBoardDate = new Date(`${normalizedBoardDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedBoardDate.getTime()) ||
    parsedBoardDate.toISOString().slice(0, 10) !== normalizedBoardDate
  ) {
    throw new Error("Board date must be a valid calendar date.");
  }

  return normalizedBoardDate;
}

function toRoles(user: GenerationUserRecord) {
  return sortRoles(
    user.userRoles.map((assignment) => ({
      roleId: assignment.role.id,
      roleName: assignment.role.name
    }))
  );
}

function toDirectDuties(user: GenerationUserRecord) {
  const dutyMap = new Map<string, GenerationInputDuty>();

  for (const assignment of user.userDuties) {
    dutyMap.set(assignment.duty.id, {
      dutyId: assignment.duty.id,
      title: assignment.duty.name,
      workflowArea: assignment.duty.workflowArea,
      source: "custom",
      roleIds: [],
      roleNames: []
    });
  }

  return sortDuties([...dutyMap.values()]);
}

function toRoleDefaultDuties(user: GenerationUserRecord) {
  const dutyMap = new Map<
    string,
    Omit<GenerationInputDuty, "roleIds" | "roleNames"> & {
      roleIds: Set<string>;
      roleNames: Set<string>;
    }
  >();

  for (const roleAssignment of user.userRoles) {
    for (const roleDuty of roleAssignment.role.roleDuties) {
      const existingDuty = dutyMap.get(roleDuty.duty.id);

      if (existingDuty) {
        existingDuty.roleIds.add(roleAssignment.role.id);
        existingDuty.roleNames.add(roleAssignment.role.name);
        continue;
      }

      dutyMap.set(roleDuty.duty.id, {
        dutyId: roleDuty.duty.id,
        title: roleDuty.duty.name,
        workflowArea: roleDuty.duty.workflowArea,
        source: "role_default",
        roleIds: new Set([roleAssignment.role.id]),
        roleNames: new Set([roleAssignment.role.name])
      });
    }
  }

  return sortDuties(
    [...dutyMap.values()].map((duty) => ({
      dutyId: duty.dutyId,
      title: duty.title,
      workflowArea: duty.workflowArea,
      source: duty.source,
      roleIds: uniqueSorted([...duty.roleIds]),
      roleNames: uniqueSorted([...duty.roleNames])
    }))
  );
}

function prepareGenerationUser(user: GenerationUserRecord): PreparedGenerationUser {
  const roles = toRoles(user);
  const directDuties = toDirectDuties(user);
  const roleDefaultDuties = toRoleDefaultDuties(user);

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    roles,
    directDuties,
    roleDefaultDuties
  };
}

function toGenerationTemplate(
  template: GenerationTemplateRecord,
  matchedByRole: boolean,
  matchedByDuty: boolean
): GenerationInputTemplate {
  return {
    templateId: template.id,
    title: template.title,
    description: template.description,
    workflowArea: template.workflowArea,
    defaultDueTime: template.defaultDueTime,
    requiresManagerApproval: template.requiresManagerApproval,
    roleId: template.roleId,
    roleName: template.role?.name ?? null,
    dutyId: template.dutyId,
    dutyName: template.duty?.name ?? null,
    matchedByRole,
    matchedByDuty
  };
}

function buildUserTemplates(user: PreparedGenerationUser, templates: GenerationTemplateRecord[]) {
  const activeRoleIds = new Set(user.roles.map((role) => role.roleId));
  const directDutyIds = new Set(user.directDuties.map((duty) => duty.dutyId));
  const roleDefaultDutyIds = new Set(user.roleDefaultDuties.map((duty) => duty.dutyId));

  const collectTemplates = ({
    dutyIds,
    allowRoleMatches
  }: {
    dutyIds: Set<string>;
    allowRoleMatches: boolean;
  }) => {
    const templateMap = new Map<string, GenerationInputTemplate>();

    for (const template of templates) {
      const matchedByRole = allowRoleMatches && template.roleId ? activeRoleIds.has(template.roleId) : false;
      const matchedByDuty = template.dutyId ? dutyIds.has(template.dutyId) : false;

      if (!matchedByRole && !matchedByDuty) {
        continue;
      }

      templateMap.set(template.id, toGenerationTemplate(template, matchedByRole, matchedByDuty));
    }

    return sortTemplates([...templateMap.values()]);
  };

  if (directDutyIds.size > 0) {
    const directTemplates = collectTemplates({
      dutyIds: directDutyIds,
      allowRoleMatches: false
    });

    if (directTemplates.length > 0) {
      return {
        dutySource: "custom" as const,
        resolvedDuties: user.directDuties,
        templates: directTemplates
      };
    }
  }

  if (roleDefaultDutyIds.size > 0) {
    const roleDefaultTemplates = collectTemplates({
      dutyIds: roleDefaultDutyIds,
      allowRoleMatches: true
    });

    return {
      dutySource: "role_default" as const,
      resolvedDuties: user.roleDefaultDuties,
      templates: roleDefaultTemplates
    };
  }

  return {
    dutySource: "none" as const,
    resolvedDuties: [] as GenerationInputDuty[],
    templates: [] as GenerationInputTemplate[]
  };
}

export async function loadGenerationInputsForDate(
  boardDate: string,
  repository: GenerationInputsRepository = createGenerationInputsRepository()
): Promise<GenerationInput> {
  const normalizedBoardDate = normalizeBoardDate(boardDate);
  const users = (await repository.listUsersForGeneration())
    .filter((user) => user.isActive)
    .map(prepareGenerationUser)
    .sort(
      (left, right) =>
        compareText(left.userName, right.userName) ||
        compareText(left.userEmail, right.userEmail) ||
        compareText(left.userId, right.userId)
    );

  const candidateRoleIds = uniqueSorted(users.flatMap((user) => user.roles.map((role) => role.roleId)));
  const candidateDutyIds = uniqueSorted(
    users.flatMap((user) => [...user.directDuties, ...user.roleDefaultDuties].map((duty) => duty.dutyId))
  );
  const templates = (await repository.listTemplatesForGeneration({
    roleIds: candidateRoleIds,
    dutyIds: candidateDutyIds
  }))
    .filter((template) => template.isActive)
    .sort(
      (left, right) =>
        compareText(left.workflowArea, right.workflowArea) ||
        compareText(left.title, right.title) ||
        compareText(left.id, right.id)
    );

  const warnings: GenerationInputWarning[] = [];
  const generationUsers: GenerationInputUser[] = users.map((user) => {
    const resolvedGenerationData = buildUserTemplates(user, templates);
    const userTemplates = resolvedGenerationData.templates;

    if (resolvedGenerationData.resolvedDuties.length === 0) {
      warnings.push({
        userId: user.userId,
        code: "USER_HAS_NO_ELIGIBLE_DUTIES",
        message: `${user.userName} has no custom duties or role default duties available for generation.`
      });
    }

    if (userTemplates.length === 0) {
      warnings.push({
        userId: user.userId,
        code: "USER_HAS_NO_ELIGIBLE_TEMPLATES",
        message: `${user.userName} has no active task templates connected to the resolved duties or active roles.`
      });
    }

    return {
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      roles: user.roles,
      directDuties: user.directDuties,
      dutySource: resolvedGenerationData.dutySource,
      resolvedDuties: resolvedGenerationData.resolvedDuties,
      templates: userTemplates
    };
  });

  return {
    boardDate: normalizedBoardDate,
    users: generationUsers,
    warnings: sortWarnings(warnings)
  };
}

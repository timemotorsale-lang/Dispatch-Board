import { PrismaClient } from "@prisma/client";

import {
  dayOneDutyDefinitions,
  dayOneTaskTemplateDefinitions,
  dayOneRoleDefinitions,
  developmentUserDefinitions
} from "../src/server/auth/dev-seed-data";
import { hashPassword } from "../src/server/auth/password";
import {
  getInitialMinneapolisOperatingWindows,
  getInitialMinneapolisLocation,
  getInitialOrganization
} from "../src/server/appointments/location-foundation";
import { getInitialResourceTypeDefinitions } from "../src/server/appointments/resource-foundation";
import { getDefaultAppSettings } from "../src/server/validation/app-settings";

const prisma = new PrismaClient();

const defaultTemplateFoundation = {
  templateCategory: null,
  priority: "MEDIUM" as const,
  requiredUpdateFields: [],
  checklistItems: [],
  completionCriteria: {
    mode: "manual",
    requiredChecklistKeys: [],
    requiredFieldKeys: []
  },
  defaultStatusRules: {
    allowedStatuses: [
      "NOT_STARTED",
      "IN_PROGRESS",
      "BLOCKED",
      "WAITING_ON_PARTS",
      "WAITING_ON_APPROVAL",
      "READY_FOR_REVIEW",
      "COMPLETED"
    ],
    blockedReasonRequired: true,
    waitingReasonRequiredStatuses: []
  },
  approvalRules: {
    mode: "none",
    readyForReviewRequired: false
  },
  intelligenceSignalType: "NONE",
  taskCardDisplayHints: {}
};

function buildTemplateFoundation(templateDefinition: (typeof dayOneTaskTemplateDefinitions)[number]) {
  return {
    templateCategory: templateDefinition.templateCategory ?? defaultTemplateFoundation.templateCategory,
    priority: templateDefinition.priority ?? defaultTemplateFoundation.priority,
    requiredUpdateFields:
      templateDefinition.requiredUpdateFields ?? defaultTemplateFoundation.requiredUpdateFields,
    checklistItems: templateDefinition.checklistItems ?? defaultTemplateFoundation.checklistItems,
    completionCriteria:
      templateDefinition.completionCriteria ?? defaultTemplateFoundation.completionCriteria,
    defaultStatusRules:
      templateDefinition.defaultStatusRules ?? defaultTemplateFoundation.defaultStatusRules,
    approvalRules: templateDefinition.approvalRules
      ? templateDefinition.approvalRules
      : templateDefinition.requiresManagerApproval
        ? {
            mode: "manager_review",
            readyForReviewRequired: true
          }
        : defaultTemplateFoundation.approvalRules,
    intelligenceSignalType:
      templateDefinition.intelligenceSignalType ?? defaultTemplateFoundation.intelligenceSignalType,
    taskCardDisplayHints: {
      ...defaultTemplateFoundation.taskCardDisplayHints,
      ...(templateDefinition.taskCardDisplayHints ?? {})
    }
  };
}

async function main() {
  const defaultAppSettings = getDefaultAppSettings();
  const initialOrganization = getInitialOrganization();
  const initialLocation = getInitialMinneapolisLocation();
  const initialOperatingWindows = getInitialMinneapolisOperatingWindows();
  const initialResourceTypes = getInitialResourceTypeDefinitions();

  await prisma.bootstrapMarker.upsert({
    where: { label: "foundation-seed" },
    update: {},
    create: { label: "foundation-seed" }
  });

  await prisma.appSetting.upsert({
    where: { id: defaultAppSettings.id },
    update: {
      dailyGenerationTime: defaultAppSettings.dailyGenerationTime,
      timezone: defaultAppSettings.timezone,
      businessDays: defaultAppSettings.businessDays
    },
    create: defaultAppSettings
  });

  const organization = await prisma.organization.upsert({
    where: { code: initialOrganization.code },
    update: {
      name: initialOrganization.name
    },
    create: initialOrganization,
    select: { id: true }
  });

  const location = await prisma.location.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: initialLocation.code
      }
    },
    update: {},
    create: {
      ...initialLocation,
      organizationId: organization.id
    },
    select: { id: true }
  });

  await prisma.locationOperatingWindow.createMany({
    data: initialOperatingWindows.map((window) => ({
      ...window,
      locationId: location.id
    })),
    skipDuplicates: true
  });

  for (const resourceType of initialResourceTypes) {
    await prisma.schedulableResourceType.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: resourceType.code
        }
      },
      update: {},
      create: {
        ...resourceType,
        organizationId: organization.id
      }
    });
  }

  for (const roleDefinition of dayOneRoleDefinitions) {
    await prisma.role.upsert({
      where: { name: roleDefinition.name },
      update: { description: roleDefinition.description },
      create: {
        name: roleDefinition.name,
        description: roleDefinition.description
      }
    });
  }

  for (const dutyDefinition of dayOneDutyDefinitions) {
    await prisma.duty.upsert({
      where: { name: dutyDefinition.name },
      update: {
        description: dutyDefinition.description,
        workflowArea: dutyDefinition.workflowArea
      },
      create: dutyDefinition
    });
  }

  const roleIdByName = new Map(
    (
      await prisma.role.findMany({
        select: { id: true, name: true }
      })
    ).map((role) => [role.name, role.id])
  );

  const dutyIdByName = new Map(
    (
      await prisma.duty.findMany({
        select: { id: true, name: true }
      })
    ).map((duty) => [duty.name, duty.id])
  );

  await prisma.roleDuty.deleteMany();

  for (const roleDefinition of dayOneRoleDefinitions) {
    for (const dutyName of roleDefinition.defaultDutyNames) {
      const roleId = roleIdByName.get(roleDefinition.name);
      const dutyId = dutyIdByName.get(dutyName);

      if (!roleId || !dutyId) {
        throw new Error(`Missing role or duty for role default assignment: ${roleDefinition.name} -> ${dutyName}`);
      }

      await prisma.roleDuty.create({
        data: {
          roleId,
          dutyId
        }
      });
    }
  }

  for (const templateDefinition of dayOneTaskTemplateDefinitions) {
    const roleId = templateDefinition.roleName ? roleIdByName.get(templateDefinition.roleName) : null;
    const dutyId = templateDefinition.dutyName ? dutyIdByName.get(templateDefinition.dutyName) : null;
    const templateFoundation = buildTemplateFoundation(templateDefinition);

    if (templateDefinition.roleName && !roleId) {
      throw new Error(`Missing role for task template seed: ${templateDefinition.title} -> ${templateDefinition.roleName}`);
    }

    if (templateDefinition.dutyName && !dutyId) {
      throw new Error(`Missing duty for task template seed: ${templateDefinition.title} -> ${templateDefinition.dutyName}`);
    }

    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: {
        title: templateDefinition.title,
        roleId: roleId ?? undefined,
        dutyId: dutyId ?? undefined
      },
      select: { id: true }
    });

    if (existingTemplate) {
      await prisma.taskTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          description: templateDefinition.description,
          ...templateFoundation,
          workflowArea: templateDefinition.workflowArea,
          defaultDueTime: templateDefinition.defaultDueTime,
          requiresManagerApproval: templateDefinition.requiresManagerApproval,
          isActive: templateDefinition.isActive,
          roleId: roleId ?? null,
          dutyId: dutyId ?? null
        }
      });
      continue;
    }

    await prisma.taskTemplate.create({
      data: {
        title: templateDefinition.title,
        description: templateDefinition.description,
        ...templateFoundation,
        workflowArea: templateDefinition.workflowArea,
        defaultDueTime: templateDefinition.defaultDueTime,
        requiresManagerApproval: templateDefinition.requiresManagerApproval,
        isActive: templateDefinition.isActive,
        roleId: roleId ?? null,
        dutyId: dutyId ?? null
      }
    });
  }

  await prisma.session.deleteMany();
  await prisma.userDuty.deleteMany();
  await prisma.userRole.deleteMany();

  for (const userDefinition of developmentUserDefinitions) {
    const passwordHash = await hashPassword(userDefinition.password);

    await prisma.user.upsert({
      where: { email: userDefinition.email },
      update: {
        name: userDefinition.name,
        passwordHash,
        isActive: userDefinition.isActive
      },
      create: {
        name: userDefinition.name,
        email: userDefinition.email,
        passwordHash,
        isActive: userDefinition.isActive
      }
    });
  }

  const userIdByEmail = new Map(
    (
      await prisma.user.findMany({
        select: { id: true, email: true }
      })
    ).map((user) => [user.email, user.id])
  );

  for (const userDefinition of developmentUserDefinitions) {
    const userId = userIdByEmail.get(userDefinition.email);

    if (!userId) {
      throw new Error(`Missing user for assignment seeding: ${userDefinition.email}`);
    }

    for (const roleName of userDefinition.roleNames) {
      const roleId = roleIdByName.get(roleName);

      if (!roleId) {
        throw new Error(`Missing role for user assignment: ${userDefinition.email} -> ${roleName}`);
      }

      await prisma.userRole.create({
        data: {
          userId,
          roleId
        }
      });
    }

    for (const dutyName of userDefinition.directDutyNames) {
      const dutyId = dutyIdByName.get(dutyName);

      if (!dutyId) {
        throw new Error(`Missing duty for user assignment: ${userDefinition.email} -> ${dutyName}`);
      }

      await prisma.userDuty.create({
        data: {
          userId,
          dutyId
        }
      });
    }

    if (userDefinition.isActive) {
      const isGeneralManager = userDefinition.roleNames.some(
        (roleName) => roleName === "General Manager"
      );

      await prisma.userLocationAccess.upsert({
        where: {
          userId_locationId: {
            userId,
            locationId: location.id
          }
        },
        update: {},
        create: {
          userId,
          locationId: location.id,
          canViewSchedule: true,
          canParticipate: true,
          canOwnAppointments: true,
          canManageAppointments: isGeneralManager,
          canViewLimitedData: isGeneralManager,
          validFrom: new Date("2026-07-05T00:00:00.000Z"),
          validTo: null
        }
      });
    }
  }

  console.log(
    "Development seed completed with users, roles, duties, task templates, assignments, app settings, Minneapolis appointment configuration, resource types, and location access."
  );
}

main()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


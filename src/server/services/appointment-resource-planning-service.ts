import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";
import { normalizeAppointmentHistoryEvent } from "@/server/validation/appointment-history-events";
import { normalizeAppointmentResourceRequirement } from "@/server/validation/appointment-resources";

const appointmentResourcePlanningSelect = {
  id: true,
  appointmentNumber: true,
  organizationId: true,
  locationId: true,
  ownerUserId: true,
  title: true,
  version: true,
  bookingStatus: true,
  purposeSnapshot: true,
  resourceRequirements: {
    select: {
      id: true,
      resourceTypeId: true,
      requirementCode: true,
      requiredCapacity: true,
      isMandatory: true,
      assignmentTiming: true,
      hardBlockIfUnfulfilled: true,
      resourceType: {
        select: {
          id: true,
          code: true,
          name: true,
          kind: true
        }
      },
      reservations: {
        select: {
          id: true,
          status: true,
          resourceId: true
        }
      }
    }
  }
} satisfies Prisma.AppointmentSelect;

const locationAccessSelect = {
  userId: true,
  locationId: true,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: true,
  canViewLimitedData: true,
  validFrom: true,
  validTo: true
} satisfies Prisma.UserLocationAccessSelect;

const resourceTypeSelect = {
  id: true,
  organizationId: true,
  code: true,
  name: true,
  kind: true,
  defaultCapacityMode: true,
  defaultCapacity: true,
  defaultConflictPolicy: true,
  visibilityClass: true
} satisfies Prisma.SchedulableResourceTypeSelect;

const resourceSelect = {
  id: true,
  resourceTypeId: true,
  code: true,
  name: true,
  status: true,
  capacityMode: true,
  capacity: true,
  conflictPolicy: true
} satisfies Prisma.SchedulableResourceSelect;

type AppointmentResourcePlanningDatabase = Pick<
  PrismaClient,
  | "$transaction"
  | "appointment"
  | "userLocationAccess"
  | "schedulableResourceType"
  | "schedulableResource"
>;

export type AppointmentResourcePlanningAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentResourcePlanningSelect;
}>;

export type AppointmentResourcePlanningLocationAccessRecord = Prisma.UserLocationAccessGetPayload<{
  select: typeof locationAccessSelect;
}>;

export type AppointmentResourcePlanningResourceTypeRecord = Prisma.SchedulableResourceTypeGetPayload<{
  select: typeof resourceTypeSelect;
}>;

export type AppointmentResourcePlanningResourceRecord = Prisma.SchedulableResourceGetPayload<{
  select: typeof resourceSelect;
}>;

export type AppointmentResourcePlanningRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentResourcePlanningAppointmentRecord | null>;
  findActiveLocationAccess(
    userId: string,
    locationId: string,
    at: Date
  ): Promise<AppointmentResourcePlanningLocationAccessRecord | null>;
  findActiveResourceTypes(
    organizationId: string
  ): Promise<AppointmentResourcePlanningResourceTypeRecord[]>;
  findActiveResourcesForTypes(input: {
    organizationId: string;
    locationId: string;
    resourceTypeIds: string[];
    at: Date;
  }): Promise<AppointmentResourcePlanningResourceRecord[]>;
};

export type RecommendedRequirement = {
  requirementCode: string;
  label: string;
  resourceTypeCode: string;
  requiredCapacity: number;
  isMandatory: boolean;
  hardBlockIfUnfulfilled: boolean;
  assignmentTiming: "AT_BOOKING" | "BEFORE_START" | "OPTIONAL";
  rationale: string;
};

export type AppointmentResourcePlanningResult = {
  appointmentId: string;
  appointmentNumber: string;
  category: string;
  status:
    | "READY_TO_SELECT"
    | "REQUIREMENT_SELECTED"
    | "CONFIGURATION_NEEDED"
    | "NO_RECOMMENDATION";
  canManageResourcesForAppointment: boolean;
  recommendations: Array<
    RecommendedRequirement & {
      resourceTypeId: string | null;
      resourceTypeName: string | null;
      selectedRequirementId: string | null;
      selectedReservationCount: number;
      activeCandidateCount: number;
      status:
        | "SELECTED"
        | "AVAILABLE"
        | "CONFIGURATION_NEEDED"
        | "RESOURCE_TYPE_MISSING";
      candidates: Array<{
        id: string;
        code: string;
        name: string;
        capacity: number;
        capacityMode: string;
        conflictPolicy: string;
      }>;
      message: string;
    }
  >;
};

export type AppointmentAttachedResourceRequirement = {
  id: string;
  appointmentId: string;
  resourceTypeId: string;
  requirementCode: string;
  requiredCapacity: number;
  isMandatory: boolean;
  assignmentTiming: string;
  hardBlockIfUnfulfilled: boolean;
  created: boolean;
  appointmentVersion: number;
};

export type AttachRecommendedResourceRequirementInput = {
  requirementCode: string;
  expectedAppointmentVersion: number;
  reasonCode: string;
  reasonNotes: string;
  correlationId?: string | null;
};

const CATEGORY_REQUIREMENTS: Record<string, RecommendedRequirement[]> = {
  sales: [
    {
      requirementCode: "TEST_DRIVE_VEHICLE",
      label: "Test-drive vehicle",
      resourceTypeCode: "VEHICLE",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      assignmentTiming: "AT_BOOKING",
      rationale: "Sales and test-drive appointments should protect the vehicle being shown."
    }
  ],
  service: [
    {
      requirementCode: "SERVICE_BAY",
      label: "Service bay",
      resourceTypeCode: "SERVICE_BAY",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      assignmentTiming: "AT_BOOKING",
      rationale: "Service and repair appointments need a bay or equivalent service capacity."
    }
  ],
  delivery: [
    {
      requirementCode: "DELIVERY_VEHICLE",
      label: "Delivery vehicle",
      resourceTypeCode: "VEHICLE",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      assignmentTiming: "AT_BOOKING",
      rationale: "Vehicle delivery appointments should protect the delivered vehicle."
    }
  ],
  customer: [
    {
      requirementCode: "CUSTOMER_MEETING_STAFF",
      label: "Customer meeting staff",
      resourceTypeCode: "STAFF",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: false,
      assignmentTiming: "BEFORE_START",
      rationale: "Customer issue appointments need an accountable person available to meet."
    }
  ],
  dmv: [
    {
      requirementCode: "DOCUMENTATION_ROOM",
      label: "Documentation room or desk",
      resourceTypeCode: "ROOM",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      assignmentTiming: "AT_BOOKING",
      rationale: "Documentation and DMV work should protect a controlled customer-facing workspace."
    }
  ],
  collections: [
    {
      requirementCode: "PAYMENT_REVIEW_ROOM",
      label: "Payment review room or desk",
      resourceTypeCode: "ROOM",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: false,
      assignmentTiming: "BEFORE_START",
      rationale: "Collections appointments often need a private workspace, but managers may proceed with a documented exception."
    }
  ],
  inventory: [
    {
      requirementCode: "INVENTORY_VEHICLE",
      label: "Inventory vehicle",
      resourceTypeCode: "VEHICLE",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      assignmentTiming: "AT_BOOKING",
      rationale: "Inventory/vendor appointments should protect the affected vehicle."
    }
  ],
  marketing: [
    {
      requirementCode: "MEDIA_EQUIPMENT",
      label: "Media equipment",
      resourceTypeCode: "EQUIPMENT",
      requiredCapacity: 1,
      isMandatory: false,
      hardBlockIfUnfulfilled: false,
      assignmentTiming: "OPTIONAL",
      rationale: "Marketing appointments may need photo or listing equipment depending on the job."
    }
  ],
  general: [
    {
      requirementCode: "LOCATION_CAPACITY",
      label: "Location capacity",
      resourceTypeCode: "LOCATION",
      requiredCapacity: 1,
      isMandatory: true,
      hardBlockIfUnfulfilled: false,
      assignmentTiming: "BEFORE_START",
      rationale: "General appointments still need visible location capacity planning."
    }
  ]
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isDateWithinAccessWindow(
  access: AppointmentResourcePlanningLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentResourcePlanningLocationAccessRecord | null
): AppointmentLocationAccessGrant | null {
  if (!access) {
    return null;
  }

  return {
    canViewSchedule: access.canViewSchedule,
    canParticipate: access.canParticipate,
    canOwnAppointments: access.canOwnAppointments,
    canManageAppointments: access.canManageAppointments,
    canViewLimitedData: access.canViewLimitedData
  };
}

function getSnapshotString(snapshot: unknown, key: string) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const value = (snapshot as Record<string, unknown>)[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function inferCategory(appointment: AppointmentResourcePlanningAppointmentRecord) {
  const snapshotCategory = getSnapshotString(appointment.purposeSnapshot, "category");

  if (snapshotCategory && CATEGORY_REQUIREMENTS[snapshotCategory]) {
    return snapshotCategory;
  }

  const title = appointment.title.toLowerCase();

  if (title.includes("service") || title.includes("repair")) {
    return "service";
  }

  if (title.includes("test drive") || title.includes("sales")) {
    return "sales";
  }

  if (title.includes("delivery")) {
    return "delivery";
  }

  if (title.includes("dmv") || title.includes("document") || title.includes("title")) {
    return "dmv";
  }

  if (title.includes("collection") || title.includes("payment")) {
    return "collections";
  }

  if (title.includes("inventory") || title.includes("vendor")) {
    return "inventory";
  }

  if (title.includes("marketing") || title.includes("listing")) {
    return "marketing";
  }

  if (title.includes("customer")) {
    return "customer";
  }

  return "general";
}

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function requiredVersion(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isInteger(value) || value < 1) {
    throw new Error("Expected appointment version is required.");
  }

  return value;
}

function asInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function nullableInputJson(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : asInputJson(value);
}

function getRecommendedRequirementForAppointment(
  appointment: AppointmentResourcePlanningAppointmentRecord,
  requirementCode: string
) {
  const category = inferCategory(appointment);

  return (
    CATEGORY_REQUIREMENTS[category]?.find(
      (requirement) => requirement.requirementCode === requirementCode
    ) ?? null
  );
}

function toAttachedRequirement(input: {
  requirement: {
    id: string;
    appointmentId: string;
    resourceTypeId: string;
    requirementCode: string;
    requiredCapacity: number;
    isMandatory: boolean;
    assignmentTiming: string;
    hardBlockIfUnfulfilled: boolean;
  };
  created: boolean;
  appointmentVersion: number;
}): AppointmentAttachedResourceRequirement {
  return {
    ...input.requirement,
    created: input.created,
    appointmentVersion: input.appointmentVersion
  };
}

function summarizeStatus(
  recommendations: AppointmentResourcePlanningResult["recommendations"]
): AppointmentResourcePlanningResult["status"] {
  if (recommendations.length === 0) {
    return "NO_RECOMMENDATION";
  }

  if (recommendations.some((recommendation) => recommendation.status === "CONFIGURATION_NEEDED" || recommendation.status === "RESOURCE_TYPE_MISSING")) {
    return "CONFIGURATION_NEEDED";
  }

  if (recommendations.some((recommendation) => recommendation.status === "SELECTED")) {
    return "REQUIREMENT_SELECTED";
  }

  return "READY_TO_SELECT";
}

function buildPlanning(input: {
  appointment: AppointmentResourcePlanningAppointmentRecord;
  resourceTypes: AppointmentResourcePlanningResourceTypeRecord[];
  resources: AppointmentResourcePlanningResourceRecord[];
  canManageResourcesForAppointment: boolean;
}): AppointmentResourcePlanningResult {
  const category = inferCategory(input.appointment);
  const recommendedRequirements = CATEGORY_REQUIREMENTS[category] ?? [];

  const recommendations = recommendedRequirements.map((recommendation) => {
    const resourceType =
      input.resourceTypes.find((type) => type.code === recommendation.resourceTypeCode) ?? null;
    const selectedRequirement =
      input.appointment.resourceRequirements.find(
        (requirement) =>
          requirement.requirementCode === recommendation.requirementCode ||
          requirement.resourceType.code === recommendation.resourceTypeCode
      ) ?? null;
    const candidates = resourceType
      ? input.resources.filter((resource) => resource.resourceTypeId === resourceType.id)
      : [];
    const status: AppointmentResourcePlanningResult["recommendations"][number]["status"] = selectedRequirement
      ? "SELECTED"
      : !resourceType
        ? "RESOURCE_TYPE_MISSING"
        : candidates.length > 0
          ? "AVAILABLE"
          : "CONFIGURATION_NEEDED";

    return {
      ...recommendation,
      resourceTypeId: resourceType?.id ?? null,
      resourceTypeName: resourceType?.name ?? null,
      selectedRequirementId: selectedRequirement?.id ?? null,
      selectedReservationCount: selectedRequirement?.reservations.length ?? 0,
      activeCandidateCount: candidates.length,
      status,
      candidates: candidates.map((resource) => ({
        id: resource.id,
        code: resource.code,
        name: resource.name,
        capacity: resource.capacity,
        capacityMode: resource.capacityMode,
        conflictPolicy: resource.conflictPolicy
      })),
      message: selectedRequirement
        ? "Requirement is already attached to this appointment."
        : !resourceType
          ? `Resource type ${recommendation.resourceTypeCode} is not configured.`
          : candidates.length > 0
            ? `${candidates.length} active candidate resource${candidates.length === 1 ? "" : "s"} available for selection.`
            : `${resourceType.name} exists, but no active resources are configured for this location.`
    };
  });

  return {
    appointmentId: input.appointment.id,
    appointmentNumber: input.appointment.appointmentNumber,
    category,
    status: summarizeStatus(recommendations),
    canManageResourcesForAppointment: input.canManageResourcesForAppointment,
    recommendations
  };
}

export function createAppointmentResourcePlanningRepository(
  database: AppointmentResourcePlanningDatabase = prisma
): AppointmentResourcePlanningRepository {
  return {
    findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentResourcePlanningSelect
      });
    },
    findActiveLocationAccess(userId, locationId, at) {
      return database.userLocationAccess.findFirst({
        where: {
          userId,
          locationId,
          validFrom: {
            lte: at
          },
          OR: [
            {
              validTo: null
            },
            {
              validTo: {
                gte: at
              }
            }
          ]
        },
        select: locationAccessSelect
      });
    },
    findActiveResourceTypes(organizationId) {
      return database.schedulableResourceType.findMany({
        where: {
          organizationId,
          isActive: true
        },
        orderBy: {
          code: "asc"
        },
        select: resourceTypeSelect
      });
    },
    findActiveResourcesForTypes(input) {
      if (input.resourceTypeIds.length === 0) {
        return Promise.resolve([]);
      }

      return database.schedulableResource.findMany({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          resourceTypeId: {
            in: input.resourceTypeIds
          },
          status: "ACTIVE",
          effectiveFrom: {
            lte: input.at
          },
          OR: [
            {
              effectiveTo: null
            },
            {
              effectiveTo: {
                gte: input.at
              }
            }
          ]
        },
        orderBy: [
          {
            resourceTypeId: "asc"
          },
          {
            name: "asc"
          }
        ],
        select: resourceSelect
      });
    }
  };
}

export async function previewAppointmentResourcePlanning(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentResourcePlanningRepository = createAppointmentResourcePlanningRepository(),
  now = new Date()
): Promise<AppointmentResourcePlanningResult> {
  const actor = assertAuthenticated(user);

  if (!appointmentId.trim()) {
    throw new Error("Appointment id is required.");
  }

  const appointment = await repository.findAppointmentById(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const access = await repository.findActiveLocationAccess(actor.id, appointment.locationId, now);

  if (!access || !isDateWithinAccessWindow(access, now)) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const locationAccess = toLocationAccessGrant(access);

  if (!canViewAppointmentSchedule({ actor, locationAccess })) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const canManageResourcesForAppointment = canMutateAppointment({
    actor,
    ownerUserId: appointment.ownerUserId,
    locationAccess
  });

  if (!canManageResourcesForAppointment) {
    throw new Error("Appointment command is not authorized.");
  }

  const resourceTypes = await repository.findActiveResourceTypes(appointment.organizationId);
  const category = inferCategory(appointment);
  const recommendedTypeCodes = new Set(
    (CATEGORY_REQUIREMENTS[category] ?? []).map((recommendation) => recommendation.resourceTypeCode)
  );
  const relevantTypeIds = resourceTypes
    .filter((resourceType) => recommendedTypeCodes.has(resourceType.code))
    .map((resourceType) => resourceType.id);
  const resources = await repository.findActiveResourcesForTypes({
    organizationId: appointment.organizationId,
    locationId: appointment.locationId,
    resourceTypeIds: relevantTypeIds,
    at: now
  });

  return buildPlanning({
    appointment,
    resourceTypes,
    resources,
    canManageResourcesForAppointment
  });
}

export async function attachRecommendedAppointmentResourceRequirement(
  user: AuthenticatedUser | null,
  appointmentId: string,
  input: AttachRecommendedResourceRequirementInput,
  database: AppointmentResourcePlanningDatabase = prisma,
  now = new Date()
): Promise<AppointmentAttachedResourceRequirement> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = requiredText(appointmentId, "Appointment id");
  const requirementCode = requiredText(input.requirementCode, "Resource requirement code");
  const expectedAppointmentVersion = requiredVersion(input.expectedAppointmentVersion);
  const reasonCode = requiredText(input.reasonCode, "Resource requirement reason code");
  const reasonNotes = requiredText(input.reasonNotes, "Resource requirement reason notes");
  const correlationId =
    input.correlationId?.trim() ||
    `resource-requirement-${normalizedAppointmentId}-${requirementCode}-${now.getTime()}`;

  const appointment = await database.appointment.findUnique({
    where: {
      id: normalizedAppointmentId
    },
    select: appointmentResourcePlanningSelect
  });

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (appointment.bookingStatus !== "DRAFT" && appointment.bookingStatus !== "PENDING_APPROVAL") {
    throw new Error("Resource requirements can only be attached to draft appointments.");
  }

  const access = await database.userLocationAccess.findFirst({
    where: {
      userId: actor.id,
      locationId: appointment.locationId,
      validFrom: {
        lte: now
      },
      OR: [
        {
          validTo: null
        },
        {
          validTo: {
            gte: now
          }
        }
      ]
    },
    select: locationAccessSelect
  });

  if (!access || !isDateWithinAccessWindow(access, now)) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const locationAccess = toLocationAccessGrant(access);

  if (!canViewAppointmentSchedule({ actor, locationAccess })) {
    throw new Error("Appointment schedule is not authorized.");
  }

  if (
    !canMutateAppointment({
      actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess
    })
  ) {
    throw new Error("Appointment command is not authorized.");
  }

  const recommendedRequirement = getRecommendedRequirementForAppointment(
    appointment,
    requirementCode
  );

  if (!recommendedRequirement) {
    throw new Error("Resource requirement recommendation is not available for this appointment.");
  }

  const resourceType = await database.schedulableResourceType.findFirst({
    where: {
      organizationId: appointment.organizationId,
      code: recommendedRequirement.resourceTypeCode,
      isActive: true
    },
    select: resourceTypeSelect
  });

  if (!resourceType) {
    throw new Error("Resource requirement type is not configured.");
  }

  const normalizedRequirement = normalizeAppointmentResourceRequirement({
    appointmentId: appointment.id,
    appointmentOrganizationId: appointment.organizationId,
    resourceTypeId: resourceType.id,
    resourceTypeOrganizationId: resourceType.organizationId,
    requirementCode: recommendedRequirement.requirementCode,
    requiredCapacity: recommendedRequirement.requiredCapacity,
    isMandatory: recommendedRequirement.isMandatory,
    assignmentTiming: recommendedRequirement.assignmentTiming,
    hardBlockIfUnfulfilled: recommendedRequirement.hardBlockIfUnfulfilled,
    characteristics: {
      label: recommendedRequirement.label,
      rationale: recommendedRequirement.rationale,
      source: "APPOINTMENT_BOARD_RESOURCE_PLANNING"
    }
  });

  const historyEvent = normalizeAppointmentHistoryEvent({
    appointmentId: appointment.id,
    actorType: "HUMAN",
    actorUserId: actor.id,
    eventType: "FIELD_UPDATED",
    message: `Resource requirement ${normalizedRequirement.requirementCode} was attached.`,
    reasonCode,
    reasonNotes,
    correlationId,
    priorValue: {
      resourceRequirements: appointment.resourceRequirements.map((requirement) => ({
        id: requirement.id,
        requirementCode: requirement.requirementCode,
        resourceTypeCode: requirement.resourceType.code
      }))
    },
    newValue: {
      resourceRequirement: {
        requirementCode: normalizedRequirement.requirementCode,
        resourceTypeCode: recommendedRequirement.resourceTypeCode,
        requiredCapacity: normalizedRequirement.requiredCapacity,
        isMandatory: normalizedRequirement.isMandatory,
        hardBlockIfUnfulfilled: normalizedRequirement.hardBlockIfUnfulfilled
      }
    },
    metadata: {
      source: "APPOINTMENT_BOARD_RESOURCE_PLANNING",
      expectedAppointmentVersion
    },
    occurredAt: now
  });

  return database.$transaction(async (tx) => {
    const existingRequirement = await tx.appointmentResourceRequirement.findUnique({
      where: {
        appointmentId_requirementCode: {
          appointmentId: appointment.id,
          requirementCode: normalizedRequirement.requirementCode
        }
      },
      select: {
        id: true,
        appointmentId: true,
        resourceTypeId: true,
        requirementCode: true,
        requiredCapacity: true,
        isMandatory: true,
        assignmentTiming: true,
        hardBlockIfUnfulfilled: true
      }
    });

    if (existingRequirement) {
      return toAttachedRequirement({
        requirement: existingRequirement,
        created: false,
        appointmentVersion: appointment.version
      });
    }

    const appointmentUpdate = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        version: expectedAppointmentVersion
      },
      data: {
        version: {
          increment: 1
        }
      }
    });

    if (appointmentUpdate.count !== 1) {
      throw new Error("Appointment version is stale.");
    }

    const createdRequirement = await tx.appointmentResourceRequirement.create({
      data: {
        appointmentId: normalizedRequirement.appointmentId,
        resourceTypeId: normalizedRequirement.resourceTypeId,
        requirementCode: normalizedRequirement.requirementCode,
        requiredCapacity: normalizedRequirement.requiredCapacity,
        isMandatory: normalizedRequirement.isMandatory,
        assignmentTiming: normalizedRequirement.assignmentTiming,
        hardBlockIfUnfulfilled: normalizedRequirement.hardBlockIfUnfulfilled,
        characteristics: nullableInputJson(normalizedRequirement.characteristics)
      },
      select: {
        id: true,
        appointmentId: true,
        resourceTypeId: true,
        requirementCode: true,
        requiredCapacity: true,
        isMandatory: true,
        assignmentTiming: true,
        hardBlockIfUnfulfilled: true
      }
    });

    await tx.appointmentHistoryEvent.create({
      data: {
        appointmentId: historyEvent.appointmentId,
        actorType: historyEvent.actorType,
        actorUserId: historyEvent.actorUserId,
        eventType: historyEvent.eventType,
        message: historyEvent.message,
        reasonCode: historyEvent.reasonCode,
        reasonNotes: historyEvent.reasonNotes,
        correlationId: historyEvent.correlationId,
        priorValue: nullableInputJson(historyEvent.priorValue),
        newValue: nullableInputJson(historyEvent.newValue),
        metadata: asInputJson(historyEvent.metadata),
        occurredAt: historyEvent.occurredAt ?? now
      }
    });

    return toAttachedRequirement({
      requirement: createdRequirement,
      created: true,
      appointmentVersion: expectedAppointmentVersion + 1
    });
  });
}

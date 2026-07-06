import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";

const appointmentResourcePlanningSelect = {
  id: true,
  appointmentNumber: true,
  organizationId: true,
  locationId: true,
  ownerUserId: true,
  title: true,
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
  "appointment" | "userLocationAccess" | "schedulableResourceType" | "schedulableResource"
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

type RecommendedRequirement = {
  requirementCode: string;
  label: string;
  resourceTypeCode: string;
  requiredCapacity: number;
  isMandatory: boolean;
  hardBlockIfUnfulfilled: boolean;
  assignmentTiming: "AT_BOOKING" | "BEFORE_START" | "ANYTIME_BEFORE_COMPLETION";
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
      assignmentTiming: "BEFORE_START",
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

import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createUnscheduledAppointmentRequest,
  prepareWaitlistPromotion,
  rankWaitlistCandidates
} from "@/server/appointments/appointment-waitlist-service";
import {
  getInitialAppointmentTemplateDefinition,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type {
  ResourceAvailabilityOperatingWindow,
  ResourceAvailabilityReservation,
  ResourceAvailabilityResource
} from "@/server/appointments/resource-availability-service";
import type {
  StaffAvailabilityUser,
  StaffLocationAccess,
  StaffResource
} from "@/server/appointments/staff-availability-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const activeLocation = {
  id: locationId,
  timezone,
  schedulingStatus: LocationSchedulingStatus.ACTIVE
};

const mondayWindow: ResourceAvailabilityOperatingWindow = {
  businessDay: BusinessDay.MONDAY,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  capacityOverride: null,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const vehicleResource: ResourceAvailabilityResource = {
  id: "resource-vehicle-camry",
  name: "2018 Toyota Camry",
  status: "ACTIVE",
  capacityMode: "EXCLUSIVE",
  capacity: 1,
  conflictPolicy: "HARD_BLOCK",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const owner: StaffAvailabilityUser = {
  id: "user-brock",
  name: "Brock Peterson",
  isActive: true
};

const ownerAccess: StaffLocationAccess = {
  userId: owner.id,
  locationId,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: false,
  canViewLimitedData: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const ownerStaffResource: StaffResource = {
  id: "resource-staff-brock",
  locationId,
  resourceKind: "STAFF",
  userId: owner.id,
  name: owner.name,
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 1,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function getTemplate(): AppointmentTemplateDefinition {
  const template = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

  if (!template) {
    throw new Error("Missing test-drive template fixture.");
  }

  return template;
}

function createRequest(overrides: Partial<Parameters<typeof createUnscheduledAppointmentRequest>[0]> = {}) {
  return createUnscheduledAppointmentRequest({
    requestId: "waitlist-1",
    organizationId: "org-time-motor-sales",
    locationId,
    template: getTemplate(),
    source: "TASK",
    priority: "HIGH",
    requestedByUserId: "user-brock",
    ownerUserId: owner.id,
    sourceTaskId: "task-1",
    requestedContextFields: [
      "customer",
      "vehicle",
      "owner",
      "driverEligibility",
      "location"
    ],
    reasonCode: "CUSTOMER_NEEDS_TEST_DRIVE",
    reasonNotes: "Customer requested a test drive but no slot was selected.",
    createdAt: new Date("2026-07-06T14:00:00.000Z"),
    permission: {
      canViewSchedule: true,
      canCreateDraft: true,
      canRequestManagerReview: true
    },
    ...overrides
  });
}

function searchInput(overrides: Partial<Parameters<typeof rankWaitlistCandidates>[0]["searchInput"]> = {}) {
  return {
    template: getTemplate(),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
    windowStartLocalDate: "2026-07-06",
    windowEndLocalDate: "2026-07-06",
    earliestStartMinuteOfDay: 9 * 60,
    latestStartMinuteOfDay: 12 * 60,
    providedContextFields: [
      "customer",
      "vehicle",
      "owner",
      "driverEligibility",
      "location"
    ],
    resources: [
      {
        requirementCode: "VEHICLE",
        resource: vehicleResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    staff: [
      {
        role: "OWNER" as const,
        staff: owner,
        locationAccess: ownerAccess,
        staffResource: ownerStaffResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    ...overrides
  };
}

describe("appointment waitlist and unscheduled request service", () => {
  it("creates an open unscheduled request without silently scheduling anything", () => {
    const request = createRequest({
      requestedContextFields: ["customer", "vehicle", "location"]
    });

    expect(request).toMatchObject({
      requestId: "waitlist-1",
      templateCode: "APT-TEST-DRIVE",
      templateVersion: 1,
      source: "TASK",
      status: "OPEN",
      priority: "HIGH",
      requestedByUserId: "user-brock",
      ownerUserId: owner.id,
      sourceTaskId: "task-1",
      isReadyForCandidateSearch: false,
      isSilentlyScheduled: false,
      missingContextFields: ["owner", "driverEligibility"]
    });
  });

  it("requires schedule access before capturing a waitlist request", () => {
    expect(() =>
      createRequest({
        permission: {
          canViewSchedule: false,
          canCreateDraft: false,
          canRequestManagerReview: false,
          reason: "No appointment access."
        }
      })
    ).toThrow(/No appointment access/i);
  });

  it("rejects candidate search until required context is complete", () => {
    const request = createRequest({
      requestedContextFields: ["customer"]
    });

    expect(() =>
      rankWaitlistCandidates({
        request,
        searchInput: searchInput()
      })
    ).toThrow(/missing required context/i);
  });

  it("ranks clean availability candidates ahead of warning candidates and never schedules them", () => {
    const staffReservation: ResourceAvailabilityReservation = {
      id: "reservation-staff",
      appointmentId: "appointment-existing",
      resourceId: ownerStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 9),
      endsAt: localInstant("2026-07-06", 10),
      capacityUnits: 1
    };
    const result = rankWaitlistCandidates({
      request: createRequest(),
      maximumCandidates: 3,
      searchInput: searchInput({
        earliestStartMinuteOfDay: 9 * 60,
        latestStartMinuteOfDay: 10 * 60,
        staff: [
          {
            role: "OWNER",
            staff: owner,
            locationAccess: ownerAccess,
            staffResource: ownerStaffResource,
            operatingWindows: [mondayWindow],
            unavailability: [],
            reservations: [staffReservation]
          }
        ]
      })
    });

    expect(result).toMatchObject({
      status: "CANDIDATES_FOUND",
      noSilentScheduling: true
    });
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0]).toMatchObject({
      requestId: "waitlist-1",
      candidateRank: 1,
      slot: {
        status: "AVAILABLE"
      },
      explanation: ["Candidate has no hard blocks or unresolved warnings."]
    });
    expect(result.candidates.some((candidate) => candidate.slot.status === "WARNING")).toBe(
      true
    );
  });

  it("prepares a promotion plan that still requires an explicit appointment command", () => {
    const request = createRequest();
    const ranked = rankWaitlistCandidates({
      request,
      maximumCandidates: 1,
      searchInput: searchInput()
    });
    const plan = prepareWaitlistPromotion({
      request,
      candidate: ranked.candidates[0],
      mode: "CREATE_DRAFT_FOR_REVIEW",
      permission: {
        canViewSchedule: true,
        canCreateDraft: true,
        canRequestManagerReview: true
      },
      reasonCode: "CUSTOMER_ACCEPTED_SLOT",
      reasonNotes: "Customer accepted the proposed slot; create draft for final review."
    });

    expect(plan).toMatchObject({
      requestId: "waitlist-1",
      mode: "CREATE_DRAFT_FOR_REVIEW",
      status: "PROMOTION_READY",
      reasonCode: "CUSTOMER_ACCEPTED_SLOT",
      createsScheduledAppointment: false,
      requiresExplicitCommit: true,
      nextCommandType: "CREATE_DRAFT"
    });
  });

  it("enforces promotion authority and candidate ownership", () => {
    const request = createRequest();
    const ranked = rankWaitlistCandidates({
      request,
      maximumCandidates: 1,
      searchInput: searchInput()
    });

    expect(() =>
      prepareWaitlistPromotion({
        request,
        candidate: {
          ...ranked.candidates[0],
          requestId: "other-request"
        },
        mode: "CREATE_DRAFT_FOR_REVIEW",
        permission: {
          canViewSchedule: true,
          canCreateDraft: true,
          canRequestManagerReview: true
        },
        reasonCode: "CUSTOMER_ACCEPTED_SLOT",
        reasonNotes: "Customer accepted the slot."
      })
    ).toThrow(/does not belong/i);

    expect(() =>
      prepareWaitlistPromotion({
        request,
        candidate: ranked.candidates[0],
        mode: "CREATE_DRAFT_FOR_REVIEW",
        permission: {
          canViewSchedule: true,
          canCreateDraft: false,
          canRequestManagerReview: true
        },
        reasonCode: "CUSTOMER_ACCEPTED_SLOT",
        reasonNotes: "Customer accepted the slot."
      })
    ).toThrow(/cannot create appointment drafts/i);
  });
});

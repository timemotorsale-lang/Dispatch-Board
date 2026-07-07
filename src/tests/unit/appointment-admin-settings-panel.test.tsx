import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentAdminSettingsPanel } from "@/features/settings/appointment-admin-settings-panel";
import type { AppointmentAdminSettings } from "@/server/services/appointment-admin-settings";

function settingsFixture(): AppointmentAdminSettings {
  return {
    organization: {
      id: "org-time-motor-sales",
      code: "TIME",
      name: "Time Motor Sales"
    },
    location: {
      id: "loc-time-motor-sales-minneapolis",
      organizationId: "org-time-motor-sales",
      code: "TMS-MSP-01",
      name: "Time Motor Sales — Minneapolis",
      timezone: "America/Chicago",
      addressLine1: "1101 E. Lake Street",
      addressLine2: "",
      city: "Minneapolis",
      region: "MN",
      postalCode: "55407",
      phoneNumber: "612 724 3631",
      countryCode: "US",
      schedulingStatus: "ACTIVE",
      displayAddress: "1101 E. Lake Street, Minneapolis MN 55407",
      displayPhone: "(612) 724-3631",
      businessHoursLabel: "9:00 AM - 6:00 PM"
    },
    operatingWindows: [
      {
        businessDay: "MONDAY",
        isOpen: true,
        opensAt: "09:00",
        closesAt: "18:00"
      }
    ],
    closures: [],
    resourceTypes: [
      {
        id: "rt-staff",
        code: "STAFF",
        name: "Staff member",
        kind: "STAFF",
        defaultCapacityMode: "EXCLUSIVE",
        defaultCapacity: 1,
        defaultConflictPolicy: "HARD_BLOCK",
        isActive: true
      }
    ],
    resources: [
      {
        id: "res-abdi",
        code: "STAFF-ABDI",
        name: "Abdi Farah",
        status: "ACTIVE",
        capacityMode: "EXCLUSIVE",
        capacity: 1,
        conflictPolicy: "HARD_BLOCK",
        userId: "user-abdi",
        vehicleId: null,
        resourceType: {
          code: "STAFF",
          name: "Staff member",
          kind: "STAFF"
        },
        operatingWindows: [
          {
            id: "resource-window-1",
            businessDay: "MONDAY",
            opensAt: "10:00",
            closesAt: "16:00",
            opensAtMinute: 600,
            closesAtMinute: 960,
            capacityOverride: 1,
            validFromIso: "2026-07-07",
            validToIso: null
          }
        ],
        unavailability: []
      }
    ],
    catalogs: {
      purposes: [],
      outcomeCodes: [],
      followUpDispositionCodes: [],
      reasonCodes: []
    },
    automationRules: [],
    specialHoursCalendar: {
      horizonStartIso: "2026-07-07",
      horizonEndIso: "2026-07-20",
      days: [
        {
          dateIso: "2026-07-07",
          businessDay: "TUESDAY",
          status: "OPEN",
          label: "Open",
          opensAt: "09:00",
          closesAt: "18:00",
          closureIds: [],
          closureNames: [],
          resourceImpactCount: 0,
          resourceImpactNames: [],
          warnings: []
        }
      ],
      summary: {
        openDayCount: 1,
        closedDayCount: 0,
        resourceImpactDayCount: 0,
        upcomingClosureCount: 0,
        upcomingResourceImpactCount: 0,
        nextClosureName: null,
        nextClosureStartsAtIso: null
      }
    },
    availabilityConfiguration: {
      recurringTemplates: [
        {
          code: "INDEPENDENCE_DAY",
          name: "Independence Day",
          category: "HOLIDAY",
          recurrenceLabel: "Every July 4",
          defaultClosureType: "HOLIDAY",
          suggestedDateIso: "2027-07-04",
          readiness: "READY",
          action: "CREATE_CLOSURE_DRAFT",
          notes: ["Confirm observed-date policy before activation."]
        }
      ],
      resourceAvailability: {
        horizonStartIso: "2026-07-07",
        horizonEndIso: "2026-07-20",
        resources: [],
        summary: {
          activeResourceCount: 0,
          constrainedResourceCount: 0,
          blockedResourceCount: 0,
          capacityResourceCount: 0
        }
      },
      capacityOverrideReadiness: {
        readyResourceCount: 1,
        needsConfigurationCount: 0,
        hardBlockExclusiveCount: 0,
        quickDrafts: [
          {
            resourceId: "res-bay-1",
            resourceName: "Service Bay 1",
            currentCapacity: 2,
            suggestedReduction: 1,
            startsAtIso: "2026-07-07T09:00:00.000Z",
            endsAtIso: "2026-07-07T18:00:00.000Z",
            reasonTemplate: "Manager capacity override draft for Service Bay 1."
          }
        ],
        recommendations: []
      },
      resourceCalendarRuntime: {
        reviewedDateIso: "2026-07-07",
        overlappingResourceCount: 1,
        noRuntimeWindowResourceCount: 0,
        precedenceRules: [
          "Runtime prefers the most recent effective window when multiple resource windows overlap.",
          "When start dates tie, narrower windows win over broader windows.",
          "Capacity overrides stay bounded by the resource's configured capacity."
        ],
        resources: [
          {
            resourceId: "res-abdi",
            resourceName: "Abdi Farah",
            resourceTypeName: "Staff member",
            runtimeStatus: "NEEDS_REVIEW",
            operatingWindowCount: 1,
            overlappingWindowCount: 1,
            overrideWindowCount: 1,
            nextEffectiveDateIso: "2026-07-07",
            nextEffectiveWindowLabel: "10:00 - 16:00",
            effectiveCapacity: 1,
            warnings: [
              "Overlapping operating windows exist. Runtime will prefer the most recent and most specific active window."
            ]
          }
        ]
      },
      resourceTypeEditorReadiness: {
        activeTypeCount: 1,
        inactiveTypeCount: 0,
        types: [
          {
            typeId: "rt-staff",
            code: "STAFF",
            name: "Staff member",
            kind: "STAFF",
            defaultCapacityMode: "EXCLUSIVE",
            defaultCapacity: 1,
            defaultConflictPolicy: "HARD_BLOCK",
            resourceCount: 0,
            readiness: "NEEDS_REVIEW",
            warnings: ["No resources currently use this type."]
          }
        ]
      }
    }
  };
}

describe("appointment admin settings panel", () => {
  it("renders configuration portability import/export foundation", () => {
    const markup = renderToStaticMarkup(
      <AppointmentAdminSettingsPanel initialSettings={settingsFixture()} />
    );

    expect(markup).toContain("Configuration portability");
    expect(markup).toContain("Special-hours calendar");
    expect(markup).toContain("Availability configuration");
    expect(markup).toContain("Enterprise readiness for hours, resources, and capacity");
    expect(markup).toContain("Recurring templates");
    expect(markup).toContain("Manager reason");
    expect(markup).toContain("Create closure");
    expect(markup).toContain("Capacity override drafts");
    expect(markup).toContain("Use capacity override draft");
    expect(markup).toContain("Resource calendar runtime");
    expect(markup).toContain("Runtime review date");
    expect(markup).toContain("Needs Review runtime");
    expect(markup).toContain("Resource operating calendar");
    expect(markup).toContain("Day-level hours and capacity overrides");
    expect(markup).toContain("Add resource operating window");
    expect(markup).toContain("Existing operating windows");
    expect(markup).toContain("Removal reason");
    expect(markup).toContain("Remove operating window");
    expect(markup).toContain("Resource type editor readiness");
    expect(markup).toContain("Create governed resource type");
    expect(markup).toContain("Create resource type");
    expect(markup).toContain("Default conflict policy");
    expect(markup).toContain("Save resource type");
    expect(markup).toContain("Closure and resource-impact preview");
    expect(markup).toContain("Export and import preview foundation");
    expect(markup).toContain("Generate export package");
    expect(markup).toContain("Preview import validation");
    expect(markup).toContain("Import apply");
  });
});

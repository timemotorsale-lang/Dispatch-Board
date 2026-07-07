import { describe, expect, it } from "vitest";

import {
  createAppointmentAdminConfigurationExportForManager,
  previewAppointmentAdminConfigurationImportForManager
} from "@/server/services/appointment-admin-import-export";
import type { AppointmentAdminSettings } from "@/server/services/appointment-admin-settings";
import type { AppointmentCatalogAutomationAdmin } from "@/server/services/appointment-catalog-automation-admin";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

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
    closures: [
      {
        id: "closure-1",
        type: "HOLIDAY",
        name: "Independence Day",
        startsAtIso: "2026-07-04T14:00:00.000Z",
        endsAtIso: "2026-07-04T23:00:00.000Z",
        reason: "Holiday closure.",
        createdByUserId: "user-manager",
        createdAtIso: "2026-07-01T18:00:00.000Z"
      }
    ],
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
        operatingWindows: [],
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
        resources: [
          {
            resourceId: "res-abdi",
            resourceName: "Abdi Farah",
            resourceTypeName: "Staff member",
            resourceTypeKind: "STAFF",
            status: "ACTIVE",
            capacityMode: "EXCLUSIVE",
            capacity: 1,
            conflictPolicy: "HARD_BLOCK",
            unavailableWindowCount: 0,
            impactedDayCount: 0,
            impactedDates: [],
            nextImpactIso: null,
            readiness: "READY",
            warnings: [
              "Exclusive resource; overlapping appointments should stay blocked unless policy changes."
            ]
          }
        ],
        summary: {
          activeResourceCount: 1,
          constrainedResourceCount: 0,
          blockedResourceCount: 0,
          capacityResourceCount: 0
        }
      },
      capacityOverrideReadiness: {
        readyResourceCount: 0,
        needsConfigurationCount: 1,
        hardBlockExclusiveCount: 1,
        quickDrafts: [],
        recommendations: [
          "Review exclusive resources before enabling capacity overrides.",
          "Keep hard-block conflict warnings visible when managers change appointment volume."
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
            resourceCount: 1,
            readiness: "READY",
            warnings: []
          }
        ]
      }
    }
  };
}

function catalogFixture(): AppointmentCatalogAutomationAdmin {
  return {
    purposes: [
      {
        code: "APT-TEST-DRIVE",
        name: "Test Drive",
        description: "Customer test drive.",
        category: "SALES",
        version: 1,
        isActive: true,
        defaultDurationMinutes: 45,
        minimumDurationMinutes: 30,
        maximumDurationMinutes: 90,
        preparationBufferMinutes: 10,
        cleanupBufferMinutes: 10,
        startIntervalMinutes: 15,
        minimumNoticeMinutes: 30,
        bookingHorizonDays: 180,
        approvalMode: "OWNER_CAN_SCHEDULE",
        eligibleOwnerRoleNames: ["Sales"],
        requiredParticipantTypes: ["CUSTOMER"],
        requiredResourceTypeCodes: ["STAFF"],
        requiredContextFields: ["customerName"],
        hardConflictCodes: ["STAFF_DOUBLE_BOOKED"],
        warningCodes: [],
        outcomeCodes: ["COMPLETED"],
        followUpDispositionCodes: ["NO_FOLLOW_UP_REQUIRED"],
        taskBlueprints: [],
        automationTriggers: ["ANY_TASK_REQUIRES_MEETING"],
        missingInputBehavior: "CREATE_DRAFT",
        dataSensitivity: "STANDARD",
        reportingDimensions: ["SALES"],
        approvedByRoleName: "General Manager"
      }
    ],
    catalogs: {
      outcomeCodes: ["COMPLETED"],
      followUpDispositionCodes: ["NO_FOLLOW_UP_REQUIRED"],
      reasonCodes: ["CUSTOMER_REQUEST"],
      codeDetails: {}
    },
    automationRules: [
      {
        code: "ANY_TASK_REQUIRES_MEETING",
        name: "Any task requires meeting",
        purposeCode: "APT-TEST-DRIVE",
        trigger: "ANY_TASK_REQUIRES_MEETING",
        enabled: true,
        missingInputBehavior: "CREATE_DRAFT",
        generatedTaskBlueprints: []
      }
    ],
    governance: {
      purposeCount: 1,
      activePurposeCount: 1,
      automationRuleCount: 1,
      enabledAutomationRuleCount: 1,
      categoryCount: 1,
      outcomeCodeCount: 1,
      followUpDispositionCodeCount: 1,
      reasonCodeCount: 1
    },
    versioning: {
      organizationId: "org-time-motor-sales",
      displayedSource: "BASELINE",
      activeVersion: null,
      draftVersion: null,
      displayedVersion: {
        id: null,
        organizationId: "org-time-motor-sales",
        version: 1,
        status: "BASELINE",
        title: "Baseline",
        description: null,
        reason: "Initial baseline.",
        createdByUserId: null,
        activatedByUserId: null,
        activatedAt: null,
        retiredAt: null,
        createdAt: null,
        updatedAt: null
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      approval: {
        status: "NOT_REQUIRED",
        requiredApproverRoleName: "General Manager",
        reason: null,
        reviewedByUserId: null,
        reviewedAt: null,
        activationBlocked: true
      },
      recentChanges: []
    },
    purposeUsage: [],
    usageAnalytics: {
      generatedAt: "2026-07-07T04:00:00.000Z",
      hasLiveAppointmentCounts: false,
      appointmentTotalCount: 0,
      activeAppointmentTotalCount: 0,
      completedAppointmentTotalCount: 0,
      codeUsage: [],
      highestRiskCodes: [],
      impactReports: [],
      highestImpactReports: []
    },
    editor: {
      canEdit: true,
      reasonMinimumCharacters: 8,
      activationRequiresValidDraft: true,
      activationRequiresApproval: true,
      editableApprovalModes: ["OWNER_CAN_SCHEDULE"]
    }
  };
}

describe("appointment admin import/export service", () => {
  it("creates a redacted manager-only export package", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;

    const exportPackage = await createAppointmentAdminConfigurationExportForManager(manager, {
      getSettings: async () => settingsFixture(),
      getCatalog: async () => catalogFixture()
    });

    expect(exportPackage.schemaVersion).toBe("appointment-admin-configuration/v1");
    expect(exportPackage.manifest).toMatchObject({
      purposeCount: 1,
      operatingWindowCount: 1,
      closureCount: 1,
      resourceCount: 1,
      automationRuleCount: 1
    });
    expect(exportPackage.redaction.redactedFieldCount).toBeGreaterThan(0);
    expect(exportPackage.contents.settings.closures[0].createdByUserId).toBe(
      "REDACTED_FOR_PORTABLE_EXPORT"
    );
    expect(exportPackage.contents.settings.resources[0].userId).toBe(
      "REDACTED_FOR_PORTABLE_EXPORT"
    );
  });

  it("previews imported packages without enabling apply", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const exportPackage = await createAppointmentAdminConfigurationExportForManager(manager, {
      getSettings: async () => settingsFixture(),
      getCatalog: async () => catalogFixture()
    });

    const preview = await previewAppointmentAdminConfigurationImportForManager(manager, {
      packageSnapshot: exportPackage,
      reason: "Review portable export before future import."
    });

    expect(preview.canApply).toBe(false);
    expect(preview.applySupported).toBe(false);
    expect(preview.validation.isValidPackage).toBe(true);
    expect(preview.summary).toMatchObject({
      organizationName: "Time Motor Sales",
      purposeCount: 1,
      resourceCount: 1
    });
    expect(preview.validation.blockedReasons).toEqual(
      expect.arrayContaining([expect.stringContaining("intentionally blocked")])
    );
  });

  it("rejects staff users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staff = usersByEmail.get("jordan.sales@local.test") ?? null;

    await expect(
      previewAppointmentAdminConfigurationImportForManager(staff, {
        packageSnapshot: {},
        reason: "Staff should not preview imports."
      })
    ).rejects.toThrow(/Manager access required/);
  });
});

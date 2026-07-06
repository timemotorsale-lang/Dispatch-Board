import { describe, expect, it } from "vitest";

import {
  activateAppointmentCatalogDraftForManager,
  getAppointmentCatalogAutomationAdminForManager,
  saveAppointmentCatalogDraftForManager,
  simulateAppointmentCatalogAutomation,
  simulateAppointmentCatalogAutomationForManager
} from "@/server/services/appointment-catalog-automation-admin";
import { createMemoryAppointmentCatalogRepository } from "@/tests/support/appointment-catalog-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment catalog automation admin service", () => {
  it("builds a manager-visible catalog and automation admin model", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    const catalog = await getAppointmentCatalogAutomationAdminForManager(manager, repository);

    expect(catalog.governance).toMatchObject({
      purposeCount: 12,
      activePurposeCount: 12
    });
    expect(catalog.versioning.displayedSource).toBe("BASELINE");
    expect(catalog.purposes.map((purpose) => purpose.code)).toContain("APT-TEST-DRIVE");
    expect(catalog.catalogs.followUpDispositionCodes).toEqual(
      expect.arrayContaining(["FOLLOW_UP_APPOINTMENT_REQUIRED", "NO_FOLLOW_UP_REQUIRED"])
    );
    expect(catalog.catalogs.reasonCodes).toEqual(
      expect.arrayContaining(["LOCATION_CLOSED", "AUTOMATION_SIMULATED"])
    );
    expect(catalog.automationRules.some((rule) => rule.trigger === "ANY_TASK_REQUIRES_MEETING")).toBe(true);
  });

  it("rejects non-manager access to catalog automation admin", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await expect(getAppointmentCatalogAutomationAdminForManager(staffUser, repository)).rejects.toThrow(
      /Manager access required/
    );
  });

  it("simulates follow-up appointment and generated task actions", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    const simulation = await simulateAppointmentCatalogAutomationForManager(
      manager,
      {
        purposeCode: "APT-TEST-DRIVE",
        outcomeCode: "TEST_DRIVE_COMPLETED_FOLLOW_UP_REQUIRED",
        followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED"
      },
      repository
    );

    expect(simulation.validation.warnings).toEqual([]);
    expect(simulation.actions.generatedAppointmentAction).toMatchObject({
      title: "Test Drive follow-up appointment",
      status: "DRAFT_READY"
    });
    expect(simulation.actions.generatedTaskActions.length).toBeGreaterThanOrEqual(1);
    expect(simulation.actions.auditReasonCode).toBe("AUTOMATION_SIMULATED");
  });

  it("saves manager edits as a draft catalog version with a required reason", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    const catalog = await saveAppointmentCatalogDraftForManager(
      manager,
      {
        purposeCode: "APT-TEST-DRIVE",
        reason: "Adjust test drive duration after manager review.",
        changes: {
          defaultDurationMinutes: 60,
          outcomeCodes: ["TEST_DRIVE_COMPLETED_FOLLOW_UP_REQUIRED", "COMPLETED"],
          followUpDispositionCodes: ["NO_FOLLOW_UP_REQUIRED", "FOLLOW_UP_APPOINTMENT_REQUIRED"],
          reasonCodes: ["AUTOMATION_SIMULATED", "CATALOG_MANAGER_EDIT"]
        }
      },
      repository
    );

    expect(catalog.versioning.displayedSource).toBe("DRAFT");
    expect(catalog.versioning.draftVersion).toMatchObject({
      version: 1,
      status: "DRAFT"
    });
    expect(
      catalog.purposes.find((purpose) => purpose.code === "APT-TEST-DRIVE")
        ?.defaultDurationMinutes
    ).toBe(60);
    expect(catalog.versioning.recentChanges[0]).toMatchObject({
      action: "DRAFT_CREATED",
      reason: "Adjust test drive duration after manager review."
    });
  });

  it("activates a valid draft and clears the draft workspace", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await saveAppointmentCatalogDraftForManager(
      manager,
      {
        purposeCode: "APT-SERVICE-INTAKE",
        reason: "Prepare service catalog draft for activation.",
        changes: {
          defaultDurationMinutes: 45
        }
      },
      repository
    );

    const catalog = await activateAppointmentCatalogDraftForManager(
      manager,
      {
        reason: "Activate approved service catalog update."
      },
      repository
    );

    expect(catalog.versioning.displayedSource).toBe("ACTIVE");
    expect(catalog.versioning.activeVersion).toMatchObject({
      version: 1,
      status: "ACTIVE"
    });
    expect(catalog.versioning.draftVersion).toBeNull();
    expect(catalog.versioning.recentChanges[0]).toMatchObject({
      action: "ACTIVATED"
    });
  });

  it("rejects invalid draft duration changes before persistence", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await expect(
      saveAppointmentCatalogDraftForManager(
        manager,
        {
          purposeCode: "APT-TEST-DRIVE",
          reason: "Invalid duration test change.",
          changes: {
            minimumDurationMinutes: 90,
            defaultDurationMinutes: 30
          }
        },
        repository
      )
    ).rejects.toThrow(/minimum duration cannot exceed default duration/);
  });

  it("shows missing-input behavior in simulations", () => {
    const simulation = simulateAppointmentCatalogAutomation({
      purposeCode: "APT-VEHICLE-DELIVERY",
      outcomeCode: "DELIVERED_ACCEPTED",
      followUpDispositionCode: "MANAGER_REVIEW_REQUIRED",
      missingRequiredFields: ["documentationStatus", "customer"]
    });

    expect(simulation.missingInputBehavior).toMatchObject({
      behavior: "CREATE_REVIEW_ITEM",
      hasMissingInput: true,
      createsReviewItem: true,
      blocked: false
    });
    expect(simulation.actions.managerReviewRequired).toBe(true);
  });

  it("returns warnings when simulated codes are outside the selected purpose catalog", () => {
    const simulation = simulateAppointmentCatalogAutomation({
      purposeCode: "APT-SERVICE-INTAKE",
      outcomeCode: "MADE_UP_OUTCOME",
      followUpDispositionCode: "MADE_UP_FOLLOW_UP"
    });

    expect(simulation.validation.validOutcome).toBe(false);
    expect(simulation.validation.validFollowUpDisposition).toBe(false);
    expect(simulation.validation.warnings).toHaveLength(2);
  });
});

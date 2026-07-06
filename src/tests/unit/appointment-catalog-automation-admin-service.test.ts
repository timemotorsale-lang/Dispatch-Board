import { describe, expect, it } from "vitest";

import {
  getAppointmentCatalogAutomationAdminForManager,
  simulateAppointmentCatalogAutomation,
  simulateAppointmentCatalogAutomationForManager
} from "@/server/services/appointment-catalog-automation-admin";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment catalog automation admin service", () => {
  it("builds a manager-visible catalog and automation admin model", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;

    const catalog = await getAppointmentCatalogAutomationAdminForManager(manager);

    expect(catalog.governance).toMatchObject({
      purposeCount: 12,
      activePurposeCount: 12
    });
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

    await expect(getAppointmentCatalogAutomationAdminForManager(staffUser)).rejects.toThrow(
      /Manager access required/
    );
  });

  it("simulates follow-up appointment and generated task actions", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;

    const simulation = await simulateAppointmentCatalogAutomationForManager(manager, {
      purposeCode: "APT-TEST-DRIVE",
      outcomeCode: "TEST_DRIVE_COMPLETED_FOLLOW_UP_REQUIRED",
      followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED"
    });

    expect(simulation.validation.warnings).toEqual([]);
    expect(simulation.actions.generatedAppointmentAction).toMatchObject({
      title: "Test Drive follow-up appointment",
      status: "DRAFT_READY"
    });
    expect(simulation.actions.generatedTaskActions.length).toBeGreaterThanOrEqual(1);
    expect(simulation.actions.auditReasonCode).toBe("AUTOMATION_SIMULATED");
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

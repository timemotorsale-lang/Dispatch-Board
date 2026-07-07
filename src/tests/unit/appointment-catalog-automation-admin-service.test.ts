import { describe, expect, it } from "vitest";

import {
  activateAppointmentCatalogDraftForManager,
  getAppointmentCatalogAutomationAdminForManager,
  reviewAppointmentCatalogDraftForManager,
  saveAppointmentCatalogDraftForManager,
  simulateAppointmentCatalogAutomation,
  simulateAppointmentCatalogAutomationForManager,
  updateAppointmentCatalogCodeForManager,
  updateAppointmentCatalogPurposeLifecycleForManager
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
    expect(catalog.versioning.approval).toMatchObject({
      status: "NOT_REQUIRED",
      activationBlocked: true
    });
    expect(catalog.purposes.map((purpose) => purpose.code)).toContain("APT-TEST-DRIVE");
    expect(catalog.purposeUsage.find((usage) => usage.purposeCode === "APT-TEST-DRIVE")).toMatchObject({
      deleteRisk: "PUBLISHED_REFERENCES",
      recommendation: "DEPRECATE_INSTEAD"
    });
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

    await expect(
      activateAppointmentCatalogDraftForManager(
        manager,
        {
          reason: "Attempt activation before approval."
        },
        repository
      )
    ).rejects.toThrow(/must be approved/);

    await reviewAppointmentCatalogDraftForManager(
      manager,
      {
        action: "APPROVE",
        reason: "Approve service catalog update for activation."
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
    expect(catalog.versioning.approval).toMatchObject({
      status: "APPROVED",
      activationBlocked: false
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

  it("records draft approval decisions with required reasons", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await saveAppointmentCatalogDraftForManager(
      manager,
      {
        purposeCode: "APT-SERVICE-INTAKE",
        reason: "Prepare draft for review decision testing.",
        changes: {
          defaultDurationMinutes: 45
        }
      },
      repository
    );

    let catalog = await reviewAppointmentCatalogDraftForManager(
      manager,
      {
        action: "REQUEST_CHANGES",
        reason: "Need better documented duration rationale before activation."
      },
      repository
    );

    expect(catalog.versioning.approval).toMatchObject({
      status: "CHANGES_REQUESTED",
      activationBlocked: true,
      reviewedByUserId: manager?.id
    });

    catalog = await reviewAppointmentCatalogDraftForManager(
      manager,
      {
        action: "APPROVE",
        reason: "Approved after manager review of duration rationale."
      },
      repository
    );

    expect(catalog.versioning.approval).toMatchObject({
      status: "APPROVED",
      activationBlocked: false
    });
  });

  it("adds and renames structured outcome codes with labels", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    let catalog = await updateAppointmentCatalogCodeForManager(
      manager,
      {
        catalog: "OUTCOME",
        action: "ADD",
        purposeCode: "APT-TEST-DRIVE",
        code: "CUSTOMER_APPROVED",
        label: "Customer approved",
        description: "Customer approved the test drive next step.",
        reason: "Add customer-approved outcome for test drive governance."
      },
      repository
    );

    expect(
      catalog.purposes.find((purpose) => purpose.code === "APT-TEST-DRIVE")?.outcomeCodes
    ).toContain("CUSTOMER_APPROVED");
    expect(catalog.catalogs.codeDetails["OUTCOME:CUSTOMER_APPROVED"]).toMatchObject({
      label: "Customer approved",
      description: "Customer approved the test drive next step."
    });
    expect(catalog.versioning.approval.status).toBe("PENDING_REVIEW");

    catalog = await updateAppointmentCatalogCodeForManager(
      manager,
      {
        catalog: "OUTCOME",
        action: "RENAME",
        purposeCode: "APT-TEST-DRIVE",
        code: "CUSTOMER_APPROVED",
        nextCode: "CUSTOMER_APPROVED_WITH_NOTES",
        label: "Customer approved with notes",
        reason: "Rename outcome to match manager reporting language."
      },
      repository
    );

    expect(
      catalog.purposes.find((purpose) => purpose.code === "APT-TEST-DRIVE")?.outcomeCodes
    ).toContain("CUSTOMER_APPROVED_WITH_NOTES");
    expect(catalog.catalogs.codeDetails["OUTCOME:CUSTOMER_APPROVED"]).toBeUndefined();
    expect(catalog.catalogs.codeDetails["OUTCOME:CUSTOMER_APPROVED_WITH_NOTES"]).toMatchObject({
      label: "Customer approved with notes"
    });
  });

  it("edits reason codes and protects system-required reasons", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    const catalog = await updateAppointmentCatalogCodeForManager(
      manager,
      {
        catalog: "REASON",
        action: "ADD",
        code: "MANAGER_POLICY_EXCEPTION",
        label: "Manager policy exception",
        reason: "Add policy exception reason for catalog governance."
      },
      repository
    );

    expect(catalog.catalogs.reasonCodes).toContain("MANAGER_POLICY_EXCEPTION");
    expect(catalog.catalogs.codeDetails["REASON:MANAGER_POLICY_EXCEPTION"]).toMatchObject({
      label: "Manager policy exception"
    });

    await expect(
      updateAppointmentCatalogCodeForManager(
        manager,
        {
          catalog: "REASON",
          action: "REMOVE",
          code: "AUTOMATION_SIMULATED",
          reason: "Attempt unsafe removal of system reason."
        },
        repository
      )
    ).rejects.toThrow(/System-required reason codes cannot be renamed or removed/);
  });

  it("prevents removing the final outcome or follow-up code from a purpose", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await saveAppointmentCatalogDraftForManager(
      manager,
      {
        purposeCode: "APT-TEST-DRIVE",
        reason: "Prepare single-outcome draft for removal validation.",
        changes: {
          outcomeCodes: ["ONLY_ONE_OUTCOME"]
        }
      },
      repository
    );

    await expect(
      updateAppointmentCatalogCodeForManager(
        manager,
        {
          catalog: "OUTCOME",
          action: "REMOVE",
          purposeCode: "APT-TEST-DRIVE",
          code: "ONLY_ONE_OUTCOME",
          reason: "Attempt removal of final outcome."
        },
        repository
      )
    ).rejects.toThrow(/at least one configured code/);
  });

  it("creates a manager-authored purpose as a draft catalog lifecycle change", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    const catalog = await updateAppointmentCatalogPurposeLifecycleForManager(
      manager,
      {
        action: "CREATE",
        purposeCode: "APT-CUSTOM-INSPECTION",
        name: "Custom Inspection",
        category: "SERVICE",
        reason: "Create custom inspection purpose for manager-approved appointment intake."
      },
      repository
    );

    expect(catalog.versioning.displayedSource).toBe("DRAFT");
    expect(catalog.purposes.find((purpose) => purpose.code === "APT-CUSTOM-INSPECTION")).toMatchObject({
      name: "Custom Inspection",
      category: "SERVICE",
      isActive: true
    });
    expect(catalog.versioning.recentChanges[0]).toMatchObject({
      action: "DRAFT_CREATED"
    });
  });

  it("duplicates an existing purpose and allows draft-only deletion", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    let catalog = await updateAppointmentCatalogPurposeLifecycleForManager(
      manager,
      {
        action: "DUPLICATE",
        sourcePurposeCode: "APT-TEST-DRIVE",
        purposeCode: "APT-VIP-TEST-DRIVE",
        name: "VIP Test Drive",
        reason: "Duplicate test drive purpose for VIP customer appointment handling."
      },
      repository
    );

    expect(catalog.purposes.find((purpose) => purpose.code === "APT-VIP-TEST-DRIVE")).toMatchObject({
      name: "VIP Test Drive",
      category: "SALES"
    });

    catalog = await updateAppointmentCatalogPurposeLifecycleForManager(
      manager,
      {
        action: "DELETE",
        purposeCode: "APT-VIP-TEST-DRIVE",
        reason: "Remove draft-only VIP purpose after manager review."
      },
      repository
    );

    expect(catalog.purposes.map((purpose) => purpose.code)).not.toContain("APT-VIP-TEST-DRIVE");
  });

  it("blocks hard deletion of published purposes and requires deprecation instead", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentCatalogRepository();

    await expect(
      updateAppointmentCatalogPurposeLifecycleForManager(
        manager,
        {
          action: "DELETE",
          purposeCode: "APT-TEST-DRIVE",
          reason: "Attempt unsafe hard delete of published purpose."
        },
        repository
      )
    ).rejects.toThrow(/Published appointment purposes cannot be deleted/);

    const catalog = await updateAppointmentCatalogPurposeLifecycleForManager(
      manager,
      {
        action: "DEPRECATE",
        purposeCode: "APT-TEST-DRIVE",
        reason: "Deprecate test drive purpose after manager replacement approval."
      },
      repository
    );

    expect(catalog.purposes.find((purpose) => purpose.code === "APT-TEST-DRIVE")?.isActive).toBe(
      false
    );
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

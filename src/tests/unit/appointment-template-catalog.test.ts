import { describe, expect, it } from "vitest";

import {
  createAppointmentPurposeSnapshot,
  getInitialAppointmentTemplateDefinition,
  INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import {
  normalizeAppointmentTemplateDefinition,
  validateAppointmentTemplateCatalog
} from "@/server/validation/appointment-template";

describe("appointment template catalog foundation", () => {
  it("keeps the approved EAPT-006 starting catalog explicit and active", () => {
    const catalog = validateAppointmentTemplateCatalog([
      ...INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS
    ]);

    expect(catalog.map((template) => template.code)).toEqual([
      "APT-SALES-CONSULT",
      "APT-TEST-DRIVE",
      "APT-VEHICLE-DELIVERY",
      "APT-SERVICE-INTAKE",
      "APT-CUSTOMER-ISSUE",
      "APT-DOCS-DMV",
      "APT-COLLECTIONS",
      "APT-INVENTORY-VENDOR",
      "APT-MARKETING-ASSET",
      "APT-INTERNAL-MEETING",
      "APT-TASK-MEETING",
      "APT-GENERAL"
    ]);
    expect(catalog).toHaveLength(12);
    expect(catalog.every((template) => template.isActive)).toBe(true);
  });

  it("includes governed defaults for any task-required meeting and general fallback", () => {
    const taskMeeting = getInitialAppointmentTemplateDefinition("apt-task-meeting");
    const general = getInitialAppointmentTemplateDefinition("APT-GENERAL");

    expect(taskMeeting).toMatchObject({
      approvalMode: "RULE_DEPENDENT",
      missingInputBehavior: "CREATE_DRAFT"
    });
    expect(taskMeeting?.automationTriggers).toContain("ANY_TASK_REQUIRES_MEETING");

    expect(general).toMatchObject({
      approvalMode: "MANAGER_REQUIRED",
      missingInputBehavior: "CREATE_REVIEW_ITEM"
    });
  });

  it("creates a historical purpose snapshot without mutable operational fields", () => {
    const testDrive = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

    expect(testDrive).toBeDefined();

    const snapshot = createAppointmentPurposeSnapshot(testDrive as AppointmentTemplateDefinition);

    expect(snapshot).toEqual({
      code: "APT-TEST-DRIVE",
      name: "Test Drive",
      category: "SALES",
      version: 1,
      defaultDurationMinutes: 45,
      preparationBufferMinutes: 15,
      cleanupBufferMinutes: 15,
      approvalMode: "OWNER_CAN_SCHEDULE",
      requiredContextFields: ["customer", "vehicle", "owner", "driverEligibility", "location"],
      outcomeCodes: expect.arrayContaining(["TEST_DRIVE_COMPLETED_PURCHASE_STARTED"]),
      followUpDispositionCodes: expect.arrayContaining(["NONE_REQUIRED"]),
      dataSensitivity: "STANDARD"
    });
    expect("automationTriggers" in snapshot).toBe(false);
    expect("taskBlueprints" in snapshot).toBe(false);
  });

  it("rejects duplicate catalog codes and unsafe template durations", () => {
    const testDrive = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

    expect(testDrive).toBeDefined();

    expect(() =>
      validateAppointmentTemplateCatalog([
        ...INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS,
        testDrive as AppointmentTemplateDefinition
      ])
    ).toThrow(/duplicate codes/i);

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(testDrive as AppointmentTemplateDefinition),
        minimumDurationMinutes: 60,
        defaultDurationMinutes: 45
      })
    ).toThrow(/minimum duration/i);

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(testDrive as AppointmentTemplateDefinition),
        taskBlueprints: []
      })
    ).toThrow(/linked-task blueprint/i);
  });

  it("requires meaningful outcomes, follow-up dispositions, conflict rules, and context", () => {
    const service = getInitialAppointmentTemplateDefinition("APT-SERVICE-INTAKE");

    expect(service).toBeDefined();

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(service as AppointmentTemplateDefinition),
        outcomeCodes: []
      })
    ).toThrow(/outcome codes/i);

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(service as AppointmentTemplateDefinition),
        followUpDispositionCodes: []
      })
    ).toThrow(/follow-up disposition codes/i);

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(service as AppointmentTemplateDefinition),
        hardConflictCodes: []
      })
    ).toThrow(/hard conflict codes/i);

    expect(() =>
      normalizeAppointmentTemplateDefinition({
        ...(service as AppointmentTemplateDefinition),
        requiredContextFields: []
      })
    ).toThrow(/required context fields/i);
  });
});

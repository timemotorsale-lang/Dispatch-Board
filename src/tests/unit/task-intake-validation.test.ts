import { describe, expect, it } from "vitest";

import { normalizeTaskCreateInput } from "@/server/validation/task-create";

const validIntake = {
  assignedUserId: "user-1",
  boardDate: "2026-07-13",
  description: "Call the customer and confirm the repair authorization.",
  dueAt: "2026-07-13T21:30:00.000Z",
  intakeMetadata: {
    channel: "Phone",
    contextOmitted: false,
    enterpriseControls: {
      escalationPath: "Manager if blocked",
      evidenceRequirement: "Final note",
      reviewCadence: "At completion",
      slaPolicy: "Standard same-day",
      visibility: "Owner and collaborators"
    },
    expectedOutcome: "The customer confirms whether the repair may proceed.",
    intakeType: "Vehicle / Service",
    requiredUpdates: ["Customer contacted", "Next step"],
    taskTools: {
      checklistItems: ["Validate context", "Document next step"],
      subtaskTemplates: ["Customer follow-up"],
      uploadedEvidence: ["Document: repair-authorization.pdf", "Photo: odometer.jpg"],
      uploadRequirements: ["Customer authorization"]
    }
  },
  priority: "HIGH",
  title: "Confirm repair authorization",
  vehicleReference: "2014 Acura MDX",
  workflowArea: "SHOP"
};

describe("task intake validation", () => {
  it("normalizes a release-ready intake contract", () => {
    expect(normalizeTaskCreateInput(validIntake)).toMatchObject({
      assignedUserId: "user-1",
      priority: "HIGH",
      intakeMetadata: {
        intakeType: "Vehicle / Service",
        requiredUpdates: ["Customer contacted", "Next step"]
      }
    });
  });

  it("rejects non-quick intake without linked operating context", () => {
    expect(() => normalizeTaskCreateInput({ ...validIntake, vehicleReference: " " })).toThrow(
      "Task intake requires customer or vehicle context"
    );
  });

  it("accepts non-quick intake when context is intentionally omitted", () => {
    expect(normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: { ...validIntake.intakeMetadata, contextOmitted: true },
      vehicleReference: " "
    })).toMatchObject({
      intakeMetadata: expect.objectContaining({ contextOmitted: true })
    });
  });

  it("normalizes enterprise controls attached to intake metadata", () => {
    expect(normalizeTaskCreateInput(validIntake)).toMatchObject({
      intakeMetadata: {
        enterpriseControls: {
          escalationPath: "Manager if blocked",
          evidenceRequirement: "Final note",
          reviewCadence: "At completion",
          slaPolicy: "Standard same-day",
          visibility: "Owner and collaborators"
        }
      }
    });
  });

  it("normalizes enterprise task tools attached to intake metadata", () => {
    expect(normalizeTaskCreateInput(validIntake)).toMatchObject({
      intakeMetadata: {
        taskTools: {
          checklistItems: ["Validate context", "Document next step"],
          subtaskTemplates: ["Customer follow-up"],
          uploadedEvidence: ["Document: repair-authorization.pdf", "Photo: odometer.jpg"],
          uploadRequirements: ["Customer authorization"]
        }
      }
    });
  });

  it("accepts staff-authored checklist items and subtasks", () => {
    expect(normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: {
        ...validIntake.intakeMetadata,
        taskTools: {
          checklistItems: ["Confirm title status", "Document next step"],
          subtaskTemplates: ["Call vendor for ETA"],
          uploadedEvidence: ["Photo: title-photo.jpg"],
          uploadRequirements: []
        }
      }
    })).toMatchObject({
      intakeMetadata: {
        taskTools: {
          checklistItems: ["Confirm title status", "Document next step"],
          subtaskTemplates: ["Call vendor for ETA"],
          uploadedEvidence: ["Photo: title-photo.jpg"]
        }
      }
    });
  });

  it("rejects duplicate staff-authored task tool items", () => {
    expect(() => normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: {
        ...validIntake.intakeMetadata,
        taskTools: {
          checklistItems: ["Confirm title status", "Confirm title status"],
          subtaskTemplates: [],
          uploadRequirements: []
        }
      }
    })).toThrow("Task intake checklistItems cannot contain duplicates.");
  });

  it("rejects an intake with an incomplete expected outcome", () => {
    expect(() => normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: { ...validIntake.intakeMetadata, expectedOutcome: "Call customer" }
    })).toThrow("Task intake requires an expected outcome");
  });
  it("records an explicit no-context choice for an internal manager planning task", () => {
    expect(normalizeTaskCreateInput({
      ...validIntake,
      title: "November 2026 action plans",
      description: "Review and assign the main operating goals for November.",
      vehicleReference: "",
      workflowArea: "GENERAL_MANAGER",
      requiresManagerApproval: true,
      intakeMetadata: { ...validIntake.intakeMetadata, intakeType: "Manager Decision", contextOmitted: true }
    })).toMatchObject({ requiresManagerApproval: true, intakeMetadata: { intakeType: "Manager Decision", contextOmitted: true } });
  });

  it.each(["INVENTORY", "OPERATIONS"])("accepts %s scope as real context without a single vehicle", scope => {
    const result = normalizeTaskCreateInput({ ...validIntake, vehicleReference: "", intakeMetadata: { ...validIntake.intakeMetadata, contextScope: scope, contextDetails: "All active inventory and related November operating work.", contextAreas: ["INVENTORY", "SERVICE"] } });
    expect(result.intakeMetadata).toMatchObject({ contextOmitted: false, contextScope: scope, contextAreas: ["INVENTORY", "SERVICE"] });
    expect(result.vehicleReference).toBeUndefined();
  });
  it("uses the plan description when broad scope details are not repeated", () => {
    const result = normalizeTaskCreateInput({ ...validIntake, vehicleReference: "", intakeMetadata: { ...validIntake.intakeMetadata, contextScope: "OPERATIONS" } });
    expect(result.intakeMetadata?.contextDetails).toBe(validIntake.description);
  });
  it("rejects conflicting and unknown scope declarations", () => {
    for (const extra of [{ contextScope: "UNKNOWN" }, { contextScope: "OPERATIONS", contextOmitted: true }, { contextScope: "OPERATIONS", contextAreas: ["UNKNOWN"] }]) {
      expect(() => normalizeTaskCreateInput({ ...validIntake, intakeMetadata: { ...validIntake.intakeMetadata, ...extra } })).toThrow();
    }
  });
  it("still requires a link when a specific-record scope is selected", () => {
    expect(() => normalizeTaskCreateInput({ ...validIntake, vehicleReference: "", intakeMetadata: { ...validIntake.intakeMetadata, contextScope: "SPECIFIC" } })).toThrow(/requires customer or vehicle context/);
  });

});

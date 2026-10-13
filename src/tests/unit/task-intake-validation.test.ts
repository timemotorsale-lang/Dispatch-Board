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
});

import { describe, expect, it } from "vitest";

import { normalizeTaskCreateInput } from "@/server/validation/task-create";

const validIntake = {
  assignedUserId: "user-1",
  boardDate: "2026-07-13",
  description: "Call the customer and confirm the repair authorization.",
  dueAt: "2026-07-13T21:30:00.000Z",
  intakeMetadata: {
    channel: "Phone",
    expectedOutcome: "The customer confirms whether the repair may proceed.",
    intakeType: "Vehicle / Service",
    requiredUpdates: ["Customer contacted", "Next step"]
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

  it("allows management carryovers without vehicle or customer context", () => {
    expect(normalizeTaskCreateInput({
      ...validIntake,
      customerReference: undefined,
      description: "Converted from COO Workbook carryover. Daily focus item needs tomorrow ownership.",
      intakeMetadata: {
        channel: "COO Workbook",
        expectedOutcome: "The carryover has a clear owner, timing, and completion result.",
        intakeType: "Carryover Task",
        requiredUpdates: ["Record the outcome or blocker before the next close."]
      },
      title: "Carryover: Review conciliation cases",
      vehicleReference: undefined,
      workflowArea: "GENERAL_MANAGER"
    })).toMatchObject({
      intakeMetadata: { intakeType: "Carryover Task" },
      workflowArea: "GENERAL_MANAGER"
    });
  });

  it("rejects an intake with an incomplete expected outcome", () => {
    expect(() => normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: { ...validIntake.intakeMetadata, expectedOutcome: "Call customer" }
    })).toThrow("Task intake requires an expected outcome");
  });
});

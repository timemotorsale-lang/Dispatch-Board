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

  it("rejects an intake with an incomplete expected outcome", () => {
    expect(() => normalizeTaskCreateInput({
      ...validIntake,
      intakeMetadata: { ...validIntake.intakeMetadata, expectedOutcome: "Call customer" }
    })).toThrow("Task intake requires an expected outcome");
  });
});

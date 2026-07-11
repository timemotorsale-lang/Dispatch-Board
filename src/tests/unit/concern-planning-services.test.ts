import { describe, expect, it } from "vitest";

import { buildConcernResolutionPlan } from "@/server/services/concern-decomposition-service";
import { normalizeConcernIntake } from "@/server/validation/concern-intake";

describe("concern resolution planning", () => {
  it("classifies a 60-day title delay as high-risk and creates seven explainable steps", () => {
    const intake = normalizeConcernIntake({ title: "Customer has not received title", description: "The DMV title was promised in two weeks and is now over two months late.", customerReference: "Maria Santos", vehicleReference: "2018 Toyota Camry", daysOverdue: 65, repeatContactCount: 3, missingDocumentation: true, source: "MANAGER" });
    const plan = buildConcernResolutionPlan(intake);
    expect(plan.templateCode).toBe("TITLE_DELAY_V1");
    expect(plan.classification.primaryCategory).toBe("DOCUMENTATION_TITLE");
    expect(["HIGH", "CRITICAL"]).toContain(plan.severity.priority);
    expect(plan.severity.escalationRequired).toBe(true);
    expect(plan.tasks).toHaveLength(7);
    expect(plan.tasks.every((task) => task.checklist.length > 0 && task.requiredUpdateFields.length > 0)).toBe(true);
    expect(plan.tasks.find((task) => task.stepCode === "FINAL_CLOSURE")?.dependsOnStepCodes).toContain("MANAGER_REVIEW");
  });

  it("falls back to a manager triage plan when no deterministic rule matches", () => {
    const intake = normalizeConcernIntake({ title: "Unclear operational concern", description: "Something unusual needs review." });
    const plan = buildConcernResolutionPlan(intake);
    expect(plan.templateCode).toBe("MANAGER_REVIEW_V1");
    expect(plan.classification.reasonCode).toBe("NO_DETERMINISTIC_MATCH");
    expect(plan.tasks).toHaveLength(1);
  });

  it("rejects unsupported and malformed intake fields", () => {
    expect(() => normalizeConcernIntake({ title: "", description: "Description" })).toThrow("title is required");
    expect(() => normalizeConcernIntake({ title: "Concern", description: "Description", reportedByUserId: "forged" })).toThrow("unsupported field");
  });
});

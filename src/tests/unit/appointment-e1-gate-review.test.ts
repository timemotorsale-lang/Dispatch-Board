import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_E1_GATE_REVIEW,
  validateAppointmentE1GateReview
} from "@/server/appointments/e1-gate-review";

describe("appointment E1 foundation gate review", () => {
  it("keeps the E1 gate ready for approval without falsely marking approval complete", () => {
    expect(validateAppointmentE1GateReview()).toBe(APPOINTMENT_E1_GATE_REVIEW);
    expect(APPOINTMENT_E1_GATE_REVIEW).toMatchObject({
      status: "READY_FOR_APPROVAL",
      reviewedThrough: "EAPT-012",
      recommendation: "PROCEED_TO_E2_AFTER_GATE_APPROVAL"
    });
  });

  it("evaluates every E1 roadmap gate criterion", () => {
    expect(APPOINTMENT_E1_GATE_REVIEW.gateCriteria.map((criterion) => criterion.criterion)).toEqual([
      "Product model approved",
      "Architecture approved",
      "Permission and privacy boundaries approved",
      "Production-volume assumptions recorded",
      "Migration and rollback strategy approved",
      "Contract-level test plan approved",
      "No unresolved high-risk domain ambiguity"
    ]);
    expect(APPOINTMENT_E1_GATE_REVIEW.gateCriteria.some((criterion) => criterion.result === "FAIL")).toBe(
      false
    );
  });

  it("documents carry-forward risks without blocking E2 foundation work", () => {
    expect(APPOINTMENT_E1_GATE_REVIEW.carryForwardRisks).toEqual([
      expect.objectContaining({
        targetMilestone: "E5",
        risk: expect.stringContaining("template administration")
      }),
      expect.objectContaining({
        targetMilestone: "E2",
        risk: expect.stringContaining("Scheduling")
      }),
      expect.objectContaining({
        targetMilestone: "E3/E4",
        risk: expect.stringContaining("read models")
      }),
      expect.objectContaining({
        targetMilestone: "E9",
        risk: expect.stringContaining("RTO")
      })
    ]);
  });

  it("hands off to E2 EAPT-013 as the next implementation work", () => {
    expect(APPOINTMENT_E1_GATE_REVIEW.nextMilestone).toEqual({
      id: "E2",
      name: "Scheduling, Availability, and Capacity Engine",
      firstWorkPackage: "EAPT-013",
      firstWorkPackageName: "Implement location time, operating-hours, closures, and timezone services"
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_E2_GATE_REVIEW,
  validateAppointmentE2GateReview
} from "@/server/appointments/e2-gate-review";

describe("appointment E2 scheduling foundation gate review", () => {
  it("keeps the E2 gate ready for review without falsely marking approval complete", () => {
    expect(validateAppointmentE2GateReview()).toBe(APPOINTMENT_E2_GATE_REVIEW);
    expect(APPOINTMENT_E2_GATE_REVIEW).toMatchObject({
      status: "READY_FOR_REVIEW",
      reviewedThrough: "EAPT-025",
      recommendation: "PROCEED_TO_E3_AFTER_GATE_APPROVAL"
    });
  });

  it("evaluates every E2 roadmap gate criterion", () => {
    expect(APPOINTMENT_E2_GATE_REVIEW.gateCriteria.map((criterion) => criterion.criterion)).toEqual([
      "Hard conflicts cannot be overridden",
      "Warning overrides are manager-only and reasoned",
      "Concurrent scheduling cannot overbook exclusive capacity",
      "Recurrence and DST behavior passes",
      "Bulk operations are previewable, retry-safe, and auditable",
      "Availability search and commit behavior reconcile",
      "Performance passes approved scheduling volume"
    ]);
    expect(APPOINTMENT_E2_GATE_REVIEW.gateCriteria.some((criterion) => criterion.result === "FAIL")).toBe(
      false
    );
  });

  it("covers the complete E2 implementation range", () => {
    expect(APPOINTMENT_E2_GATE_REVIEW.implementedWorkPackages).toEqual([
      "EAPT-013",
      "EAPT-014",
      "EAPT-015",
      "EAPT-016",
      "EAPT-017",
      "EAPT-018",
      "EAPT-019",
      "EAPT-020",
      "EAPT-021",
      "EAPT-022",
      "EAPT-023",
      "EAPT-024",
      "EAPT-025"
    ]);
  });

  it("documents carry-forward risks and non-claims before E3", () => {
    expect(APPOINTMENT_E2_GATE_REVIEW.carryForwardRisks).toEqual([
      expect.objectContaining({
        targetMilestone: "E3/E4",
        risk: expect.stringContaining("Prisma adapters")
      }),
      expect.objectContaining({
        targetMilestone: "E4",
        risk: expect.stringContaining("preview data")
      }),
      expect.objectContaining({
        targetMilestone: "E3",
        risk: expect.stringContaining("audit-shaped")
      }),
      expect.objectContaining({
        targetMilestone: "E9",
        risk: expect.stringContaining("Production load")
      })
    ]);
    expect(APPOINTMENT_E2_GATE_REVIEW.nonClaims).toContain(
      "Database-backed scheduling adapters are complete."
    );
    expect(APPOINTMENT_E2_GATE_REVIEW.nonClaims).toContain(
      "The visible Appointment Board is backed by live appointment read models."
    );
  });

  it("hands off to E3 EAPT-026 as the next implementation work", () => {
    expect(APPOINTMENT_E2_GATE_REVIEW.nextMilestone).toEqual({
      id: "E3",
      name: "Lifecycle, Task Orchestration, Audit, and Automation",
      firstWorkPackage: "EAPT-026",
      firstWorkPackageName:
        "Implement lifecycle command execution with transactional appointment, reservation, history, and task effects"
    });
  });
});

import { describe, expect, it } from "vitest";

import { evaluateSalesLeadOperations } from "@/features/sales/sales-console-m59-lead-operations-logic";

describe("Sales Console M59 lead operations logic", () => {
  it("detects SLA risk and recommends BDC routing for web leads", () => {
    const decision = evaluateSalesLeadOperations({
      leadId: "LEAD-1",
      channel: "website",
      leadAgeMinutes: 45,
      duplicateSignals: [],
      requestedLane: "inventory",
      appointmentSet: false,
      appointmentCompleted: false,
      ownerAvailable: true,
      customerIntent: "high"
    });

    expect(decision.slaRisk).toBe("yellow");
    expect(decision.routingRecommendation).toBe("bdc");
    expect(decision.assignmentWriteEnabled).toBe(false);
  });

  it("flags duplicate risk and escalates to manager review", () => {
    const decision = evaluateSalesLeadOperations({
      leadId: "LEAD-2",
      channel: "phone",
      leadAgeMinutes: 70,
      duplicateSignals: ["same-phone", "same-email"],
      appointmentSet: false,
      appointmentCompleted: false,
      ownerAvailable: false,
      customerIntent: "high"
    });

    expect(decision.slaRisk).toBe("red");
    expect(decision.dedupeRisk).toBe("likely-duplicate");
    expect(decision.routingRecommendation).toBe("manager-review");
    expect(decision.escalationTriggers).toEqual(
      expect.arrayContaining(["first response SLA breach", "likely duplicate lead"])
    );
  });

  it("tracks appointment conversion visibility without writing assignments", () => {
    const decision = evaluateSalesLeadOperations({
      leadId: "LEAD-3",
      channel: "walk-in",
      leadAgeMinutes: 20,
      duplicateSignals: [],
      appointmentSet: true,
      appointmentCompleted: true,
      ownerAvailable: true,
      customerIntent: "medium"
    });

    expect(decision.appointmentConversion).toBe("shown");
    expect(decision.assignmentWriteEnabled).toBe(false);
  });
});

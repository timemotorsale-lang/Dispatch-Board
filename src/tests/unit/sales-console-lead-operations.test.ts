import { describe, expect, it } from "vitest";

import {
  salesConsoleLeadOperationsCoversCoreStates,
  salesConsoleLeadOperationsRemainControlled,
  salesConsoleLeadRecords,
  salesConsoleLeadStates
} from "@/features/sales/sales-console-lead-operations";

describe("Sales Console M42 lead operations workflow", () => {
  it("defines all MVP lead states", () => {
    expect(salesConsoleLeadOperationsCoversCoreStates()).toBe(true);
    expect(salesConsoleLeadStates).toEqual([
      "New",
      "Dedupe Review",
      "Attempting",
      "Contacted",
      "Appointment Set",
      "Nurture",
      "Disqualified"
    ]);
  });

  it("tracks source, SLA, dedupe, owner, channel, vehicle interest, financing intent, and next action", () => {
    for (const lead of salesConsoleLeadRecords) {
      expect(lead.source).toBeTruthy();
      expect(lead.sla).toBeTruthy();
      expect(lead.duplicateRisk).toBeTruthy();
      expect(lead.owner).toBeTruthy();
      expect(lead.preferredChannel).toBeTruthy();
      expect(lead.vehicleInterest).toBeTruthy();
      expect(lead.financingIntent).toBeTruthy();
      expect(lead.nextAction).toBeTruthy();
    }
  });

  it("keeps assignment and dedupe behavior controlled for MVP", () => {
    expect(salesConsoleLeadOperationsRemainControlled()).toBe(true);
  });
});

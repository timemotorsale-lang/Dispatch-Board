import { describe, expect, it } from "vitest";

import {
  buildSalesManagerCommandQueues,
  type SalesManagerCommandInput
} from "@/features/sales/sales-console-m62-manager-command-algorithms";

const records: SalesManagerCommandInput[] = [
  {
    recordId: "REV-1",
    customerName: "John Smith",
    revenueAmount: 25000,
    stageAgeHours: 30,
    slaRiskMinutes: 15,
    managerReviewOpen: true,
    governedApprovalNeeded: false,
    salespersonId: "SP-1",
    showRatePercent: 45,
    grossPerUnit: 1200,
    overdueFollowUps: 1,
    sourceVerified: true,
    closeProbabilityPercent: 80
  },
  {
    recordId: "REV-2",
    customerName: "Samantha Lee",
    revenueAmount: 15000,
    stageAgeHours: 8,
    slaRiskMinutes: 45,
    managerReviewOpen: false,
    governedApprovalNeeded: true,
    salespersonId: "SP-2",
    showRatePercent: 70,
    grossPerUnit: 650,
    overdueFollowUps: 0,
    sourceVerified: false,
    closeProbabilityPercent: 40
  }
];

describe("Sales Console M62 manager command algorithms", () => {
  it("builds stalled revenue, SLA, review, and backlog queues", () => {
    const queues = buildSalesManagerCommandQueues(records);

    expect(queues.stalledRevenue.map((record) => record.recordId)).toEqual(["REV-1", "REV-2"]);
    expect(queues.slaBreachQueue.map((record) => record.recordId)).toEqual(["REV-2"]);
    expect(queues.managerReviewQueue.map((record) => record.recordId)).toEqual(["REV-1"]);
    expect(queues.approvalBacklogVisibility.map((record) => record.recordId)).toEqual(["REV-2"]);
  });

  it("flags coaching opportunities and forecast confidence", () => {
    const queues = buildSalesManagerCommandQueues(records);

    expect(queues.coachingOpportunityFlags).toEqual(
      expect.arrayContaining([
        { salespersonId: "SP-1", reasons: ["low show rate", "overdue follow-ups"] },
        { salespersonId: "SP-2", reasons: ["low gross per unit"] }
      ])
    );
    expect(queues.forecastConfidencePercent).toBe(65);
  });

  it("keeps governed approvals visible but blocked", () => {
    const queues = buildSalesManagerCommandQueues(records);

    expect(queues.drilldownRecordIds).toEqual(["REV-1", "REV-2"]);
    expect(queues.governedActionsRemainBlocked).toBe(true);
  });
});

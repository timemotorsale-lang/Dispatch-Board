import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";

const actor: AuthenticatedUser = {
  id: "advisor-1",
  name: "Alex Carter",
  email: "alex@test.local",
  isActive: true,
  roles: ["Service Advisor"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

vi.mock("@/server/repair-order/service", () => ({
  getRepairOrderCreateOptions: vi.fn(async () => ({
    appointments: [],
    customers: []
  })),
  listRepairOrders: vi.fn(async () => ({
    total: 1,
    items: [
      {
        id: "ro-1",
        repairOrderNumber: "RO-1",
        stage: null,
        operatingState: null,
        nextAction: null,
        targetAt: null,
        age: { overdue: false, openAgeHours: 1, stageAgeHours: 1, targetVarianceHours: 0 },
        advisorUpdates: [
          {
            id: "update-1",
            contactChannel: "PHONE",
            contactDirection: "OUTBOUND",
            contactOutcome: null,
            customerVisibleSummary: null,
            internalNotes: null,
            exceptionCodes: null,
            nextContactAt: null,
            occurredAt: new Date("2026-08-10T12:00:00.000Z"),
            statusCode: "RECORDED",
            version: 1,
            authorUser: null
          }
        ],
        customer: null,
        inventoryUnit: { inventoryNumber: "333586" },
        location: null,
        ownerUser: null,
        partDemands: [],
        vehicle: null,
        vendorWorks: []
      }
    ]
  }))
}));

vi.mock("@/server/services/workday-workbook", () => ({
  currentWorkdayBoardDate: vi.fn(() => "2026-08-10"),
  getCooWorkbook: vi.fn(async () => ({ id: "coo-workbook-1" })),
  getStaffWorkbook: vi.fn(async () => ({ id: "staff-workbook-1" })),
  getStaffWorkbookSummaries: vi.fn(async () => [])
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    staffDay: { findFirst: vi.fn(async () => null) },
    task: { findMany: vi.fn(async () => []) },
    workdayChecklistItem: { findMany: vi.fn(async () => []) },
    workdayDailyFocusItem: { findMany: vi.fn(async () => []) },
    workdayQuickUpdate: { findMany: vi.fn(async () => []) },
    workdayReportSeed: { findMany: vi.fn(async () => []) }
  }
}));

describe("getServiceAdvisorWorkspace", () => {
  it("does not crash when legacy repair-order fields are incomplete", async () => {
    const result = await getServiceAdvisorWorkspace(actor);

    expect(result.counts.activeRepairOrders).toBe(1);
    expect(result.actionQueue[0]).toMatchObject({
      customerName: "333586",
      nextAction: "Next action not recorded",
      operatingState: "UNKNOWN",
      stage: "UNKNOWN",
      vehicleLabel: "333586"
    });
    expect(result.inbox[0]).toMatchObject({
      authorName: "Unknown staff",
      preview: "Customer communication recorded.",
      subject: "Repair order update"
    });
  });
});

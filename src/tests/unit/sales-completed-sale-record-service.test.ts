import { describe, expect, it, vi } from "vitest";

import {
  completedSaleRecordServiceBlocksSourceSystemWrites,
  submitCompletedSaleRecord
} from "@/server/sales/completed-sale-record-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const managerUser: AuthenticatedUser = {
  duties: {
    all: ["Record completed sales"],
    direct: ["Record completed sales"],
    roleDefaults: ["Record completed sales"]
  },
  email: "manager@local.test",
  id: "manager-1",
  isActive: true,
  name: "Manager User",
  roles: ["Sales Manager"]
};

const validRequest = {
  customerId: "customer-1",
  customerName: "John Smith",
  evidenceIds: ["evidence-1"],
  grossEstimateCents: 285000,
  idempotencyKey: "completed-sale-1",
  managerId: "manager-1",
  paymentPath: "cash",
  productLabel: "2022 Toyota RAV4 XLE",
  reason: "Record completed sale packet after staff verified source evidence.",
  revenueLane: "Inventory Cash Sale",
  revenueOpportunityId: "revenue-1",
  saleDate: "2026-07-30",
  salesOpportunityId: "sales-1",
  salespersonId: "salesperson-1",
  satisfied: [
    "customer-linked",
    "revenue-lane-selected",
    "source-links-present",
    "salesperson-linked",
    "sale-date-present",
    "source-verification-ready",
    "vehicle-linked",
    "inventory-verified",
    "gross-estimate-present",
    "cash-payment-path-labeled",
    "evidence-attached"
  ],
  sourceRecordLinks: ["/customers/customer-360?customerId=customer-1", "/vehicles/360/TMS22145"],
  vehicleStockNumber: "TMS22145"
};

function repository(duplicate = false) {
  return {
    persist: vi.fn(async (input) => ({
      auditEventId: "audit-1",
      commandId: "command-1",
      correlationId: input.correlationId,
      duplicate,
      idempotencyKey: input.idempotencyKey,
      saleRecord: {
        id: "command-1",
        customerId: input.request.customerId,
        customerName: input.request.customerName,
        grossEstimateCents: input.request.grossEstimateCents,
        productLabel: input.request.productLabel,
        reconciliationStatus: "pending" as const,
        revenueLane: input.request.revenueLane,
        saleDate: input.request.saleDate,
        sourceRecordLinks: input.request.sourceRecordLinks
      }
    }))
  };
}

describe("completed sale record service", () => {
  it("creates a Sales Console-owned completed sale record", async () => {
    const repo = repository();
    const result = await submitCompletedSaleRecord(managerUser, validRequest, {
      organizationId: "org-1",
      repository: repo as never
    });

    expect(result).toMatchObject({
      duplicate: false,
      status: "created",
      workflowLive: true,
      saleRecord: {
        customerName: "John Smith",
        reconciliationStatus: "pending"
      }
    });
    expect(repo.persist).toHaveBeenCalledWith(expect.objectContaining({
      commandType: "RECORD_COMPLETED_SALE",
      idempotencyKey: "completed-sale-1"
    }));
  });

  it("returns duplicate status for idempotent retries", async () => {
    const result = await submitCompletedSaleRecord(managerUser, validRequest, {
      organizationId: "org-1",
      repository: repository(true) as never
    });

    expect(result.status).toBe("duplicate");
  });

  it("blocks BDC completion attempts", async () => {
    await expect(
      submitCompletedSaleRecord({ ...managerUser, roles: ["BDC"] }, validRequest, {
        organizationId: "org-1",
        repository: repository() as never
      })
    ).rejects.toThrow("This role can prepare the record, but cannot complete the internal sale record.");
  });

  it("blocks missing completion evidence", async () => {
    await expect(
      submitCompletedSaleRecord(managerUser, { ...validRequest, evidenceIds: [], satisfied: validRequest.satisfied.filter((item) => item !== "evidence-attached") }, {
        organizationId: "org-1",
        repository: repository() as never
      })
    ).rejects.toThrow("Missing 1 completion requirement.");
  });

  it("keeps source-system writes blocked by policy", () => {
    expect(completedSaleRecordServiceBlocksSourceSystemWrites()).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildSalesRecordWorkflowState,
  salesConsoleSampleRecordSaleDraft,
  submitSalesRecordWorkflow
} from "@/features/sales/sales-console-m68-record-sale-ui-workflow";
import { createInMemorySalesConsoleRecordRepository } from "@/features/sales/sales-console-m67-persistent-sales-record-service";
import type { SalesConsoleAuditMetadata } from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T16:00:00.000Z",
  commandId: "CMD-M68",
  correlationId: "CORR-M68",
  idempotencyKey: "IDEMP-M68",
  sourceLink: "/sales"
};

describe("Sales Console M68 record sale UI workflow", () => {
  it("blocks recording until completion evidence is present", () => {
    const state = buildSalesRecordWorkflowState(salesConsoleSampleRecordSaleDraft, "Sales Manager");

    expect(state.submitEnabled).toBe(false);
    expect(state.missingLabels).toContain("Sale evidence is attached");
    expect(state.submitLabel).toBe("Complete requirements before recording");
  });

  it("allows an internal completed-sale record when requirements pass", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const draft = {
      ...salesConsoleSampleRecordSaleDraft,
      satisfied: [...salesConsoleSampleRecordSaleDraft.satisfied, "evidence-attached" as const],
      evidenceIds: ["EVD-1"],
      blockerSeverity: "none" as const
    };

    const result = submitSalesRecordWorkflow(draft, audit, "Sales Manager", repository);

    expect(result).toMatchObject({ ok: true, status: "success", recordId: "CMD-M68" });
    expect(repository.read().completedSales).toHaveLength(1);
  });

  it("keeps BDC users from completing the internal sale record", () => {
    const draft = {
      ...salesConsoleSampleRecordSaleDraft,
      satisfied: [...salesConsoleSampleRecordSaleDraft.satisfied, "evidence-attached" as const],
      evidenceIds: ["EVD-1"],
      blockerSeverity: "none" as const
    };

    const result = submitSalesRecordWorkflow(draft, audit, "BDC / Lead Coordinator");

    expect(result).toMatchObject({ ok: false, status: "auth-error" });
  });

  it("returns duplicate state for replayed idempotency keys", () => {
    const repository = createInMemorySalesConsoleRecordRepository();
    const draft = {
      ...salesConsoleSampleRecordSaleDraft,
      satisfied: [...salesConsoleSampleRecordSaleDraft.satisfied, "evidence-attached" as const],
      evidenceIds: ["EVD-1"],
      blockerSeverity: "none" as const
    };

    submitSalesRecordWorkflow(draft, audit, "Sales Manager", repository);
    const duplicate = submitSalesRecordWorkflow(draft, audit, "Sales Manager", repository);

    expect(duplicate).toMatchObject({ ok: true, status: "duplicate", recordId: "CMD-M68" });
    expect(repository.read().completedSales).toHaveLength(1);
  });

  it("keeps risky enterprise actions governed", () => {
    const state = buildSalesRecordWorkflowState(salesConsoleSampleRecordSaleDraft, "Admin / Owner");

    expect(state.governedActions).toEqual(
      expect.arrayContaining(["quote submission", "finance decision", "vehicle hold/reservation", "contract execution"])
    );
  });
});

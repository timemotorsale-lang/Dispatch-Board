import { describe, expect, it } from "vitest";

import {
  commandMutatesOnlySalesConsoleInternal,
  hasRequiredAuditMetadata,
  isApprovedSalesConsoleCommand,
  prohibitedSalesConsoleCommandNames,
  type LogSalesActivity,
  type SalesConsoleAuditMetadata
} from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-29T22:00:00.000Z",
  commandId: "CMD-1",
  correlationId: "CORR-1",
  idempotencyKey: "IDEMP-1",
  sourceLink: "/sales"
};

describe("Sales Console M50 record command contract", () => {
  it("requires audit and idempotency metadata for internal writes", () => {
    expect(hasRequiredAuditMetadata(audit)).toBe(true);
    expect(hasRequiredAuditMetadata({ ...audit, idempotencyKey: "" })).toBe(false);
  });

  it("approves only safe Sales Console-owned command names", () => {
    expect(isApprovedSalesConsoleCommand("LogSalesActivity")).toBe(true);
    expect(isApprovedSalesConsoleCommand("SubmitQuote")).toBe(false);
    expect(prohibitedSalesConsoleCommandNames).toContain("DecideFinance");
  });

  it("keeps commands scoped to Sales Console internal records", () => {
    const command: LogSalesActivity = {
      name: "LogSalesActivity",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit,
      payload: {
        opportunityId: "SO-1",
        kind: "call-outcome",
        summary: "Customer confirmed they can visit today.",
        outcome: "confirmed"
      }
    };

    expect(commandMutatesOnlySalesConsoleInternal(command)).toBe(true);
  });
});

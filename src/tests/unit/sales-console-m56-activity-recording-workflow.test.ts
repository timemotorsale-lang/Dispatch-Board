import { describe, expect, it } from "vitest";

import {
  evaluateSalesActivityRecording,
  salesActivityActionIsRisky,
  salesActivityBlockedRiskyActions,
  salesActivityRecordingActions
} from "@/features/sales/sales-console-m56-activity-recording-workflow";
import type { SalesConsoleAuditMetadata } from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Salesperson",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-56",
  correlationId: "CORR-56",
  idempotencyKey: "IDEMP-56",
  sourceLink: "/sales"
};

describe("Sales Console M56 activity recording workflow", () => {
  it("allows safe internal sales activity recording with audit metadata", () => {
    const result = evaluateSalesActivityRecording({
      opportunityId: "SO-1",
      action: "log call outcome",
      summary: "Customer confirmed arrival window.",
      audit
    });

    expect(result.allowed).toBe(true);
    expect(result.commandName).toBe("LogSalesActivity");
    expect(result.activityKind).toBe("call-outcome");
  });

  it("requires opportunity, summary, and audit metadata", () => {
    const result = evaluateSalesActivityRecording({
      opportunityId: "",
      action: "add sales note",
      summary: " ",
      audit: { ...audit, commandId: "" }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["opportunity is required", "summary is required", "audit and idempotency metadata required"])
    );
  });

  it("does not include risky external write actions in the activity menu", () => {
    expect(salesActivityRecordingActions).not.toContain("submit quote");
    expect(salesActivityBlockedRiskyActions).toContain("send customer message");
    expect(salesActivityActionIsRisky("submit quote to customer")).toBe(true);
  });
});

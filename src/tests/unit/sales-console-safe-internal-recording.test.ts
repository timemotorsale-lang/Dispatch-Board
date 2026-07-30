import { describe, expect, it } from "vitest";

import {
  emptySalesConsoleInternalRecordingStore,
  recordSalesConsoleActivity,
  recordSalesConsoleEvidence,
  recordSalesConsoleNote,
  recordSalesConsoleOutcome,
  recordSalesConsolePromise
} from "@/features/sales/sales-console-safe-internal-recording";
import type {
  AddSalesNote,
  LogSalesActivity,
  SalesConsoleAuditMetadata
} from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Salesperson",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-REC-1",
  correlationId: "CORR-REC-1",
  idempotencyKey: "IDEMP-REC-1",
  sourceLink: "/sales"
};

describe("Sales Console safe internal recording", () => {
  it("records internal sales activity without mutating source systems", () => {
    const command: LogSalesActivity = {
      name: "LogSalesActivity",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit,
      payload: {
        opportunityId: "REV-1001",
        kind: "call-outcome",
        summary: "Customer confirmed appointment."
      }
    };

    const result = recordSalesConsoleActivity(command);

    expect(result.ok).toBe(true);
    expect(result.store.activities).toHaveLength(1);
  });

  it("rejects duplicate idempotency keys", () => {
    const command: AddSalesNote = {
      name: "AddSalesNote",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit,
      payload: {
        opportunityId: "REV-1001",
        body: "Manager reviewed source context.",
        visibility: "manager-only"
      }
    };

    const first = recordSalesConsoleNote(command, emptySalesConsoleInternalRecordingStore);
    const second = recordSalesConsoleNote(command, first.store);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("duplicate idempotency key");
  });

  it("supports promises, evidence metadata, and outcomes as Sales Console records", () => {
    const promise = recordSalesConsolePromise({
      name: "AddSalesPromise",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit: { ...audit, commandId: "CMD-PROM", idempotencyKey: "IDEMP-PROM" },
      payload: {
        opportunityId: "REV-1001",
        promiseType: "customer-callback",
        dueAt: "2026-07-31T15:00:00.000Z",
        ownerId: "USER-1",
        status: "open"
      }
    });
    const evidence = recordSalesConsoleEvidence({
      name: "AttachSalesEvidence",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit: { ...audit, commandId: "CMD-EVD", idempotencyKey: "IDEMP-EVD" },
      payload: {
        fileName: "trade-photo.jpg",
        fileType: "image/jpeg",
        sizeBytes: 300_000,
        status: "pending",
        attachedSubjectType: "revenue-opportunity",
        attachedSubjectId: "REV-1001",
        category: "trade"
      }
    }, promise.store);
    const outcome = recordSalesConsoleOutcome({
      name: "RecordSalesOutcome",
      writesTo: "Sales Console Internal",
      mutatesSourceSystem: false,
      audit: { ...audit, commandId: "CMD-OUT", idempotencyKey: "IDEMP-OUT" },
      payload: {
        opportunityId: "REV-1001",
        outcome: "nurture",
        reasonCode: "future-interest",
        terminal: false,
        nextAction: "Follow up tomorrow.",
        evidenceIds: []
      }
    }, evidence.store);

    expect(outcome.ok).toBe(true);
    expect(outcome.store.promises).toHaveLength(1);
    expect(outcome.store.evidence).toHaveLength(1);
    expect(outcome.store.outcomes).toHaveLength(1);
  });
});

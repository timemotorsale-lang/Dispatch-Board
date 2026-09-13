import { describe, expect, it } from "vitest";

import {
  evaluateSalesOutcomeRecording,
  evaluateSalesWorkbenchOutcomeCapture,
  salesOutcomeCloseWritesRemainGoverned
} from "@/features/sales/sales-console-m63-sales-outcome-recording";
import type { SalesConsoleAuditMetadata } from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Sales Manager",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-63",
  correlationId: "CORR-63",
  idempotencyKey: "IDEMP-63",
  sourceLink: "/sales"
};

describe("Sales Console M63 sales outcome recording", () => {
  it("allows controlled terminal outcomes with evidence and audit", () => {
    const decision = evaluateSalesOutcomeRecording({
      opportunityId: "SO-1",
      outcome: "won",
      reasonCode: "completed",
      sourceLink: "/sales?record=SO-1",
      evidenceIds: ["EVD-1"],
      audit
    });

    expect(decision.allowed).toBe(true);
    expect(decision.terminal).toBe(true);
    expect(salesOutcomeCloseWritesRemainGoverned(decision)).toBe(true);
  });

  it("requires next action for non-terminal outcomes", () => {
    const decision = evaluateSalesOutcomeRecording({
      opportunityId: "SO-2",
      outcome: "nurture",
      reasonCode: "future-interest",
      sourceLink: "/sales?record=SO-2",
      evidenceIds: [],
      audit
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("non-terminal outcomes require a next action");
  });

  it("requires evidence and audit for sensitive terminal outcomes", () => {
    const decision = evaluateSalesOutcomeRecording({
      opportunityId: "SO-3",
      outcome: "duplicate",
      reasonCode: "duplicate",
      sourceLink: "/sales?record=SO-3",
      evidenceIds: [],
      audit: { ...audit, idempotencyKey: "" }
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(["evidence is required for this outcome", "audit trail is required"]));
  });

  it("requires selected outcome, note, customer, and next action for workbench capture", () => {
    const decision = evaluateSalesWorkbenchOutcomeCapture({
      opportunityId: "SO-4",
      outcome: "nurture",
      reasonCode: "future-interest",
      sourceLink: "/sales?record=SO-4",
      evidenceIds: [],
      audit,
      customerId: "customer-1",
      outcomeNote: "",
      selectedOutcomeLabel: "Customer needs follow-up"
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(["non-terminal outcomes require a next action", "outcome note is required"]));
    expect(salesOutcomeCloseWritesRemainGoverned(decision)).toBe(true);
  });

  it("allows a complete non-terminal workbench outcome with a next action", () => {
    const decision = evaluateSalesWorkbenchOutcomeCapture({
      opportunityId: "SO-5",
      outcome: "nurture",
      reasonCode: "future-interest",
      sourceLink: "/sales?record=SO-5",
      evidenceIds: [],
      nextAction: "Call customer tomorrow with final numbers.",
      audit,
      customerId: "customer-1",
      outcomeNote: "Customer asked for final numbers after appointment confirmation.",
      selectedOutcomeLabel: "Customer needs follow-up"
    });

    expect(decision.allowed).toBe(true);
    expect(decision.terminal).toBe(false);
    expect(salesOutcomeCloseWritesRemainGoverned(decision)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { salesConsoleMvpExecution } from "@/features/sales/sales-console-mvp-execution";
import {
  auditEventsAreImmutable,
  salesConsoleAuditReadModel,
  sensitiveActionsHaveAuditCoverage
} from "@/features/sales/sales-console-m9-audit-trails";

describe("Sales Console enterprise audit trail foundation", () => {
  it("keeps the audit foundation read-only and mock/source-shaped", () => {
    expect(salesConsoleAuditReadModel.readOnly).toBe(true);
    expect(salesConsoleAuditReadModel.events.length).toBeGreaterThan(0);
    expect(salesConsoleAuditReadModel.events.every((event) => event.sourceRecord.recordId.length > 0)).toBe(true);
    expect(salesConsoleAuditReadModel.events.every((event) => event.actor.userId.length > 0)).toBe(true);
  });

  it("requires audit coverage for every sensitive future action", () => {
    expect(sensitiveActionsHaveAuditCoverage()).toBe(true);
    expect(salesConsoleAuditReadModel.futureActionCoverage.map((coverage) => coverage.action)).toEqual(
      salesConsoleMvpExecution.readOnlyGuardrails.map((guardrail) => guardrail.action)
    );
  });

  it("keeps future sensitive actions disabled while audit coverage is defined", () => {
    expect(salesConsoleAuditReadModel.futureActionCoverage.every((coverage) => coverage.enabled === false)).toBe(true);
    expect(salesConsoleAuditReadModel.futureActionCoverage.every((coverage) => coverage.coverage === "audit-required")).toBe(true);
  });

  it("requires actor, source, timestamp, reason, and before/after summaries", () => {
    for (const coverage of salesConsoleAuditReadModel.futureActionCoverage) {
      expect(coverage.requiredFields).toEqual(
        expect.arrayContaining(["actor", "sourceRecord", "timestampIso", "reason", "beforeSummary", "afterSummary"])
      );
    }
  });

  it("marks audit events immutable and preserves source-system context", () => {
    expect(auditEventsAreImmutable()).toBe(true);
    expect(salesConsoleAuditReadModel.events.every((event) => event.immutable)).toBe(true);
    expect(salesConsoleAuditReadModel.events.every((event) => event.sourceRecord.sourceSystem !== "Sales Console")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  salesConsoleM18AuditIdempotencyReadiness,
  salesConsoleM18AuditReadinessBlocksPersistence,
  salesConsoleM18AuditReadinessRequiresAuditEvent,
  salesConsoleM18AuditReadinessRequiresIdempotency
} from "@/features/sales/sales-console-m18-audit-idempotency-readiness";

describe("Sales Console M18 audit and idempotency readiness", () => {
  it("requires an audit event before persistence", () => {
    expect(salesConsoleM18AuditReadinessRequiresAuditEvent()).toBe(true);
    expect(salesConsoleM18AuditIdempotencyReadiness.auditRequiredBeforePersistence).toBe(true);
  });

  it("requires idempotency before persistence", () => {
    expect(salesConsoleM18AuditReadinessRequiresIdempotency()).toBe(true);
    expect(salesConsoleM18AuditIdempotencyReadiness.idempotencyRequiredBeforePersistence).toBe(true);
  });

  it("keeps live persistence blocked", () => {
    expect(salesConsoleM18AuditReadinessBlocksPersistence()).toBe(true);
    expect(salesConsoleM18AuditIdempotencyReadiness.mergeGate).toContain("Do not enable live manager-review persistence");
  });
});

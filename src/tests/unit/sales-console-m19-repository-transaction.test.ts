import { describe, expect, it } from "vitest";

import {
  salesConsoleM19RepositoryChecksIdempotencyFirst,
  salesConsoleM19RepositoryCreatesAuditTrail,
  salesConsoleM19RepositoryLimitsWriteBoundary,
  salesConsoleM19RepositoryTransaction
} from "@/features/sales/sales-console-m19-repository-transaction";

describe("Sales Console M19 repository transaction proof", () => {
  it("checks idempotency before task creation", () => {
    expect(salesConsoleM19RepositoryChecksIdempotencyFirst()).toBe(true);
    expect(salesConsoleM19RepositoryTransaction.steps[0]).toContain("EnterpriseCommandLedger");
  });

  it("creates audit trail coverage", () => {
    expect(salesConsoleM19RepositoryCreatesAuditTrail()).toBe(true);
  });

  it("limits the write boundary to Manager Review Request", () => {
    expect(salesConsoleM19RepositoryLimitsWriteBoundary()).toBe(true);
    expect(salesConsoleM19RepositoryTransaction.writeBoundary).toContain("quote");
  });
});

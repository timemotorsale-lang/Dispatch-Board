import { describe, expect, it } from "vitest";

import {
  salesConsoleM19PersistenceContract,
  salesConsoleM19PersistenceContractDefinesTargets,
  salesConsoleM19PersistenceContractKeepsOtherWorkflowsBlocked,
  salesConsoleM19PersistenceContractRequiresIdempotency
} from "@/features/sales/sales-console-m19-persistence-contract";

describe("Sales Console M19 persistence contract", () => {
  it("defines the persistence targets for Manager Review Request", () => {
    expect(salesConsoleM19PersistenceContractDefinesTargets()).toBe(true);
    expect(salesConsoleM19PersistenceContract.persistenceTargets.map((target) => target.target)).toEqual([
      "EnterpriseCommandLedger",
      "EnterpriseAuditEvent",
      "Task"
    ]);
  });

  it("requires idempotency before task creation", () => {
    expect(salesConsoleM19PersistenceContractRequiresIdempotency()).toBe(true);
  });

  it("keeps other risky workflows blocked", () => {
    expect(salesConsoleM19PersistenceContractKeepsOtherWorkflowsBlocked()).toBe(true);
    expect(salesConsoleM19PersistenceContract.activationBoundary).toContain("Only Manager Review Request");
  });
});

import { describe, expect, it } from "vitest";

import {
  salesConsoleM18BackendContract,
  salesConsoleM18BackendContractBlocksWrites,
  salesConsoleM18BackendContractDefinesEndpoint,
  salesConsoleM18BackendContractRequiresAuditFields
} from "@/features/sales/sales-console-m18-backend-contract";

describe("Sales Console M18 backend contract", () => {
  it("defines a dedicated sales manager review endpoint", () => {
    expect(salesConsoleM18BackendContractDefinesEndpoint()).toBe(true);
    expect(salesConsoleM18BackendContract.endpoint).toBe("/api/sales/manager-review-requests");
  });

  it("requires audit and idempotency fields", () => {
    expect(salesConsoleM18BackendContractRequiresAuditFields()).toBe(true);
  });

  it("blocks writes in the backend contract", () => {
    expect(salesConsoleM18BackendContractBlocksWrites()).toBe(true);
  });
});

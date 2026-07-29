import { describe, expect, it } from "vitest";

import {
  salesConsoleM19ApiActivation,
  salesConsoleM19ApiBlocksIdempotencyConflict,
  salesConsoleM19ApiReturnsCreatedForNewRequest,
  salesConsoleM19ApiReturnsDuplicateForRetry
} from "@/features/sales/sales-console-m19-api-activation";

describe("Sales Console M19 API activation", () => {
  it("returns created for new requests", () => {
    expect(salesConsoleM19ApiReturnsCreatedForNewRequest()).toBe(true);
  });

  it("returns duplicate for idempotent retries", () => {
    expect(salesConsoleM19ApiReturnsDuplicateForRetry()).toBe(true);
  });

  it("blocks idempotency conflicts", () => {
    expect(salesConsoleM19ApiBlocksIdempotencyConflict()).toBe(true);
    expect(salesConsoleM19ApiActivation.guardrail).toContain("only Manager Review Request");
  });
});

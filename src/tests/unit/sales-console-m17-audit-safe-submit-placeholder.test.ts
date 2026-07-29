import { describe, expect, it } from "vitest";

import {
  salesConsoleM17AuditSafeSubmitPlaceholder,
  salesConsoleM17SubmitPlaceholderBlocksWrites,
  salesConsoleM17SubmitPlaceholderIncludesAuditFields,
  salesConsoleM17SubmitPlaceholderNamesMissingBackend
} from "@/features/sales/sales-console-m17-audit-safe-submit-placeholder";

describe("Sales Console M17 audit-safe submit placeholder", () => {
  it("blocks writes and task creation", () => {
    expect(salesConsoleM17SubmitPlaceholderBlocksWrites()).toBe(true);
    expect(salesConsoleM17AuditSafeSubmitPlaceholder.submitActionEnabled).toBe(false);
  });

  it("names the missing backend destination", () => {
    expect(salesConsoleM17SubmitPlaceholderNamesMissingBackend()).toBe(true);
  });

  it("includes the intended audit fields", () => {
    expect(salesConsoleM17SubmitPlaceholderIncludesAuditFields()).toBe(true);
  });
});

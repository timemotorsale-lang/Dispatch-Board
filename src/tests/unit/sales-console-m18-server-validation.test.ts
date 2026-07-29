import { describe, expect, it } from "vitest";

import {
  salesConsoleM18ServerValidation,
  salesConsoleM18ServerValidationCoversRequiredPayload,
  salesConsoleM18ServerValidationKeepsSubmitBlocked,
  salesConsoleM18ServerValidationRequiresSourceSnapshot
} from "@/features/sales/sales-console-m18-server-validation";

describe("Sales Console M18 server validation", () => {
  it("covers the required backend payload", () => {
    expect(salesConsoleM18ServerValidationCoversRequiredPayload()).toBe(true);
    expect(salesConsoleM18ServerValidation.validationRules.map((rule) => rule.rule).join(" ")).toContain(
      "idempotency key"
    );
  });

  it("requires source snapshot context", () => {
    expect(salesConsoleM18ServerValidationRequiresSourceSnapshot()).toBe(true);
  });

  it("keeps submit blocked until the backend is explicitly activated", () => {
    expect(salesConsoleM18ServerValidationKeepsSubmitBlocked()).toBe(true);
    expect(salesConsoleM18ServerValidation.submitEnabled).toBe(false);
  });
});

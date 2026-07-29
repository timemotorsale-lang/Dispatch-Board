import { describe, expect, it } from "vitest";

import {
  salesConsoleM17RequestFormControlsDisabled,
  salesConsoleM17RequestFormExplainsWhyDisabled,
  salesConsoleM17RequestFormHasRequiredFields,
  salesConsoleM17RequestFormShell
} from "@/features/sales/sales-console-m17-request-form-shell";

describe("Sales Console M17 request form shell", () => {
  it("contains required manager review request fields", () => {
    expect(salesConsoleM17RequestFormHasRequiredFields()).toBe(true);
    expect(salesConsoleM17RequestFormShell.fields.map((field) => field.label)).toContain("Reason");
  });

  it("keeps controls and submit disabled", () => {
    expect(salesConsoleM17RequestFormControlsDisabled()).toBe(true);
  });

  it("explains why the form is disabled", () => {
    expect(salesConsoleM17RequestFormExplainsWhyDisabled()).toBe(true);
  });
});

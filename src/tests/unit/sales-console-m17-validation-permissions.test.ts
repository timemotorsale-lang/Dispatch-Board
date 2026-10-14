import { describe, expect, it } from "vitest";

import {
  salesConsoleM17PermissionsAllowManagerReviewOnly,
  salesConsoleM17PermissionsAllowSalespersonRequestOnly,
  salesConsoleM17ValidationBlocksSubmitUntilBackendReady,
  salesConsoleM17ValidationPermissions
} from "@/features/sales/sales-console-m17-validation-permissions";

describe("Sales Console M17 validation and permissions", () => {
  it("scopes request permission to salesperson", () => {
    expect(salesConsoleM17PermissionsAllowSalespersonRequestOnly()).toBe(true);
  });

  it("scopes review permission to manager and admin owner", () => {
    expect(salesConsoleM17PermissionsAllowManagerReviewOnly()).toBe(true);
  });

  it("blocks submit until a dedicated backend endpoint is ready", () => {
    expect(salesConsoleM17ValidationBlocksSubmitUntilBackendReady()).toBe(true);
    expect(salesConsoleM17ValidationPermissions.validationGates).toContain("dedicated backend endpoint ready");
  });
});

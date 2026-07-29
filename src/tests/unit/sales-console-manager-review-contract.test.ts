import { describe, expect, it } from "vitest";

import {
  salesConsoleM16ManagerReviewContract,
  salesConsoleM16ManagerReviewContractHasAuditShape,
  salesConsoleM16ManagerReviewContractHasPermissions,
  salesConsoleM16ManagerReviewContractHasRequiredFields,
  salesConsoleM16ManagerReviewContractRemainsDisabled
} from "@/features/sales/sales-console-m16-manager-review-contract";

describe("Sales Console M16 manager review contract", () => {
  it("defines required request fields", () => {
    expect(salesConsoleM16ManagerReviewContractHasRequiredFields()).toBe(true);
    expect(salesConsoleM16ManagerReviewContract.fields.map((field) => field.field)).toContain("reason");
    expect(salesConsoleM16ManagerReviewContract.fields.map((field) => field.field)).toContain("urgency");
  });

  it("defines request and review permissions", () => {
    expect(salesConsoleM16ManagerReviewContractHasPermissions()).toBe(true);
  });

  it("defines audit shape and disabled states", () => {
    expect(salesConsoleM16ManagerReviewContractHasAuditShape()).toBe(true);
    expect(salesConsoleM16ManagerReviewContract.unavailableStates).toContain("Audit sink not ready");
  });

  it("keeps the workflow disabled until a later milestone", () => {
    expect(salesConsoleM16ManagerReviewContractRemainsDisabled()).toBe(true);
    expect(salesConsoleM16ManagerReviewContract.writeActivation).toBe("disabled-until-m17");
  });
});

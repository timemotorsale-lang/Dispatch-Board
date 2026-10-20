import { describe, expect, it } from "vitest";
import { purchasingFlags, savedPurchasingFlags, type PurchasingPolicy } from "@/lib/money-purchasing";

const policy: PurchasingPolicy = { id: "policy", employeeId: "staff", vendorId: "vendor", accountId: "card", purposeScope: "Recon parts only", categories: ["Parts"], perPurchaseLimitCents: 10000, requiresPriorApproval: true, startsOn: "2026-10-01", expiresOn: "2026-10-31", revokedAt: null };
describe("vendor purchasing policy", () => {
  it("flags exceptions without erasing actual spending", () => {
    const flags = purchasingFlags({ ...policy, revokedAt: "2026-10-18" }, { amountCents: 10800, category: "Fuel", businessDate: "2026-11-01" }, false);
    expect(flags).toHaveLength(5);
    expect(flags.join(" ")).toContain("prior approval missing");
  });
  it("separates an independent prior approval from limit exceptions", () => {
    expect(purchasingFlags(policy, { amountCents: 9000, category: "Parts", businessDate: "2026-10-19" }, true)).toEqual([]);
    expect(purchasingFlags(policy, { amountCents: 10800, category: "Parts", businessDate: "2026-10-19" }, true)).toHaveLength(1);
  });
  it("reads only textual saved flags from immutable snapshots", () => {
    expect(savedPurchasingFlags(null)).toEqual([]);
    expect(savedPurchasingFlags({ flags: ["Receipt exception", 42, null] })).toEqual(["Receipt exception"]);
  });
});

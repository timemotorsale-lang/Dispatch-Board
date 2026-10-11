import { describe, expect, it } from "vitest";
import { PURCHASE_RELEASE_PROOFS, validatePurchaseReleaseApproval } from "@/lib/purchase-release-approval";

describe("import release approval gate", () => {
  const now = new Date("2026-10-11T12:00:00Z"), revision = "a".repeat(40);
  const approval = () => ({ revision, approvedBy: "Release owner", proofs: Object.fromEntries(PURCHASE_RELEASE_PROOFS.map(name => [name, { passed: true, checkedBy: "Staff reviewer", checkedAt: now.toISOString(), evidence: `staging/${name}/result` }])) });
  it("rejects absent and placeholder approvals", () => { expect(validatePurchaseReleaseApproval(null, revision, now).ready).toBe(false); });
  it("requires every proof for the exact revision", () => {
    expect(validatePurchaseReleaseApproval(approval(), revision, now).ready).toBe(true);
    expect(validatePurchaseReleaseApproval(approval(), "b".repeat(40), now).ready).toBe(false);
    const missing = approval(); delete missing.proofs.permissions;
    expect(validatePurchaseReleaseApproval(missing, revision, now).ready).toBe(false);
  });
  it("rejects failed, stale, future and unnamed proofs", () => {
    for (const patch of [{ passed: false }, { checkedAt: "2026-10-01T12:00:00Z" }, { checkedAt: "2026-10-12T12:00:00Z" }, { checkedBy: "" }, { evidence: "" }]) {
      const invalid = approval(); Object.assign(invalid.proofs.loadTest, patch);
      expect(validatePurchaseReleaseApproval(invalid, revision, now).ready).toBe(false);
    }
  });
});

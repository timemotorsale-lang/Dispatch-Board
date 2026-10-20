import { moneyLabel } from "./money-resources";

export type PurchasingPolicy = { id: string; employeeId: string; vendorId: string; accountId: string; purposeScope: string; categories: string[]; perPurchaseLimitCents: number; requiresPriorApproval: boolean; startsOn: string; expiresOn: string; revokedAt: Date | string | null };
export function purchasingFlags(policy: PurchasingPolicy, purchase: { amountCents: number; category: string; businessDate: string }, priorApproved: boolean) {
  return [
    policy.revokedAt ? "Purchasing authorization revoked — investigate actual purchase" : "",
    purchase.businessDate < policy.startsOn || purchase.businessDate > policy.expiresOn ? "Purchase outside authorization dates" : "",
    !policy.categories.includes(purchase.category) ? "Category outside authorized purposes" : "",
    purchase.amountCents > policy.perPurchaseLimitCents ? `Above authorized purchase limit (${moneyLabel(policy.perPurchaseLimitCents)})` : "",
    (policy.requiresPriorApproval || purchase.amountCents > policy.perPurchaseLimitCents) && !priorApproved ? "Required prior approval missing" : ""
  ].filter(Boolean);
}

export function savedPurchasingFlags(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== "object" || !("flags" in snapshot) || !Array.isArray(snapshot.flags)) return [];
  return snapshot.flags.filter((flag): flag is string => typeof flag === "string");
}

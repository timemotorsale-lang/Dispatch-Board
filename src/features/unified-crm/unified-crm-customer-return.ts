import { safeUnifiedCrmCustomerContextReturn } from "@/server/unified-crm/opportunity-review-return";

export function safeCrmCustomerReturn(value: string | string[] | undefined) {
  return safeUnifiedCrmCustomerContextReturn(typeof value === "string" ? value : undefined);
}

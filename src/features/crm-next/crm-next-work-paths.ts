export const CRM_WORK_PATH_IDS = [
  "customer-follow-up",
  "delivery-transport",
  "finance-payment",
  "general-issue",
  "sales-deal",
  "service-repair",
  "title-document",
  "vendor-partner"
] as const;

export type CrmWorkPathId = typeof CRM_WORK_PATH_IDS[number];

export function normalizeCrmWorkPathId(value: string | null | undefined): CrmWorkPathId | null {
  return CRM_WORK_PATH_IDS.includes(value as CrmWorkPathId) ? value as CrmWorkPathId : null;
}

export const SAVED_DEAL_STATUSES = {
  IN_PROGRESS: "Working Deals",
  PENDING: "Pending",
  SOLD: "Sold Deals",
  LOST: "Lost Deals",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
} as const;
export type SavedDealStatus = keyof typeof SAVED_DEAL_STATUSES;
export const isSavedDealStatus = (value: unknown): value is SavedDealStatus => typeof value === "string" && Object.hasOwn(SAVED_DEAL_STATUSES, value);
export const isActiveSavedDeal = (value: unknown) => !value || value === "IN_PROGRESS" || value === "PENDING";

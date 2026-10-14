export type SalesConsoleM13FeedbackCategory = {
  category: string;
  example: string;
  routingOwner: "admin-owner" | "implementation" | "sales-manager";
  writeEnabled: false;
};

export const salesConsoleM13FeedbackCategories = [
  { category: "wrong role view", example: "I see manager/admin sections I should not see.", routingOwner: "admin-owner", writeEnabled: false },
  { category: "confusing button/control", example: "A planned button looked live or important.", routingOwner: "implementation", writeEnabled: false },
  { category: "stale data", example: "A record looked old or freshness label was confusing.", routingOwner: "implementation", writeEnabled: false },
  { category: "missing source link", example: "I could not open the CRM/customer/task/vehicle source.", routingOwner: "implementation", writeEnabled: false },
  { category: "wrong customer/deal/vehicle", example: "The displayed customer, deal, or vehicle context looked incorrect.", routingOwner: "sales-manager", writeEnabled: false },
  { category: "unclear blocker", example: "A blocker label did not tell me what to verify next.", routingOwner: "sales-manager", writeEnabled: false },
  { category: "missing priority", example: "The console did not show work I expected to see.", routingOwner: "sales-manager", writeEnabled: false },
  { category: "layout confusion", example: "I did not know where to start or what section mattered.", routingOwner: "implementation", writeEnabled: false }
] as const satisfies readonly SalesConsoleM13FeedbackCategory[];

export function salesConsoleM13FeedbackCategoriesCoverDogfoodRisks() {
  return salesConsoleM13FeedbackCategories.length >= 8 &&
    salesConsoleM13FeedbackCategories.some((item) => item.category === "wrong role view") &&
    salesConsoleM13FeedbackCategories.some((item) => item.category === "missing source link") &&
    salesConsoleM13FeedbackCategories.some((item) => item.category === "confusing button/control");
}

export function salesConsoleM13FeedbackCaptureRemainsReadOnly() {
  return salesConsoleM13FeedbackCategories.every((item) => item.writeEnabled === false);
}

export type SalesConsoleM14PlaceholderDemotionItem = {
  audience: "staff" | "admin-owner";
  handling: "operational-first" | "admin-review-only" | "planned-disabled";
  reason: string;
  surface: string;
};

export const salesConsoleM14PlaceholderDemotion = {
  items: [
    {
      audience: "staff",
      handling: "operational-first",
      reason: "Daily staff users should start with queues, risk, deals, inventory, and source verification.",
      surface: "Salesperson Today, Lead Operations, Deal Desk, Inventory Intelligence, Manager Command Center"
    },
    {
      audience: "admin-owner",
      handling: "admin-review-only",
      reason: "MVP/M9/M10/M11/M12/M13 planning evidence remains available for owner review and audit confidence.",
      surface: "Planning panels and milestone review panels"
    },
    {
      audience: "staff",
      handling: "planned-disabled",
      reason: "Sensitive workflows remain visible only as future capability labels until explicit approval.",
      surface: "Messages, quote submission, vehicle holds, finance decisions, discount approvals"
    }
  ] as const satisfies readonly SalesConsoleM14PlaceholderDemotionItem[],
  staffStartMessage: "Daily staff view starts with operating work above. Planning/admin panels are Admin / Owner review only.",
  readOnly: true
} as const;

export function salesConsoleM14PlaceholderDemotionKeepsAdminReview() {
  return salesConsoleM14PlaceholderDemotion.items.some((item) =>
    item.audience === "admin-owner" && item.handling === "admin-review-only"
  );
}

export function salesConsoleM14PlaceholderDemotionReducesStaffNoise() {
  return salesConsoleM14PlaceholderDemotion.items.some((item) =>
    item.audience === "staff" && item.handling === "operational-first"
  );
}

export function salesConsoleM14PlaceholderDemotionKeepsWritesDisabled() {
  return salesConsoleM14PlaceholderDemotion.readOnly &&
    salesConsoleM14PlaceholderDemotion.items.some((item) =>
      item.handling === "planned-disabled" && item.surface.includes("quote submission")
    );
}

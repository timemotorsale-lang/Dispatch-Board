export type SalesConsoleM13PilotGuideItem = {
  instruction: string;
  role: "all-staff" | "manager" | "salesperson";
  title: string;
};

export const salesConsoleM13StaffPilotGuide = {
  whatItIs: "A read-only sales operating console for reviewing priorities, risks, source links, and role-specific starting points.",
  whatItIsNot: "It is not a CRM replacement, quote tool, messaging system, finance decision tool, discount approval system, or inventory reservation system.",
  guideItems: [
    {
      instruction: "Start with the role landing card, then open the recommended internal section.",
      role: "all-staff",
      title: "Start with your role"
    },
    {
      instruction: "Use freshness, blocked, placeholder, unavailable, and verify-first labels before trusting a record.",
      role: "all-staff",
      title: "Trust labels before acting"
    },
    {
      instruction: "Review Today, Deal Desk, Inventory, and source links, then complete real work in the source system.",
      role: "salesperson",
      title: "Salesperson flow"
    },
    {
      instruction: "Review team risk, stale work, blocked deals, and manager review placeholders without approving in the console.",
      role: "manager",
      title: "Manager flow"
    },
    {
      instruction: "If a button says planned or read-only, it is intentionally inactive during dogfood.",
      role: "all-staff",
      title: "Inactive controls are intentional"
    }
  ] as const satisfies readonly SalesConsoleM13PilotGuideItem[]
} as const;

export function salesConsoleM13PilotGuideExplainsWhatItIsAndIsNot() {
  return salesConsoleM13StaffPilotGuide.whatItIs.includes("read-only") &&
    salesConsoleM13StaffPilotGuide.whatItIsNot.includes("not a CRM replacement");
}

export function salesConsoleM13PilotGuideCoversStaffAndManagers() {
  return salesConsoleM13StaffPilotGuide.guideItems.some((item) => item.role === "salesperson") &&
    salesConsoleM13StaffPilotGuide.guideItems.some((item) => item.role === "manager") &&
    salesConsoleM13StaffPilotGuide.guideItems.some((item) => item.role === "all-staff");
}

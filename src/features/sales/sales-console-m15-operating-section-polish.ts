export type SalesConsoleM15OperatingSectionPolishItem = {
  dailyUse: string;
  scanTarget: string;
  section: "Salesperson Today" | "Lead Operations" | "Manager Command Center" | "Deal Desk" | "Inventory Intelligence";
  verificationRule: string;
};

export const salesConsoleM15OperatingSectionPolish = {
  items: [
    {
      dailyUse: "Know which customer work needs attention first.",
      scanTarget: "Blocked-now and stale-follow-up groups",
      section: "Salesperson Today",
      verificationRule: "Verify task, customer, and activity source records before contact."
    },
    {
      dailyUse: "Find lead leakage before the team loses response time.",
      scanTarget: "SLA risk, duplicate review, and unassigned leads",
      section: "Lead Operations",
      verificationRule: "Verify CRM owner, latest lead activity, and appointment status."
    },
    {
      dailyUse: "See team risk and decide what needs manager attention today.",
      scanTarget: "Risk queues, approvals visibility, forecast signals, and top opportunities",
      section: "Manager Command Center",
      verificationRule: "Review only; approvals and discounts remain outside this console."
    },
    {
      dailyUse: "Understand deal status without submitting quotes or finance actions.",
      scanTarget: "Manager review needs, scenario gaps, and source prompts",
      section: "Deal Desk",
      verificationRule: "Verify deal source records before discussing payment or scenario."
    },
    {
      dailyUse: "Avoid presenting vehicles with blocked or uncertain readiness.",
      scanTarget: "Readiness, blocker labels, and verify-first inventory",
      section: "Inventory Intelligence",
      verificationRule: "Verify inventory, recon, and availability before presentation."
    }
  ] as const satisfies readonly SalesConsoleM15OperatingSectionPolishItem[],
  readOnly: true
} as const;

export function salesConsoleM15OperatingPolishCoversDailySections() {
  return salesConsoleM15OperatingSectionPolish.items.length === 5;
}

export function salesConsoleM15OperatingPolishExplainsStaffUse() {
  return salesConsoleM15OperatingSectionPolish.items.every((item) =>
    item.dailyUse.length > 0 && item.scanTarget.length > 0
  );
}

export function salesConsoleM15OperatingPolishRemainsReadOnly() {
  return salesConsoleM15OperatingSectionPolish.readOnly &&
    salesConsoleM15OperatingSectionPolish.items.some((item) => item.verificationRule.includes("approvals and discounts remain outside")) &&
    salesConsoleM15OperatingSectionPolish.items.every((item) => item.verificationRule.includes("Verify") || item.verificationRule.includes("Review only"));
}

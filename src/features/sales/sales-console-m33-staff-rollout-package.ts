export type SalesConsoleM33RolloutAudience = {
  audience: "Sales staff" | "Sales managers" | "BDC / lead coordinators" | "Admin / Owner";
  todayUse: string;
  notYet: string;
  supportInstruction: string;
};

export const salesConsoleM33StaffRolloutPackage = {
  milestone: "Milestone 33 - Staff Rollout Package",
  rolloutPosture: "ready-to-brief-staff",
  onePageGuideTitle: "Sales Console MVP Staff Guide",
  openingMessage: "Use Sales Console to see priorities, verify source-aware context, and request manager review. Continue final actions in the approved source systems unless Manager Review Request is the specific Sales Console action you are using.",
  rolloutAudiences: [
    {
      audience: "Sales staff",
      todayUse: "Start in Salesperson Today, review priority work, verify source labels, and use Manager Review Request for manager attention.",
      notYet: "Do not submit quotes, discounts, finance decisions, holds, reservations, or automated customer messages from Sales Console.",
      supportInstruction: "Report confusing rows, stale data, or submit errors to the rollout support owner with customer/deal context."
    },
    {
      audience: "Sales managers",
      todayUse: "Start in Manager Command Center, review team blockers, and monitor Manager Review Workbench.",
      notYet: "Do not resolve discounts, finance, quote approvals, vehicle holds, or customer messages inside Sales Console.",
      supportInstruction: "Escalate role leakage, missing workbench requests, or unclear source labels before expanding access."
    },
    {
      audience: "BDC / lead coordinators",
      todayUse: "Start in Lead Operations, watch duplicate risk, assignment gaps, source freshness, and response-risk context.",
      notYet: "Do not automate outreach or replace CRM lead ownership from Sales Console.",
      supportInstruction: "Report lead-source mismatch, duplicate confusion, or missing assignment context to the rollout support owner."
    },
    {
      audience: "Admin / Owner",
      todayUse: "Use deployment readiness, role verification, Manager Review evidence, and go/no-go panels to control rollout.",
      notYet: "Do not enable broad writes or source-system replacement during MVP deployment.",
      supportInstruction: "Own the support loop, rollback decision, access expansion, and next milestone prioritization."
    }
  ] satisfies SalesConsoleM33RolloutAudience[],
  issueReportFields: ["staff role", "route or tab", "customer/deal/lead reference", "source label shown", "what the user expected", "screenshot if available"],
  returnToSourceSystemRules: [
    "If source data is stale, unavailable, or fallback/source-shaped and the action affects a customer or deal.",
    "If the staff member needs to quote, discount, finance, hold/reserve a vehicle, or message a customer.",
    "If the staff member is unsure whether Sales Console is showing the latest source record.",
    "If Manager Review Request fails or shows an unclear duplicate/conflict state."
  ],
  rolloutCadence: [
    "Brief managers and support owner first.",
    "Open access to one user per role.",
    "Run one operating-day issue collection.",
    "Expand to the first staff group only after go/no-go criteria stay green."
  ]
} as const;

export function salesConsoleM33CoversAllRolloutAudiences() {
  return salesConsoleM33StaffRolloutPackage.rolloutAudiences.map((audience) => audience.audience).join("|") ===
    "Sales staff|Sales managers|BDC / lead coordinators|Admin / Owner";
}

export function salesConsoleM33DefinesIssueReportingFields() {
  return salesConsoleM33StaffRolloutPackage.issueReportFields.includes("staff role") &&
    salesConsoleM33StaffRolloutPackage.issueReportFields.includes("screenshot if available");
}

export function salesConsoleM33ExplainsReturnToSourceSystems() {
  return salesConsoleM33StaffRolloutPackage.returnToSourceSystemRules.some((rule) => rule.includes("quote")) &&
    salesConsoleM33StaffRolloutPackage.returnToSourceSystemRules.some((rule) => rule.includes("stale"));
}

export function salesConsoleM33RolloutCadenceStartsSmall() {
  return salesConsoleM33StaffRolloutPackage.rolloutCadence[1] === "Open access to one user per role." &&
    salesConsoleM33StaffRolloutPackage.rolloutCadence.some((step) => step.includes("one operating-day"));
}

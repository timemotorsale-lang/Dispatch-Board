import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";

export type SalesConsoleM14LeadOperationsGroup = {
  count: number;
  group: "assigned-current" | "duplicate-review" | "sla-risk" | "unassigned-or-placeholder";
  operatingMeaning: string;
  verifyPrompt: string;
};

export const salesConsoleM14LeadOperationsDepth = {
  groups: [
    {
      count: salesConsoleReadAdapterPreview.leadOperations.filter((lead) => lead.assignmentState === "assigned" && lead.freshnessState === "current").length,
      group: "assigned-current",
      operatingMeaning: "Assigned/current leads are the safest read-only lead queue to review first.",
      verifyPrompt: "Verify CRM owner and latest activity before follow-up."
    },
    {
      count: salesConsoleReadAdapterPreview.leadOperations.filter((lead) => lead.label === "Duplicate review").length,
      group: "duplicate-review",
      operatingMeaning: "Duplicate-review leads need source cleanup before staff trust ownership or priority.",
      verifyPrompt: "Verify CRM/customer source records and confirm whether records should be merged or ignored."
    },
    {
      count: salesConsoleReadAdapterPreview.leadOperations.filter((lead) => lead.tone === "danger").length,
      group: "sla-risk",
      operatingMeaning: "SLA-risk leads represent possible customer leakage and should be reviewed early.",
      verifyPrompt: "Verify last activity and appointment status in the lead source system."
    },
    {
      count: salesConsoleReadAdapterPreview.leadOperations.filter((lead) => lead.assignmentState !== "assigned" || lead.freshnessState === "placeholder").length,
      group: "unassigned-or-placeholder",
      operatingMeaning: "Unassigned or placeholder leads are investigation prompts, not trusted work commands.",
      verifyPrompt: "Do not reassign from this console; verify in CRM/source system first."
    }
  ] as const satisfies readonly SalesConsoleM14LeadOperationsGroup[],
  readOnly: true
} as const;

export function salesConsoleM14LeadOperationsHasOperatingGroups() {
  return salesConsoleM14LeadOperationsDepth.groups.length === 4;
}

export function salesConsoleM14LeadOperationsRemainsReadOnly() {
  return salesConsoleM14LeadOperationsDepth.readOnly &&
    salesConsoleM14LeadOperationsDepth.groups.every((group) => group.verifyPrompt.includes("Verify") || group.verifyPrompt.includes("Do not"));
}

export function salesConsoleM14LeadOperationsExplainsSlaAndAssignment() {
  return salesConsoleM14LeadOperationsDepth.groups.some((group) => group.group === "sla-risk") &&
    salesConsoleM14LeadOperationsDepth.groups.some((group) => group.group === "unassigned-or-placeholder");
}

export const salesConsoleManagerQueues = [
  { title: "Review Queue", count: "17", drilldowns: ["REV-1001 cash sale trade review", "REV-1002 BHPH compliance review", "REV-1003 LTO terms review"] },
  { title: "Stalled Revenue", count: "$68,430", drilldowns: ["Samantha Lee blocked by pay stub", "Maria Garcia credit app stale", "David Brown estimate awaiting customer"] },
  { title: "SLA Risk", count: "12", drilldowns: ["No response > 30m", "Appointments at risk", "Tasks overdue"] },
  { title: "Approval Backlog", count: "9", drilldowns: ["Finance approvals governed", "LTO program approvals governed", "Warranty authorizations governed"] },
  { title: "Coaching Opportunities", count: "6", drilldowns: ["Low show rate", "Low gross per unit", "Overdue follow-ups"] },
  { title: "Forecast Confidence", count: "72%", drilldowns: ["Best Case $512K", "Commit $436K", "Gap $76K"] }
] as const;

export function salesConsoleManagerCommandHasDrilldowns() {
  return salesConsoleManagerQueues.every((queue) => queue.drilldowns.length > 0);
}

export function salesConsoleManagerCommandKeepsApprovalsGoverned() {
  return salesConsoleManagerQueues.some((queue) => queue.drilldowns.some((item) => item.toLowerCase().includes("governed")));
}

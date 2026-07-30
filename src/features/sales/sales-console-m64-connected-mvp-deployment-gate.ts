export const salesConsoleM64ReadinessAreas = [
  "appointment integration",
  "Customer 360 integration",
  "task/promise integration",
  "inventory integration",
  "evidence upload foundation",
  "activity recording",
  "federated search",
  "work queue algorithm",
  "lead workflow logic",
  "inventory match algorithm",
  "Revenue Desk workflow rules",
  "Manager Command algorithms",
  "risky workflows blocked",
  "performance acceptable",
  "staff usability"
] as const;

export type SalesConsoleM64ReadinessArea = (typeof salesConsoleM64ReadinessAreas)[number];

export type SalesConsoleM64ReadinessItem = {
  area: SalesConsoleM64ReadinessArea;
  status: "ready" | "guarded" | "source-controlled" | "needs-review";
  owner: "Sales Console" | "Source System" | "Admin / Owner" | "Sales Manager";
  evidence: string;
};

export const salesConsoleM64ConnectedMvpGate: SalesConsoleM64ReadinessItem[] = [
  { area: "appointment integration", status: "source-controlled", owner: "Source System", evidence: "Appointment records map into Sales Console context; scheduling writes stay in calendar." },
  { area: "Customer 360 integration", status: "source-controlled", owner: "Source System", evidence: "Customer identity, consent, timeline, cases, documents, and promises map from CRM/customer surfaces." },
  { area: "task/promise integration", status: "source-controlled", owner: "Source System", evidence: "Tasks and promises show due/owner/blocker/evidence context; completion writes remain governed." },
  { area: "inventory integration", status: "source-controlled", owner: "Source System", evidence: "Inventory maps availability, readiness, pricing posture, blockers, and source vehicle links." },
  { area: "evidence upload foundation", status: "guarded", owner: "Sales Console", evidence: "Evidence records require allowed type, size, subject link, audit, and idempotency metadata." },
  { area: "activity recording", status: "guarded", owner: "Sales Console", evidence: "Internal activity, notes, promises, next action, document events, and manager help are command-scoped." },
  { area: "federated search", status: "ready", owner: "Sales Console", evidence: "Search supports categories, role visibility, empty states, and read-only open-context behavior." },
  { area: "work queue algorithm", status: "ready", owner: "Sales Console", evidence: "Queue ranking uses deterministic score, group, reasons, and next best action." },
  { area: "lead workflow logic", status: "ready", owner: "Sales Console", evidence: "Lead logic covers SLA, duplicate risk, routing, conversion, and escalation visibility." },
  { area: "inventory match algorithm", status: "ready", owner: "Sales Console", evidence: "Match logic scores budget, body, readiness, availability, age, market, gross, finance, preference, and blockers." },
  { area: "Revenue Desk workflow rules", status: "ready", owner: "Sales Console", evidence: "Every revenue lane has required fields, next actions, manager triggers, handoffs, and governed actions." },
  { area: "Manager Command algorithms", status: "ready", owner: "Sales Manager", evidence: "Manager queues cover stalled revenue, SLA breach, reviews, backlog visibility, coaching, and forecast confidence." },
  { area: "risky workflows blocked", status: "ready", owner: "Admin / Owner", evidence: "Messaging, quote submission, finance decisions, discounts, holds, reservations, and contracts stay blocked or source-controlled." },
  { area: "performance acceptable", status: "needs-review", owner: "Admin / Owner", evidence: "Production build should be attempted after local Prisma DLL lock is cleared." },
  { area: "staff usability", status: "needs-review", owner: "Admin / Owner", evidence: "Staff review should confirm users can find work, search, inspect source context, and record safe internal activity." }
];

export function salesConsoleM64GateCoversEveryArea() {
  const areas = new Set(salesConsoleM64ConnectedMvpGate.map((item) => item.area));

  return salesConsoleM64ReadinessAreas.every((area) => areas.has(area));
}

export function salesConsoleM64RiskyWorkflowsRemainBlocked() {
  const riskyItem = salesConsoleM64ConnectedMvpGate.find((item) => item.area === "risky workflows blocked");

  return riskyItem?.status === "ready" && riskyItem.evidence.includes("quote submission") && riskyItem.evidence.includes("finance decisions");
}

export function salesConsoleM64ReadyCount() {
  return salesConsoleM64ConnectedMvpGate.filter(
    (item) => item.status === "ready" || item.status === "guarded" || item.status === "source-controlled"
  ).length;
}

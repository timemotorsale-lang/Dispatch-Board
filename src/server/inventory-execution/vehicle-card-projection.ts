export type VehicleCardReadiness = { code: string; label: string; state: "READY" | "NOT_READY" | "BLOCKED" | "WAITING" | "UNKNOWN" | "STALE" | "NOT_APPLICABLE"; detail?: string };

export type VehicleLifecycleCardProjection = {
  identity: { vehicleId: string; inventoryUnitId: string; inventoryNumber: string; description: string; identifier: string; imageUrl: string | null };
  health: { label: "At Risk" | "On Track" | "Waiting"; tone: "critical" | "healthy" | "waiting" };
  context: { stage: string; stageAgeLabel: string; location: string; owner: string; executor: string; target: string; freshness: string };
  flowClock: Array<{ code: "ACTIVE_WORK" | "APPROVED_WAIT" | "UNCLASSIFIED_DELAY"; label: string; state: "ACTIVE" | "INACTIVE" | "UNKNOWN"; durationLabel: string }>;
  constraint: { title: string; detail: string; recovery: string | null; state: "BLOCKED" | "WAITING" | "CLEAR" };
  action: { title: string; due: string; confidence: string; reason: string; authority: string };
  currentWork: { taskId: string; title: string } | null;
  stagedWork: { taskId: string; title: string } | null;
  readiness: VehicleCardReadiness[];
  evidence: { satisfied: number | null; required: number | null; remainingLabel: string };
  financial: Array<{ label: string; value: string; source: string }>;
  linkedWork: { tasks: number; repairOrders: number; approvals: number };
  activity: Array<{ id: string; at: string; summary: string }>;
  workbenchHref: string;
  commands: { assignHref: string; reviewApprovalHref: string | null; resolveBlockerHref: string | null; escalateHref: string };
};

const words = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const date = (value: Date | string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function buildVehicleLifecycleCardProjection(input: {
  inventoryUnit: { id: string; inventoryNumber: string; lifecycleStage: string; operatingState: string; ageDays: number; overdue: boolean; nextAction: string; stateReason: string | null; targetAt: Date | string; exposureCents: number; owner: string; location?: string | null; vehicle: { id: string; vehicleNumber: string; vin: string | null; year: number | null; make: string | null; model: string | null } };
  context?: { tasks?: Array<{ id: string; title?: string | null; status?: string }>; repairOrders?: unknown[]; decisions?: unknown[]; auditEvents?: Array<{ id: string; occurredAt: Date | string; eventType: string; reason: string }> } | null;
  freshness: string;
}): VehicleLifecycleCardProjection {
  const unit = input.inventoryUnit, waiting = unit.operatingState === "WAITING", blocked = unit.operatingState === "BLOCKED", risk = blocked || unit.overdue;
  const tasks = input.context?.tasks ?? [], current = tasks.find(task => task.status === "IN_PROGRESS") ?? tasks[0] ?? null, staged = tasks.find(task => task.id !== current?.id && ["NOT_STARTED", "READY_FOR_REVIEW"].includes(task.status ?? "")) ?? null;
  const params = new URLSearchParams({ inventoryUnitId: unit.id });
  return {
    identity: { vehicleId: unit.vehicle.id, inventoryUnitId: unit.id, inventoryNumber: unit.inventoryNumber, description: [unit.vehicle.year, unit.vehicle.make, unit.vehicle.model].filter(Boolean).join(" ") || unit.vehicle.vehicleNumber, identifier: unit.vehicle.vin ?? unit.vehicle.vehicleNumber, imageUrl: null },
    health: risk ? { label: "At Risk", tone: "critical" } : waiting ? { label: "Waiting", tone: "waiting" } : { label: "On Track", tone: "healthy" },
    context: { stage: words(unit.lifecycleStage), stageAgeLabel: `${unit.ageDays} days`, location: unit.location ?? "Location unavailable", owner: unit.owner, executor: current ? "Task owner" : "No current executor", target: date(unit.targetAt), freshness: input.freshness },
    flowClock: [
      { code: "ACTIVE_WORK", label: "Active Work", state: unit.operatingState === "ACTIVE" ? "ACTIVE" : "INACTIVE", durationLabel: "Duration unavailable" },
      { code: "APPROVED_WAIT", label: "Approved Wait", state: waiting ? "ACTIVE" : "INACTIVE", durationLabel: "Duration unavailable" },
      { code: "UNCLASSIFIED_DELAY", label: "Unclassified Delay", state: blocked ? "ACTIVE" : "INACTIVE", durationLabel: "Duration unavailable" }
    ],
    constraint: blocked || waiting ? { title: unit.stateReason ?? (blocked ? "Blocked work" : "Approved wait"), detail: `Authoritative InventoryUnit state: ${words(unit.operatingState)}.`, recovery: "Open the Workbench to document recovery ownership and next check.", state: blocked ? "BLOCKED" : "WAITING" } : { title: "No controlling constraint recorded", detail: "The authoritative InventoryUnit is active.", recovery: null, state: "CLEAR" },
    action: { title: unit.nextAction, due: date(unit.targetAt), confidence: "Data sufficiency: partial", reason: "InventoryUnit next action and target", authority: "Human authorization remains required for governed commands." },
    currentWork: current ? { taskId: current.id, title: current.title?.trim() || "Current linked task" } : null,
    stagedWork: staged ? { taskId: staged.id, title: staged.title?.trim() || "Staged linked task" } : null,
    readiness: [
      { code: "VEHICLE", label: "Vehicle", state: "READY", detail: "Canonical active vehicle" },
      { code: "PARTS", label: "Parts", state: "UNKNOWN", detail: "Open Workbench for authoritative Parts readiness" },
      { code: "APPROVAL", label: "Approval", state: (input.context?.decisions?.length ?? 0) > 0 ? "WAITING" : "NOT_APPLICABLE" },
      { code: "WORKSPACE", label: "Work area", state: "UNKNOWN", detail: "Capacity projection unavailable" }
    ],
    evidence: { satisfied: null, required: null, remainingLabel: "Evidence totals unavailable in this projection" },
    financial: [
      { label: "Recorded exposure", value: money(unit.exposureCents), source: "Inventory ledger" },
      { label: "Recon", value: "Unavailable", source: "Repair Order" },
      { label: "Carrying", value: "Unavailable", source: "Finance policy" },
      { label: "Forecast margin", value: "Unavailable", source: "Approved forecast" }
    ],
    linkedWork: { tasks: tasks.length, repairOrders: input.context?.repairOrders?.length ?? 0, approvals: input.context?.decisions?.length ?? 0 },
    activity: (input.context?.auditEvents ?? []).slice(0, 4).map(event => ({ id: event.id, at: date(event.occurredAt), summary: `${words(event.eventType)} · ${event.reason}` })),
    workbenchHref: `/vehicles/${unit.vehicle.id}/workbench?${params.toString()}`,
    commands: { assignHref: `/vehicles/shop-dispatch?${params.toString()}`, reviewApprovalHref: (input.context?.decisions?.length ?? 0) > 0 ? `/vehicles/governance-decisions?${params.toString()}` : null, resolveBlockerHref: blocked || waiting ? `/vehicles/workflow-operations?${params.toString()}&view=exceptions` : null, escalateHref: `/vehicles/workflow-operations?${params.toString()}&view=exceptions&action=escalate` }
  };
}

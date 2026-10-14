type RecordItem = Record<string, unknown>;

function record(value: unknown): RecordItem {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {};
}

function list(value: unknown): RecordItem[] {
  return Array.isArray(value) ? value.filter((item): item is RecordItem => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function text(value: unknown, fallback = "Unavailable") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dateText(value: unknown) {
  if (!(typeof value === "string" || value instanceof Date)) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toISOString();
}

export function buildVehicleWorkbenchReturnHref(vehicleId: string) {
  return `/vehicles/${encodeURIComponent(vehicleId)}/workbench`;
}

export function withVehicleWorkbenchReturn(href: string, vehicleId: string) {
  const [path, rawQuery = ""] = href.split("?");
  const params = new URLSearchParams(rawQuery);
  params.set("returnTo", buildVehicleWorkbenchReturnHref(vehicleId));
  return `${path}?${params.toString()}`;
}

export function summarizeEvidenceCompleteness(evidenceRequirements: unknown) {
  const items = list(record(evidenceRequirements).items);
  const required = items.length;
  const complete = items.filter((item) => item.satisfied === true).length;
  return {
    complete,
    missing: Math.max(0, required - complete),
    required,
    status: required === 0 ? "UNAVAILABLE" : complete === required ? "COMPLETE" : "INCOMPLETE",
    summary: required === 0 ? "No evidence policy is available." : `${complete}/${required} evidence requirement${required === 1 ? "" : "s"} complete.`
  };
}

export function summarizePartsReadiness(parts: { allowed: boolean; demands: RecordItem[] }) {
  if (!parts.allowed) return { blocker: false, needed: 0, ready: 0, status: "RESTRICTED", summary: "Parts access is restricted." };
  const demands = parts.demands;
  const readyStates = new Set(["RESERVED", "READY", "ISSUED", "INSTALLED", "RECONCILED"]);
  const blockedStates = new Set(["REQUESTED", "ORDERED", "BACKORDERED", "WAITING", "UNRESERVED", "PARTIAL"]);
  const ready = demands.filter((demand) => readyStates.has(text(demand.status).toUpperCase())).length;
  const blocker = demands.some((demand) => blockedStates.has(text(demand.status).toUpperCase()));
  return {
    blocker,
    needed: demands.length,
    ready,
    status: demands.length === 0 ? "NO_PARTS_DEMAND" : blocker ? "NOT_READY" : "READY",
    summary: demands.length === 0 ? "No linked parts demand." : `${ready}/${demands.length} linked parts demand${demands.length === 1 ? "" : "s"} ready.`
  };
}

export function chooseVehicleWorkbenchNextAction(input: {
  current: RecordItem | null;
  operation: RecordItem;
  partsReadiness: ReturnType<typeof summarizePartsReadiness>;
  evidenceCompleteness: ReturnType<typeof summarizeEvidenceCompleteness>;
  workUnavailable: boolean;
  unavailableReason?: string | null;
}) {
  if (input.workUnavailable) return { action: "Review unavailable work source", reason: text(input.unavailableReason, "The Workbench cannot invent authoritative work when execution data is unavailable."), tone: "warning" as const };
  if (input.partsReadiness.blocker) return { action: "Confirm parts readiness", reason: "Parts demand is not fully ready, so repair movement may be blocked.", tone: "warning" as const };
  if (input.current?.nextAction) return { action: text(input.current.nextAction), reason: "Current work packet carries the authoritative next action.", tone: "standard" as const };
  if (input.evidenceCompleteness.missing > 0) return { action: "Complete missing evidence", reason: input.evidenceCompleteness.summary, tone: "warning" as const };
  if (input.operation.nextAction) return { action: text(input.operation.nextAction), reason: "Vehicle operation carries the next action.", tone: "standard" as const };
  return { action: "Review vehicle status", reason: "No current work packet is staged; use the overview cards to choose the right work area.", tone: "standard" as const };
}

export function buildVehicleWorkbenchOverview(input: {
  activity: RecordItem[];
  evidence: { allowed: boolean; items: RecordItem[] };
  identity: RecordItem;
  links: Record<string, string>;
  operation: RecordItem;
  parts: { allowed: boolean; demands: RecordItem[] };
  work: { current: RecordItem | null; staged: RecordItem | null; status: string; unavailableReason: string | null };
  workOrders: { allowed: boolean; items: RecordItem[] };
}) {
  const vehicleId = text(input.identity.id, text(input.identity.vehicleNumber, "vehicle"));
  const returnTo = buildVehicleWorkbenchReturnHref(vehicleId);
  const evidenceCompleteness = summarizeEvidenceCompleteness(input.work.current?.evidenceRequirements);
  const partsReadiness = summarizePartsReadiness(input.parts);
  const nextBestAction = chooseVehicleWorkbenchNextAction({
    current: input.work.current,
    evidenceCompleteness,
    operation: input.operation,
    partsReadiness,
    unavailableReason: input.work.unavailableReason,
    workUnavailable: input.work.status === "UNAVAILABLE"
  });
  return {
    currentSituation: {
      blocker: input.operation.operatingState === "BLOCKED" || partsReadiness.blocker ? "Needs attention" : "No active blocker",
      nextAction: nextBestAction.action,
      owner: text(record(input.operation.owner).name, "Unassigned"),
      stage: text(input.operation.stage),
      targetAt: dateText(input.operation.targetAt)
    },
    deepLinks: {
      approvals: withVehicleWorkbenchReturn("/manager-review?scope=inventory&view=approvals", vehicleId),
      audit: withVehicleWorkbenchReturn(input.links.vehicle360, vehicleId),
      evidence: withVehicleWorkbenchReturn(input.links.evidence, vehicleId),
      lifecycle: withVehicleWorkbenchReturn(`/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning`, vehicleId),
      parts: withVehicleWorkbenchReturn(input.links.parts, vehicleId),
      repair: withVehicleWorkbenchReturn(input.workOrders.items[0]?.id ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(text(input.workOrders.items[0].id))}&vehicleId=${encodeURIComponent(vehicleId)}` : `/vehicles/repair-workbench?vehicleId=${encodeURIComponent(vehicleId)}`, vehicleId),
      sales: withVehicleWorkbenchReturn(`/vehicles/inventory-to-frontline?vehicleId=${encodeURIComponent(vehicleId)}`, vehicleId),
      vehicle360: withVehicleWorkbenchReturn(input.links.vehicle360, vehicleId)
    },
    evidenceCompleteness,
    nextBestAction,
    partsReadiness,
    recentActivity: input.activity.slice(0, 3).map((item) => ({ detail: text(item.detail, text(item.source)), id: text(item.id), title: text(item.title), occurredAt: dateText(item.occurredAt) })),
    returnTo,
    workCounts: {
      activity: input.activity.length,
      evidence: input.evidence.items.length,
      parts: input.parts.demands.length,
      repairOrders: input.workOrders.items.length
    }
  };
}

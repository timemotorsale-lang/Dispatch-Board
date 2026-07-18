type Demand = { quantityRequired: number; quantityReserved: number };
type Dispatch = { status: string; technicianUser: { id: string; name: string }; bayResource: { id: string; name: string } | null };
type Job = { id: string; jobNumber: string; description: string; status: string; partDemands: Demand[]; dispatches: Dispatch[] };
type Order = { id: string; repairOrderNumber: string; origin: string; stage: string; operatingState: string; targetAt: Date | string; nextAction: string; stateReason: string | null; ownerUser: { id: string; name: string }; location: { id: string; name: string }; vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null }; customer: { displayName: string } | null; inventoryUnit: { inventoryNumber: string } | null; serviceVisit: { promisedAt: Date | string | null; concernSummary: string }; estimateVersions: Array<{ status: string; authorizations: Array<{ disposition: string }> }>; releaseAuthorization: { id: string } | null; repairJobs: Job[] };

const pipeline = [
  { key: "INTAKE", label: "Intake" },
  { key: "PLAN", label: "Inspect & plan" },
  { key: "READY", label: "Ready" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "REPAIR", label: "In progress" },
  { key: "QC", label: "Quality" },
  { key: "ADVISOR", label: "Advisor review" },
  { key: "HANDOFF", label: "Handoff" },
] as const;

type PipelineKey = (typeof pipeline)[number]["key"];

function pipelineStage(order: Order): PipelineKey {
  if (order.stage === "HANDOFF") return "HANDOFF";
  if (order.stage === "ADVISOR_REVIEW") return "ADVISOR";
  if (order.stage === "QUALITY_CONTROL" || order.repairJobs.some(job => job.status === "READY_FOR_QC")) return "QC";
  if (order.repairJobs.some(job => ["IN_PROGRESS", "PAUSED"].includes(job.status))) return "REPAIR";
  if (order.repairJobs.some(job => job.status === "DISPATCHED")) return "ASSIGNED";
  if (order.stage === "READY_FOR_REPAIR") return "READY";
  if (["DIAGNOSIS", "ESTIMATE", "AUTHORIZATION"].includes(order.stage)) return "PLAN";
  return "INTAKE";
}

function waitingParts(order: Order) { return order.repairJobs.some(job => job.status === "WAITING_PARTS" || job.partDemands.some(demand => demand.quantityReserved < demand.quantityRequired)); }
function unassigned(order: Order) { return order.repairJobs.some(job => job.status === "READY_FOR_REPAIR" && !job.dispatches.length); }
function overdue(order: Order, now: Date) { return new Date(order.targetAt) < now; }
function promiseRisk(order: Order, now: Date) { const at = order.serviceVisit.promisedAt ? new Date(order.serviceVisit.promisedAt) : new Date(order.targetAt); return at.getTime() <= now.getTime() + 4 * 60 * 60 * 1000 && !["HANDOFF","CLOSED"].includes(order.stage); }
function vehicle(order: Order) { return [order.vehicle.year,order.vehicle.make,order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber; }

export function buildShopReconProjection(orders: Order[], now: Date) {
  const customerRepair = orders.filter(order => order.origin === "CUSTOMER_REPAIR").length, inventoryRecon = orders.filter(order => order.origin === "INVENTORY_RECON").length;
  const waiting = orders.filter(waitingParts), unassignedOrders = orders.filter(unassigned), atRisk = orders.filter(order => overdue(order, now) || promiseRisk(order, now) || order.operatingState !== "ACTIVE");
  const projectedOnTime = orders.length ? Math.round(((orders.length - atRisk.length) / orders.length) * 100) : 100;
  const items = orders.map(order => { const waits = waitingParts(order), noOwner = unassigned(order), risk = overdue(order, now) || promiseRisk(order, now) || order.operatingState !== "ACTIVE"; const activeDispatches = order.repairJobs.flatMap(job => job.dispatches); const approvalPending = order.estimateVersions.some(estimate => estimate.status === "PRESENTED" && !estimate.authorizations.some(auth => ["ACCEPTED","PARTIAL"].includes(auth.disposition))); return { id: order.id, repairOrderNumber: order.repairOrderNumber, origin: order.origin, stage: order.stage, operatingState: order.operatingState, targetAt: new Date(order.targetAt).toISOString(), nextAction: order.nextAction, blocker: order.stateReason, owner: order.ownerUser.name, location: order.location.name, vehicle: vehicle(order), subject: order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? order.origin, concern: order.serviceVisit.concernSummary, waitingParts: waits, unassigned: noOwner, atRisk: risk, approvalPending, technician: activeDispatches[0]?.technicianUser.name ?? null, bay: activeDispatches[0]?.bayResource?.name ?? null, jobCount: order.repairJobs.length, qcPending: order.repairJobs.filter(job => job.status === "READY_FOR_QC").length }; }).sort((a,b) => Number(b.atRisk)-Number(a.atRisk) || Number(b.waitingParts)-Number(a.waitingParts) || a.targetAt.localeCompare(b.targetAt));
  return { contractVersion: "shop-recon/r7.0.0", freshness: "COMPLETE", generatedAt: now.toISOString(), totals: { openOrders: orders.length, projectedOnTime, waitingParts: waiting.length, unassigned: unassignedOrders.length, atRisk: atRisk.length, customerRepair, inventoryRecon }, pipeline: pipeline.map(stage => ({ key: stage.key, label: stage.label, count: orders.filter(order => pipelineStage(order) === stage.key).length })), items, reviews: { quality: items.reduce((sum,item)=>sum+item.qcPending,0), comebacks: 0 }, approvals: { estimate: items.filter(item=>item.approvalPending).length }, capability: { partsRecommendations: "ADVISORY_HUMAN_APPROVAL", externalAdapters: "DISABLED", automaticDiscipline: "PROHIBITED" } };
}

import { getShopReconFoundation } from "./foundation";
import { SHOP_RECON_STAGES } from "./foundation";
import { getShopReconPilotScenario } from "./pilot";
import { deriveShopReconWorkflow, evaluateShopReconStageWip, scoreShopReconPriority, shopReconLaneIntelligence } from "./workflow";

type Demand = { quantityRequired: number; quantityReserved: number };
type Dispatch = { status: string; technicianUser: { id: string; name: string }; bayResource: { id: string; name: string } | null };
type Job = { id: string; jobNumber: string; description: string; status: string; partDemands: Demand[]; dispatches: Dispatch[] };
type Order = { id: string; repairOrderNumber: string; origin: string; vehicleId?: string; vin?: string | null; inventoryLifecycleStage?: string | null; stage: string; stageStartedAt: Date | string; operatingState: string; targetAt: Date | string; nextAction: string; stateReason: string | null; ownerUser: { id: string; name: string }; location: { id: string; name: string }; vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null }; customer: { displayName: string } | null; inventoryUnit: { inventoryNumber: string } | null; serviceVisit: { arrivedAt: Date | string; keysReceivedCount: number; promisedAt: Date | string | null; concernSummary: string }; inspectionVersions?: unknown[]; diagnosisVersions?: unknown[]; estimateVersions: Array<{ status: string; totalCents?: number | null; authorizations: Array<{ disposition: string }> }>; releaseAuthorization: { id: string } | null; repairJobs: Job[]; shopReconLifecycle?: { stage: import("./foundation").ShopReconStageCode; operatingState: string; stageStartedAt: Date | string; zoneCode: string; blockerCodes: unknown; targetAt: Date | string; nextAction: string } | null };

function waitingParts(order: Order) { return order.repairJobs.some(job => job.status === "WAITING_PARTS" || job.partDemands.some(demand => demand.quantityReserved < demand.quantityRequired)); }
function unassigned(order: Order) { return order.repairJobs.some(job => job.status === "READY_FOR_REPAIR" && !job.dispatches.length); }
function overdue(order: Order, now: Date) { return new Date(order.targetAt) < now; }
function promiseRisk(order: Order, now: Date) { const at = order.serviceVisit.promisedAt ? new Date(order.serviceVisit.promisedAt) : new Date(order.targetAt); return at.getTime() <= now.getTime() + 4 * 60 * 60 * 1000 && !["HANDOFF","CLOSED"].includes(order.stage); }
function vehicle(order: Order) { return [order.vehicle.year,order.vehicle.make,order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber; }

export function buildShopReconProjection(orders: Order[], now: Date) {
  const customerRepair = orders.filter(order => order.origin === "CUSTOMER_REPAIR").length;
  const inventoryRecon = orders.filter(order => order.origin === "INVENTORY_RECON").length;
  const items = orders.map(order => {
    const workflow = deriveShopReconWorkflow(order, now);
    const waits = waitingParts(order);
    const noOwner = unassigned(order);
    const qcPending = order.repairJobs.filter(job => job.status === "READY_FOR_QC").length;
    const approvalPending = order.estimateVersions.some(estimate => estimate.status === "PRESENTED" && !estimate.authorizations.some(auth => ["ACCEPTED", "PARTIAL"].includes(auth.disposition)));
    const lane = shopReconLaneIntelligence(order.origin);
    const operationalTargetOverdue = overdue(order, now);
    const commitmentAtRisk = lane.workLane === "CUSTOMER_REPAIR" ? promiseRisk(order, now) : operationalTargetOverdue;
    const risk = operationalTargetOverdue || commitmentAtRisk || workflow.operatingState !== "ACTIVE" || ["BREACHED", "CRITICAL"].includes(workflow.targetBand);
    const priority = scoreShopReconPriority({ workLane: lane.workLane, targetBand: workflow.targetBand, operatingState: workflow.operatingState, commitmentAtRisk, operationalTargetOverdue, waitingParts: waits, approvalPending, unassigned: noOwner, qcPending });
    const activeDispatches = order.repairJobs.flatMap(job => job.dispatches);
    const authorizedEstimateCents = order.estimateVersions.filter(estimate => estimate.authorizations.some(auth => ["ACCEPTED", "PARTIAL"].includes(auth.disposition))).reduce((sum, estimate) => sum + (typeof estimate.totalCents === "number" ? estimate.totalCents : 0), 0);
    const blocker = workflow.blockerCodes[0] ?? null;
    const waitingReason = blocker ?? (waits ? "WAITING_PARTS" : approvalPending ? "WAITING_APPROVAL" : noOwner ? "WAITING_ASSIGNMENT" : qcPending > 0 ? "WAITING_QUALITY_REVIEW" : workflow.operatingState !== "ACTIVE" ? `LIFECYCLE_${workflow.operatingState}` : null);
    const cycleElapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(order.serviceVisit.arrivedAt).getTime()) / 60000));
    return { id: order.id, vehicleId: order.vehicleId ?? null, vin: order.vin ?? null, inventoryLifecycleStage: order.inventoryLifecycleStage ?? null, repairOrderNumber: order.repairOrderNumber, origin: order.origin, pilot: getShopReconPilotScenario(order.repairOrderNumber), ...lane, stage: order.stage, shopLifecycleStage: workflow.stage, shopLifecycleLabel: workflow.stageLabel, shopLifecycleOrder: workflow.stageOrder, shopZoneCode: workflow.zoneCode, stageTargetBand: workflow.targetBand, stageElapsedMinutes: workflow.elapsedMinutes, cycleElapsedMinutes, waitingReason, priorityScore: priority.score, priorityBand: priority.band, priorityReasons: priority.reasons, operatingState: workflow.operatingState, targetAt: new Date(order.shopReconLifecycle?.targetAt ?? order.targetAt).toISOString(), nextAction: order.shopReconLifecycle?.nextAction ?? order.nextAction, blocker, owner: order.ownerUser.name, location: order.location.name, vehicle: vehicle(order), subject: order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? order.origin, concern: order.serviceVisit.concernSummary, waitingParts: waits, unassigned: noOwner, atRisk: risk, approvalPending, technician: activeDispatches[0]?.technicianUser.name ?? null, bay: activeDispatches[0]?.bayResource?.name ?? null, jobCount: order.repairJobs.length, qcPending, authorizedEstimateCents, costCaptureStatus: authorizedEstimateCents > 0 ? "AUTHORIZED_COST_CAPTURED" : "COST_CAPTURE_NEEDED" };
  }).sort((a, b) => b.priorityScore - a.priorityScore || a.targetAt.localeCompare(b.targetAt));
  const atRisk = items.filter(item => item.atRisk).length;
  const projectedOnTime = orders.length ? Math.round(((orders.length - atRisk) / orders.length) * 100) : 100;
  const pipeline = SHOP_RECON_STAGES.map(stage => {
    const count = items.filter(item => item.shopLifecycleStage === stage.code).length;
    const wip = evaluateShopReconStageWip(stage.code, count);
    return { key: stage.code, label: stage.label, order: stage.order, count, wipLimit: wip.limit, wipBreached: wip.breached };
  });
  return { contractVersion: "shop-recon/r11.0.0", freshness: "COMPLETE", generatedAt: now.toISOString(), foundation: getShopReconFoundation(), totals: { openOrders: orders.length, projectedOnTime, waitingParts: items.filter(item => item.waitingParts).length, unassigned: items.filter(item => item.unassigned).length, atRisk, customerRepair, inventoryRecon, authorizedReconCents: items.reduce((sum, item) => sum + item.authorizedEstimateCents, 0), missingCostCapture: items.filter(item => item.costCaptureStatus === "COST_CAPTURE_NEEDED").length }, pipeline, items, reviews: { quality: items.reduce((sum, item) => sum + item.qcPending, 0), comebacks: 0 }, approvals: { estimate: items.filter(item => item.approvalPending).length }, capability: { partsRecommendations: "ADVISORY_HUMAN_APPROVAL", externalAdapters: "DISABLED", automaticDiscipline: "PROHIBITED", unifiedCommandCenter: "ACTIVE", exceptionLoopEngine: "ACTIVE_UI_GUIDANCE", inventoryShopHandoff: "LANE_AWARE_RETURN_PATH", rapidFlow: "CALM_DEFAULT_HIGH_VOLUME_OPTIONAL" } };
}

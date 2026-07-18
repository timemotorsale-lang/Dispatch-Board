import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser, isGeneralManager, isManager } from "@/server/policies/access";

type QueueKind = "REVIEW" | "APPROVAL";
type QueueItem = {
  id: string; kind: QueueKind; domain: string; type: string; title: string; subject: string;
  owner: string; location: string; dueAt: string; ageHours: number; overdue: boolean;
  version: number; policyVersion: string | null; amountCents: number | null;
  evidence: string[]; state: string; actionLabel: string; actionHref: string;
};

const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value as Record<string, unknown>[] : [];
const cents = (...values: unknown[]) => { const value = values.find(candidate => Number.isInteger(Number(candidate))); return value == null ? null : Number(value); };
const iso = (value: Date) => value.toISOString();
const age = (now: Date, value: Date) => Math.max(0, Math.round((now.getTime() - value.getTime()) / 3_600_000));

function authorize(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Enterprise governance access requires manager privileges.");
  return user;
}

export async function getInventoryGovernanceConsole(actor: AuthenticatedUser | null, input: { organizationId?: string; now?: Date } = {}) {
  const user = authorize(actor), organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, now = input.now ?? new Date();
  const accesses = isGeneralManager(user) ? [] : await prisma.userLocationAccess.findMany({ where: { userId: user.id, canViewSchedule: true, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] }, select: { locationId: true } });
  const locationIds = accesses.map(item => item.locationId), locationWhere = isGeneralManager(user) ? {} : { locationId: { in: locationIds } };

  const [tasks, acquisition, frontline, retail, disposition, purchaseOrders, inventoryStageGroups, repairStateGroups, audit, failedCommands, pendingOutbox, checkpoints, evidenceDue, grants, flags, policies, roles, users, locations] = await Promise.all([
    prisma.task.findMany({ where: { status: { in: ["READY_FOR_REVIEW", "WAITING_ON_APPROVAL"] } }, orderBy: { dueAt: "asc" }, take: 200, include: { assignedUser: { select: { name: true } } } }),
    prisma.inventoryAcquisitionCase.findMany({ where: { organizationId, ...locationWhere, status: { in: ["APPRAISAL_REVIEW", "AUTHORIZATION_PENDING", "REVERSAL_REVIEW", "EXCEPTION"] } }, orderBy: { expiresAt: "asc" }, take: 200, include: { location: { select: { name: true } }, ownerUser: { select: { name: true } }, vehicle: { select: { vehicleNumber: true, year: true, make: true, model: true } } } }),
    prisma.inventoryFrontlineWorkflow.findMany({ where: { organizationId, ...locationWhere, operatingState: "BLOCKED" }, orderBy: { targetAt: "asc" }, take: 200, include: { location: { select: { name: true } }, ownerUser: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } } }),
    prisma.inventoryRetailCompletion.findMany({ where: { organizationId, ...locationWhere, operatingState: { in: ["BLOCKED", "WAITING"] } }, orderBy: { targetAt: "asc" }, take: 200, include: { location: { select: { name: true } }, ownerUser: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } } }),
    prisma.inventoryDispositionCase.findMany({ where: { organizationId, ...locationWhere, OR: [{ stage: "APPROVAL" }, { operatingState: "BLOCKED" }] }, orderBy: { targetAt: "asc" }, take: 200, include: { location: { select: { name: true } }, ownerUser: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } } }),
    prisma.partPurchaseOrder.findMany({ where: { organizationId, ...locationWhere, status: "DRAFT" }, orderBy: { createdAt: "asc" }, take: 200, include: { location: { select: { name: true } }, createdByUser: { select: { name: true } }, vendor: { select: { name: true } } } }),
    prisma.inventoryUnit.groupBy({ by: ["lifecycleStage"], where: { organizationId, ...locationWhere, closedAt: null }, _count: { _all: true } }),
    prisma.repairOrder.groupBy({ by: ["stage"], where: { organizationId, ...locationWhere, closedAt: null }, _count: { _all: true } }),
    prisma.enterpriseAuditEvent.findMany({ where: { organizationId, ...(isGeneralManager(user) ? {} : { OR: [{ locationId: { in: locationIds } }, { locationId: null }] }) }, orderBy: { occurredAt: "desc" }, take: 100, include: { actorUser: { select: { name: true } }, location: { select: { name: true } } } }),
    prisma.enterpriseCommandLedger.count({ where: { organizationId, status: "FAILED", createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    prisma.enterpriseOutboxMessage.count({ where: { organizationId, status: { in: ["PENDING", "PROCESSING", "DEAD_LETTER"] } } }),
    prisma.enterpriseProjectionCheckpoint.findMany({ where: { organizationId }, orderBy: { lagSeconds: "desc" }, take: 100 }),
    prisma.vehicleEvidenceObject.count({ where: { organizationId, status: { not: "DELETED" }, retentionUntil: { lte: now } } }),
    prisma.vehicleCapabilityGrant.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" }, include: { user: { select: { name: true } }, location: { select: { name: true } } } }),
    prisma.vehicleOperationsFeatureFlag.findMany({ where: { organizationId }, orderBy: [{ code: "asc" }, { locationId: "asc" }], include: { location: { select: { name: true } } } }),
    prisma.vehiclePolicyVersion.findMany({ where: { organizationId }, orderBy: [{ policyCode: "asc" }, { version: "desc" }], take: 100 }),
    prisma.role.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { userRoles: true, roleDuties: true } } } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, userRoles: { select: { role: { select: { name: true } } } } } }),
    prisma.location.findMany({ where: { organizationId, ...(isGeneralManager(user) ? {} : { id: { in: locationIds } }) }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } })
  ]);

  const queue: QueueItem[] = [];
  for (const item of tasks) queue.push({ id: `TASK:${item.id}`, kind: item.status === "READY_FOR_REVIEW" ? "REVIEW" : "APPROVAL", domain: item.workflowArea, type: "TASK", title: item.title, subject: item.vehicleReference ?? item.customerReference ?? item.id, owner: item.assignedUser.name, location: "Board scope", dueAt: iso(item.dueAt), ageHours: age(now, item.readyForReviewAt ?? item.updatedAt), overdue: item.dueAt < now, version: 1, policyVersion: null, amountCents: null, evidence: [item.requiresManagerApproval ? "Manager approval required" : "Review-ready evidence", item.blockerReason ?? "Task state and checklist"], state: item.status, actionLabel: "Open task decision", actionHref: `/tasks/${item.id}` });
  for (const item of acquisition) { const appraisal = object(item.appraisalSnapshot), recommendation = object(item.recommendationSnapshot); queue.push({ id: `ACQUISITION:${item.id}`, kind: item.status === "AUTHORIZATION_PENDING" ? "APPROVAL" : "REVIEW", domain: "ACQUISITION", type: item.status, title: `${item.status === "AUTHORIZATION_PENDING" ? "Purchase authorization" : "Acquisition review"} · ${item.vehicle.vehicleNumber}`, subject: [item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" "), owner: item.ownerUser.name, location: item.location.name, dueAt: iso(item.expiresAt), ageHours: age(now, item.updatedAt), overdue: item.expiresAt < now, version: item.version, policyVersion: String(recommendation.policyVersion ?? "R4 governed policy"), amountCents: cents(recommendation.recommendedAmountCents, appraisal.highCents), evidence: ["Identity and evidence snapshot", "Disposition appraisal and recommendation"], state: item.status, actionLabel: "Open acquisition case", actionHref: `/vehicles/acquisition-appraisal?caseId=${item.id}` }); }
  for (const item of frontline) queue.push({ id: `FRONTLINE:${item.id}`, kind: "REVIEW", domain: "INVENTORY_TO_FRONTLINE", type: "BLOCKER", title: `Blocked frontline workflow · ${item.inventoryUnit.inventoryNumber}`, subject: item.nextAction, owner: item.ownerUser.name, location: item.location.name, dueAt: iso(item.targetAt), ageHours: age(now, item.updatedAt), overdue: item.targetAt < now, version: item.version, policyVersion: item.policyVersion, amountCents: null, evidence: ["Exception snapshot", "Current stage and downstream gate state"], state: `${item.stage}/${item.operatingState}`, actionLabel: "Open frontline workflow", actionHref: `/vehicles/inventory-to-frontline?workflowId=${item.id}` });
  for (const item of retail) { const sale = object(item.saleAuthorizationSnapshot); queue.push({ id: `RETAIL:${item.id}`, kind: item.stage === "SALE_AUTHORIZATION" ? "APPROVAL" : "REVIEW", domain: "RETAIL_COMPLETION", type: item.stage, title: `Retail completion · ${item.inventoryUnit.inventoryNumber}`, subject: item.nextAction, owner: item.ownerUser.name, location: item.location.name, dueAt: iso(item.targetAt), ageHours: age(now, item.updatedAt), overdue: item.targetAt < now, version: item.version, policyVersion: item.policyVersion, amountCents: cents(sale.amountCents, sale.saleAmountCents), evidence: ["Sale/delivery exact-version snapshot", "Readiness and exception evidence"], state: `${item.stage}/${item.operatingState}`, actionLabel: "Open retail completion", actionHref: `/vehicles/retail-completion?completionId=${item.id}` }); }
  for (const item of disposition) { const proposal = list(item.proposalVersions).at(-1) ?? {}; queue.push({ id: `DISPOSITION:${item.id}`, kind: item.stage === "APPROVAL" ? "APPROVAL" : "REVIEW", domain: "DISPOSITION_WHOLESALE", type: item.stage === "APPROVAL" ? "CHANNEL_PRICE_RESERVE" : "EXCEPTION", title: `${item.stage === "APPROVAL" ? "Disposition approval" : "Disposition exception"} · ${item.inventoryUnit.inventoryNumber}`, subject: item.nextAction, owner: item.ownerUser.name, location: item.location.name, dueAt: iso(item.targetAt), ageHours: age(now, item.updatedAt), overdue: item.targetAt < now, version: item.version, policyVersion: String(proposal.policyVersion ?? "R9 governed policy"), amountCents: cents(proposal.askingCents, proposal.reserveCents), evidence: ["Exact proposal and policy version", "Appraisal, reserve, fees, and channel evidence"], state: `${item.stage}/${item.operatingState}`, actionLabel: "Open disposition decision", actionHref: `/vehicles/disposition-wholesale?caseId=${item.id}` }); }
  for (const item of purchaseOrders) queue.push({ id: `PARTS_PO:${item.id}`, kind: "APPROVAL", domain: "PARTS", type: "PURCHASE_ORDER", title: `Purchase order approval · ${item.purchaseOrderNumber}`, subject: item.vendor.name, owner: item.createdByUser.name, location: item.location.name, dueAt: iso(item.createdAt), ageHours: age(now, item.createdAt), overdue: false, version: item.version, policyVersion: "Parts purchase authority", amountCents: item.orderedTotalCents, evidence: ["Frozen line and vendor comparison", "Exact PO amount and version"], state: item.status, actionLabel: "Open Parts approvals", actionHref: "/vehicles/parts-operations?view=purchase-orders" });
  queue.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueAt.localeCompare(b.dueAt));

  const reviews = queue.filter(item => item.kind === "REVIEW"), approvals = queue.filter(item => item.kind === "APPROVAL");
  const facts = [
    { code: "INV_OPEN_UNITS", label: "Open inventory units", value: inventoryStageGroups.reduce((sum, item) => sum + item._count._all, 0), unit: "COUNT", definitionVersion: "INV-KPI-001/v1", quality: "AUTHORITATIVE", drillHref: "/vehicles/control-tower" },
    { code: "SHOP_OPEN_ORDERS", label: "Open Shop orders", value: repairStateGroups.reduce((sum, item) => sum + item._count._all, 0), unit: "COUNT", definitionVersion: "SHOP-KPI-001/v1", quality: "AUTHORITATIVE", drillHref: "/vehicles/shop-recon" },
    { code: "GOV_PENDING_REVIEWS", label: "Pending reviews", value: reviews.length, unit: "COUNT", definitionVersion: "GOV-KPI-001/v1", quality: "COMPLETE", drillHref: "/manager-review?scope=inventory&view=reviews" },
    { code: "GOV_PENDING_APPROVALS", label: "Pending approvals", value: approvals.length, unit: "COUNT", definitionVersion: "GOV-KPI-002/v1", quality: "COMPLETE", drillHref: "/manager-review?scope=inventory&view=approvals" },
    { code: "OPS_FAILED_COMMANDS_24H", label: "Failed commands · 24h", value: failedCommands, unit: "COUNT", definitionVersion: "OPS-KPI-001/v1", quality: "AUTHORITATIVE", drillHref: "/administration?view=operations" },
    { code: "OPS_DELIVERY_BACKLOG", label: "Outbox attention", value: pendingOutbox, unit: "COUNT", definitionVersion: "OPS-KPI-002/v1", quality: "AUTHORITATIVE", drillHref: "/administration?view=operations" }
  ];

  return {
    contractVersion: "inventory-governance/r10.0.0", generatedAt: iso(now), scope: { organizationId, locationIds: isGeneralManager(user) ? locations.map(item => item.id) : locationIds, global: isGeneralManager(user) },
    capabilities: { decisions: "CONTEXTUAL_DOMAIN_COMMANDS", exports: "PREVIEW_ONLY_NOT_ACTIVATED", policyPublication: "EXISTING_FOUR_EYES_DOMAIN_COMMANDS", providerOperations: "OBSERVE_ONLY" },
    totals: { reviews: reviews.length, approvals: approvals.length, overdue: queue.filter(item => item.overdue).length, failedCommands, outboxAttention: pendingOutbox, retentionDue: evidenceDue },
    reviews, approvals, reports: { facts, inventoryStages: inventoryStageGroups.map(item => ({ code: item.lifecycleStage, count: item._count._all })), repairStates: repairStateGroups.map(item => ({ code: item.stage, count: item._count._all })), snapshot: { cutoffAt: iso(now), timezone: "America/Chicago", restatement: "CURRENT_SNAPSHOT", cohort: "AUTHORIZED_LOCATION_SCOPE" } },
    administration: {
      roles: roles.map(item => ({ id: item.id, name: item.name, users: item._count.userRoles, duties: item._count.roleDuties })),
      users: users.map(item => ({ ...item, roles: item.userRoles.map(role => role.role.name) })), locations,
      grants: grants.map(item => ({ id: item.id, user: item.user.name, capability: item.capability, effect: item.effect, location: item.location?.name ?? "Enterprise", constraints: item.constraints, validFrom: iso(item.validFrom), validTo: item.validTo ? iso(item.validTo) : null })),
      flags: flags.map(item => ({ id: item.id, code: item.code, mode: item.mode, rolloutPercent: item.rolloutPercent, version: item.version, location: item.location?.name ?? "Enterprise", updatedAt: iso(item.updatedAt) })),
      policies: policies.map(item => ({ id: item.id, code: item.policyCode, domain: item.domain, version: item.version, status: item.status, createdByUserId: item.createdByUserId, approvedByUserId: item.approvedByUserId, effectiveFrom: item.effectiveFrom ? iso(item.effectiveFrom) : null, effectiveTo: item.effectiveTo ? iso(item.effectiveTo) : null })),
      operations: { failedCommands24h: failedCommands, outboxAttention: pendingOutbox, retentionDue: evidenceDue, projections: checkpoints.map(item => ({ code: item.projectionCode, lagSeconds: item.lagSeconds, state: item.lastFailureAt && (!item.lastSuccessAt || item.lastFailureAt > item.lastSuccessAt) ? "FAILED" : item.lagSeconds > 60 ? "LAGGING" : "HEALTHY", lastError: item.lastError })) },
      audit: audit.map(item => ({ id: item.id, domain: item.domain, eventType: item.eventType, subjectType: item.subjectType, subjectId: item.subjectId, actor: item.actorUser.name, location: item.location?.name ?? "Enterprise", reason: item.reason, correlationId: item.correlationId, occurredAt: iso(item.occurredAt) }))
    }
  };
}

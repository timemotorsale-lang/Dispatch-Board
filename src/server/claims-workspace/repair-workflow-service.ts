import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { applyClaimWorkflowAction, ClaimWorkflowError, emptyClaimWorkflow, type ClaimWorkflowSource, type ClaimWorkflowState, type WorkflowEstimate } from "@/lib/claim-repair-workflow";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import { hashEnterpriseCommand, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { getClaimWorkspaceReadModel } from "./service";
import { claimsWorkspaceDependencies } from "./repository-factory";
import { claimPermissionStatus } from "@/lib/claim-customer-authorization";

const DOMAIN = "CLAIM_REPAIR_WORKFLOW";
const managerRoles = ["General Manager", "Vehicle Operations Lead", "Service Department Manager"];
const workerRoles = [...managerRoles, "Service Advisor", "Operations Coordinator", "Front Desk Operations Coordinator"];
type Database = PrismaClient | Prisma.TransactionClient;
function actorAccess(actor: AuthenticatedUser | null) {
  if (!actor) throw new ClaimWorkflowError("Sign in before opening claim repair workflow.", 401);
  if (!actor.isActive || !actor.roles.some((role) => workerRoles.includes(role))) throw new ClaimWorkflowError("Claim workflow access is not permitted.", 403);
  return actor;
}
function textKeys(value: Prisma.JsonValue): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function estimateLines(value: Prisma.JsonValue): WorkflowEstimate["lines"] {
  if (!Array.isArray(value)) throw new ClaimWorkflowError("Estimate lines need repair planning review.", 409);
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.key !== "string" || typeof entry.description !== "string" || typeof entry.quantity !== "number" || typeof entry.unitPriceCents !== "number") throw new ClaimWorkflowError("Estimate lines need repair planning review.", 409);
    return { key: entry.key, description: entry.description, amountCents: entry.quantity * entry.unitPriceCents };
  });
}
async function sourceFor(database: Database, claimId: string): Promise<ClaimWorkflowSource> {
  const organizationId = INITIAL_ORGANIZATION.id;
  const claim = await database.insuranceClaim.findFirst({ where: { id: claimId, organizationId }, include: { evidence: true } });
  if (!claim) throw new ClaimWorkflowError("Claim not found.", 404);
  const order = claim.linkedRepairOrderId ? await database.repairOrder.findFirst({
    where: { id: claim.linkedRepairOrderId, organizationId },
    include: {
      ownerUser: { select: { name: true } }, vehicle: { select: { vin: true } },
      estimateVersions: { orderBy: { version: "desc" }, include: { authorizations: { orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }] } } },
      repairJobs: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" }, include: { dispatches: { orderBy: { createdAt: "desc" }, take: 1, include: { technicianUser: { select: { name: true } } } }, qualityInspections: { orderBy: { version: "desc" }, take: 1 } } },
      partDemands: { orderBy: { createdAt: "asc" }, include: { part: { select: { partNumber: true, description: true } }, requisitions: { include: { purchaseOrders: { include: { vendor: { select: { name: true } }, receipts: { include: { discrepancies: true } } } } } } } },
      releaseAuthorization: true, invoicePackages: { orderBy: { version: "desc" }, take: 1 }
    }
  }) : null;
  if (claim.linkedRepairOrderId && !order) throw new ClaimWorkflowError("The linked repair order is unavailable.", 409);
  const vin = claim.vehicleVin?.trim().toUpperCase() ?? "";
  const candidates = !order && (claim.vehicleId || vin) ? await database.repairOrder.findMany({ where: { organizationId, closedAt: null, ...(claim.vehicleId ? { vehicleId: claim.vehicleId } : { vehicle: { vin } }) }, orderBy: { openedAt: "desc" }, take: 20, include: { vehicle: { select: { year: true, make: true, model: true } } } }) : [];
  const orders = [...new Map((order?.partDemands.flatMap((demand) => demand.requisitions.flatMap((requisition) => requisition.purchaseOrders)) ?? []).map((purchase) => [purchase.id, purchase])).values()];
  const source: ClaimWorkflowSource = {
    claimId, customer: claim.customerName, vin, claimNumber: claim.claimNumber ?? "Draft", claimClosed: claim.status === "CLOSED",
    customerAuthorization: claim.evidence.some((item) => item.category === "AUTHORIZATION" && item.status === "RECEIVED" && Boolean(item.documentLibraryId)),
    communicationPermission: claimPermissionStatus(claim.evidence, "CLAIM_COMMUNICATION"),
    directPayPermission: claimPermissionStatus(claim.evidence, "CLAIM_DIRECT_PAY"),
    repairOrder: order ? { id: order.id, number: order.repairOrderNumber, stage: order.stage, owner: order.ownerUser.name, targetAt: order.targetAt.toISOString(), closed: Boolean(order.closedAt), version: order.version } : null,
    estimates: order?.estimateVersions.map((estimate) => ({ id: estimate.id, version: estimate.version, totalCents: estimate.totalCents, lines: estimateLines(estimate.lineItems), authorizations: estimate.authorizations.map((authorization) => ({ id: authorization.id, disposition: authorization.disposition, keys: textKeys(authorization.authorizedLineKeys), actor: authorization.decisionActorName, amountCents: authorization.authorizedAmountCents })) })) ?? [],
    jobs: order?.repairJobs.map((job) => ({ id: job.id, number: job.jobNumber, description: job.description, status: job.status, blocker: job.executionBlockerReason, technician: job.dispatches[0]?.technicianUser.name ?? "Unassigned", estimateId: job.estimateVersionId, lineKey: job.authorizedLineKey, latestQc: job.qualityInspections[0]?.disposition ?? null })) ?? [],
    parts: order?.partDemands.map((demand) => ({ id: demand.id, number: demand.part.partNumber, description: demand.part.description, required: demand.quantityRequired, reserved: demand.quantityReserved, status: demand.status })) ?? [],
    orders: orders.map((purchase) => ({ id: purchase.id, number: purchase.purchaseOrderNumber, supplier: purchase.vendor.name, status: purchase.status, orderedCents: purchase.orderedTotalCents, receivedCents: purchase.receivedTotalCents, discrepancyCount: purchase.receipts.flatMap((receipt) => receipt.discrepancies).filter((discrepancy) => discrepancy.status === "OPEN").length })),
    qualityRelease: Boolean(order?.releaseAuthorization), invoiceCount: order?.invoicePackages.length ?? 0, invoiceTotalCents: order?.invoicePackages[0]?.authorizedTotalCents ?? 0, invoiceReady: Boolean(order?.invoicePackages[0] && ["READY", "ACCEPTED"].includes(order.invoicePackages[0].status) && !textKeys(order.invoicePackages[0].mismatchCodes).length),
    candidates: candidates.map((candidate) => ({ id: candidate.id, number: candidate.repairOrderNumber, vehicle: [candidate.vehicle.year, candidate.vehicle.make, candidate.vehicle.model].filter(Boolean).join(" ") })),
    evidence: claim.evidence.filter((item) => item.documentLibraryId && item.status === "RECEIVED").map((item) => ({ id: item.id, title: item.title, category: item.category })),
    fingerprints: { TEARDOWN: "", PARTS: "", REPAIR: "", QC: "", BILLING: "" }
  };
  source.fingerprints = {
    TEARDOWN: hashEnterpriseCommand({ ro: order?.id, scope: order?.estimateVersions.map((item) => [item.id, item.lineItems]), evidence: claim.evidence.filter((item) => ["DAMAGE_PHOTO", "ODOMETER_PHOTO", "VIN_PHOTO"].includes(item.category)).map((item) => item.id).sort() }),
    PARTS: hashEnterpriseCommand({ ro: order?.id, demands: source.parts, orders: source.orders }),
    REPAIR: hashEnterpriseCommand({ ro: order?.id, jobs: source.jobs }),
    QC: hashEnterpriseCommand({ ro: order?.id, jobs: source.jobs, release: order?.releaseAuthorization?.id }),
    BILLING: hashEnterpriseCommand({ ro: order?.id, invoices: order?.invoicePackages.map((item) => [item.id, item.version, item.mismatchCodes, item.status]), estimates: source.estimates })
  };
  return source;
}
async function readState(database: Database, claimId: string) {
  const row = await database.enterpriseCommandLedger.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, domain: DOMAIN, subjectType: "INSURANCE_CLAIM", subjectId: claimId, status: "SUCCEEDED" }, orderBy: { resultingVersion: "desc" } });
  if (!row) return { state: emptyClaimWorkflow(), version: 0 };
  const value = row.resultSnapshot;
  if (!value || typeof value !== "object" || Array.isArray(value) || !value.state || typeof value.state !== "object" || Array.isArray(value.state) || value.state.schemaVersion !== 1) throw new ClaimWorkflowError("Saved workflow needs administrative review.", 409);
  return { state: value.state as unknown as ClaimWorkflowState, version: row.resultingVersion ?? 0 };
}
async function authorize(actor: AuthenticatedUser | null, database: Database, locationId: string | null, manage = false) {
  const user = actorAccess(actor);
  const grants = await database.vehicleCapabilityGrant.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, userId: user.id } });
  try { assertVehicleCapability({ actor: user, capability: manage ? "REPAIR_ORDER_MANAGE" : "REPAIR_ORDER_VIEW", grants, locationId, now: new Date() }); }
  catch { throw new ClaimWorkflowError("Repair workflow permission is required.", 403); }
  return user;
}
export async function getClaimRepairWorkflow(actor: AuthenticatedUser | null, claimId: string, database: PrismaClient = prisma) {
  const user = await authorize(actor, database, null);
  const source = await sourceFor(database, claimId);
  if (source.repairOrder) {
    const order = await database.repairOrder.findFirst({ where: { id: source.repairOrder.id, organizationId: INITIAL_ORGANIZATION.id }, select: { locationId: true } });
    await authorize(actor, database, order?.locationId ?? null);
  }
  const stored = await readState(database, claimId);
  const history = await database.enterpriseAuditEvent.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, domain: DOMAIN, subjectId: claimId, subjectType: "INSURANCE_CLAIM" }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, eventType: true, reason: true, createdAt: true, actorUser: { select: { name: true } } } });
  return { ...stored, source, sourceVersion: hashEnterpriseCommand({ fingerprints: source.fingerprints, communicationPermission: source.communicationPermission, directPayPermission: source.directPayPermission }), canDecide: user.roles.some((role) => managerRoles.includes(role)), history: history.map((item) => ({ id: item.id, action: item.eventType.replace(/_COMPLETED$/, ""), reason: item.reason, at: item.createdAt.toISOString(), actor: item.actorUser?.name ?? "Recorded user" })) };
}
export type ClaimRepairWorkflowModel = Awaited<ReturnType<typeof getClaimRepairWorkflow>>;

export async function getClaimWorkflowTaskContext(actor: AuthenticatedUser, task: { id: string; description: string | null }, requestedClaimId?: string, database: PrismaClient = prisma) {
  if (!actor.isActive || !actor.roles.some((role) => workerRoles.includes(role))) return null;
  const reference = task.description?.match(/(?:^|\s)Claim:\s*([^\s.]+)(?:\.|\s|$)/i)?.[1];
  if (!requestedClaimId && !reference) return null;
  const claim = await database.insuranceClaim.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, ...(requestedClaimId ? { id: requestedClaimId } : { claimNumber: reference }) }, select: { id: true } });
  if (!claim) return null;
  const model = await getClaimWorkspaceReadModel(actor, claim.id, await claimsWorkspaceDependencies());
  if (model.associatedRepairTask?.id !== task.id) return null;
  await getClaimRepairWorkflow(actor, claim.id, database);
  return { claimId: claim.id, intakeReady: model.handoff.allowed, intakeTask: model.executionTasks.find((item) => item.id !== "task-repair-handoff"), href: `/vehicles/claims-workspace?${new URLSearchParams({ claimId: claim.id, workflow: "next" })}` };
}

export async function executeClaimRepairWorkflow(actor: AuthenticatedUser | null, claimId: string, raw: Record<string, unknown>, database: PrismaClient = prisma) {
  const user = await authorize(actor, database, null, true);
  if (!Number.isInteger(raw.expectedVersion) || Number(raw.expectedVersion) < 0 || typeof raw.idempotencyKey !== "string" || raw.idempotencyKey.length > 200 || typeof raw.reason !== "string" || raw.reason.trim().length < 10) throw new ClaimWorkflowError("A version, request key, and reason of at least 10 characters are required.");
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, commandType: String(raw.action), domain: DOMAIN, expectedVersion: Number(raw.expectedVersion), idempotencyKey: raw.idempotencyKey, locationId: null, organizationId: INITIAL_ORGANIZATION.id, payload: raw, reason: raw.reason, subjectId: claimId, subjectType: "INSURANCE_CLAIM" });
  return executeAggregateMutation(database, command, "claims.repair-workflow", async (tx) => {
    const source = await sourceFor(tx, claimId);
    if (hashEnterpriseCommand({ fingerprints: source.fingerprints, communicationPermission: source.communicationPermission, directPayPermission: source.directPayPermission }) !== raw.sourceVersion) throw new ClaimWorkflowError("Repair source records changed. Refresh and review before saving.", 409);
    const stored = await readState(tx, claimId);
    let state = stored.state;
    if (raw.action === "LINK_REPAIR_ORDER") {
      if (source.claimClosed || source.repairOrder || state.supplements.length || state.delivery) throw new ClaimWorkflowError("An existing repair link cannot be replaced through this workflow.", 409);
      if (typeof raw.repairOrderId !== "string" || !source.candidates.some((item) => item.id === raw.repairOrderId)) throw new ClaimWorkflowError("Select a matching open repair order for this claim.");
      const order = await tx.repairOrder.findFirst({ where: { id: raw.repairOrderId, organizationId: INITIAL_ORGANIZATION.id, closedAt: null }, select: { id: true, locationId: true, vehicleId: true, customerId: true } });
      if (!order) throw new ClaimWorkflowError("Repair order not found.", 404);
      await authorize(actor, tx, order.locationId, true);
      const claim = await tx.insuranceClaim.findFirst({ where: { id: claimId, organizationId: INITIAL_ORGANIZATION.id }, select: { customerId: true } });
      if (claim?.customerId && claim.customerId !== order.customerId) throw new ClaimWorkflowError("The repair order customer does not match this claim.");
      if (await tx.insuranceClaim.findFirst({ where: { organizationId: INITIAL_ORGANIZATION.id, linkedRepairOrderId: order.id, id: { not: claimId }, status: "OPEN" } })) throw new ClaimWorkflowError("This repair order is already linked to another open claim.", 409);
      await tx.insuranceClaim.update({ where: { id: claimId }, data: { linkedRepairOrderId: order.id, vehicleId: order.vehicleId, lastActivityAt: new Date(), version: { increment: 1 } } });
    } else {
      if (!source.repairOrder) throw new ClaimWorkflowError("Link the repair order before recording workflow steps.", 409);
      const order = await tx.repairOrder.findFirst({ where: { id: source.repairOrder.id, organizationId: INITIAL_ORGANIZATION.id }, select: { locationId: true } });
      await authorize(actor, tx, order?.locationId ?? null, true);
      state = applyClaimWorkflowAction(state, source, raw, { actor: user.name, manager: user.roles.some((role) => managerRoles.includes(role)), now: new Date().toISOString(), id: randomUUID() });
      await tx.insuranceClaim.update({ where: { id: claimId }, data: { lastActivityAt: new Date(), version: { increment: 1 } } });
    }
    await tx.insuranceClaimActivity.create({ data: { organizationId: INITIAL_ORGANIZATION.id, claimId, action: `WORKFLOW_${String(raw.action)}`, actorUserId: user.id, detail: raw.reason as string, at: new Date() } });
    return { previous: toJson(stored.state), result: { state } };
  });
}

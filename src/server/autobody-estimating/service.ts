import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, canManageSettings } from "@/server/policies/access";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { EnterpriseCommandConflictError, hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { getRepairOrderCreateOptions } from "@/server/repair-order/service";
import { getShopPlanningDetail, presentRepairEstimate } from "@/server/shop-planning/service";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { estimateReviewScope } from "@/lib/estimate-review";
import { bodyEstimateLines, calculateBodyDraft, compareBodyDrafts, normalizeBodyDraft, type BodyDraft } from "@/lib/autobody-estimating/domain";
import { coverageManifest } from "@/lib/autobody-estimating/catalog";

const organizationId = INITIAL_ORGANIZATION.id;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function conflict(message: string): never { throw new EnterpriseCommandConflictError(message, "VERSION_CONFLICT"); }
function identifier(value: unknown) { if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error("Choose a valid record reference."); return value; }
async function authorize(actor: AuthenticatedUser | null, locationId: string | null, write = false) { const user = assertAuthenticatedUser(actor), grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId); assertVehicleCapability({ actor: user, grants, locationId, capability: write ? "REPAIR_ORDER_MANAGE" : "REPAIR_ORDER_VIEW", now: new Date() }); return user; }
async function scopedRecord(actor: AuthenticatedUser | null, id: string, write = false) { assertAuthenticatedUser(actor); const record = await prisma.autobodyEstimateDraft.findFirst({ where: { id: identifier(id), organizationId } }); if (!record) throw new Error("Autobody draft was not found."); await authorize(actor, record.locationId, write); return record; }
async function verifyContext(actor: AuthenticatedUser, draft: BodyDraft, locationId: string) {
  const location = await prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { id: true } });
  if (!location) throw new Error("Select an authorized company location.");
  if (draft.vehicleId && !await prisma.vehicle.findFirst({ where: { id: draft.vehicleId, organizationId, mergedIntoVehicleId: null }, select: { id: true } })) throw new Error("Vehicle was not found.");
  if (draft.repairOrderId) { const ro = await getShopPlanningDetail(actor, draft.repairOrderId); if (ro.locationId !== locationId || ro.vehicle.id !== draft.vehicleId) throw new Error("This repair order does not match the vehicle or location."); }
  const evidenceIds = [...new Set([...draft.evidenceIds, ...draft.lines.flatMap(line => line.evidenceIds)])];
  if (evidenceIds.length) {
    if (!draft.vehicleId) throw new Error("Select a vehicle before linking its evidence.");
    const grants = await createEnterpriseCommandRepository().listCapabilityGrants(actor.id, organizationId);
    assertVehicleCapability({ actor, grants, locationId, capability: "VEHICLE_EVIDENCE_VIEW", now: new Date() });
    const available = await prisma.vehicleEvidenceObject.count({ where: { id: { in: evidenceIds }, organizationId, links: { some: { vehicleId: draft.vehicleId } }, status: "AVAILABLE", malwareStatus: "CLEAN", accessLevel: "INTERNAL" } });
    if (available !== evidenceIds.length) throw new Error("An evidence reference is unavailable, restricted or belongs to another vehicle.");
  }
}
export async function readBodyWorkspace(actor: AuthenticatedUser | null, query: { id?: string; repairOrderId?: string; q?: string }) {
  const user = assertAuthenticatedUser(actor);
  if (query.id) { const record = await scopedRecord(user, query.id); const revisions = await prisma.autobodyEstimateDraftRevision.findMany({ where: { draftId: record.id }, orderBy: { version: "desc" }, take: 20 }); return { record, revisions, calculation: calculateBodyDraft(normalizeBodyDraft(record.content)) }; }
  const options = await getRepairOrderCreateOptions(user), rate = await getActiveLaborRate(user), term = (query.q ?? "").trim().toLowerCase();
  const locationIds = options.locations.map(location => location.id);
  const drafts = await prisma.autobodyEstimateDraft.findMany({ where: { organizationId, locationId: { in: locationIds }, status: { not: "ARCHIVED" }, ...(query.repairOrderId ? { repairOrderId: query.repairOrderId } : {}), ...(term ? { title: { contains: term, mode: "insensitive" as const } } : {}) }, select: { id: true, title: true, vehicleId: true, repairOrderId: true, status: true, version: true, estimateId: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 50 });
  let context = null;
  if (query.repairOrderId) {
    const ro = await getShopPlanningDetail(user, identifier(query.repairOrderId));
    context = { repairOrderId: ro.id, locationId: ro.locationId, vehicleId: ro.vehicle.id, label: ro.repairOrderNumber, vehicle: [ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" "), vin: ro.vehicle.vin, customer: ro.customer?.displayName ?? "Internal recon", payer: ro.inventoryUnitId && !ro.customerId ? "INTERNAL" : "CUSTOMER", closed: Boolean(ro.closedAt), vendorWorks: ro.vendorWorks.map(work => ({ id: work.id, vendorName: work.vendorName, status: work.status, version: work.version })), estimates: ro.estimateVersions.map(estimate => ({ id: estimate.id, version: estimate.version, totalCents: estimate.totalCents, presentedAt: estimate.presentedAt })) };
  }
  return { locations: options.locations, vehicles: options.vehicles.filter(vehicle => !term || JSON.stringify(vehicle).toLowerCase().includes(term)).slice(0, 20), orders: options.repairOrders.filter(order => !term || JSON.stringify(order).toLowerCase().includes(term)).slice(0, 20), drafts, context, rateCents: Math.round(rate.laborRate * 100), ratePolicy: { id: rate.policyId, version: rate.policyVersion }, canOverrideRates: canManageSettings(user), coverage: coverageManifest() };
}

export async function saveBodyDraft(actor: AuthenticatedUser | null, value: Record<string, unknown>) {
  const locationId = identifier(value.locationId), user = await authorize(actor, locationId, true), draft = normalizeBodyDraft(value.content), id = identifier(value.id), key = identifier(value.idempotencyKey);
  const expectedVersion = value.expectedVersion;
  if (!Number.isSafeInteger(expectedVersion) || Number(expectedVersion) < 0) throw new Error("Expected draft version is required.");
  await verifyContext(user, draft, locationId);
  const requestHash = hashEnterpriseCommand({ id, locationId, draft, expectedVersion, actor: user.id });
  return prisma.$transaction(async tx => {
    const receipt = await tx.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId, domain: "AUTOBODY", commandType: "SAVE_DRAFT", idempotencyKey: key } } });
    if (receipt) { if (receipt.requestHash !== requestHash) conflict("This save key was used for different work. Reload before saving again."); return { duplicate: true, record: receipt.resultSnapshot }; }
    const current = await tx.autobodyEstimateDraft.findUnique({ where: { id } });
    if (current && (current.organizationId !== organizationId || current.locationId !== locationId)) throw new Error("Autobody draft was not found.");
    if ((current?.version ?? 0) !== expectedVersion) conflict("Another staff member saved this draft. Reload and compare before saving.");
    if (current && current.status !== "DRAFT") conflict("This draft is issued or awaiting an estimate result. Start a supplement or recover the existing request.");
    if (current && (current.vehicleId !== draft.vehicleId || current.repairOrderId !== draft.repairOrderId)) throw new Error("Start a new draft when changing the linked vehicle or repair order.");
    const data = { title: draft.title || "Autobody estimate", content: json(draft), version: Number(expectedVersion) + 1 };
    const record = current ? await tx.autobodyEstimateDraft.update({ where: { id }, data }) : await tx.autobodyEstimateDraft.create({ data: { ...data, id, organizationId, locationId, vehicleId: draft.vehicleId, repairOrderId: draft.repairOrderId, createdByUserId: user.id } });
    await tx.autobodyEstimateDraftRevision.create({ data: { id: randomUUID(), draftId: id, version: record.version, content: json(draft), actorUserId: user.id } });
    const correlationId = randomUUID();
    const command = await tx.enterpriseCommandLedger.create({ data: { organizationId, locationId, actorUserId: user.id, domain: "AUTOBODY", subjectType: "AUTOBODY_DRAFT", subjectId: id, commandType: "SAVE_DRAFT", status: "SUCCEEDED", idempotencyKey: key, requestHash, correlationId, expectedVersion: Number(expectedVersion), resultingVersion: record.version, resultSnapshot: json(record), completedAt: new Date() } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId, locationId, actorUserId: user.id, domain: "AUTOBODY", subjectType: "AUTOBODY_DRAFT", subjectId: id, commandId: command.id, eventType: "AUTOBODY_DRAFT_SAVED", reason: "Staff saved collision scope without authorizing repair or moving money.", priorValue: current ? json({ version: current.version }) : Prisma.JsonNull, newValue: json({ version: record.version }), metadata: json({ requestHash }), correlationId } });
    return { duplicate: false, record };
  }, { isolationLevel: "Serializable", timeout: 15000 });
}

type Presentation = { key: string; actorId: string; expectedVersion: number; presentedAt: string; expiresAt: string };
export async function presentBodyDraft(actor: AuthenticatedUser | null, id: string, version: number) {
  const record = await scopedRecord(actor, id, true), user = assertAuthenticatedUser(actor), draft = normalizeBodyDraft(record.content);
  if (record.status === "PRESENTED") return { duplicate: true, estimateId: record.estimateId, record };
  if (record.version !== version) conflict("The draft changed. Reload and review before generating.");
  const savedIntent = record.presentation as Presentation | null;
  if (savedIntent) {
    if (savedIntent.actorId !== user.id) throw new Error("The staff member who started generation must recover this unchanged request.");
    const receipt = await prisma.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId, domain: "SHOP_OPERATIONS", commandType: "PRESENT_ESTIMATE_VERSION", idempotencyKey: savedIntent.key } } });
    const result = receipt?.resultSnapshot as { id?: string } | null;
    if (receipt?.status === "SUCCEEDED" && receipt.actorUserId === user.id && receipt.subjectId === draft.repairOrderId && result?.id) {
      await prisma.autobodyEstimateDraft.updateMany({ where: { id, organizationId, version, status: "PRESENTING" }, data: { status: "PRESENTED", estimateId: result.id } });
      return { duplicate: true, estimateId: result.id, record: await scopedRecord(user, id) };
    }
  }
  if (!draft.repairOrderId || !draft.vehicleId) throw new Error("Open this draft from a repair order before generating an official estimate.");
  await verifyContext(user, draft, record.locationId);
  const calculation = calculateBodyDraft(draft), lineItems = bodyEstimateLines(draft);
  const ro = await getShopPlanningDetail(user, draft.repairOrderId);
  const activeRate = await getActiveLaborRate(user);
  if (draft.lines.some(line => line.minutes && draft.rates[line.category] !== Math.round(activeRate.laborRate * 100)) && (!canManageSettings(user) || !draft.rateReason.trim())) throw new Error("Changing a collision category rate requires an administrator and an override explanation.");
  const internal = Boolean(ro.inventoryUnitId) && !ro.customerId;
  if ((internal && draft.payer !== "INTERNAL") || (!internal && draft.payer === "INTERNAL")) throw new Error("Choose the payer matching this repair order.");
  let intent = record.presentation as Presentation | null;
  if (!intent) {
    if (ro.closedAt) throw new Error("This repair order is closed. Reopen it through the existing workflow first.");
    if ((ro.estimateVersions[0]?.id ?? null) !== draft.priorEstimateId) conflict("An estimate already exists or changed. Start a supplement from the current estimate instead of duplicating it.");
    intent = { key: `autobody-present-${id}-${record.version}`, actorId: user.id, expectedVersion: ro.version, presentedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
    const locked = await prisma.autobodyEstimateDraft.updateMany({ where: { id, organizationId, version, status: "DRAFT" }, data: { status: "PRESENTING", presentation: json(intent) } });
    if (locked.count !== 1) conflict("This draft is being generated elsewhere. Reload to recover its result.");
  }
  if (intent.actorId !== user.id) throw new Error("The staff member who started generation must recover this unchanged request.");
  const result = await presentRepairEstimate(user, ro.id, { collisionReview: draft, expectedVersion: intent.expectedVersion, idempotencyKey: intent.key, reason: "Present the exact staff-reviewed collision estimate revision.", presentedAt: intent.presentedAt, expiresAt: intent.expiresAt, presentationChannel: "IN_PERSON", lineItems, taxCents: calculation.taxCents, discountCents: calculation.discountCents, taxBoundary: draft.taxReference, assumptions: `Payer: ${draft.payer}. Claim: ${draft.claimReference || "Not supplied"}. ${draft.supplementReason}`, optionGroups: [{ type: "AUTOBODY_PROVENANCE", snapshot: draft, calculation }], ...(draft.priorEstimateId ? { chargeRevisionFrom: draft.priorEstimateId } : {}), manualLaborReview: { engine: "Visible bodywork scope; mechanical engine review not applicable", configuration: draft.lines.map(line => line.applicability || line.subletReference).filter(Boolean).join("; ").slice(0, 2000), source: "Estimator-reviewed manual collision allowances; not OEM-verified", limitations: "Technical methods and fitment remain subject to the recorded applicable references.", scope: estimateReviewScope(draft.vehicleId, lineItems) } });
  const estimateId = (result.result as { id: string }).id;
  await prisma.autobodyEstimateDraft.updateMany({ where: { id, organizationId, version, status: "PRESENTING" }, data: { status: "PRESENTED", estimateId } });
  return { duplicate: result.duplicate, estimateId, record: await scopedRecord(user, id) };
}

export async function supplementBodyDraft(actor: AuthenticatedUser | null, id: string) {
  const record = await scopedRecord(actor, id, true), draft = normalizeBodyDraft(record.content);
  if (!record.estimateId || !draft.repairOrderId) throw new Error("Generate an estimate before starting its supplement.");
  const ro = await getShopPlanningDetail(actor, draft.repairOrderId);
  if (ro.estimateVersions[0]?.id !== record.estimateId) conflict("Start from the latest estimate. A newer revision already exists.");
  return { content: { ...draft, title: `${draft.title} · supplement`.slice(0, 200), priorEstimateId: record.estimateId, supplementReason: "" }, locationId: record.locationId, sourceId: id };
}
export async function reopenBodyScope(actor: AuthenticatedUser | null, id: string) {
  const record = await scopedRecord(actor, id, true), draft = normalizeBodyDraft(record.content);
  if (record.status !== "PRESENTING" || !draft.repairOrderId) throw new Error("Only an interrupted generation request can be reopened for fresh review.");
  const ro = await getShopPlanningDetail(actor, draft.repairOrderId);
  return { content: { ...draft, title: `${draft.title} · fresh review`.slice(0, 200), priorEstimateId: ro.estimateVersions[0]?.id ?? null, supplementReason: "" }, locationId: record.locationId };
}
export async function bodyDraftHistory(actor: AuthenticatedUser | null, id: string, beforeVersion: number) { if (!Number.isSafeInteger(beforeVersion) || beforeVersion < 1) throw new Error("Choose a valid history version."); const record = await scopedRecord(actor, id); const revisions = await prisma.autobodyEstimateDraftRevision.findMany({ where: { draftId: record.id, version: { lt: beforeVersion } }, orderBy: { version: "desc" }, take: 20 }); const current = normalizeBodyDraft(record.content); return revisions.map(revision => ({ ...revision, difference: compareBodyDrafts(normalizeBodyDraft(revision.content), current) })); }

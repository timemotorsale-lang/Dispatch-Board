import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";

type Acceptance = { repairOrderId: string; vendorWorkId: string; vendorVersion: number; estimateId: string; authorizationId: string; lineKeys: string[]; reviewedAt: string; evidence: string[]; reference: string; fitFinishPassed: boolean; safetyPassed: boolean };
export async function acceptedVendorReturns(database: Prisma.TransactionClient, organizationId: string, repairOrderId: string, estimateId: string, authorizationId: string, lineKeys: string[]) {
  if (!lineKeys.length) return [];
  const works = await database.repairVendorWork.findMany({ where: { organizationId, repairOrderId, status: "COMPLETED" } });
  const audits = await database.enterpriseAuditEvent.findMany({ where: { organizationId, domain: "SHOP_OPERATIONS", subjectType: "VENDOR_RETURN_ACCEPTANCE", subjectId: { in: works.map(work => work.id) }, eventType: "ACCEPT_VENDOR_RETURN_COMPLETED" }, orderBy: { createdAt: "desc" } });
  return audits.flatMap(audit => {
    const result = audit.newValue as unknown as Acceptance;
    const work = works.find(work => work.id === result?.vendorWorkId);
    return work && result.repairOrderId === repairOrderId && result.estimateId === estimateId && result.authorizationId === authorizationId && result.vendorVersion === work.version && result.fitFinishPassed && result.safetyPassed && result.evidence?.length && result.reference && result.lineKeys.every(key => lineKeys.includes(key)) ? [{ id: audit.id, ...result }] : [];
  });
}
export async function recordVendorReturnAcceptance(actor: AuthenticatedUser | null, repairOrderId: string, raw: Record<string, unknown>) {
  const user = assertAuthenticatedUser(actor), organizationId = INITIAL_ORGANIZATION.id;
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, select: { locationId: true } });
  if (!order) throw new Error("Open repair order was not found.");
  const foundation = createEnterpriseCommandRepository(), grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "REPAIR_ORDER_MANAGE", now: new Date() });
  const decision = evaluateVehicleOperationsFeature(await foundation.listFeatureFlags(organizationId), "SHOP_OPERATIONS", user.id, order.locationId);
  if (!decision.executable) throw new Error("Shop Operations must be enabled before accepting vendor work.");
  const vendorWorkId = String(raw.vendorWorkId ?? ""), expectedVersion = Number(raw.expectedVersion), reference = String(raw.reference ?? "").trim(), evidence = String(raw.evidence ?? "").trim();
  if (!vendorWorkId || vendorWorkId.length > 100 || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !reference || reference.length > 500 || evidence.length < 10 || evidence.length > 2000 || raw.fitFinishPassed !== true || raw.safetyPassed !== true) throw new Error("Select the returned vendor work, confirm fit/finish and safety, and record its invoice/completion reference and review evidence.");
  const receipt = await prisma.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: { organizationId, domain: "SHOP_OPERATIONS", commandType: "ACCEPT_VENDOR_RETURN", idempotencyKey: String(raw.idempotencyKey ?? "") } } });
  const aggregate = await prisma.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { organizationId, domain: "SHOP_OPERATIONS", subjectType: "VENDOR_RETURN_ACCEPTANCE", subjectId: vendorWorkId } } });
  const lineKeys = Array.isArray(raw.lineKeys) ? [...new Set(raw.lineKeys.filter((key): key is string => typeof key === "string" && key.length <= 100))] : [];
  if (!lineKeys.length || lineKeys.length > 150) throw new Error("Select the authorized vendor lines covered by this return review.");
  const payload = { estimateId: String(raw.estimateId ?? ""), lineKeys, vendorWorkId, expectedVersion, reference, evidence, fitFinishPassed: true, safetyPassed: true };
  const command = normalizeEnterpriseCommand({ organizationId, locationId: order.locationId, actorUserId: user.id, domain: "SHOP_OPERATIONS", subjectType: "VENDOR_RETURN_ACCEPTANCE", subjectId: vendorWorkId, commandType: "ACCEPT_VENDOR_RETURN", expectedVersion: receipt?.expectedVersion ?? aggregate?.version ?? 0, idempotencyKey: String(raw.idempotencyKey ?? ""), reason: "Attributable staff inspection of completed outside collision repair; no internal repair time invented.", payload });
  return executeAggregateMutation(prisma, command, "vehicle-operations.shop", async tx => {
    const work = await tx.repairVendorWork.findFirst({ where: { id: vendorWorkId, organizationId, repairOrderId, version: expectedVersion, status: { in: ["RETURNED", "QC_REQUIRED", "COMPLETED"] } } });
    if (!work || !work.returnedAt || !["APPROVED", "NOT_REQUIRED"].includes(work.approvalStatus)) throw new Error("Vendor work must be returned with its approval recorded. Refresh the vendor record before acceptance.");
    const estimate = await tx.repairEstimateVersion.findFirstOrThrow({ where: { organizationId, repairOrderId }, orderBy: { version: "desc" } }), authorization = await tx.repairAuthorization.findFirst({ where: { organizationId, repairOrderId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (estimate.id !== raw.estimateId || !authorization || authorization.estimateVersionId !== estimate.id || !["ACCEPTED", "PARTIAL"].includes(authorization.disposition)) throw new Error("Authorize the exact current estimate before accepting its outside work.");
    const groups = estimate.optionGroups as unknown as { type: string }[] | null;
    if (!Array.isArray(groups) || !groups.some(group => group.type === "AUTOBODY_PROVENANCE")) throw new Error("This acceptance path requires a reviewed collision estimate.");
    const lines = (estimate.lineItems as unknown as { key: string; type: string }[]).filter(line => line.type === "FEE" && /^bf-.+-vendor$/.test(line.key) && (authorization.authorizedLineKeys as string[]).includes(line.key));
    if (!lines.length || lineKeys.some(key => !lines.some(line => line.key === key))) throw new Error("No authorized vendor quotation is present in this estimate.");
    const prior = await acceptedVendorReturns(tx, organizationId, repairOrderId, estimate.id, authorization.id, lines.map(line => line.key));
    if (prior.some(item => item.vendorWorkId !== work.id && item.lineKeys.some(key => lineKeys.includes(key)))) throw new Error("Vendor scope is already accepted. Use its current record or a reviewed supplement for changed work.");
    const acceptedKeys = [...new Set([...lineKeys, ...prior.filter(item => item.vendorWorkId === work.id).flatMap(item => item.lineKeys)])];
    const now = new Date(), nextVersion = work.version + 1;
    await tx.repairVendorWork.update({ where: { id: work.id }, data: { status: "COMPLETED", version: nextVersion, lastUpdateSummary: "Returned work inspected and accepted by staff.", nextAction: "Complete release, billing or internal-cost review and handoff." } });
    await tx.repairVendorWorkEvent.create({ data: { organizationId, vendorWorkId, version: nextVersion, fromStatus: work.status, toStatus: "COMPLETED", approvalStatus: work.approvalStatus, summary: "Staff confirmed fit/finish and safety of returned work.", customerVisibleSummary: "Outside repair has returned and passed staff review.", internalNotes: evidence, evidence: toJson([reference, evidence]), occurredAt: now, actorUserId: user.id, reason: command.reason } });
    const latestAdvisor = await tx.repairAdvisorUpdate.findFirst({ where: { repairOrderId }, orderBy: { version: "desc" } });
    const otherActive = await tx.repairVendorWork.count({ where: { organizationId, repairOrderId, id: { not: work.id }, status: { notIn: ["COMPLETED", "CANCELLED"] } } });
    await tx.repairAdvisorUpdate.create({ data: { organizationId, repairOrderId, version: (latestAdvisor?.version ?? 0) + 1, statusCode: "VENDOR_WORK", contactChannel: "INTERNAL", contactDirection: "INTERNAL", contactOutcome: "Vendor return inspected by staff.", customerVisibleSummary: "Returned repair passed staff inspection.", exceptionCodes: toJson(((latestAdvisor?.exceptionCodes as string[] | null) ?? []).filter(code => otherActive || code !== "VENDOR_COORDINATION")), authorUserId: user.id, reason: command.reason, occurredAt: now } });
    return { previous: { status: work.status, version: work.version }, result: { repairOrderId, vendorWorkId, vendorVersion: nextVersion, estimateId: estimate.id, authorizationId: authorization.id, lineKeys: acceptedKeys, reviewedAt: now.toISOString(), evidence: [evidence], reference, fitFinishPassed: true, safetyPassed: true } satisfies Acceptance };
  });
}

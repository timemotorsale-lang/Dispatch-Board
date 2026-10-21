import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertLaborStagingTarget } from "../../../scripts/lib/labor-staging-target.mjs";

describe.skipIf(process.env.RUN_LABOR_STAGING_INTEGRATION !== "1")("isolated labor catalog PostgreSQL proof", () => {
  it("initializes missing rollout controls only on authorized changes and audits concurrent configuration", async () => {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Explicit isolated staging confirmation is required.");
    assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
    const { prisma } = await import("@/server/db/client");
    const { getVehicleOperationsFoundation, updateVehicleOperationsFeature, evaluateVehicleOperationsFeature } = await import("@/server/enterprise-command/service");
    const prefix = `rollout-proof-${randomUUID()}`, organizationId = `${prefix}-org`;
    const actor = { id: `${prefix}-manager`, name: "Synthetic rollout manager", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.organization.create({ data: { id: organizationId, code: prefix, name: "Synthetic missing rollout proof" } });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "synthetic-disabled-login" } });
    const context = { organizationId };
    const model = await getVehicleOperationsFoundation(actor, context);
    expect(model.flags.find(flag => flag.code === "VEHICLE_REGISTRY")).toMatchObject({ version: 0, mode: "OFF" });
    expect(await prisma.vehicleOperationsFeatureFlag.count({ where: { organizationId } })).toBe(0);
    const request = { code: "VEHICLE_REGISTRY", mode: "GENERAL", rolloutPercent: 100, expectedVersion: 0, reason: "Synthetic authorized missing rollout recovery." };
    const results = await Promise.allSettled([updateVehicleOperationsFeature(actor, request, context), updateVehicleOperationsFeature(actor, request, context)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect(await prisma.vehicleOperationsRolloutEvent.count({ where: { organizationId, action: "FEATURE_FLAG_CREATED" } })).toBe(1);
    let flags = await prisma.vehicleOperationsFeatureFlag.findMany({ where: { organizationId } });
    expect(evaluateVehicleOperationsFeature(flags, "VEHICLE_REGISTRY", actor.id, null).reason).toBe("MASTER_DISABLED");
    await updateVehicleOperationsFeature(actor, { ...request, code: "VEHICLE_OPERATIONS_MASTER" }, context);
    flags = await prisma.vehicleOperationsFeatureFlag.findMany({ where: { organizationId } });
    expect(evaluateVehicleOperationsFeature(flags, "VEHICLE_REGISTRY", actor.id, null).executable).toBe(true);
    expect(flags).toHaveLength(2);
    await updateVehicleOperationsFeature(actor, { ...request, mode: "OFF", rolloutPercent: 0, expectedVersion: 1 }, context);
    await expect(updateVehicleOperationsFeature(actor, { ...request, expectedVersion: 1 }, context)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(await prisma.vehicleOperationsRolloutEvent.count({ where: { organizationId } })).toBe(3);
  }, 30_000);

  it("persists independent approval, idempotency, scoped activation and a superseding hold with audit history", async () => {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Explicit isolated staging confirmation is required.");
    assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
    const { prisma } = await import("@/server/db/client");
    const { executeCustomerLifecycleCommand } = await import("@/server/customer-lifecycle/service");
    const { readCatalogApproval, catalogScopeDigest } = await import("@/server/diagnostics/catalog-approval");
    const { LIGHT_DUTY_CATALOG_VERSION } = await import("@/lib/light-duty-baseline");
    const prefix = `labor-proof-${randomUUID()}`, organizationId = `${prefix}-org`;
    const author = { id: `${prefix}-author`, name: "Synthetic policy author", email: `${prefix}-author@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    const reviewer = { ...author, id: `${prefix}-reviewer`, email: `${prefix}-reviewer@example.test` };
    await prisma.organization.create({ data: { id: organizationId, code: prefix, name: "Isolated synthetic labor proof" } });
    for (const actor of [author, reviewer]) await prisma.user.create({ data: { id: actor.id, email: actor.email, name: actor.name, passwordHash: "synthetic-disabled-login" } });
    const context = { organizationId, enforceRollout: false };
    const configuration = { version: 1, catalogVersion: LIGHT_DUTY_CATALOG_VERSION, systemId: "ev", scopeDigest: catalogScopeDigest("ev"), enabled: true, reviewReference: "Synthetic automated scope fixture, not shop approval", capabilityReference: "Synthetic automated capability fixture, not personnel verification" };
    const create = { action: "CREATE_POLICY_DRAFT", policyCode: "LABOR_CATALOG_EV", domain: "LABOR_CATALOG", configuration, pilotScope: {}, reason: "Isolated synthetic policy lifecycle proof", idempotencyKey: `${prefix}-create` };
    const draft = await executeCustomerLifecycleCommand(author, create, context);
    expect(await executeCustomerLifecycleCommand(author, create, context)).toMatchObject({ duplicate: true });
    const subjectId = (draft.result as { id: string }).id;
    const transition = (action: string, suffix = action) => ({ action, subjectId, reason: "Isolated synthetic policy transition proof", idempotencyKey: `${prefix}-${suffix}`, simulationSnapshot: { synthetic: true }, effectiveFrom: new Date(Date.now() - 1000).toISOString(), pilotScope: {}, outcomeSnapshot: { synthetic: true } });
    expect(await readCatalogApproval(prisma, organizationId, "ev")).toBeNull();
    await executeCustomerLifecycleCommand(author, transition("SIMULATE_POLICY"), context);
    await expect(executeCustomerLifecycleCommand(author, transition("APPROVE_POLICY", "self-review"), context)).rejects.toThrow("independent reviewer");
    await executeCustomerLifecycleCommand(reviewer, transition("APPROVE_POLICY"), context);
    const activation = transition("ACTIVATE_POLICY");
    await executeCustomerLifecycleCommand(reviewer, activation, context);
    expect(await executeCustomerLifecycleCommand(reviewer, activation, context)).toMatchObject({ duplicate: true });
    await expect(executeCustomerLifecycleCommand(reviewer, { ...activation, reason: "Changed request must not reuse the successful key" }, context)).rejects.toThrow("different request");
    expect(await readCatalogApproval(prisma, organizationId, "ev")).toMatchObject({ policyId: subjectId, scopeDigest: configuration.scopeDigest });
    expect(await readCatalogApproval(prisma, organizationId, "engine")).toBeNull();
    const { LIGHT_DUTY_OPERATIONS } = await import("@/lib/light-duty-baseline");
    const { catalogLaborLineKey } = await import("@/lib/catalog-job-readiness");
    const { createShopExecutionRepository } = await import("@/server/shop-execution/repository");
    const { normalizeEnterpriseCommand } = await import("@/server/enterprise-command/domain");
    const operation = LIGHT_DUTY_OPERATIONS.find(item => item.label === "Replace high-voltage battery assembly")!;
    const lineKey = catalogLaborLineKey(operation.id), now = new Date(), startedAt = new Date(now.getTime() - 600_000);
    const location = await prisma.location.create({ data: { organizationId, code: prefix, name: "Synthetic staging bay", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: prefix, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic labor staging fixture", vinValidationSource: "SYNTHETIC" } });
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: prefix, displayName: "Synthetic staging customer, not a real customer" } });
    const visit = await prisma.serviceVisit.create({ data: { organizationId, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: startedAt, concernSummary: "Synthetic fixture only, not customer work", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: author.id } });
    const order = await prisma.repairOrder.create({ data: { organizationId, locationId: location.id, serviceVisitId: visit.id, vehicleId: vehicle.id, customerId: customer.id, repairOrderNumber: prefix, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: startedAt, stageStartedAt: startedAt, ownerUserId: author.id, targetAt: now, nextAction: "Synthetic execution guard proof only" } });
    const estimate = await prisma.repairEstimateVersion.create({ data: { organizationId, repairOrderId: order.id, version: 1, lineItems: [{ key: lineKey, type: "LABOR", description: operation.label, quantity: 1, unitPriceCents: 100, laborGuideMinutes: 60, workTypeCode: "SYNTHETIC" }], laborSubtotalCents: 100, partsSubtotalCents: 0, feeSubtotalCents: 0, taxCents: 0, discountCents: 0, totalCents: 100, taxBoundary: "SYNTHETIC_NOT_TAX_ADVICE", expiresAt: new Date(now.getTime() + 86400000), presentedAt: startedAt, presentationChannel: "INTERNAL", authorUserId: author.id } });
    const decision = await prisma.repairAuthorization.create({ data: { organizationId, repairOrderId: order.id, estimateVersionId: estimate.id, disposition: "PARTIAL", channel: "INTERNAL", authorizedLineKeys: [lineKey], authorizedAmountCents: 100, decisionActorType: "SYNTHETIC_FIXTURE", decisionActorName: "Synthetic fixture, not customer approval", decidedByUserId: author.id, decidedAt: startedAt, reason: "Synthetic approval record for isolated guard verification" } });
    const job = await prisma.repairJob.create({ data: { organizationId, repairOrderId: order.id, jobNumber: "J001", estimateVersionId: estimate.id, authorizationId: decision.id, authorizedLineKey: lineKey, workTypeCode: "SYNTHETIC_LEGACY_REQUIREMENTS", description: operation.label, plannedCorrection: "Synthetic execution guard proof only", laborGuideMinutes: 60, requiredSkills: [], requiredCertifications: [], bayRequirements: [], toolRequirements: [], priority: "NORMAL", dependencyJobIds: [], readinessReasonCodes: [], partsRequired: false, authorizedAmountCents: 100, createdByUserId: author.id, status: "DISPATCHED" } });
    await prisma.repairJobDispatch.create({ data: { organizationId, locationId: location.id, repairJobId: job.id, technicianUserId: reviewer.id, resourceIds: [], position: "CURRENT", status: "ACTIVE", scheduledStartAt: startedAt, scheduledEndAt: now, assignedByUserId: author.id, reason: "Synthetic prior-dispatch fixture, not dispatch acceptance", conflictSnapshot: {} } });
    const execution = createShopExecutionRepository(prisma);
    const procedure = await prisma.workProcedureVersion.create({ data: { organizationId, workTypeCode: "CATALOG_EV_BATTERY", version: 1, title: "Synthetic procedure fixture, not repair instructions", instructions: ["Synthetic fixture"], safetySteps: ["Synthetic fixture"], requiredEvidence: ["Synthetic fixture"], qcRules: ["Synthetic fixture"], standardMinutes: 60, effectiveFrom: new Date(0), createdByUserId: author.id, reason: "Synthetic isolated procedure readiness fixture" } });
    const bayType = await prisma.schedulableResourceType.create({ data: { organizationId, code: "SYNTHETIC_BAY", name: "Synthetic bay type", kind: "SERVICE_BAY", defaultCapacityMode: "EXCLUSIVE", defaultConflictPolicy: "HARD_BLOCK" } });
    const bay = await prisma.schedulableResource.create({ data: { organizationId, locationId: location.id, resourceTypeId: bayType.id, code: "SYNTHETIC_BAY_1", name: "Synthetic equipment declaration, not capability verification", capacityMode: "EXCLUSIVE", conflictPolicy: "HARD_BLOCK", effectiveFrom: new Date(0), attributes: { catalogCapabilities: ["HV_CONTROLLED_AREA", "HV_ISOLATION_EQUIPMENT", "SERVICE_INFORMATION"] } } });
    await prisma.repairJob.update({ where: { id: job.id }, data: { procedureVersionId: procedure.id } });
    await prisma.repairJobDispatch.updateMany({ where: { repairJobId: job.id }, data: { bayResourceId: bay.id, resourceIds: [bay.id] } });
    async function labor(eventType: "START" | "PAUSE" | "RESUME" | "FINISH", occurredAt: Date, suffix: string = eventType) {
      const data = { eventType, technicianUserId: reviewer.id, actorUserId: reviewer.id, occurredAt, reason: "Isolated synthetic clock guard verification", approvedNonProductiveCode: null, blockerReason: eventType === "PAUSE" ? "Synthetic approval review hold" : null, correctionMinutes: null, evidence: ["Synthetic proof only"], qcHandoffNotes: "Synthetic fixture, not actual repair completion" };
      const version = await execution.aggregateVersion(organizationId, "REPAIR_JOB", job.id);
      const command = normalizeEnterpriseCommand({ organizationId, actorUserId: reviewer.id, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_JOB", subjectId: job.id, commandType: `${eventType}_REPAIR_JOB_LABOR`, expectedVersion: version, idempotencyKey: `${prefix}-${suffix}`, locationId: location.id, payload: data, reason: data.reason });
      return execution.labor(command, data);
    }
    await expect(labor("START", startedAt, "missing-qualification")).rejects.toThrow("Current technician qualifications");
    for (const [type, code] of [["SKILL", "CATALOG_EV"], ["CERTIFICATION", "HV_PLATFORM_QUALIFIED"]] as const) await prisma.technicianQualification.create({ data: { organizationId, technicianUserId: reviewer.id, type, code, effectiveFrom: new Date(0), sourceReference: "Synthetic automated fixture, not personnel verification", verifiedByUserId: author.id, verifiedAt: now } });
    const staffType = await prisma.schedulableResourceType.create({ data: { organizationId, code: "SYNTHETIC_STAFF", name: "Synthetic staff type", kind: "STAFF", defaultCapacityMode: "EXCLUSIVE", defaultConflictPolicy: "HARD_BLOCK" } });
    await prisma.schedulableResource.create({ data: { organizationId, locationId: location.id, resourceTypeId: staffType.id, code: "SYNTHETIC_TECH", name: "Synthetic technician resource", userId: reviewer.id, capacityMode: "EXCLUSIVE", conflictPolicy: "HARD_BLOCK", effectiveFrom: new Date(0) } });
    async function dispatch(withBay: boolean) {
      const data = { assignedByUserId: author.id, technicianUserId: reviewer.id, bayResourceId: withBay ? bay.id : null, resourceIds: withBay ? [bay.id] : [], position: "CURRENT" as const, scheduledStartAt: startedAt, scheduledEndAt: now, overrideReason: null, reason: "Synthetic isolated dispatch capability verification" };
      const version = await execution.aggregateVersion(organizationId, "REPAIR_JOB", job.id);
      const command = normalizeEnterpriseCommand({ organizationId, actorUserId: author.id, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_JOB", subjectId: job.id, commandType: "DISPATCH_REPAIR_JOB", expectedVersion: version, idempotencyKey: `${prefix}-dispatch-${withBay}`, locationId: location.id, payload: data, reason: data.reason });
      return execution.dispatch(command, data, now);
    }
    await expect(dispatch(false)).rejects.toThrow("Required shop resources");
    await dispatch(true);
    await expect(labor("START", startedAt, "missing-parts")).rejects.toThrow("fully reserved");
    const part = await prisma.part.create({ data: { organizationId, partNumber: prefix, description: "Synthetic battery fixture only", standardCostCents: 0 } });
    const demand = await prisma.repairPartDemand.create({ data: { organizationId, repairOrderId: order.id, repairJobId: job.id, partId: part.id, quantityRequired: 1, quantityReserved: 0, requiredAt: now, createdByUserId: author.id } });
    await expect(labor("START", startedAt, "unreserved-parts")).rejects.toThrow("fully reserved");
    await prisma.repairPartDemand.update({ where: { id: demand.id }, data: { quantityReserved: 1 } });
    await labor("START", startedAt);
    await labor("PAUSE", new Date(startedAt.getTime() + 300_000));
    await prisma.repairAuthorization.create({ data: { organizationId, repairOrderId: order.id, estimateVersionId: estimate.id, disposition: "REVOKED", channel: "INTERNAL", authorizedLineKeys: [], authorizedAmountCents: 0, decisionActorType: "SYNTHETIC_FIXTURE", decisionActorName: "Synthetic revocation", decidedByUserId: author.id, decidedAt: now, previousAuthorizationId: decision.id, reason: "Synthetic revocation proof, not a customer action" } });
    await expect(labor("RESUME", now, "revoked-authorization")).rejects.toThrow("authorization");
    expect(await prisma.repairJobLaborClock.findUnique({ where: { repairJobId_technicianUserId: { repairJobId: job.id, technicianUserId: reviewer.id } }, select: { state: true, accumulatedMinutes: true } })).toEqual({ state: "PAUSED", accumulatedMinutes: 5 });
    expect(await prisma.repairJobLaborEvent.count({ where: { repairJobId: job.id } })).toBe(2);
    const hold = await executeCustomerLifecycleCommand(author, { ...create, configuration: { ...configuration, enabled: false }, idempotencyKey: `${prefix}-hold` }, context);
    const holdId = (hold.result as { id: string }).id;
    for (const action of ["SIMULATE_POLICY", "APPROVE_POLICY", "ACTIVATE_POLICY"]) await executeCustomerLifecycleCommand(action === "SIMULATE_POLICY" ? author : reviewer, { ...transition(action, `hold-${action}`), subjectId: holdId }, context);
    expect(await readCatalogApproval(prisma, organizationId, "ev")).toBeNull();
    await expect(labor("RESUME", now, "catalog-hold")).rejects.toThrow("on hold");
    expect(await prisma.vehiclePolicyVersion.findUnique({ where: { id: subjectId }, select: { status: true } })).toEqual({ status: "SUPERSEDED" });
    expect(await prisma.vehiclePolicyEvent.count({ where: { organizationId } })).toBe(8);
  }, 30_000);

  it("binds governed inventory recon to one inventory unit and vehicle without duplicate intake writes", async () => {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Explicit isolated staging confirmation is required.");
    assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
    const { prisma } = await import("@/server/db/client");
    const { createInventoryUnit } = await import("@/server/inventory-unit/service");
    const { createRepairOrder } = await import("@/server/repair-order/service");
    const { createRepairOrderRepository } = await import("@/server/repair-order/repository");
    const { normalizeRepairOrderCreate } = await import("@/server/repair-order/domain");
    const { normalizeEnterpriseCommand } = await import("@/server/enterprise-command/domain");
    const prefix = `recon-proof-${randomUUID()}`, organizationId = `${prefix}-org`;
    const actor = { id: `${prefix}-actor`, name: "Synthetic inventory recon actor", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    const now = new Date(), arrivedAt = new Date(now.getTime() - 60_000), targetAt = new Date(now.getTime() + 3_600_000);
    await prisma.organization.create({ data: { id: organizationId, code: prefix, name: "Isolated synthetic inventory recon proof" } });
    await prisma.user.create({ data: { id: actor.id, email: actor.email, name: actor.name, passwordHash: "synthetic-disabled-login" } });
    const location = await prisma.location.create({ data: { organizationId, code: prefix, name: "Synthetic inventory recon location", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: prefix, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic isolated recon fixture", vinValidationSource: "SYNTHETIC" } });
    await prisma.vehicleRelationship.create({ data: { organizationId, vehicleId: vehicle.id, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: arrivedAt, sourceCode: "SYNTHETIC_ISOLATED_PROOF", sourceReference: prefix, notes: "Synthetic effective ownership for isolated inventory eligibility proof only" } });
    const context = { organizationId, enforceRollout: false, now: () => now };
    const intake = { intakeSource: "INVENTORY_RECON", vehicleId: vehicle.id, arrivedAt: arrivedAt.toISOString(), targetAt: targetAt.toISOString(), consentStatus: "NOT_REQUIRED", concernSummary: "Synthetic inventory brake inspection, not actual repair work", idempotencyKey: `${prefix}-intake`, locationId: location.id, nextAction: "Synthetic recon intake proof only", ownerUserId: actor.id, reason: "Isolated synthetic inventory recon proof", transportMode: "INTERNAL_TRANSPORT" };
    async function counts() {
      const where = { organizationId };
      return Promise.all([
        prisma.inventoryUnit.count({ where }), prisma.serviceVisit.count({ where }), prisma.repairOrder.count({ where }),
        prisma.enterpriseCommandLedger.count({ where }), prisma.enterpriseDomainEvent.count({ where }),
        prisma.enterpriseAuditEvent.count({ where }), prisma.enterpriseOutboxMessage.count({ where }),
        prisma.serviceDocument.count({ where }), prisma.repairOrderStateEvent.count({ where }),
      ]);
    }
    const empty = await counts();
    expect(empty).toEqual(Array(9).fill(0));
    for (const inventoryUnitId of [undefined, null, "", "   "]) {
      await expect(createRepairOrder(actor, { ...intake, inventoryUnitId }, context)).rejects.toThrow("Inventory unit ID is required.");
      expect(await counts()).toEqual(empty);
    }
    const acquisition = { acquisitionSource: "DIRECT_PURCHASE", financialAcquiredAt: arrivedAt.toISOString(), idempotencyKey: `${prefix}-inventory`, inventoryNumber: `${prefix}-inventory`, locationId: location.id, nextAction: "Synthetic recon intake proof only", ownerUserId: actor.id, reason: "Explicit synthetic inventory acquisition for isolated proof", targetAt: targetAt.toISOString(), vehicleId: vehicle.id };
    const createdUnit = await createInventoryUnit(actor, acquisition, context);
    const inventoryUnitId = (createdUnit.result as { id: string }).id;
    expect(createdUnit.duplicate).toBe(false);
    expect(await createInventoryUnit(actor, acquisition, context)).toMatchObject({ duplicate: true, result: { id: inventoryUnitId } });
    expect(await prisma.inventoryUnit.findUnique({ where: { id: inventoryUnitId } })).toMatchObject({ organizationId, vehicleId: vehicle.id, locationId: location.id, closedAt: null });

    const acquired = await counts();
    const repository = createRepairOrderRepository(prisma);
    const normalized = normalizeRepairOrderCreate({ ...intake, inventoryUnitId }, now);
    const directCommand = normalizeEnterpriseCommand({ actorUserId: actor.id, commandType: "CREATE_REPAIR_ORDER", domain: "SHOP_OPERATIONS", expectedVersion: 0, idempotencyKey: `${prefix}-direct-missing-unit`, locationId: location.id, organizationId, payload: {}, reason: intake.reason, subjectId: `${prefix}-rejected-ro`, subjectType: "REPAIR_ORDER" });
    await expect(repository.create(directCommand, { ...normalized, inventoryUnitId: null, actorUserId: actor.id, repairOrderNumber: `${prefix}-rejected-ro` })).rejects.toThrow("Inventory unit ID is required.");
    expect(await counts()).toEqual(acquired);

    const request = { ...intake, inventoryUnitId, vehicleId: undefined };
    const created = await createRepairOrder(actor, request, context);
    const repairOrderId = (created.result as { id: string }).id;
    expect(created.duplicate).toBe(false);
    const order = await prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId }, include: { serviceVisit: true } });
    expect(order).toMatchObject({ organizationId, vehicleId: vehicle.id, inventoryUnitId, locationId: location.id, origin: "INVENTORY_RECON", intakeSource: "INVENTORY_RECON", customerId: null });
    expect(order.serviceVisit).toMatchObject({ organizationId, vehicleId: vehicle.id, inventoryUnitId, locationId: location.id, origin: "INVENTORY_RECON", intakeSource: "INVENTORY_RECON", customerId: null });
    const persisted = await counts();
    expect(persisted.slice(0, 3)).toEqual([1, 1, 1]);
    expect(await createRepairOrder(actor, request, context)).toMatchObject({ duplicate: true, result: { id: repairOrderId } });
    expect(await createRepairOrder(actor, { ...request, idempotencyKey: `${prefix}-same-concern` }, context)).toMatchObject({ duplicate: true, result: { id: repairOrderId, duplicateReason: "OPEN_VEHICLE_CONCERN_MATCH" } });
    expect(await createRepairOrder(actor, { ...request, vehicleId: vehicle.id, idempotencyKey: `${prefix}-different-concern`, concernSummary: "Synthetic check engine light inspection" }, context)).toMatchObject({ duplicate: true, result: { id: repairOrderId, duplicateReason: "OPEN_VEHICLE_REPAIR_ORDER" } });
    await expect(createRepairOrder(actor, { ...intake, idempotencyKey: `${prefix}-missing-after-create` }, context)).rejects.toThrow("Inventory unit ID is required.");
    expect(await counts()).toEqual(persisted);
    expect(await prisma.inventoryUnit.count({ where: { organizationId, vehicleId: vehicle.id } })).toBe(1);
    expect(await prisma.serviceVisit.count({ where: { organizationId, vehicleId: vehicle.id } })).toBe(1);
    expect(await prisma.repairOrder.count({ where: { organizationId, vehicleId: vehicle.id } })).toBe(1);
  }, 30_000);
});

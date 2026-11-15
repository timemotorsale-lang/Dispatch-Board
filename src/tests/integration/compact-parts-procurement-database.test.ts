import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";

const enabled = process.env.RUN_COMPACT_PARTS_DB_REGRESSION === "true";
let disconnect: (() => Promise<void>) | undefined;

afterAll(async () => { await disconnect?.(); });

it.runIf(enabled)("replays committed procurement commands and serializes strict receipts", async () => {
  const url = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || url.hostname !== "127.0.0.1" || url.port !== "55439"
    || !/^dispatch_board_e2e_compact_parts_[a-z0-9_]+$/.test(url.searchParams.get("schema") ?? "")) {
    throw new Error("Use a disposable compact-parts test schema on local port 55439.");
  }

  const { prisma } = await import("@/server/db/client");
  disconnect = () => prisma.$disconnect();
  const [{ executeServiceClosePartsCommand }, { createServiceClosePartsRepository }] = await Promise.all([
    import("@/server/service-close-parts/service"),
    import("@/server/service-close-parts/repository"),
  ]);
  const tag = `backend-${randomUUID()}`;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  const organizationId = organization.id;
  const location = await prisma.location.findUniqueOrThrow({ where: { organizationId_code: { organizationId, code: "TMS-MSP-01" } } });
  const { id: locationId } = location;
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  const customer = await prisma.customer.create({ data: { organizationId, customerNumber: tag, displayName: "Synthetic compact parts backend test" } });
  const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: tag, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Disposable backend regression", vinValidationSource: "SYNTHETIC_TEST" } });
  const now = new Date();
  const visit = await prisma.serviceVisit.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: now, concernSummary: "Synthetic parts regression", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: manager.id } });
  const order = await prisma.repairOrder.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: visit.id, repairOrderNumber: tag, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: now, stageStartedAt: now, targetAt: now, ownerUserId: manager.id, nextAction: "Synthetic compact parts regression" } });
  const bin = await prisma.partStockLocation.create({ data: { organizationId, locationId, code: tag, name: "Synthetic receiving bin", type: "BIN" } });
  const part = await prisma.part.create({ data: { organizationId, partNumber: tag, description: "Synthetic harness", standardCostCents: 100 } });
  const demand = await prisma.repairPartDemand.create({ data: { organizationId, partId: part.id, quantityRequired: 3, repairOrderId: order.id, requiredAt: now, createdByUserId: manager.id } });
  const actor = { ...manager, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
  const repository = createServiceClosePartsRepository(prisma);
  const run = async (action: string, step: string, fields: Record<string, unknown>) => {
    const response = await executeServiceClosePartsCommand(actor, { action, idempotencyKey: `${tag}:${step}`, reason: "Verify isolated backend procurement.", ...fields }, { organizationId, repository, enforceRollout: false });
    if (!response || !("result" in response) || !response.result || typeof response.result !== "object") throw new Error("Expected a committed command result.");
    return response as { duplicate: boolean; result: { id: string; status?: string } };
  };

  async function lostResponse(action: string, step: string, fields: Record<string, unknown>) {
    // Discard the original service response after the database transaction commits.
    await run(action, step, fields);
    const retry = await run(action, step, fields);
    expect(retry.duplicate).toBe(true);
    expect(retry.result.id).toBeTruthy();
    const committed = await prisma.enterpriseCommandLedger.findMany({ where: { organizationId, domain: "PARTS_OPERATIONS", commandType: action, idempotencyKey: `${tag}:${step}` } });
    expect(committed).toHaveLength(1);
    expect(committed[0].resultSnapshot).toEqual(retry.result);
    return retry.result;
  }

  const vendorFields = { code: tag, name: tag, defaultReturnTerms: "Verify vendor terms", defaultWarranty: "Verify warranty", paymentTerms: "Due on receipt" };
  const vendor = await lostResponse("CREATE_VENDOR", "vendor", vendorFields);
  await expect(run("CREATE_VENDOR", "vendor", { ...vendorFields, name: `${tag}-changed` })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  const offer = await lostResponse("CREATE_VENDOR_OFFER", "offer", { vendorId: vendor.id, partId: part.id, vendorPartNumber: tag, unitCostCents: 100, availableQuantity: 3, effectiveFrom: now.toISOString(), returnTerms: "Verify vendor terms", warrantyTerms: "Verify warranty" });
  const requisition = await lostResponse("CREATE_REQUISITION", "requisition", { demandId: demand.id, quantity: 3, requiredAt: now.toISOString() });
  await lostResponse("SELECT_REQUISITION_OFFER", "select", { subjectId: requisition.id, offerId: offer.id });
  const po = await lostResponse("CREATE_PURCHASE_ORDER", "po", { requisitionId: requisition.id, vendorId: vendor.id, locationId, purchaseOrderNumber: tag, lines: [{ partId: part.id, quantity: 3, unitCostCents: 100 }] });
  if (po.status === "DRAFT") {
    await run("TRANSITION_PURCHASE_ORDER", "approve", { subjectId: po.id, toStatus: "APPROVED", occurredAt: now.toISOString() });
  }
  expect(await prisma.partVendor.count({ where: { organizationId, id: vendor.id } })).toBe(1);
  expect(await prisma.partVendorOffer.count({ where: { organizationId, partId: part.id } })).toBe(1);
  expect(await prisma.partRequisition.count({ where: { organizationId, demandId: demand.id } })).toBe(1);
  expect(await prisma.partPurchaseOrder.count({ where: { organizationId, requisitionId: requisition.id } })).toBe(1);

  const receipt = (step: string, quantity: number) => run("RECEIVE_PURCHASE_ORDER", step, { subjectId: po.id, strictRemaining: true, packingSource: `${tag}:${step}`, stockLocationId: bin.id, receivedAt: now.toISOString(), lines: [{ partId: part.id, quantity, unitCostCents: 100 }] });
  const attempts = await Promise.allSettled([receipt("concurrent-a", 2), receipt("concurrent-b", 2)]);
  expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(1);
  await expect(receipt("over-remainder", 2)).rejects.toThrow(/remaining quantity/i);
  await expect(receipt("last-unit", 1)).resolves.toMatchObject({ result: { status: "RECEIVED" } });
  expect(await prisma.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(2);
  expect(await prisma.partStockBalance.findUniqueOrThrow({ where: { partId_stockLocationId: { partId: part.id, stockLocationId: bin.id } } })).toMatchObject({ onHandQuantity: 3 });
}, 60_000);

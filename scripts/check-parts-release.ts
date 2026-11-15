import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../src/server/auth/store";

// Run only against a new schema on the dedicated disposable receiving database.
// This leaves the schema intact for inspection; it never resets or drops data.
async function run() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.host, "127.0.0.1:55439");
  assert.equal(url.pathname, "/postgres");
  const schema = url.searchParams.get("schema") ?? "";
  assert.match(schema, /^dispatch_board_e2e_parts_[a-z0-9_]+$/);
  const { PrismaClient } = await import("@prisma/client");
  const probe = new PrismaClient();
  try {
    const existing = await probe.$queryRaw<Array<{ schema_name: string }>>`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${schema}`;
    assert.equal(existing.length, 0, "Refusing to reuse an existing schema");
  } finally { await probe.$disconnect(); }
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit", env: process.env });
  console.log(JSON.stringify({ phase: "setup", schema, revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() }));
  const { prisma } = await import("../src/server/db/client");
  try {
    const { createPartStockLocation } = await import("../src/server/parts-ledger/service");
    const { executeServiceClosePartsCommand } = await import("../src/server/service-close-parts/service");
    const organization = await prisma.organization.create({ data: { code: randomUUID(), name: "Disposable parts release" } });
    const organizationId = organization.id;
    const locationData = { organizationId, name: "Release store", timezone: "America/Chicago", city: "Test", region: "MN" };
    const store = await prisma.location.create({ data: { ...locationData, code: "A" } });
    const other = await prisma.location.create({ data: { ...locationData, code: "B" } });
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, name: "Scoped receiving tester", passwordHash: "not-a-login-credential" } });
    const actor: AuthenticatedUser = { id: user.id, email: user.email, name: user.name, isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
    await prisma.vehicleCapabilityGrant.create({ data: { organizationId, locationId: store.id, userId: user.id, capability: "PARTS_MANAGE", constraints: {}, validFrom: new Date(0) } });
    for (const locationId of [store.id, other.id]) for (const code of ["VEHICLE_OPERATIONS_MASTER", "PARTS_OPERATIONS"]) {
      await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId, locationId, code, mode: "GENERAL", allowedUserIds: [], rolloutPercent: 100 } });
    }
    const reason = "Isolated parts release verification";
    const stockRequest = { locationId: store.id, code: "RECEIVING", name: "Receiving", type: "STAGING", reason, idempotencyKey: randomUUID() };
    const deps = { organizationId }; // Real authorization, rollout, repositories and transactions.
    await createPartStockLocation(actor, stockRequest, deps);
    await assert.rejects(createPartStockLocation(actor, { ...stockRequest, locationId: other.id, idempotencyKey: randomUUID() }, deps), /CAPABILITY_REQUIRED/);
    await prisma.vehicleCapabilityGrant.deleteMany({ where: { organizationId, userId: user.id } });
    await assert.rejects(createPartStockLocation(actor, { ...stockRequest, code: "DENIED", idempotencyKey: randomUUID() }, deps), /PARTS_MANAGE/);
    assert.equal(await prisma.partStockLocation.count({ where: { organizationId } }), 1);
    await prisma.vehicleCapabilityGrant.create({ data: { organizationId, locationId: store.id, userId: user.id, capability: "PARTS_MANAGE", constraints: {}, validFrom: new Date(0) } });
    const stock = await prisma.partStockLocation.findFirstOrThrow({ where: { organizationId } });
    console.log("PASS: durable same-store stock creation; cross-store and restricted-role denial with no extra stock locations");
    // Fixture creation is direct; the operations under test use public services.
    const vendor = await prisma.partVendor.create({ data: { organizationId, code: randomUUID(), name: "Test supplier", paymentTerms: "Test", defaultWarranty: "Test", defaultReturnTerms: "Test", createdByUserId: user.id } });
    const part = await prisma.part.create({ data: { organizationId, partNumber: randomUUID(), description: "Test taillight", standardCostCents: 100 } });
    const lines = [{ partId: part.id, quantity: 1, unitCostCents: 100, damagedQuantity: 0 }];
    const order = await prisma.partPurchaseOrder.create({ data: { organizationId, locationId: store.id, vendorId: vendor.id, purchaseOrderNumber: randomUUID(), status: "ISSUED", lines, orderedTotalCents: 100, createdByUserId: user.id, reason } });
    const request = { action: "RECEIVE_PURCHASE_ORDER", subjectId: order.id, invoiceReference: null, lines, packingSource: randomUUID(), receivedAt: new Date().toISOString(), stockLocationId: stock.id, reason, idempotencyKey: randomUUID() };
    const first = await executeServiceClosePartsCommand(actor, request, deps);
    await prisma.$disconnect(); // Reconnect before inspecting persisted state and retrying.
    const saved = await prisma.partPurchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: { receipts: true } });
    assert.equal(saved.status, "RECEIVED"); assert.equal(saved.receivedTotalCents, 100); assert.equal(saved.receipts.length, 1);
    const receiptId = saved.receipts[0].id;
    console.log(JSON.stringify({ phase: "receipt", schema, orderId: order.id, receiptId, status: saved.status, receivedTotalCents: saved.receivedTotalCents }));
    let retryError: unknown;
    let retry: unknown;
    try { retry = await executeServiceClosePartsCommand(actor, request, deps); } catch (error) { retryError = error; }
    assert.equal(await prisma.partReceipt.count({ where: { purchaseOrderId: order.id } }), 1);
    assert.equal(await prisma.partStockLedgerEntry.count({ where: { organizationId, partId: part.id, movementType: "RECEIPT" } }), 1);
    const balance = await prisma.partStockBalance.findUniqueOrThrow({ where: { partId_stockLocationId: { partId: part.id, stockLocationId: stock.id } } });
    assert.equal(balance.onHandQuantity, 1);
    assert.equal(await prisma.enterpriseCommandLedger.count({ where: { organizationId, commandType: request.action, idempotencyKey: request.idempotencyKey } }), 1);
    console.log("PASS: one durable receipt, one stock movement, one command and one unit after retry attempt");
    if (retryError) throw retryError;
    assert.deepEqual((retry as { result: unknown }).result, first.result);
    assert.equal((retry as { duplicate: boolean }).duplicate, true);
    await assert.rejects(executeServiceClosePartsCommand(actor, { ...request, packingSource: "changed" }, deps), /Idempotency key/);
    console.log("PASS: identical retry returned original result; changed-payload retry rejected");
  } finally { await prisma.$disconnect(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

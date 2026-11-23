import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { RepairHistoryResult } from "@/lib/repair-history";
import { emptyBodyDraft } from "@/lib/autobody-estimating/domain";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { SERVICE_DOCUMENT_TEMPLATE } from "@/server/repair-order/service-documents";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

// Run this spec alone against the same disposable schema as the application.
// No billing commands, document regeneration or shared setup changes are involved.
test.describe.configure({ mode: "serial" });
const managerEmail = "morgan.manager@local.test";
const password = "dispatch123!";
const old = new Date("2018-02-12T16:00:00.000Z");
const closed = new Date("2018-02-14T16:00:00.000Z");
let fixture: Awaited<ReturnType<typeof seedHistory>>;
let beforeRead: Awaited<ReturnType<typeof businessSnapshot>> | undefined;

async function seedHistory() {
  const tag = `history-${randomUUID().slice(0, 8)}`;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  const location = await prisma.location.findUniqueOrThrow({
    where: { organizationId_code: { organizationId: organization.id, code: "TMS-MSP-01" } }
  });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: managerEmail } });
  const gmRole = await prisma.role.findFirstOrThrow({ where: { name: "General Manager" } });
  // Reuse the seeded password hash, but give each negative case its own identity.
  const staff = await prisma.user.create({ data: {
    name: "Synthetic history staff without repair access", email: `${tag}-staff@local.test`, passwordHash: manager.passwordHash
  } });
  const reader = await prisma.user.create({ data: {
    name: "Synthetic history read-only staff", email: `${tag}-reader@local.test`, passwordHash: manager.passwordHash
  } });
  const deniedManager = await prisma.user.create({ data: {
    name: "Synthetic history store-denied manager", email: `${tag}-denied@local.test`, passwordHash: manager.passwordHash,
    userRoles: { create: { roleId: gmRole.id } }
  } });
  await prisma.vehicleCapabilityGrant.createMany({ data: [
    { organizationId: organization.id, userId: reader.id, capability: "REPAIR_ORDER_VIEW", effect: "ALLOW", constraints: {}, validFrom: old },
    { organizationId: organization.id, userId: reader.id, capability: "SERVICE_BILLING_VIEW", effect: "DENY", constraints: {}, validFrom: old },
    { organizationId: organization.id, locationId: location.id, userId: deniedManager.id, capability: "REPAIR_ORDER_VIEW", effect: "DENY", constraints: {}, validFrom: old }
  ] });
  const customer = await prisma.customer.create({ data: {
    organizationId: organization.id, customerNumber: `${tag}-customer`, displayName: `Synthetic Avery History ${tag}`
  } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: organization.id, vehicleNumber: `${tag}-vehicle`, stockNumber: `${tag}-stock`,
    year: 2016, make: "Toyota", model: "Camry", vin: `4T1BF1FK5${tag.slice(-8).toUpperCase()}`,
    vinState: "LEGACY_UNVERIFIED", vinValidationSource: "SYNTHETIC_E2E"
  } });
  const visit = await prisma.serviceVisit.create({ data: {
    organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id,
    origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: old,
    concernSummary: "Synthetic archived front brake inspection", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF",
    createdByUserId: manager.id, createdAt: old, updatedAt: old
  } });
  const order = await prisma.repairOrder.create({ data: {
    organizationId: organization.id, locationId: location.id, serviceVisitId: visit.id, vehicleId: vehicle.id,
    customerId: customer.id, repairOrderNumber: `${tag}-RO-2018`, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN",
    openedAt: old, stageStartedAt: old, targetAt: closed, closedAt: closed, stage: "CLOSED", operatingState: "CLOSED",
    ownerUserId: manager.id, nextAction: "Historical fixture only; no repair work pending", createdAt: old, updatedAt: closed
  } });
  const estimateData = {
    organizationId: organization.id, repairOrderId: order.id,
    lineItems: [{ key: "brake-inspection", type: "LABOR", description: "Front brake inspection", quantity: 1, unitPriceCents: 12500, totalCents: 12500 }],
    laborSubtotalCents: 12500, partsSubtotalCents: 0, feeSubtotalCents: 0, taxCents: 0, discountCents: 0, totalCents: 12500,
    taxBoundary: "Synthetic no-tax fixture, not tax advice", expiresAt: closed, presentedAt: old,
    presentationChannel: "INTERNAL", authorUserId: manager.id, createdAt: old
  };
  const legacy = await prisma.repairEstimateVersion.create({ data: { ...estimateData, version: 1 } });
  const estimate = await prisma.repairEstimateVersion.create({ data: { ...estimateData, version: 2, supersedesId: legacy.id } });
  const invoiceNumber = `${tag}-INV-2018`, receiptReference = `${tag}-CHECK-2048`;
  const documents = [];
  for (const kind of ["ESTIMATE", "INVOICE", "PAYMENT"] as const) {
    const content = {
      title: `Synthetic archived ${kind.toLowerCase()}`, number: kind === "INVOICE" ? invoiceNumber : `${tag}-${kind}-2018`,
      issuedAt: closed.toISOString(), identity: {
        customer: customer.displayName, vehicle: "2016 Toyota Camry", vin: vehicle.vin!, vehicleNumber: vehicle.vehicleNumber,
        concern: visit.concernSummary, repairOrderNumber: order.repairOrderNumber, store: location.name,
        address: "Synthetic fixture address", timezone: "America/Chicago", stockNumber: vehicle.stockNumber
      },
      lines: estimateData.lineItems, totals: { subtotalCents: 12500, discountCents: 0, taxCents: 0, totalCents: 12500 },
      ...(kind === "PAYMENT" ? { receipt: { invoiceNumber, kind: "PAYMENT", amountCents: 12500, method: "CHECK", reference: receiptReference, balanceCents: 0 } } : {}),
      notes: ["Disposable E2E fixture. No real invoice or payment was issued."]
    };
    documents.push(await prisma.serviceDocument.create({ data: {
      organizationId: organization.id, repairOrderId: order.id, kind,
      sourceId: kind === "ESTIMATE" ? estimate.id : `${tag}-${kind.toLowerCase()}`, sourceVersion: kind === "ESTIMATE" ? 2 : 1,
      templateVersion: SERVICE_DOCUMENT_TEMPLATE, content,
      sha256: hashEnterpriseCommand({ templateVersion: SERVICE_DOCUMENT_TEMPLATE, content }),
      createdByUserId: manager.id, createdAt: closed
    } }));
  }
  const body = await prisma.autobodyEstimateDraft.create({ data: {
    id: `${tag}-body`, organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id,
    createdByUserId: manager.id, title: `${tag} bumper inspection draft`,
    content: { ...emptyBodyDraft(12500), title: `${tag} bumper inspection draft`, vehicleId: vehicle.id },
    createdAt: old, updatedAt: old
  } });
  const laborContent = {
    schema: 1, manual: { customer: customer.displayName, vehicle: "2016 Toyota Camry", vin: vehicle.vin, concern: "Synthetic brake noise quote" },
    ro: null, labor: [], parts: [], evidence: [], attempt: null
  };
  const labor = await prisma.diagnosticWorkspaceDraft.create({ data: {
    id: `${tag}-labor`, userId: manager.id, title: `${tag} personal labor quote`, content: laborContent,
    contentHash: createHash("sha256").update(JSON.stringify(laborContent)).digest("hex"), createdAt: old, updatedAt: old
  } });
  const privateLabor = await prisma.diagnosticWorkspaceDraft.create({ data: {
    id: `${tag}-private`, userId: staff.id, title: `${tag} another staff private quote`, content: laborContent,
    contentHash: createHash("sha256").update(JSON.stringify(laborContent)).digest("hex"), createdAt: old, updatedAt: old
  } });
  // Separate identity keeps the existing three-item pagination fixture bounded.
  const archivedContent = { ...laborContent,
    manual: { customer: "Synthetic Rowan Archived", vehicle: "2014 Honda Civic", vin: "2HGFB2F50EH123456", concern: "Archived synthetic brake inspection" },
    parts: [{ id: "archived-brake-kit", laborRowId: "", name: "Archived brake hardware kit", number: "SYNTH-KIT", quantity: 2, unitPrice: 24.75, source: "MANUAL", pricingStatus: "ESTIMATED" }],
    archivedAt: closed.toISOString(), archiveReason: "Historical quote retained for read-only verification"
  };
  const archivedLabor = await prisma.diagnosticWorkspaceDraft.create({ data: {
    id: `archived-${randomUUID()}`, userId: manager.id, title: "Archived - Synthetic Rowan brake quote", version: 3,
    content: archivedContent, contentHash: createHash("sha256").update(JSON.stringify(archivedContent)).digest("hex"),
    createdAt: old, updatedAt: closed
  } });
  const billing = await seedLegacyBilling(organization.id, location.id, manager.id);
  return { tag, organization, location, customer, vehicle, visit, order, legacy, estimate, documents, body, labor, privateLabor, archivedLabor,
    staff, reader, deniedManager, invoiceNumber, receiptReference, billing };
}

async function seedLegacyBilling(organizationId: string, locationId: string, ownerUserId: string) {
  const tag = `billing-${randomUUID().slice(0, 8)}`;
  const customer = await prisma.customer.create({ data: { organizationId, customerNumber: tag, displayName: `Synthetic Jordan Billing ${tag}` } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId, vehicleNumber: tag, year: 2015, make: "Honda", model: "Accord",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated legacy import fixture", vinValidationSource: "SYNTHETIC_E2E"
  } });
  async function closedOrder(suffix: string) {
    const visit = await prisma.serviceVisit.create({ data: {
      organizationId, locationId, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN",
      arrivedAt: old, concernSummary: `Synthetic old ${suffix} billing import`, consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF",
      createdByUserId: ownerUserId, createdAt: old, updatedAt: closed
    } });
    return prisma.repairOrder.create({ data: {
      organizationId, locationId, serviceVisitId: visit.id, vehicleId: vehicle.id, customerId: customer.id, repairOrderNumber: `${tag}-${suffix}`,
      origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: old, stageStartedAt: old, targetAt: closed, closedAt: closed,
      stage: "CLOSED", operatingState: "CLOSED", ownerUserId, nextAction: "Historical billing import only", createdAt: old, updatedAt: closed
    } });
  }
  const externalOrder = await closedOrder("external"), nativeOrder = await closedOrder("native");
  const invoicePackage = await prisma.serviceInvoicePackage.create({ data: {
    organizationId, repairOrderId: externalOrder.id, version: 1, status: "ACCEPTED",
    lineItems: [{ key: "inspection", description: "Recorded brake inspection", quantity: 1, unitPriceCents: 12500 }],
    authorizedTotalCents: 12500, installedPartsCostCents: 0, clockedLaborMinutes: 60,
    sourceSnapshot: { source: "Synthetic legacy import", repairOrderNumber: externalOrder.repairOrderNumber }, mismatchCodes: [],
    externalSystemCode: "SYNTHETIC_DMS", externalReference: `${tag}-PACKAGE`, createdByUserId: ownerUserId,
    reason: "Synthetic historical invoice preparation", generatedAt: old, submittedAt: old, reconciledAt: closed, createdAt: old
  } });
  const reconciliation = await prisma.serviceInvoiceReconciliation.create({ data: {
    organizationId, invoicePackageId: invoicePackage.id, externalSystemCode: "SYNTHETIC_DMS", externalReference: `${tag}-EXTERNAL-INVOICE`,
    returnedSubtotalCents: 12500, returnedTaxCents: 0, returnedTotalCents: 12500, expectedTotalCents: 12500,
    discrepancyCents: 0, discrepancyCodes: [], status: "MATCHED", reconciledByUserId: ownerUserId, reconciledAt: closed,
    reason: "Synthetic external reconciliation, not native invoice issuance", createdAt: closed
  } });
  const nativePackage = await prisma.serviceInvoicePackage.create({ data: {
    organizationId, repairOrderId: nativeOrder.id, version: 1, status: "READY",
    lineItems: [{ key: "inspection", description: "Recorded brake inspection", quantity: 1, unitPriceCents: 12500 }],
    authorizedTotalCents: 12500, installedPartsCostCents: 0, clockedLaborMinutes: 60,
    sourceSnapshot: { source: "Synthetic native invoice import", repairOrderNumber: nativeOrder.repairOrderNumber }, mismatchCodes: [],
    createdByUserId: ownerUserId, reason: "Required matching historical invoice package", generatedAt: old, createdAt: old
  } });
  // Keep all billing guards: only the frozen document is absent, not the package.
  const invoice = await prisma.serviceInvoice.create({ data: {
    id: `${tag}-invoice`, organizationId, repairOrderId: nativeOrder.id, packageId: nativePackage.id,
    invoiceNumber: `${tag}-NATIVE-INVOICE`, subtotalCents: 12500, discountCents: 0, taxCents: 0, totalCents: 12500,
    ledger: { lines: [{ key: "inspection", description: "Recorded brake inspection", totalCents: 12500 }], totalCents: 12500 },
    sourceFingerprint: hashEnterpriseCommand({ synthetic: tag }), issuedAt: old, createdByUserId: ownerUserId,
    reason: "Synthetic native legacy import without frozen documents", createdAt: old
  } });
  const payment = await prisma.serviceInvoiceEntry.create({ data: {
    organizationId, invoiceId: invoice.id, kind: "PAYMENT", amountCents: 12500, method: "CHECK", reference: `${tag}-PAYMENT`,
    evidence: { source: "Synthetic imported payment" }, occurredAt: closed, createdByUserId: ownerUserId,
    reason: "Synthetic historical entry; no money moved", createdAt: closed
  } });
  return { tag, customer, vehicle, externalOrder, nativeOrder, invoicePackage, reconciliation, nativePackage, invoice, payment };
}

async function login(request: APIRequestContext, email = managerEmail) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.ok(), `Fixture login failed for ${email}`).toBeTruthy();
}

async function search(request: APIRequestContext, params: Record<string, string> = {}): Promise<RepairHistoryResult> {
  const response = await request.get("/api/repair-history", { params: { query: fixture.tag, ...params } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json();
}

function exactDocumentHref(id: string) {
  // Deliberately independent of the production URL helper.
  return `/service-documents?${new URLSearchParams({ repairOrderId: fixture.order.id, documentId: id, workspace: "1" })}`;
}

function legacyHref() {
  return `/repair-estimate?${new URLSearchParams({ repairOrderId: fixture.order.id, estimateId: fixture.legacy.id })}`;
}

function billingHref(repairOrderId: string, key: "packageId" | "invoiceId" | "entryId", id: string) {
  return `/repair-billing-record?${new URLSearchParams({ repairOrderId, [key]: id })}`;
}

async function dismissReminder(page: Page) {
  const dismiss = page.getByRole("button", { name: "Dismiss reminder", exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await expect(page.locator('[aria-label="Operating rhythm reminder"]')).not.toBeVisible();
}

async function businessSnapshot() {
  const orderBy = { id: "asc" } as const;
  const orderIds = [fixture.order.id, fixture.billing.externalOrder.id, fixture.billing.nativeOrder.id];
  const records = await Promise.all([
    prisma.repairOrder.findMany({ where: { id: { in: orderIds } }, orderBy }),
    prisma.serviceVisit.findMany({ where: { id: { in: [fixture.visit.id, fixture.billing.externalOrder.serviceVisitId, fixture.billing.nativeOrder.serviceVisitId] } }, orderBy }),
    prisma.customer.findMany({ where: { id: { in: [fixture.customer.id, fixture.billing.customer.id] } }, orderBy }),
    prisma.vehicle.findMany({ where: { id: { in: [fixture.vehicle.id, fixture.billing.vehicle.id] } }, orderBy }),
    prisma.repairEstimateVersion.findMany({ where: { repairOrderId: { in: orderIds } }, orderBy }),
    prisma.serviceDocument.findMany({ where: { repairOrderId: { in: orderIds } }, orderBy }),
    prisma.autobodyEstimateDraft.findMany({ where: { id: fixture.body.id }, orderBy }),
    prisma.diagnosticWorkspaceDraft.findMany({ where: { id: { in: [fixture.labor.id, fixture.privateLabor.id, fixture.archivedLabor.id] } }, orderBy }),
    prisma.serviceInvoicePackage.findMany({ where: { repairOrderId: { in: orderIds } }, orderBy }),
    prisma.serviceInvoiceReconciliation.findMany({ where: { invoicePackageId: fixture.billing.invoicePackage.id }, orderBy }),
    prisma.serviceInvoice.findMany({ where: { repairOrderId: { in: orderIds } }, orderBy }),
    prisma.serviceInvoiceEntry.findMany({ where: { invoiceId: fixture.billing.invoice.id }, orderBy })
  ]);
  const counts = await Promise.all([
    prisma.repairOrder.count(), prisma.repairEstimateVersion.count(), prisma.serviceDocument.count(),
    prisma.autobodyEstimateDraft.count(), prisma.diagnosticWorkspaceDraft.count(),
    prisma.serviceInvoice.count(), prisma.serviceInvoiceEntry.count(), prisma.serviceInvoicePackage.count(), prisma.serviceInvoiceReconciliation.count()
  ]);
  // Hash the complete persisted rows, including content, hashes, versions and dates.
  return { counts, sha256: createHash("sha256").update(JSON.stringify(records)).digest("hex") };
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  const database = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.searchParams.get("schema")?.startsWith("dispatch_board_e2e_")) {
    throw new Error("Repair history checks require an isolated dispatch_board_e2e_ schema.");
  }
  await resetDailyWorkflowState();
  fixture = await seedHistory();
});
test.beforeEach(async () => { beforeRead = await businessSnapshot(); });
test.afterEach(async () => {
  if (beforeRead) expect(await businessSnapshot(), "History reads must not alter business records or create documents").toEqual(beforeRead);
});
test.afterAll(disconnectDailyWorkflowDatabase);

test("old closed repairs remain searchable by customer, VIN and frozen document references", async ({ request }) => {
  await login(request);
  for (const query of [fixture.order.repairOrderNumber, fixture.customer.displayName, `${fixture.tag} ${fixture.vehicle.vin}`, fixture.invoiceNumber, fixture.receiptReference]) {
    const result = await search(request, { query, state: "CLOSED" });
    expect(result.items.map(item => item.id)).toEqual([fixture.order.id]);
    const item = result.items[0];
    expect(item.status).toBe("CLOSED");
    expect(item.updatedAt).toBe(closed.toISOString());
    expect(item.href).toBe(`/vehicles/repair-workbench?repairOrderId=${fixture.order.id}`);
    expect(item.documents).toHaveLength(4);
    for (const document of fixture.documents) {
      expect(item.documents).toContainEqual(expect.objectContaining({ id: document.id, kind: document.kind, version: document.sourceVersion, href: exactDocumentHref(document.id) }));
    }
    expect(item.documents).toContainEqual(expect.objectContaining({ id: fixture.legacy.id, kind: "LEGACY_ESTIMATE", version: 1, href: legacyHref() }));
    expect(item.drafts.some(draft => draft.id === fixture.estimate.id)).toBe(false);
  }
  expect((await search(request, { query: fixture.order.repairOrderNumber, state: "OPEN" })).items).toEqual([]);
});

test("kind, customer and vehicle filters preserve draft ownership and stable pagination", async ({ request }) => {
  await login(request);
  for (const kind of ["ESTIMATE", "INVOICE", "RECEIPT"]) {
    expect((await search(request, { kind })).items.map(item => item.id)).toEqual([fixture.order.id]);
  }
  const drafts = await search(request, { kind: "DRAFT" });
  expect(drafts.items.map(item => item.id).sort()).toEqual([fixture.body.id, fixture.labor.id].sort());
  expect(drafts.items.find(item => item.id === fixture.body.id)?.href).toBe(`/prototype/autobody-estimate?draftId=${fixture.body.id}`);
  expect(drafts.items.find(item => item.id === fixture.labor.id)?.href).toBe(`/prototype/repair-explorer?draftId=${fixture.labor.id}`);
  expect(JSON.stringify(drafts)).not.toContain(fixture.privateLabor.id);
  expect((await search(request, { customerId: fixture.customer.id })).items.map(item => item.id)).toEqual([fixture.order.id]);
  expect((await search(request, { vehicleId: fixture.vehicle.id })).items.map(item => item.id).sort()).toEqual([fixture.order.id, fixture.body.id].sort());
  expect((await search(request, { customerId: "missing-history-customer" })).items).toEqual([]);
  expect((await search(request, { vehicleId: "missing-history-vehicle" })).items).toEqual([]);
  const all = await search(request);
  expect(all.items).toHaveLength(3);
  const ids: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const result = await search(request, { page: String(page), pageSize: "1" });
    expect(result.page).toBe(page);
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(page < 3);
    ids.push(result.items[0].id);
  }
  expect(ids).toEqual(all.items.map(item => item.id));
  expect(new Set(ids).size).toBe(3);
  expect((await search(request, { page: "4", pageSize: "1" })).items).toEqual([]);
  expect((await search(request, { page: "1", pageSize: "1" })).items[0].id).toBe(ids[0]);
});

test("unauthenticated and unprivileged staff receive no record metadata", async ({ request }) => {
  const anonymous = await request.get("/api/repair-history", { params: { query: fixture.tag } });
  expect(anonymous.status()).toBe(401);
  await login(request, fixture.staff.email);
  const denied = await request.get("/api/repair-history", { params: { query: fixture.tag } });
  expect(denied.status()).toBe(403);
  for (const response of [anonymous, denied]) {
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["error"]);
    expect(JSON.stringify(body)).not.toContain(fixture.tag);
    expect(JSON.stringify(body)).not.toContain(fixture.customer.displayName);
  }
});

test("explicit store denial overrides a general manager and hides store records", async ({ request }) => {
  await login(request, fixture.deniedManager.email);
  for (const query of [fixture.tag, fixture.invoiceNumber, fixture.receiptReference]) {
    const result = await search(request, { query });
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  }
  const response = await request.get(`/api/repair-orders/${fixture.order.id}/document-review`, { params: { documentId: fixture.documents[0].id } });
  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).not.toContain(fixture.customer.displayName);
});

test("billing-denied readers see estimates but cannot discover invoice or receipt metadata", async ({ request }) => {
  await login(request, fixture.reader.email);
  const result = await search(request, { query: fixture.order.repairOrderNumber });
  expect(result.items).toHaveLength(1);
  expect(result.items[0].documents.map(document => document.kind).sort()).toEqual(["ESTIMATE", "LEGACY_ESTIMATE"]);
  for (const secret of [fixture.invoiceNumber, fixture.receiptReference, ...fixture.documents.filter(document => document.kind !== "ESTIMATE").map(document => document.id)]) {
    expect(JSON.stringify(result)).not.toContain(secret);
  }
  for (const kind of ["INVOICE", "RECEIPT"]) expect((await search(request, { kind })).items).toEqual([]);
  for (const query of [fixture.invoiceNumber, fixture.receiptReference]) {
    const hidden = await search(request, { query });
    expect(hidden.items).toEqual([]);
    expect(hidden.hasMore).toBe(false);
  }
  for (const document of fixture.documents) {
    const response = await request.get(`/api/repair-orders/${fixture.order.id}/document-review`, { params: { documentId: document.id } });
    expect(response.status()).toBe(document.kind === "ESTIMATE" ? 200 : 403);
    const body = await response.json();
    if (document.kind === "ESTIMATE") expect(body.documentHash).toBe(document.sha256);
    else {
      expect(Object.keys(body)).toEqual(["error"]);
      for (const secret of [fixture.customer.displayName, fixture.invoiceNumber, fixture.receiptReference, document.sha256]) {
        expect(JSON.stringify(body)).not.toContain(secret);
      }
    }
  }
});

for (const route of ["/prototype/repair-explorer", "/prototype/autobody-estimate", "/crm-next/deals"]) {
  test(`${route} exposes saved closed work and exact frozen document links`, async ({ page }) => {
    test.setTimeout(120_000);
    await login(page.request);
    const rhythmResponse = await page.request.get("/api/coo-workbook/rhythm");
    expect(rhythmResponse.ok()).toBeTruthy();
    const rhythm = await rhythmResponse.json();
    const explanation = await page.request.post("/api/coo-workbook/rhythm", { data: {
      workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED",
      reason: "Disposable repair-history read verification; no operational day or billing action.", sourcePath: route
    } });
    expect(explanation.ok()).toBeTruthy();
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/login/);
    const summaries = page.locator("summary").filter({ hasText: /^Find saved repair work$/ });
    await expect(summaries).toHaveCount(1);
    await summaries.click();
    const input = page.getByRole("searchbox", { name: "Search repair history", exact: true });
    await expect(input).toBeVisible();
    await input.fill(fixture.order.repairOrderNumber);
    const directory = page.locator("details").filter({ has: input }).last();
    await directory.getByRole("combobox", { name: "Status", exact: true }).selectOption("CLOSED");
    const loaded = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/repair-history" && url.searchParams.get("query") === fixture.order.repairOrderNumber && url.searchParams.get("state") === "CLOSED";
    });
    await directory.getByRole("button", { name: "Search", exact: true }).click();
    expect((await loaded).status()).toBe(200);
    await expect(directory.getByRole("link", { name: `Open original record ${fixture.order.repairOrderNumber}`, exact: true }))
      .toHaveAttribute("href", `/vehicles/repair-workbench?repairOrderId=${fixture.order.id}`);
    for (const document of fixture.documents) {
      await expect(directory.locator(`a[href="${exactDocumentHref(document.id)}"]`)).toBeVisible();
    }
    await expect(directory.locator(`a[href="${legacyHref()}"]`)).toBeVisible();
    if (route === "/crm-next/deals") {
      const deals = page.getByRole("region", { name: "Saved deals library", exact: true });
      await expect(deals.getByRole("button", { name: "Refresh saved deals", exact: true })).toBeEnabled({ timeout: 30_000 });
      await expect(deals.getByText("Loading saved deals...", { exact: true })).toHaveCount(0);
      await expect(deals.locator("footer")).toBeVisible();
    }
    await dismissReminder(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await directory.screenshot({ path: `test-results/history-${route.slice(1).replaceAll("/", "-")}-1280.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await directory.scrollIntoViewIfNeeded();
    await expect(directory.locator('[aria-busy="true"]')).toHaveCount(0);
    await dismissReminder(page);
    await page.screenshot({ path: `test-results/history-${route.slice(1).replaceAll("/", "-")}-390.png`, fullPage: true });
    for (const control of [input, directory.getByRole("combobox", { name: "Record kind", exact: true }), directory.getByRole("combobox", { name: "Status", exact: true }), directory.getByRole("button", { name: "Search", exact: true })]) {
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    }
    await expect.poll(() => directory.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
    await expect.poll(() => directory.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1280, height: 900 });
    if (route === "/prototype/repair-explorer") {
      // Open each saved version directly; never invoke approval, billing or save controls.
      for (const document of fixture.documents) {
        const opened = await page.goto(exactDocumentHref(document.id));
        expect(opened?.status()).toBe(200);
        await expect(page).toHaveURL(url => url.searchParams.get("documentId") === document.id);
        await expect(page.locator("[data-document-title] h1")).toHaveText(`Synthetic archived ${document.kind.toLowerCase()}`);
        const review = await page.request.get(`/api/repair-orders/${fixture.order.id}/document-review`, { params: { documentId: document.id } });
        expect(review.status()).toBe(200);
        expect((await review.json()).documentHash).toBe(document.sha256);
      }
      expect((await page.goto(legacyHref()))?.status()).toBe(200);
      await expect(page.getByText(`${fixture.order.repairOrderNumber} / v1`, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Legacy document: identity is current, not frozen at issue/)).toBeVisible();
      expect((await page.goto(`/prototype/autobody-estimate?draftId=${fixture.body.id}`))?.status()).toBe(200);
      await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(fixture.body.title);
      await expect(page.getByText("Draft v1 \u00b7 draft", { exact: true })).toBeVisible();
      const draftLoaded = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === "/api/diagnostics/workspace-drafts" && url.searchParams.get("id") === fixture.labor.id;
      });
      expect((await page.goto(`/prototype/labor-guide?draftId=${fixture.labor.id}`))?.status()).toBe(200);
      const loadedDraft = await draftLoaded;
      expect(loadedDraft.status()).toBe(200);
      expect((await loadedDraft.json()).draft).toMatchObject({ id: fixture.labor.id, version: 1, content: { manual: { customer: fixture.customer.displayName, vin: fixture.vehicle.vin } } });
      await expect(page).toHaveURL(url => url.pathname === "/prototype/repair-explorer" && url.searchParams.get("draftId") === fixture.labor.id);
      await expect(page.getByRole("heading", { name: "Find the work. Build the estimate.", exact: true })).toBeVisible();
      await expect(page.locator('[aria-label="Saved quote context"]')).toContainText(fixture.customer.displayName);
      await expect(page.locator('[aria-label="Saved quote context"]')).toContainText(fixture.vehicle.vin!);
    }
  });
}

test("exact archived personal quote restores without saving and denies a different owner", async ({ page, request }) => {
  test.setTimeout(120_000);
  await login(page.request);
  const rhythmResponse = await page.request.get("/api/coo-workbook/rhythm");
  expect(rhythmResponse.ok()).toBeTruthy();
  const rhythm = await rhythmResponse.json();
  const explanation = await page.request.post("/api/coo-workbook/rhythm", { data: {
    workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED",
    reason: "Disposable archived-quote read verification; no save or operational work.", sourcePath: "/prototype/labor-guide"
  } });
  expect(explanation.ok()).toBeTruthy();
  const loaded = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/diagnostics/workspace-drafts" && url.searchParams.get("id") === fixture.archivedLabor.id;
  });
  expect((await page.goto(`/prototype/labor-guide?draftId=${fixture.archivedLabor.id}`))?.status()).toBe(200);
  await expect(page).toHaveURL(url => url.pathname === "/prototype/repair-explorer" && url.searchParams.get("draftId") === fixture.archivedLabor.id);
  const exact = await loaded;
  expect(exact.status()).toBe(200);
  expect(await exact.json()).toMatchObject({ archived: true, draft: { id: fixture.archivedLabor.id, version: 3, content: { archivedAt: closed.toISOString() } } });
  await expect(page.locator('[aria-label="Saved quote context"]')).toContainText("Synthetic Rowan Archived");
  await expect(page.locator('[aria-label="Saved quote context"]')).toContainText("2HGFB2F50EH123456");
  await expect(page.getByText("Archived quote opened as a new draft. Saving creates a copy and preserves the original.", { exact: true })).toBeVisible();
  await dismissReminder(page);
  const draftWrites: string[] = [];
  const estimateWrites: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" && /\/api\/repair-orders\/[^/]+\/planning$/.test(new URL(request.url()).pathname)) estimateWrites.push(request.url());
    if (request.method() === "PUT" && new URL(request.url()).pathname === "/api/diagnostics/workspace-drafts") {
      draftWrites.push(request.url());
    }
  });
  await page.getByRole("navigation", { name: "Estimate steps" }).getByRole("button", { name: /Review estimate/ }).click();
  await page.getByRole("button", { name: "Link repair order", exact: true }).click();
  const lookup = page.getByRole("textbox", { name: "Find an open repair order", exact: true });
  await expect(lookup).toBeFocused();
  await expect(lookup).toHaveValue("2HGFB2F50EH123456");
  await expect(page.getByText("Link an open repair order to issue this estimate. Your current quote lines will stay available.", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Archived brake hardware kit quantity", exact: true })).toHaveValue("2");
  await expect(page.getByRole("button", { name: "Preview / Print Preliminary Quote", exact: true })).toBeEnabled();
  expect(estimateWrites, "An unlinked quote cannot issue an estimate").toEqual([]);
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/my-tasks");
  expect(draftWrites, "Leaving the mounted worksheet must not attempt a draft PUT").toEqual([]);
  expect(await businessSnapshot(), "Leaving an unchanged archived quote must not save a copy").toEqual(beforeRead);
  // No Save action: afterEach checks the archived version/content/hash and total counts.
  await login(request, fixture.reader.email);
  const denied = await request.get("/api/diagnostics/workspace-drafts", { params: { id: fixture.archivedLabor.id } });
  expect(denied.status()).toBe(404);
  expect(denied.headers()["cache-control"]).toContain("no-store");
  const body = await denied.json();
  expect(Object.keys(body)).toEqual(["error"]);
  for (const secret of [fixture.archivedLabor.id, fixture.archivedLabor.title, fixture.archivedLabor.contentHash, "Synthetic Rowan Archived", "2HGFB2F50EH123456"]) {
    expect(JSON.stringify(body)).not.toContain(secret);
  }
});

test("legacy invoice preparation, external reconciliation and document-free payments remain discoverable only with billing access", async ({ request }) => {
  await login(request);
  const b = fixture.billing;
  for (const [query, orderId, documentId, href] of [
    [b.invoicePackage.externalReference!, b.externalOrder.id, b.invoicePackage.id, billingHref(b.externalOrder.id, "packageId", b.invoicePackage.id)],
    [b.reconciliation.externalReference, b.externalOrder.id, b.invoicePackage.id, billingHref(b.externalOrder.id, "packageId", b.invoicePackage.id)],
    [b.invoice.invoiceNumber, b.nativeOrder.id, b.invoice.id, billingHref(b.nativeOrder.id, "invoiceId", b.invoice.id)],
    [b.payment.reference, b.nativeOrder.id, b.payment.id, billingHref(b.nativeOrder.id, "entryId", b.payment.id)]
  ]) {
    const result = await search(request, { query, state: "CLOSED" });
    expect(result.items.map(item => item.id)).toEqual([orderId]);
    expect(result.items[0].documents).toContainEqual(expect.objectContaining({ id: documentId, href }));
  }
  expect((await search(request, { query: b.tag, kind: "INVOICE" })).items.map(item => item.id).sort()).toEqual([b.externalOrder.id, b.nativeOrder.id].sort());
  expect((await search(request, { query: b.tag, kind: "RECEIPT" })).items.map(item => item.id)).toEqual([b.nativeOrder.id]);
  const native = (await search(request, { query: b.invoice.invoiceNumber })).items[0];
  expect(native.documents).toHaveLength(3);
  expect(native.documents).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: b.nativePackage.id, kind: "INVOICE_PACKAGE", href: billingHref(b.nativeOrder.id, "packageId", b.nativePackage.id) }),
    expect.objectContaining({ id: b.invoice.id, kind: "LEGACY_INVOICE" }),
    expect.objectContaining({ id: b.payment.id, kind: "LEGACY_RECEIPT" })
  ]));
  expect(await prisma.serviceDocument.count({ where: { repairOrderId: { in: [b.externalOrder.id, b.nativeOrder.id] } } })).toBe(0);
  for (const email of [fixture.reader.email, fixture.deniedManager.email]) {
    await login(request, email);
    for (const query of [b.invoicePackage.externalReference!, b.reconciliation.externalReference, b.invoice.invoiceNumber, b.payment.reference]) {
      const result = await search(request, { query });
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    }
    for (const kind of ["INVOICE", "RECEIPT"]) expect((await search(request, { query: b.tag, kind })).items).toEqual([]);
    const byCustomer = await search(request, { query: b.customer.displayName });
    if (email === fixture.reader.email) {
      expect(byCustomer.items).toHaveLength(2);
      expect(byCustomer.items.every(item => item.documents.length === 0)).toBe(true);
    } else expect(byCustomer.items).toEqual([]);
    for (const secret of [b.invoicePackage.id, b.invoicePackage.externalReference!, b.reconciliation.externalReference, b.invoice.invoiceNumber, b.payment.reference]) {
      expect(JSON.stringify(byCustomer)).not.toContain(secret);
    }
  }
});

test("exact legacy billing pages show persisted evidence without creating documents or billing actions", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page.request);
  const b = fixture.billing;
  for (const [href, title, reference] of [
    [billingHref(b.externalOrder.id, "packageId", b.invoicePackage.id), "Invoice preparation record", b.invoicePackage.externalReference!],
    [billingHref(b.nativeOrder.id, "invoiceId", b.invoice.id), "Issued service invoice record", b.invoice.invoiceNumber],
    [billingHref(b.nativeOrder.id, "entryId", b.payment.id), "Billing entry record", b.payment.reference]
  ]) {
    expect((await page.goto(href))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("main dd").filter({ hasText: reference }).first()).toBeVisible();
    await expect(page.getByText("This view displays stored records. It does not recreate an issued document or PDF.", { exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("button")).toHaveCount(0);
    if (title === "Invoice preparation record") {
      await expect(page.getByRole("region", { name: "Reconciliation history" })).toContainText(b.reconciliation.externalReference);
    }
  }
  // A valid entry ID paired with the wrong repair order must not reveal that entry.
  const mismatched = await page.request.get(billingHref(b.externalOrder.id, "entryId", b.payment.id));
  expect(mismatched.status()).toBe(404);
  expect(await mismatched.text()).not.toContain(b.payment.reference);
});

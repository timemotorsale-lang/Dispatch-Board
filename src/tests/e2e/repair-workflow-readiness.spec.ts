import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect as baseExpect, test, type APIRequestContext, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { requiredPartsForLabor } from "@/server/diagnostics/estimate-parts-tax-policy";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { catalogScopeDigest } from "@/server/diagnostics/catalog-approval";
import { LIGHT_DUTY_CATALOG_VERSION } from "@/lib/light-duty-baseline";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

// Run alone, with the app and tests pointed at the same NEW disposable schema.
// Synthetic identity/catalog prerequisites; workflow transitions use browser controls.
// No real vehicle work, customer authorization, or money is represented.
test.describe.configure({ mode: "default" });
test.setTimeout(360_000);
test.use({ actionTimeout: 15_000, screenshot: "only-on-failure" });
const expect = baseExpect.configure({ timeout: 45_000 });
const resumeRepairOrderId = process.env.E2E_READINESS_RESUME_RO;
const email = "morgan.manager@local.test", password = "dispatch123!";
let fixture: Awaited<ReturnType<typeof seedReadiness>>;
let issued: { estimateId: string; documentId: string; invoiceDocumentId: string; invoiceId: string };
let artifactDirectory: string;
let depositCommand: Record<string, unknown>;
let depositId: string;
let depositDocumentId: string;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const guideHref = (draftId: string) => `/prototype/labor-guide?experience=explorer&draftId=${draftId}`;

async function seedReadiness() {
  const tag = `readiness-${randomUUID().slice(0, 8)}`;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  const location = await prisma.location.findUniqueOrThrow({ where: { organizationId_code: { organizationId: organization.id, code: "TMS-MSP-01" } } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email } });
  // This organization exists only inside the guarded disposable schema.
  for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS"] as const) {
    await prisma.vehicleOperationsFeatureFlag.deleteMany({ where: { organizationId: organization.id, code } });
    await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: organization.id, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
  }
  const otherLocation = await prisma.location.create({ data: { organizationId: organization.id, code: tag, name: "SYNTHETIC other store", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
  // An unrelated store bin is intentionally present before any local receiving bin.
  // Receiving must resolve the purchase order location, not the first global bin.
  const foreignBin = await prisma.partStockLocation.create({ data: { organizationId: organization.id, locationId: otherLocation.id, code: `AAA-${tag}`, name: "SYNTHETIC other-store receiving bin", type: "BIN" } });
  const seededSales = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" }, include: { userRoles: { include: { role: true } } } });
  const salesRole = seededSales.userRoles[0]?.role;
  if (!salesRole) throw new Error("Seeded Sales role is required for the store-scoped regression.");
  const sales = await prisma.user.create({ data: { name: "SYNTHETIC scoped sales reader", email: `${tag}-sales@local.test`, passwordHash: manager.passwordHash, userRoles: { create: { roleId: salesRole.id } } } });
  const billing = await prisma.user.create({ data: { name: "SYNTHETIC explicitly granted billing clerk", email: `${tag}-billing@local.test`, passwordHash: manager.passwordHash } });
  for (const user of [sales, billing]) {
    const capabilities = user.id === sales.id ? ["REPAIR_ORDER_VIEW"] : ["REPAIR_ORDER_VIEW", "SERVICE_BILLING_VIEW", "SERVICE_BILLING_MANAGE"];
    for (const capability of capabilities) await prisma.vehicleCapabilityGrant.create({ data: { organizationId: organization.id, locationId: location.id, userId: user.id, capability, effect: "ALLOW", constraints: {}, validFrom: new Date("2020-01-01") } });
  }
  const selectedOperation = flattenLaborOperationTaxonomy().find(item => item.operation === "Diagnose" && !item.requiredAddOns.length && !requiredPartsForLabor(item).length);
  if (!selectedOperation) throw new Error("A catalog diagnostic operation without required parts is needed.");
  const operation = selectedOperation;
  // Administrative prerequisites only. No job, clock, QC, purchase or receipt is seeded.
  const technician = await prisma.user.findFirstOrThrow({ where: { userRoles: { some: { role: { name: "Mechanic" } } } }, orderBy: { name: "asc" } });
  if (!await prisma.technicianQualification.findFirst({ where: { organizationId: organization.id, technicianUserId: technician.id, code: "CATALOG_MAINTENANCE" } })) await prisma.technicianQualification.create({ data: { organizationId: organization.id, technicianUserId: technician.id, type: "SKILL", code: "CATALOG_MAINTENANCE", effectiveFrom: new Date("2020-01-01"), sourceReference: "SYNTHETIC training qualification prerequisite", verifiedByUserId: manager.id, verifiedAt: new Date() } });
  const bayType = await prisma.schedulableResourceType.findFirstOrThrow({ where: { organizationId: organization.id, kind: "SERVICE_BAY" } });
  const bay = await prisma.schedulableResource.create({ data: { organizationId: organization.id, locationId: location.id, resourceTypeId: bayType.id, code: `${tag}-BAY`, name: "SYNTHETIC training bay with service information", capacityMode: "EXCLUSIVE", conflictPolicy: "HARD_BLOCK", effectiveFrom: new Date("2020-01-01"), attributes: { catalogCapabilities: ["SERVICE_INFORMATION"] } } });
  await prisma.vehiclePolicyVersion.create({ data: { organizationId: organization.id, policyCode: "LABOR_CATALOG_MAINTENANCE", domain: "LABOR_CATALOG", version: 1 + await prisma.vehiclePolicyVersion.count({ where: { organizationId: organization.id, policyCode: "LABOR_CATALOG_MAINTENANCE" } }), status: "ACTIVE", configuration: { version: 1, catalogVersion: LIGHT_DUTY_CATALOG_VERSION, systemId: "maintenance", scopeDigest: catalogScopeDigest("maintenance"), enabled: true, reviewReference: "SYNTHETIC independently reviewed scope fixture", capabilityReference: "SYNTHETIC capability prerequisite fixture" }, simulationSnapshot: {}, pilotScope: {}, outcomeSnapshot: {}, effectiveFrom: new Date("2020-01-01"), createdByUserId: technician.id, approvedByUserId: manager.id, approvedAt: new Date(), activatedByUserId: manager.id, activatedAt: new Date(), reason: "Synthetic catalog policy prerequisite; administrative UI not under test" } });
  const rate = await prisma.vehiclePolicyVersion.findFirst({ where: { organizationId: organization.id, policyCode: "SHOP_LABOR_RATE", status: "ACTIVE" }, orderBy: { version: "desc" } });
  const rateConfig = rate?.configuration;
  const laborRate = rateConfig && typeof rateConfig === "object" && !Array.isArray(rateConfig) && typeof rateConfig.laborRateCents === "number" ? rateConfig.laborRateCents / 100 : 125;
  async function order(suffix: string, locationId = location.id) {
    const customer = await prisma.customer.create({ data: { organizationId: organization.id, customerNumber: `${tag}-${suffix}`, displayName: `SYNTHETIC ${suffix} customer - training only` } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId: organization.id, vehicleNumber: `${tag}-${suffix}`, year: 2016, make: "Toyota", model: "Camry", vinState: "NON_VIN_EXCEPTION", nonVinReason: "Disposable synthetic workflow demonstration", vinValidationSource: "SYNTHETIC_E2E" } });
    const visit = await prisma.serviceVisit.create({ data: { organizationId: organization.id, locationId, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: new Date(), concernSummary: "Synthetic diagnostic inspection. No real customer, vehicle or payment.", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: manager.id } });
    const ro = await prisma.repairOrder.create({ data: { organizationId: organization.id, locationId, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: visit.id, repairOrderNumber: `${tag}-${suffix}-OPEN`, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(Date.now() + 86400000), ownerUserId: manager.id, nextAction: "SYNTHETIC: link saved quote, review and generate estimate" } });
    const content = { schema: 1, ro: null, manual: { customer: customer.displayName, vehicle: "2016 Toyota Camry", vin: "", concern: visit.concernSummary }, labor: [{ ...operation, rowId: operation.id, source: "SELECTED" }], parts: [], evidence: [], attempt: null, clinical: {}, serviceCharges: [], suppliesTaxable: false, discountCents: 0, estimateControls: { version: 1, pricing: { ...initialEstimatePricing, laborRate, taxRatePercent: 0, taxReference: "Synthetic no-tax training quote" }, fitment: {}, overlapResolution: "", reviewedScope: "" } };
    const draft = await prisma.diagnosticWorkspaceDraft.create({ data: { id: randomUUID(), userId: manager.id, title: `SYNTHETIC ${suffix} - unissued diagnostic quote`, content, contentHash: digest(content) } });
    return { ro, draft, customer, vehicle };
  }
  const parts = await order("PARTS"), tested = await order("TEST"), demo = await order("DEMO-START-HERE"), other = await order("OTHER-STORE", otherLocation.id);
  return { tag, organization, location, manager, sales, billing, technician, bay, foreignBin, parts, tested, demo, other, operation };
}


// Explicit continuation only: read existing synthetic fixtures without reset or seed.
async function loadReadiness(repairOrderId: string): Promise<Awaited<ReturnType<typeof seedReadiness>>> {
  const root = await prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId } });
  if (!/^readiness-[a-f0-9]{8}-TEST-OPEN$/.test(root.repairOrderNumber)) throw new Error("Resume requires the synthetic TEST repair.");
  const tag = root.repairOrderNumber.replace(/-TEST-OPEN$/, "");
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: root.organizationId } });
  const location = await prisma.location.findUniqueOrThrow({ where: { id: root.locationId } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email } });
  const sales = await prisma.user.findUniqueOrThrow({ where: { email: `${tag}-sales@local.test` } });
  const billing = await prisma.user.findUniqueOrThrow({ where: { email: `${tag}-billing@local.test` } });
  const technician = await prisma.user.findFirstOrThrow({ where: { userRoles: { some: { role: { name: "Mechanic" } } } }, orderBy: { name: "asc" } });
  const bay = await prisma.schedulableResource.findFirstOrThrow({ where: { organizationId: organization.id, code: `${tag}-BAY` } });
  const foreignBin = await prisma.partStockLocation.findFirstOrThrow({ where: { organizationId: organization.id, code: `AAA-${tag}` } });
  const operation = flattenLaborOperationTaxonomy().find(item => item.operation === "Diagnose" && !item.requiredAddOns.length && !requiredPartsForLabor(item).length);
  if (!operation) throw new Error("Diagnostic catalog prerequisite missing.");
  async function order(suffix: string) {
    const ro = await prisma.repairOrder.findFirstOrThrow({ where: { organizationId: organization.id, repairOrderNumber: `${tag}-${suffix}-OPEN` } });
    if (!ro.customerId) throw new Error("Synthetic customer missing.");
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: ro.customerId } });
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: ro.vehicleId } });
    const draft = await prisma.diagnosticWorkspaceDraft.findFirstOrThrow({ where: { userId: manager.id, createdAt: { gte: ro.createdAt }, content: { path: ["manual", "customer"], equals: customer.displayName } }, orderBy: { createdAt: "asc" } });
    return { ro, customer, vehicle, draft };
  }
  const parts = await order("PARTS"), tested = await order("TEST"), demo = await order("DEMO-START-HERE"), other = await order("OTHER-STORE");
  const estimate = await prisma.repairEstimateVersion.findFirstOrThrow({ where: { repairOrderId }, orderBy: { createdAt: "asc" } });
  const invoice = await prisma.serviceInvoice.findFirstOrThrow({ where: { repairOrderId } });
  const estimateDocument = await prisma.serviceDocument.findFirstOrThrow({ where: { repairOrderId, sourceId: estimate.id, kind: "ESTIMATE" } });
  const invoiceDocument = await prisma.serviceDocument.findFirstOrThrow({ where: { repairOrderId, sourceId: invoice.id, kind: "INVOICE" } });
  issued = { estimateId: estimate.id, documentId: estimateDocument.id, invoiceId: invoice.id, invoiceDocumentId: invoiceDocument.id };
  return { tag, organization, location, manager, sales, billing, technician, bay, foreignBin, parts, tested, demo, other, operation };
}

async function login(request: APIRequestContext, userEmail = email) {
  const response = await request.post("/api/auth/login", { data: { email: userEmail, password } });
  expect(response.ok(), await response.text()).toBe(true);
}
async function preparePage(page: Page) {
  await page.addLocatorHandler(page.getByRole("dialog", { name: "Operating rhythm reminder", exact: true }), async dialog => {
    await dialog.getByLabel("Reason Start The Day cannot happen yet", { exact: true }).fill("Disposable synthetic browser workflow; no operational day or actual customer work.");
    await dialog.getByRole("button", { name: "Save reason", exact: true }).click();
  });
  await page.addLocatorHandler(page.getByRole("button", { name: "Dismiss reminder", exact: true }), async button => { await button.click(); });
  await login(page.request);
  const response = await page.request.get("/api/coo-workbook/rhythm");
  expect(response.ok()).toBe(true);
  const rhythm = await response.json();
  expect((await page.request.post("/api/coo-workbook/rhythm", { data: { workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED", reason: "Disposable synthetic workflow test; no actual operational day or customer work.", sourcePath: "/prototype/labor-guide" } })).ok()).toBe(true);
}
async function dismissReminder(page: Page) {
  const dismiss = page.getByRole("button", { name: "Dismiss reminder", exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
}
async function snapshot() {
  const repairOrderId = fixture.tested.ro.id;
  const invoices = await prisma.serviceInvoice.findMany({ where: { repairOrderId }, select: { id: true } });
  return digest(await Promise.all([
    prisma.repairOrder.findUnique({ where: { id: repairOrderId } }),
    prisma.repairEstimateVersion.findMany({ where: { repairOrderId }, orderBy: { id: "asc" } }),
    prisma.repairAuthorization.findMany({ where: { repairOrderId }, orderBy: { id: "asc" } }),
    prisma.serviceDocument.findMany({ where: { repairOrderId }, orderBy: { id: "asc" } }),
    prisma.$queryRaw`SELECT * FROM "ServiceRepairDepositEntry" WHERE "repairOrderId" = ${repairOrderId} ORDER BY id`,
    prisma.serviceInvoicePackage.findMany({ where: { repairOrderId }, orderBy: { id: "asc" } }),
    prisma.serviceInvoice.findMany({ where: { repairOrderId }, orderBy: { id: "asc" } }),
    prisma.serviceInvoiceEntry.findMany({ where: { invoiceId: { in: invoices.map(invoice => invoice.id) } }, orderBy: { id: "asc" } })
  ]));
}
async function inspectAndDiagnose(page: Page) {
  await page.goto(`/vehicles/shop-planning?repairOrderId=${fixture.tested.ro.id}`);
  await dismissReminder(page);
  const clearance = page.getByRole("region", { name: "Inspection clearance items" });
  for (const label of ["Inspection proof", "Safety / warning lights", "Repair path decision"]) {
    await clearance.getByRole("button", { name: new RegExp(label.replace("/", "\\/")) }).click();
  }
  await page.getByRole("button", { name: "Save checklist and unlock next stage", exact: true }).click();
  await expect.poll(() => prisma.vehicleInspectionVersion.count({ where: { repairOrderId: fixture.tested.ro.id } })).toBe(1);
  await page.getByText("Diagnosis details when troubleshooting needs documentation", { exact: true }).click();
  for (const [label, value] of Object.entries({ Symptoms: "Synthetic intermittent sensor signal", "Diagnostic test": "Synthetic harness continuity check", "Test result": "Synthetic repeatable signal dropout", "Evidence references": "synthetic:training-measurement", "Root cause": "Synthetic loose connector", Recommendation: "Inspect and secure the connector", "Proposed correction": "Perform the approved synthetic diagnostic operation" })) {
    await page.locator("#repair-planning-step-2").getByLabel(label, { exact: true }).fill(value);
  }
  await page.locator("#repair-planning-step-2").getByRole("combobox", { name: /^Diagnostic uncertainty/ }).selectOption("LOW");
  await page.getByRole("button", { name: "Confirm diagnosis and unlock estimate", exact: true }).click();
  await expect.poll(() => prisma.repairDiagnosisVersion.count({ where: { repairOrderId: fixture.tested.ro.id } }), { timeout: 30_000 }).toBe(1);
}

async function completeLaborThroughBrowser(page: Page) {
  const roId = fixture.tested.ro.id;
  await page.goto(`/vehicles/shop-planning?repairOrderId=${roId}`);
  const create = page.getByRole("button", { name: "Create repair job", exact: true });
  if (!await create.isVisible()) await page.locator("summary").filter({ hasText: /Release|repair job/i }).last().click();
  await page.getByLabel("What should be done", { exact: true }).fill("Synthetic training operation; no physical vehicle work performed");
  await create.click();
  await expect.poll(() => prisma.repairJob.count({ where: { repairOrderId: roId } })).toBe(1);
  const job = await prisma.repairJob.findFirstOrThrow({ where: { repairOrderId: roId } });
  await page.goto(`/vehicles/shop-dispatch?repairOrderId=${roId}`);
  await page.getByLabel("Repair job", { exact: true }).selectOption(job.id);
  await page.getByLabel("Technician", { exact: true }).selectOption(fixture.technician.id);
  await page.getByRole("combobox", { name: /^Service bay/ }).selectOption(fixture.bay.id);
  const localTime = (offset: number) => { const date = new Date(Date.now() + offset); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  await page.getByLabel("Start", { exact: true }).fill(localTime(120_000));
  await page.getByLabel("End", { exact: true }).fill(localTime(3_720_000));
  const technicianId = await page.getByLabel("Technician", { exact: true }).inputValue();
  const technician = await prisma.user.findUniqueOrThrow({ where: { id: technicianId } });
  const publish = page.getByText("Publish work procedure", { exact: true });
  if (await publish.isVisible()) {
    await publish.click();
    for (const label of ["Procedure title", "Work instructions", "Safety steps", "Required evidence", "QC checks"]) await page.getByLabel(label, { exact: true }).fill(`Synthetic training ${label.toLowerCase()}`);
    await page.getByRole("button", { name: "Publish procedure", exact: true }).click();
  }
  await page.getByRole("button", { name: "Book work", exact: true }).click();
  await expect.poll(() => prisma.repairJobDispatch.count({ where: { repairJobId: job.id, status: "ACTIVE" } })).toBe(1);
  await login(page.request, technician.email);
  await page.goto(`/vehicles/repair-jobs/${job.id}/workbench`);
  await dismissReminder(page);
  await page.getByRole("button", { name: "Start Work", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Work started.");
  await page.getByRole("button", { name: "Partially Completed", exact: true }).click();
  await page.getByLabel("Why the repair is incomplete", { exact: true }).fill("Synthetic training pause to verify the service information");
  await page.getByRole("textbox", { name: "Recommended next step", exact: true }).fill("Resume the synthetic diagnostic operation after checking service information");
  await page.getByRole("button", { name: "Pause / Report Blocker", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Work paused. Your update was recorded.");
  await page.getByRole("button", { name: "Resume Work", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Work resumed.");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByLabel("Work performed", { exact: true }).fill("Synthetic training: inspected and secured connector");
  await page.getByLabel("Verification performed", { exact: true }).fill("Synthetic continuity and signal verification passed");
  await page.getByLabel("QC handoff notes", { exact: true }).fill("Synthetic training: verify connector and recorded signal");
  await page.getByRole("button", { name: "Complete Work & Send to QC", exact: true }).click();
  await expect.poll(async () => (await prisma.repairJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("READY_FOR_QC");
  expect(await prisma.repairJobLaborEvent.findMany({ where: { repairJobId: job.id }, orderBy: { occurredAt: "asc" }, select: { eventType: true } })).toEqual([{ eventType: "START" }, { eventType: "PAUSE" }, { eventType: "RESUME" }, { eventType: "FINISH" }]);
  await login(page.request);
  await page.goto(`/vehicles/quality-control?repairOrderId=${roId}`);
  await page.getByRole("button", { name: "Show queue and detailed QC tools", exact: true }).click();
  const qcForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Record immutable QC result", exact: true }) });
  await qcForm.getByLabel("Evidence references", { exact: true }).fill("synthetic:independent-peer-verification");
  await qcForm.getByRole("checkbox", { name: "Peer verification passed", exact: true }).check();
  await qcForm.getByRole("combobox", { name: /^Peer verifier/ }).selectOption(fixture.manager.id);
  const qcResponse = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith(`/api/repair-jobs/${job.id}/quality-inspection`));
  await qcForm.getByRole("button", { name: "Record immutable QC result", exact: true }).click();
  const qcResult = await qcResponse;
  expect(qcResult.ok(), await qcResult.text()).toBe(true);
  await expect.poll(async () => (await prisma.repairJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("QC_PASSED");
  expect(await prisma.repairQualityInspection.count({ where: { repairJobId: job.id, disposition: "PASSED" } })).toBe(1);
  await page.screenshot({ path: resolve(artifactDirectory, "technician-qc-passed.png"), fullPage: true });
}

async function completeHandoffThroughBrowser(page: Page) {
  const repairOrderId = fixture.tested.ro.id;
  await page.goto(`/vehicles/quality-control?repairOrderId=${repairOrderId}`);
  const finalQc = page.getByRole("region", { name: "Final Frontline QC", exact: true });
  await expect(finalQc).toBeVisible();
  const checks = finalQc.getByRole("group");
  await expect(checks).toHaveCount(19);
  for (let index = 0; index < 19; index++) await checks.nth(index).getByRole("button", { name: /Pass$/ }).click();
  await finalQc.getByRole("button", { name: "Mark Frontline Ready", exact: true }).click();
  await expect.poll(() => prisma.repairOrderReleaseAuthorization.count({ where: { repairOrderId: repairOrderId } })).toBe(1);
  await page.goto(`/prototype/repair-workbench?repairOrderId=${repairOrderId}&step=handoff`);
  await page.getByLabel("Receiving person / department", { exact: true }).fill("Synthetic training customer");
  await page.getByLabel("Final odometer", { exact: true }).fill("123456");
  await page.getByLabel("Handoff evidence (one reference per line)", { exact: true }).fill("synthetic:training-handoff-no-real-vehicle");
  await page.getByRole("checkbox", { name: "Keys verified", exact: true }).check();
  await page.getByRole("checkbox", { name: "I verified the vehicle, destination and handoff evidence.", exact: true }).check();
  await page.getByRole("button", { name: "Check current handoff readiness", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Handoff readiness/ })).toContainText("READY");
  await page.getByRole("button", { name: "Close repair & record handoff", exact: true }).click();
  await expect.poll(async () => (await prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId } })).closedAt).not.toBeNull();
  await page.screenshot({ path: resolve(artifactDirectory, "handoff-complete.png"), fullPage: true });
}

test.beforeAll(async () => {
  const db = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["postgres:", "postgresql:"].includes(db.protocol) || db.hostname !== "127.0.0.1" || db.port !== "55439" || !db.searchParams.get("schema")?.startsWith("dispatch_board_e2e_readiness_")) throw new Error("Use a NEW local disposable readiness schema on 127.0.0.1:55439.");
  if (!resumeRepairOrderId) await resetDailyWorkflowState();
  const constraints = await prisma.$queryRaw<{ conname: string }[]>`SELECT conname FROM pg_constraint WHERE conrelid = '"ServiceRepairDepositEntry"'::regclass`;
  expect(constraints.map(row => row.conname)).toEqual(expect.arrayContaining(["ServiceRepairDepositEntry_amount_check", "ServiceRepairDepositEntry_links_check"]));
  const triggers = await prisma.$queryRaw<{ tgname: string }[]>`SELECT tgname FROM pg_trigger WHERE tgrelid = '"ServiceRepairDepositEntry"'::regclass AND NOT tgisinternal`;
  expect(triggers.map(row => row.tgname)).toContain("ServiceRepairDepositEntry_history_guard");
  fixture = resumeRepairOrderId ? await loadReadiness(resumeRepairOrderId) : await seedReadiness();
  artifactDirectory = resolve("..", "repair-readiness-artifacts", db.searchParams.get("schema")!);
  mkdirSync(artifactDirectory, { recursive: true });
  if (!resumeRepairOrderId) writeFileSync(resolve(artifactDirectory, "demo.json"), JSON.stringify({ schema: db.searchParams.get("schema"), email, password, demoRepairOrder: fixture.demo.ro.repairOrderNumber, repairOrderId: fixture.demo.ro.id, demoPath: guideHref(fixture.demo.draft.id), note: "Unissued synthetic quote. Click Link repair order, find this open RO, attach proposed work, then generate." }, null, 2));
});
test.afterAll(disconnectDailyWorkflowDatabase);

test("parts purchase and partial receiving use browser controls and the purchase order store", async ({ page }) => {
  test.skip(Boolean(resumeRepairOrderId), "Completed mutations are preserved during continuation.");
  await preparePage(page);
  const partDescription = "Synthetic training connector";
  await page.goto(`/vehicles/service-close-parts?repairOrderId=${fixture.parts.ro.id}`);
  await dismissReminder(page);
  await page.getByRole("button", { name: /Bought \/ Ordered Create and track purchases/ }).click();
  await page.getByPlaceholder("Add part bought, vendor, amount, date bought/ordered, and any purchase detail.", { exact: true }).fill(`${partDescription} - Synthetic Local Supplier - $12.50 qty 2`);
  await page.getByRole("button", { name: "Record bought parts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record bought parts", exact: true })).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => prisma.partPurchaseOrder.count({ where: { requisition: { demand: { repairOrderId: fixture.parts.ro.id } } } })).toBe(1);
  const po = await prisma.partPurchaseOrder.findFirstOrThrow({ where: { requisition: { demand: { repairOrderId: fixture.parts.ro.id } } } });
  const card = page.locator("article").filter({ has: page.locator("strong", { hasText: po.purchaseOrderNumber }) });
  const approve = page.getByRole("button", { name: "Approve purchase order", exact: true });
  if (await approve.isVisible()) await approve.click();
  else if (await card.getByRole("button", { name: "Approve", exact: true }).isVisible()) await card.getByRole("button", { name: "Approve", exact: true }).click();
  const issue = card.getByRole("button", { name: /^(Issue|Issue order)$/ });
  if (po.status !== "ISSUED") await issue.click();
  await expect.poll(async () => (await prisma.partPurchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe("ISSUED");
  await page.getByRole("button", { name: /Received Post receipts and exceptions/ }).click();
  const captured = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/api/service-close-parts") && request.postDataJSON().action === "RECEIVE_PURCHASE_ORDER");
  await page.getByPlaceholder("Add what arrived, condition, quantity, packing slip, and any exception.", { exact: true }).fill(`${partDescription} - $12.50 qty 1`);
  await page.getByRole("button", { name: "Record received parts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record received parts", exact: true })).toBeVisible({ timeout: 45_000 });
  const command = (await captured).postDataJSON();
  await expect.poll(() => prisma.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(1);
  const receipt = await prisma.partReceipt.findFirstOrThrow({ where: { purchaseOrderId: po.id }, include: { stockLocation: true } });
  expect(receipt.stockLocation.locationId).toBe(po.locationId);
  expect(receipt.stockLocationId).not.toBe(fixture.foreignBin.id);
  expect(receipt.lines).toEqual(expect.arrayContaining([expect.objectContaining({ quantity: 1 })]));
  const before = digest(await prisma.partReceipt.findMany({ where: { purchaseOrderId: po.id } }));
  const replay = await page.request.post("/api/service-close-parts", { data: command });
  expect(replay.ok(), await replay.text()).toBe(true);
  expect(digest(await prisma.partReceipt.findMany({ where: { purchaseOrderId: po.id } }))).toBe(before);
  await page.getByPlaceholder("Add what arrived, condition, quantity, packing slip, and any exception.", { exact: true }).fill(`${partDescription} - $12.50 qty 1`);
  await page.getByRole("button", { name: "Record received parts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record received parts", exact: true })).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => prisma.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(2);
  await dismissReminder(page);
  await page.screenshot({ path: resolve(artifactDirectory, "parts-received.png"), fullPage: true });
  const partsFlag = await prisma.vehicleOperationsFeatureFlag.findFirstOrThrow({ where: { organizationId: fixture.organization.id, code: "PARTS_OPERATIONS", locationId: null } });
  await prisma.vehicleOperationsFeatureFlag.update({ where: { id: partsFlag.id }, data: { mode: "OFF" } });
  try {
    const blocked = await page.request.post("/api/parts/locations", { data: { code: `${fixture.tag}-BLOCKED`, name: "Synthetic blocked bin", locationId: fixture.location.id, type: "STAGING", reason: "Synthetic rollout guard verification", idempotencyKey: randomUUID() } });
    expect(blocked.status()).toBe(400);
    expect(await blocked.text()).toContain("Parts Operations mutations are not enabled");
  } finally { await prisma.vehicleOperationsFeatureFlag.update({ where: { id: partsFlag.id }, data: { mode: "GENERAL" } }); }
  await login(page.request, fixture.sales.email);
  expect((await page.request.post("/api/service-close-parts", { data: { ...command, idempotencyKey: randomUUID(), packingSource: randomUUID() } })).status()).toBe(403);
});

test("unlinked saved quote links through UI, issues once, recovers approval load and settles invoice", async ({ page }) => {
  test.skip(Boolean(resumeRepairOrderId), "Completed mutations are preserved during continuation.");
  await preparePage(page);
  await inspectAndDiagnose(page);
  await page.goto(guideHref(fixture.tested.draft.id));
  await expect(page.getByRole("heading", { name: "Find the work. Build the estimate.", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Estimate steps" }).getByRole("button", { name: /Review estimate/ }).click();
  const generate = page.getByRole("button", { name: "Generate / Print Estimate", exact: true });
  const linkRepairOrder = page.getByRole("button", { name: "Link repair order", exact: true });
  await expect(linkRepairOrder).toBeVisible();
  await dismissReminder(page);
  await linkRepairOrder.click();
  const lookup = page.getByRole("textbox", { name: "Find an open repair order", exact: true });
  await expect(lookup).toBeFocused();
  expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId: fixture.tested.ro.id } })).toBe(0);
  await page.getByRole("spinbutton", { name: `${fixture.operation.title} hours`, exact: true }).fill("1.4");
  await page.getByRole("button", { name: "Preview / Print Preliminary Quote", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/repair-estimate" && !url.searchParams.has("repairOrderId"), { timeout: 30_000 });
  const selectOrder = page.getByRole("link", { name: "Select repair order", exact: true });
  const returnUrl = new URL((await selectOrder.getAttribute("href"))!, page.url());
  expect(returnUrl.pathname).toBe("/prototype/repair-explorer");
  expect(returnUrl.searchParams.get("draftId")).toBe(fixture.tested.draft.id);
  expect(returnUrl.searchParams.get("attachRepairOrder")).toBe("1");
  await selectOrder.click();
  await expect(lookup).toBeFocused({ timeout: 30_000 });
  await expect(page.getByRole("spinbutton", { name: `${fixture.operation.title} hours`, exact: true })).toHaveValue("1.4");
  await lookup.fill(fixture.tested.ro.repairOrderNumber);
  await page.getByRole("region", { name: "Repair order lookup results" }).getByRole("button").filter({ hasText: fixture.tested.ro.repairOrderNumber }).click();
  await page.getByRole("button", { name: "Save source quote & attach proposed work to this RO", exact: true }).click();
  await expect(page.locator('[aria-label="Saved quote context"]')).toContainText(fixture.tested.ro.repairOrderNumber);
  await expect(page.getByLabel("Estimate editor")).toContainText(fixture.operation.title);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => window.document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: resolve(artifactDirectory, `linked-quote-review-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await generate.click();
  await expect(page).toHaveURL(/\/repair-estimate\?.*estimateId=/, { timeout: 45000 });
  const estimateId = new URL(page.url()).searchParams.get("estimateId");
  if (!estimateId) throw new Error("Issued estimate link missing exact version ID.");
  const estimate = await prisma.repairEstimateVersion.findUniqueOrThrow({ where: { id: estimateId } });
  expect(estimate.repairOrderId).toBe(fixture.tested.ro.id);
  expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId: estimate.repairOrderId } })).toBe(1);
  const document = await prisma.serviceDocument.findFirstOrThrow({ where: { sourceId: estimateId, kind: "ESTIMATE" } });
  expect(document.sha256).toBe(hashEnterpriseCommand({ templateVersion: document.templateVersion, content: document.content }));
  await expect(page.getByRole("heading", { name: "Estimate to receipt", exact: true })).toBeVisible();
  const planning = `/api/repair-orders/${estimate.repairOrderId}/planning`;
  let rejectedLoad = false, allowRetry = false, approvals = 0;
  await page.route(`**${planning}`, async route => {
    // Strict Mode may repeat/abort the initial effect. Keep that load phase down
    // until the user-visible retry is observed, then restore the real endpoint.
    if (route.request().method() === "GET" && !allowRetry) { rejectedLoad = true; await route.fulfill({ status: 503, json: { error: "Synthetic transient planning outage" } }); return; }
    if (route.request().method() === "POST" && route.request().postDataJSON().action === "DECIDE_AUTHORIZATION") approvals++;
    await route.continue();
  });
  await page.getByRole("button", { name: "Record customer approval", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry loading approval details", exact: true })).toBeVisible();
  await expect(page.getByLabel("Customer / authorized representative", { exact: true })).toBeDisabled();
  await page.screenshot({ path: resolve(artifactDirectory, "approval-retry.png"), fullPage: true });
  allowRetry = true;
  await page.getByRole("button", { name: "Retry loading approval details", exact: true }).click();
  await page.getByLabel("Customer / authorized representative", { exact: true }).fill("Synthetic customer - automated training approval");
  await page.getByLabel("Approval evidence / reference", { exact: true }).fill("SYNTHETIC test consent only - not a real customer authorization");
  await page.getByRole("checkbox", { name: "I verified the customer approved all listed work and the exact quoted amount.", exact: true }).check();
  // Two same-task DOM clicks exercise the synchronous submission latch.
  await page.getByRole("button", { name: "Record approval & continue", exact: true }).evaluate(button => { if (!(button instanceof HTMLButtonElement)) throw new Error("Expected submit button"); button.click(); button.click(); });
  await expect(page.getByRole("button", { name: "Review invoice requirements", exact: true })).toBeVisible();
  expect(rejectedLoad).toBe(true);
  expect(approvals).toBe(1);
  expect(await prisma.repairAuthorization.count({ where: { repairOrderId: estimate.repairOrderId, estimateVersionId: estimateId, disposition: "ACCEPTED" } })).toBe(1);
  await page.unroute(`**${planning}`);
  await page.goto(`/vehicles/service-billing?repairOrderId=${estimate.repairOrderId}`);
  const deposits = page.getByRole("region", { name: "Repair deposits", exact: true });
  await deposits.getByLabel("Amount (USD)", { exact: true }).fill("25.00");
  await deposits.getByLabel("Verified payment / refund reference", { exact: true }).fill(`${fixture.tag}-SYNTHETIC-DEPOSIT`);
  await deposits.getByRole("checkbox", { name: "I verified this money was received for this repair.", exact: true }).check();
  const collection = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith(`/api/repair-orders/${estimate.repairOrderId}/billing`) && request.postDataJSON().action === "DEPOSIT");
  await deposits.getByRole("button", { name: "Record repair deposit", exact: true }).click();
  depositCommand = (await collection).postDataJSON();
  const receiptLink = deposits.getByRole("link", { name: "Open / Print Repair Deposit Receipt", exact: true });
  await expect(receiptLink).toBeVisible();
  depositDocumentId = new URL((await receiptLink.getAttribute("href"))!, page.url()).searchParams.get("documentId")!;
  const depositState = await (await page.request.get(`/api/repair-orders/${estimate.repairOrderId}/billing`)).json();
  expect(depositState.deposits.balance).toMatchObject({ collectedCents: 2500, availableCents: 2500, appliedCents: 0 });
  depositId = depositState.deposits.entries[0].id;
  const replay = await page.request.post(`/api/repair-orders/${estimate.repairOrderId}/billing`, { data: depositCommand });
  expect(replay.ok(), await replay.text()).toBe(true);
  expect((await replay.json()).result.documentId).toBe(depositDocumentId);
  const depositBefore = await snapshot();
  for (const data of [
    { ...depositCommand, action: "REFUND_DEPOSIT", relatedEntryId: depositId, amountCents: 2501, expectedVersion: depositState.deposits.version },
    { ...depositCommand, amountCents: 0, expectedVersion: depositState.deposits.version },
  ]) {
    const rejected = await page.request.post(`/api/repair-orders/${estimate.repairOrderId}/billing`, { data: { ...data, idempotencyKey: randomUUID() } });
    expect(rejected.status(), await rejected.text()).toBe(400);
  }
  await login(page.request, fixture.sales.email);
  expect((await page.request.get(`/api/repair-orders/${estimate.repairOrderId}/documents/${depositDocumentId}/pdf`)).status()).toBe(403);
  expect((await page.request.post(`/api/repair-orders/${estimate.repairOrderId}/billing`, { data: { ...depositCommand, idempotencyKey: randomUUID() } })).status()).toBe(403);
  await login(page.request);
  expect(await snapshot()).toBe(depositBefore);
  // Verify the operational gate before exercising job release, dispatch, labor and QC.
  const gated = await (await page.request.get(`/api/repair-orders/${estimate.repairOrderId}/billing`)).json();
  expect(gated.readiness.mismatchCodes).toContain("INVOICE_JOB_QC_INCOMPLETE");
  await completeLaborThroughBrowser(page);
  await page.goto(`/service-documents?repairOrderId=${estimate.repairOrderId}&documentId=${document.id}&workspace=1`);
  await page.getByRole("button", { name: "Review invoice requirements", exact: true }).click();
  await page.getByLabel("Detailed business reason", { exact: true }).fill("Synthetic readiness fixture - verify diagnostic invoice");
  await page.getByRole("button", { name: "Check invoice readiness", exact: true }).click();
  await page.getByRole("button", { name: "Create Final Invoice", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Final service invoice", exact: true })).toBeVisible({ timeout: 30000 });
  const invoice = await prisma.serviceInvoice.findFirstOrThrow({ where: { repairOrderId: estimate.repairOrderId } });
  expect(invoice.totalCents).toBe(estimate.totalCents);
  const invoiceDocument = await prisma.serviceDocument.findFirstOrThrow({ where: { sourceId: invoice.id, kind: "INVOICE" } });
  issued = { estimateId, documentId: document.id, invoiceId: invoice.id, invoiceDocumentId: invoiceDocument.id };
  await page.goto(`/vehicles/service-billing?repairOrderId=${estimate.repairOrderId}`);
  const application = page.getByRole("region", { name: "Repair deposits", exact: true });
  await application.getByRole("combobox", { name: /^Action/ }).selectOption("APPLY_DEPOSIT");
  await application.getByRole("combobox", { name: /^Original repair deposit/ }).selectOption(depositId);
  await application.getByRole("combobox", { name: /^Invoice/ }).selectOption(invoice.id);
  await application.getByLabel("Amount (USD)", { exact: true }).fill("25.00");
  await application.getByLabel("Application reference", { exact: true }).fill(`${fixture.tag}-SYNTHETIC-ALLOCATION`);
  await application.getByRole("checkbox", { name: "I verified this deposit allocation and the selected invoice.", exact: true }).check();
  await application.getByRole("button", { name: "Apply deposit to invoice", exact: true }).click();
  await expect(application.getByRole("status")).toContainText("Apply deposit to invoice saved.");
  const credited = await (await page.request.get(`/api/repair-orders/${estimate.repairOrderId}/billing`)).json();
  expect(credited.deposits.balance).toMatchObject({ collectedCents: 2500, appliedCents: 2500, availableCents: 0 });
  expect(credited.invoices[0].balance.balanceCents).toBe(invoice.totalCents - 2500);
  await page.goto(`/service-documents?repairOrderId=${estimate.repairOrderId}&documentId=${invoiceDocument.id}&workspace=1`);
  await page.getByRole("button", { name: "Record payment", exact: true }).click();
  await page.getByLabel("Amount received (USD)", { exact: true }).fill(((invoice.totalCents - 2500) / 100).toFixed(2));
  await page.getByLabel("Verified payment evidence / reference", { exact: true }).fill(`${fixture.tag}-SYNTHETIC-NO-MONEY`);
  await page.getByRole("checkbox", { name: "I verified this payment was received for this invoice.", exact: true }).check();
  const paymentRequest = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith(`/api/repair-orders/${estimate.repairOrderId}/billing`) && request.postDataJSON().action === "PAYMENT");
  await page.getByRole("button", { name: "Record payment & view receipt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Service payment receipt", exact: true })).toBeVisible();
  const state = await (await page.request.get(`/api/repair-orders/${estimate.repairOrderId}/billing`)).json();
  expect(state.invoices[0].balance).toMatchObject({ balanceCents: 0, settlement: "SETTLED" });
  const finalPayment = (await paymentRequest).postDataJSON();
  const paymentBefore = await snapshot();
  const paymentReplay = await page.request.post(`/api/repair-orders/${estimate.repairOrderId}/billing`, { data: finalPayment });
  expect(paymentReplay.ok(), await paymentReplay.text()).toBe(true);
  const replayedPayment = await paymentReplay.json();
  expect((await prisma.serviceDocument.findUniqueOrThrow({ where: { id: replayedPayment.result.documentId } })).sourceId).toBe(replayedPayment.result.entryId);
  expect(await snapshot()).toBe(paymentBefore);
  await completeHandoffThroughBrowser(page);
});

test("resume settled repair through final QC and handoff", async ({ page }) => {
  test.skip(!resumeRepairOrderId, "Only selected for explicit continuation of an existing synthetic run.");
  await preparePage(page);
  const response = await page.request.get(`/api/repair-orders/${fixture.tested.ro.id}/billing`);
  expect(response.ok()).toBe(true);
  const state = await response.json();
  expect(state.invoices).toHaveLength(1);
  expect(state.invoices[0].balance).toMatchObject({ balanceCents: 0, settlement: "SETTLED" });
  expect(state.deposits.balance).toMatchObject({ collectedCents: 2500, appliedCents: 2500, availableCents: 0 });
  await completeHandoffThroughBrowser(page);
});

test("exact frozen estimate, invoice and receipt download real PDFs without changing records", async ({ page }) => {
  await preparePage(page);
  test.skip(!issued, "Issuance journey did not finish; exact document verification remains unverified.");
  const before = await snapshot();
  const documents = await prisma.serviceDocument.findMany({ where: { repairOrderId: fixture.tested.ro.id, kind: { in: ["ESTIMATE", "INVOICE", "PAYMENT", "DEPOSIT", "DEPOSIT_APPLICATION"] } } });
  expect(documents.map(doc => doc.kind).sort()).toEqual(["DEPOSIT", "DEPOSIT_APPLICATION", "ESTIMATE", "INVOICE", "PAYMENT"]);
  for (const document of documents) {
    await page.goto(`/service-documents?repairOrderId=${fixture.tested.ro.id}&documentId=${document.id}&workspace=1`);
    const pdf = page.getByRole("link", { name: "Save PDF", exact: true });
    await expect(pdf).toHaveAttribute("href", `/api/repair-orders/${fixture.tested.ro.id}/documents/${document.id}/pdf`);
    const response = await page.request.get((await pdf.getAttribute("href"))!);
    expect(response.ok(), await response.text()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const bytes = await response.body();
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
    writeFileSync(resolve(artifactDirectory, `${document.kind.toLowerCase()}.pdf`), bytes);
    await expect(page.getByRole("button", { name: "Print", exact: true })).toBeEnabled();
    // Keep the generated print frame inspectable; only the OS print dialog is stubbed.
    await page.evaluate(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow");
      if (!descriptor?.get) throw new Error("Browser iframe accessor missing");
      const getWindow = descriptor.get;
      Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", { configurable: true, get() {
        const frameWindow = getWindow.call(this);
        if (frameWindow && this.hasAttribute("data-service-print-frame")) frameWindow.print = () => this.setAttribute("data-test-printed", "true");
        return frameWindow;
      } });
    });
    await page.getByRole("button", { name: "Print", exact: true }).click();
    await expect(page.locator('[data-service-print-frame]')).toHaveAttribute("data-test-printed", "true");
    const print = page.frameLocator('[data-service-print-frame]');
    await expect(print.locator("article")).toContainText(fixture.tested.customer.displayName);
    await expect(print.getByRole("navigation")).toHaveCount(0);
    await expect(print.getByRole("status")).toHaveText("Ready to print.");
    await dismissReminder(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: resolve(artifactDirectory, `${document.kind.toLowerCase()}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => window.document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: resolve(artifactDirectory, `${document.kind.toLowerCase()}-390.png`), fullPage: true });
  }
  expect(await snapshot()).toBe(before);
});

test("store-scoped sales and explicit non-manager billing grants preserve permission boundaries", async ({ request }) => {
  test.skip(!issued, "Issuance journey did not finish.");
  const before = await snapshot(), ro = fixture.tested.ro.id;
  const estimatePdf = `/api/repair-orders/${ro}/documents/${issued.documentId}/pdf`;
  const invoicePdf = `/api/repair-orders/${ro}/documents/${issued.invoiceDocumentId}/pdf`;
  expect((await request.get(estimatePdf)).status()).toBe(401);
  await login(request, fixture.sales.email);
  expect((await request.get(`/api/repair-orders/${ro}/planning`)).status()).toBe(200);
  expect((await request.get(estimatePdf)).status()).toBe(200);
  expect((await request.get(invoicePdf)).status()).toBe(403);
  expect((await request.get(`/api/repair-orders/${fixture.other.ro.id}/planning`)).status()).toBe(403);
  expect((await request.get(`/api/repair-orders/${fixture.other.ro.id}/documents/${issued.documentId}/pdf`)).status()).toBe(403);
  const denied = await request.get(`/api/repair-orders/${ro}/billing`);
  expect(denied.status()).toBe(403);
  expect(await denied.text()).not.toContain(issued.invoiceId);
  expect((await request.post(`/api/repair-orders/${fixture.parts.ro.id}/billing`, { data: { action: "PREPARE_INVOICE", reason: "Synthetic unauthorized billing attempt", occurredAt: new Date().toISOString(), idempotencyKey: randomUUID() } })).status()).toBe(403);
  await login(request, fixture.billing.email);
  expect((await request.get(invoicePdf)).status()).toBe(200);
  const billing = await (await request.get(`/api/repair-orders/${ro}/billing`)).json();
  expect(billing.canManage).toBe(true);
  expect((await request.get(`/api/repair-orders/${fixture.other.ro.id}/billing`)).status()).toBe(403);
  expect(await snapshot()).toBe(before);
});

test("rollout blocks authorized mutation and the separate preview quote remains unissued", async ({ request }) => {
  test.skip(!issued, "Issuance journey did not finish.");
  await login(request);
  const before = await snapshot();
  const flag = await prisma.vehicleOperationsFeatureFlag.findFirstOrThrow({ where: { organizationId: fixture.organization.id, code: "SHOP_OPERATIONS", locationId: null } });
  await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: "OFF" } });
  try {
    const held = await (await request.get(`/api/repair-orders/${fixture.tested.ro.id}/billing`)).json();
    expect(held.mutationAvailability.allowed).toBe(false);
    expect((await request.get(`/api/repair-orders/${fixture.tested.ro.id}/documents/${issued.invoiceDocumentId}/pdf`)).status()).toBe(200);
    const response = await request.post(`/api/repair-orders/${fixture.parts.ro.id}/billing`, { data: { action: "PREPARE_INVOICE", reason: "Synthetic rollout denial check", occurredAt: new Date().toISOString(), idempotencyKey: randomUUID() } });
    expect(response.status()).toBe(400); // Route represents rollout holds as a business-rule rejection.
    expect(await response.text()).toMatch(/not enabled|paused/i);
    expect(await snapshot()).toBe(before);
  } finally { await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: "GENERAL" } }); }
  expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId: fixture.demo.ro.id } })).toBe(0);
  expect(await prisma.repairOrder.findUniqueOrThrow({ where: { id: fixture.demo.ro.id } })).toMatchObject({ closedAt: null, stage: "INTAKE" });
  const demo = await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.demo.draft.id } });
  expect(demo.contentHash).toBe(fixture.demo.draft.contentHash);
  expect(demo.version).toBe(fixture.demo.draft.version);
});



test("MASTER_DISABLED preserves staff work until local rollout is enabled", async ({ page }) => {
  test.skip(Boolean(resumeRepairOrderId), "Requires a fresh isolated fixture, never a resumed preview schema.");
  const role = await prisma.role.findUniqueOrThrow({ where: { name: "Service Advisor" } });
  const advisor = await prisma.user.create({ data: { name: "SYNTHETIC service advisor", email: `${fixture.tag}-advisor@local.test`, passwordHash: fixture.manager.passwordHash, userRoles: { create: { roleId: role.id } } } });

  const codes = ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS"];
  await prisma.vehicleOperationsFeatureFlag.updateMany({ where: { organizationId: fixture.organization.id, code: { in: codes }, locationId: null }, data: { mode: "OFF" } });
  await preparePage(page);
  await login(page.request, advisor.email);
  const endpoint = `/api/repair-orders/${fixture.tested.ro.id}/planning`;
  const before = await snapshot();
  await page.goto(`/vehicles/shop-planning?repairOrderId=${fixture.tested.ro.id}`);
  const clearance = page.getByRole("region", { name: "Inspection clearance items" });
  for (const label of ["Inspection proof", "Safety / warning lights", "Repair path decision"]) await clearance.getByRole("button", { name: new RegExp(label) }).click();
  const rejected = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save checklist and unlock next stage", exact: true }).click();
  const blocked = await rejected;
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error).toContain("MASTER_DISABLED");
  const command = blocked.request().postDataJSON();
  await expect(page.getByText(/Shop Operations mutations are not enabled/).first()).toBeVisible();
  expect(await snapshot()).toBe(before);
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: fixture.tested.ro.id } })).toBe(0);
  await page.screenshot({ path: resolve(artifactDirectory, "master-disabled-advisor.png"), fullPage: true });
  for (const code of codes) await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: fixture.organization.id, locationId: fixture.location.id, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
  const accepted = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save checklist and unlock next stage", exact: true }).click();
  expect((await accepted).status()).toBe(201);
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: fixture.tested.ro.id } })).toBe(1);
  await page.screenshot({ path: resolve(artifactDirectory, "master-enabled-advisor.png"), fullPage: true });
  await login(page.request, fixture.sales.email);
  const denied = await page.request.post(endpoint, { data: { ...command, idempotencyKey: randomUUID() } });
  expect(denied.status()).toBe(403);
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: fixture.tested.ro.id } })).toBe(1);
  await login(page.request, advisor.email);
  // Service Advisor has role-based read access across stores; rollout is separate.
  expect((await page.request.get(`/api/repair-orders/${fixture.other.ro.id}/planning`)).status()).toBe(200);
  const otherStore = await page.request.post(`/api/repair-orders/${fixture.other.ro.id}/planning`, { data: { ...command, idempotencyKey: randomUUID() } });
  expect(otherStore.status()).toBe(400);
  expect((await otherStore.json()).error).toContain("MASTER_DISABLED");
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: fixture.other.ro.id } })).toBe(0);
  expect(await prisma.vehicleOperationsFeatureFlag.count({ where: { organizationId: fixture.organization.id, locationId: null, code: { in: codes }, mode: "OFF" } })).toBe(3);
});


test("blocked billing explains access and rechecks without posting money", async ({ page }) => {
  await preparePage(page);
  await login(page.request, fixture.billing.email);
  const repairOrderId = fixture.parts.ro.id;
  const before = await snapshot();
  const flag = await prisma.vehicleOperationsFeatureFlag.findFirstOrThrow({ where: { organizationId: fixture.organization.id, locationId: null, code: "VEHICLE_OPERATIONS_MASTER" } });
  let billingPosts = 0;
  page.on("request", request => { if (request.method() === "POST" && /\/api\/repair-orders\/[^/]+\/billing$/.test(new URL(request.url()).pathname)) billingPosts++; });
  await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: "OFF" } });
  try {
    await page.goto(`/vehicles/service-billing?repairOrderId=${repairOrderId}`);
    const explanation = page.getByRole("complementary", { name: "Billing changes unavailable", exact: true });
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText("Saved documents remain available to view and print.");
    await expect(explanation).toContainText(/master setting|paused|not configured/i);
    await expect(page.getByRole("link", { name: "Review Vehicle Operations settings", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Detailed business reason", { exact: true })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Repair deposits", exact: true }).getByLabel("Amount (USD)", { exact: true })).toBeDisabled();
    const reasonId = await explanation.getByRole("status").getAttribute("id");
    expect(reasonId).toBe(`billing-blocked-${repairOrderId}`);
    await expect(page.locator(`fieldset[aria-describedby="${reasonId}"]`)).toHaveAttribute("disabled", "");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: resolve(artifactDirectory, "billing-blocked-feedback-390.png"), fullPage: true });
    const recheck = page.waitForResponse(response => response.url().endsWith(`/api/repair-orders/${repairOrderId}/billing`) && response.request().method() === "GET");
    await page.getByRole("button", { name: "Recheck billing access", exact: true }).click();
    expect((await recheck).ok()).toBe(true);
    await expect(explanation).toBeVisible();
    await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: flag.mode } });
    await page.getByRole("button", { name: "Recheck billing access", exact: true }).click();
    await expect(explanation).toHaveCount(0);
    await expect(page.getByLabel("Detailed business reason", { exact: true })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Repair deposits", exact: true }).getByLabel("Amount (USD)", { exact: true })).toBeEnabled();
    expect(billingPosts).toBe(0);
    expect(await snapshot()).toBe(before);
  } finally { await prisma.vehicleOperationsFeatureFlag.update({ where: { id: flag.id }, data: { mode: flag.mode } }); }
});

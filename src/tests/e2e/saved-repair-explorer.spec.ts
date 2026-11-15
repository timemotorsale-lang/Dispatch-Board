import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { requiredPartsForLabor } from "@/server/diagnostics/estimate-parts-tax-policy";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { emptyManualLaborReview } from "@/lib/estimate-review";
import { repairExplorerStorageKey } from "@/lib/repair-explorer-context";
import { recordEstimateDocument } from "@/server/repair-order/service-documents";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
test.use({ actionTimeout: 20_000, screenshot: "only-on-failure" });
const email = "morgan.manager@local.test", password = "dispatch123!";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const href = (id: string) => `/prototype/repair-explorer?draftId=${id}`;
let fixture: Awaited<ReturnType<typeof seedVisualQuotes>>;
let immutableBefore: string;
let artifacts: string;

async function seedVisualQuotes() {
  const tag = `visual-${randomUUID().slice(0, 8)}`;
  const manager = await prisma.user.findUniqueOrThrow({ where: { email } });
  const outsider = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  const location = await prisma.location.findUniqueOrThrow({ where: { organizationId_code: { organizationId: organization.id, code: "TMS-MSP-01" } } });
  const customer = await prisma.customer.create({ data: { organizationId: organization.id, customerNumber: tag, displayName: `Synthetic Mira Visual ${tag}` } });
  const vehicle = await prisma.vehicle.create({ data: { organizationId: organization.id, vehicleNumber: tag, year: 2017, make: "Acura", model: "TLX", vin: `19UUB2F50${tag.slice(-8).toUpperCase()}`, vinState: "LEGACY_UNVERIFIED", vinValidationSource: "SYNTHETIC_E2E" } });
  const visit = await prisma.serviceVisit.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: new Date(), concernSummary: "Synthetic saved diagnostic quote, no actual vehicle work", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: manager.id } });
  const order = await prisma.repairOrder.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: visit.id, repairOrderNumber: `${tag}-RO`, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(Date.now() + 86400000), ownerUserId: manager.id, nextAction: "Synthetic visual restoration test only" } });
  const estimate = await prisma.repairEstimateVersion.create({ data: { organizationId: organization.id, repairOrderId: order.id, version: 1, lineItems: [{ key: "frozen", type: "LABOR", description: "Previously issued synthetic diagnostic estimate", quantity: 1, unitPriceCents: 12500, laborGuideMinutes: 60 }], laborSubtotalCents: 12500, partsSubtotalCents: 0, feeSubtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 12500, taxBoundary: "Synthetic fixture only", expiresAt: new Date(Date.now() + 86400000), presentedAt: new Date(), presentationChannel: "INTERNAL", authorUserId: manager.id } });
  await prisma.$transaction(tx => recordEstimateDocument(tx, organization.id, order.id, estimate, manager.id));
  const operations = flattenLaborOperationTaxonomy().filter(item => item.operation === "Diagnose" && !item.requiredAddOns.length && !requiredPartsForLabor(item).length).slice(0, 2);
  if (operations.length !== 2) throw new Error("Two bounded diagnostic operations required.");
  const content = {
    ro: null, manual: { customer: customer.displayName, vehicle: "2017 Acura TLX", vin: vehicle.vin!, concern: visit.concernSummary },
    labor: operations.map((item, index) => ({ ...item, hours: index ? 0.8 : 1.2, rowId: item.id, source: "SELECTED" })),
    parts: [
      { id: "visual-sensor", laborRowId: operations[0].id, name: "Synthetic sensor connector", number: "VIS-CON-17", quantity: 2, unitPrice: 23.45, taxable: true, source: "MANUAL", pricingStatus: "ESTIMATED" },
      { id: "visual-harness", laborRowId: operations[1].id, name: "Synthetic harness sleeve", number: "VIS-SLV-17", quantity: 1, unitPrice: 17.2, taxable: false, source: "MANUAL", pricingStatus: "ESTIMATED" }
    ],
    serviceCharges: [{ id: "visual-tow", description: "Synthetic transport fee", amountCents: 1835, taxable: false }, { id: "visual-material", description: "Synthetic materials fee", amountCents: 740, taxable: true }],
    suppliesTaxable: true, discountCents: 1234,
    estimateControls: { version: 1, pricing: { ...initialEstimatePricing, laborRate: 137.5, taxRatePercent: 8.125, taxReference: "Saved synthetic tax reference", overrideReason: "Historical synthetic quoted rate" }, fitment: {}, overlapResolution: "", reviewedScope: "" },
    evidence: [], attempt: null, clinical: {}, laborReview: emptyManualLaborReview
  };
  const draft = await prisma.diagnosticWorkspaceDraft.create({ data: { id: randomUUID(), userId: manager.id, title: `Synthetic visual quote ${tag}`, version: 4, content, contentHash: hash(content) } });
  const archivedContent = { ...content, archivedAt: "2023-01-02T12:00:00.000Z", archiveReason: "Synthetic retained original" };
  const archived = await prisma.diagnosticWorkspaceDraft.create({ data: { id: randomUUID(), userId: manager.id, title: `Archived synthetic visual quote ${tag}`, version: 7, content: archivedContent, contentHash: hash(archivedContent) } });
  const privateContent = { ...content, manual: { ...content.manual, customer: "PRIVATE SYNTHETIC OWNER" } };
  const privateDraft = await prisma.diagnosticWorkspaceDraft.create({ data: { id: randomUUID(), userId: outsider.id, title: `Private synthetic ${tag}`, content: privateContent, contentHash: hash(privateContent) } });
  // This linked quote deliberately disagrees with the RO supplied by the mismatch URL.
  const otherVisit = await prisma.serviceVisit.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: new Date(), concernSummary: "Synthetic separate repair visit", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: manager.id } });
  const otherOrder = await prisma.repairOrder.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: otherVisit.id, repairOrderNumber: `${tag}-OTHER`, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(Date.now() + 86400000), ownerUserId: manager.id, nextAction: "Synthetic mismatched URL target" } });
  const linked = { ...content, ro: { id: order.id, repairOrderNumber: order.repairOrderNumber, customer: "MISMATCH PRIVATE CUSTOMER", vehicle: { id: vehicle.id, label: "Private linked vehicle", vin: "2HGFB2F50EH123456" }, openedAt: order.openedAt.toISOString(), concern: "MISMATCH PRIVATE CONCERN" } };
  const mismatched = await prisma.diagnosticWorkspaceDraft.create({ data: { id: randomUUID(), userId: manager.id, title: `Mismatched synthetic ${tag}`, content: linked, contentHash: hash(linked) } });
  return { tag, manager, outsider, customer, vehicle, order, otherOrder, estimate, content, draft, archived, privateDraft, mismatched };
}

async function immutableSnapshot() {
  return hash(await Promise.all([
    prisma.serviceDocument.findMany({ where: { repairOrderId: fixture.order.id }, orderBy: { id: "asc" } }),
    prisma.repairEstimateVersion.findMany({ where: { repairOrderId: fixture.order.id }, orderBy: { id: "asc" } }),
    prisma.repairAuthorization.count({ where: { repairOrderId: fixture.order.id } }),
    prisma.serviceInvoice.count({ where: { repairOrderId: fixture.order.id } }),
    prisma.diagnosticWorkspaceDraft.findMany({ where: { id: { in: [fixture.archived.id, fixture.privateDraft.id, fixture.mismatched.id] } }, orderBy: { id: "asc" } })
  ]));
}
async function login(page: Page) {
  expect((await page.request.post("/api/auth/login", { data: { email, password } })).ok()).toBe(true);
  const response = await page.request.get("/api/coo-workbook/rhythm");
  expect(response.ok()).toBe(true);
  const rhythm = await response.json();
  expect((await page.request.post("/api/coo-workbook/rhythm", { data: { workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED", reason: "Synthetic visual quote test; no operational day or actual customer work.", sourcePath: "/prototype/repair-explorer" } })).ok()).toBe(true);
}
async function review(page: Page) {
  await expect(page.getByRole("heading", { name: "Find the work. Build the estimate.", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Estimate steps" }).getByRole("button", { name: /Review estimate/ }).click();
}
async function verifySavedValues(page: Page) {
  const identity = page.locator('[aria-label="Saved quote context"]');
  await expect(identity).toContainText(fixture.customer.displayName);
  await expect(identity).toContainText(fixture.vehicle.vin!);
  await expect(page.getByRole("region", { name: "Connected Repair Explorer", exact: true })).toContainText("2017 Acura TLX");
  await expect(page.getByText(/Reference vehicle: 2019 Ford F-150/)).toHaveCount(0);
  await review(page);
  const editor = page.getByLabel("Estimate editor", { exact: true });
  for (const line of fixture.content.labor) await expect(editor.getByRole("spinbutton", { name: `${line.title} hours`, exact: true })).toHaveValue(String(line.hours));
  for (const part of fixture.content.parts) {
    await expect(editor.getByRole("textbox", { name: `${part.name} part number`, exact: true })).toHaveValue(part.number);
    await expect(editor.getByRole("spinbutton", { name: `${part.name} quantity`, exact: true })).toHaveValue(String(part.quantity));
    await expect(editor.getByRole("spinbutton", { name: `${part.name} unit price`, exact: true })).toHaveValue(String(part.unitPrice));
  }
  await expect(editor.getByLabel("Charge 1 description", { exact: true })).toHaveValue("Synthetic transport fee");
  await expect(editor.getByLabel("Charge 1 amount", { exact: true })).toHaveValue("18.35");
  await expect(editor.getByLabel("Charge 2 description", { exact: true })).toHaveValue("Synthetic materials fee");
  await expect(editor.getByLabel("Charge 2 amount", { exact: true })).toHaveValue("7.4");
  await expect(editor.getByLabel("Discount ($)", { exact: true })).toHaveValue("12.34");
  await expect(editor.getByLabel("Estimate tax rate", { exact: true })).toHaveValue("8.125");
  const totals = page.getByRole("complementary", { name: "Estimate", exact: true });
  for (const amount of ["$275.00", "$64.10", "$39.50", "$12.34", "$5.35", "$371.61"]) await expect(totals).toContainText(amount);
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  const database = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (database.hostname !== "127.0.0.1" || database.port !== "55439" || !database.searchParams.get("schema")?.startsWith("dispatch_board_e2e_visual_") || database.searchParams.get("connection_limit") !== "3") throw new Error("Use a fresh local visual schema with connection_limit=3.");
  await resetDailyWorkflowState();
  fixture = await seedVisualQuotes();
  immutableBefore = await immutableSnapshot();
  artifacts = resolve("..", "saved-visual-artifacts", database.searchParams.get("schema")!);
  mkdirSync(artifacts, { recursive: true });
});
test.afterEach(async () => { expect(await immutableSnapshot(), "Viewing/editing personal quotes must preserve archived originals and exact issued documents").toBe(immutableBefore); });
test.afterAll(disconnectDailyWorkflowDatabase);

test("old saved-quote bookmark restores complete actual values in the visual explorer at desktop and mobile", async ({ page }) => {
  await login(page);
  const query = new URLSearchParams({ draftId: fixture.draft.id, returnTo: "/my-tasks", returnLabel: "My work", workflow: "review" });
  await page.goto(`/prototype/labor-guide?${query}`);
  await expect(page).toHaveURL(url => url.pathname === "/prototype/repair-explorer" && [...query].every(([key, value]) => url.searchParams.get(key) === value), { timeout: 30_000 });
  await verifySavedValues(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const dismiss = page.getByRole("button", { name: "Dismiss reminder", exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    await expect(page.getByRole("navigation", { name: "Estimate steps" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: resolve(artifacts, `saved-visual-review-${width}.png`), fullPage: true });
    await page.getByRole("navigation", { name: "Estimate steps" }).getByRole("button", { name: /Find repair/ }).click();
    await expect(page.getByRole("button", { name: "Find it visually", exact: true })).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, `saved-visual-find-${width}.png`), fullPage: true });
    await review(page);
  }
  expect(await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } })).toMatchObject({ version: 4, contentHash: fixture.draft.contentHash });
});

test("add catalog work and edit quantities, fees, discount and tax then reload the exact saved draft", async ({ page }) => {
  await login(page);
  await page.goto(href(fixture.draft.id));
  await verifySavedValues(page);
  const editor = page.getByLabel("Estimate editor", { exact: true });
  await editor.getByRole("spinbutton", { name: `${fixture.content.labor[0].title} hours`, exact: true }).fill("1.6");
  await editor.getByRole("spinbutton", { name: "Synthetic sensor connector quantity", exact: true }).fill("3");
  await editor.getByLabel("Charge 1 amount", { exact: true }).fill("21.45");
  await editor.getByLabel("Discount ($)", { exact: true }).fill("15.67");
  await editor.getByLabel("Estimate tax rate", { exact: true }).fill("7.375");
  await page.getByRole("navigation", { name: "Estimate steps" }).getByRole("button", { name: /Find repair/ }).click();
  await page.getByRole("textbox", { name: "Search connected repairs", exact: true }).fill("brake noise");
  const add = page.getByRole("button", { name: /^Add .* to workspace$/ }).first();
  await expect(add).toBeEnabled();
  await add.click();
  await review(page);
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(async () => (await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } })).content).toMatchObject({ labor: [expect.objectContaining({ hours: 1.6 }), expect.objectContaining({ hours: 0.8 }), expect.any(Object)], parts: expect.arrayContaining([expect.objectContaining({ id: "visual-sensor", quantity: 3 })]), serviceCharges: [expect.objectContaining({ amountCents: 2145 }), expect.objectContaining({ amountCents: 740 })], discountCents: 1567, estimateControls: { pricing: { taxRatePercent: 7.375, laborRate: 137.5 } } });
  const saved = await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } });
  await page.reload();
  await review(page);
  await expect(editor.getByLabel("Charge 1 amount", { exact: true })).toHaveValue("21.45");
  await expect(editor.getByLabel("Discount ($)", { exact: true })).toHaveValue("15.67");
  await expect(editor.getByLabel("Estimate tax rate", { exact: true })).toHaveValue("7.375");
  await expect(editor.getByRole("spinbutton", { name: "Synthetic sensor connector quantity", exact: true })).toHaveValue("3");
  expect(await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
});

test("saving an archived visual quote creates a distinct copy and retains its original version and hash", async ({ page }) => {
  await login(page);
  const originalCount = await prisma.diagnosticWorkspaceDraft.count({ where: { userId: fixture.manager.id } });
  await page.goto(href(fixture.archived.id));
  await verifySavedValues(page);
  await expect(page.getByText("Archived quote opened as a new draft. Saving creates a copy and preserves the original.", { exact: true })).toBeVisible();
  expect(await prisma.diagnosticWorkspaceDraft.count({ where: { userId: fixture.manager.id } })).toBe(originalCount);
  const editor = page.getByLabel("Estimate editor", { exact: true });
  await editor.getByLabel("Charge 2 amount", { exact: true }).fill("9.25");
  const savedResponse = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname === "/api/diagnostics/workspace-drafts");
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  const response = await savedResponse;
  expect(response.ok()).toBe(true);
  const submitted = response.request().postDataJSON();
  expect(submitted.id).not.toBe(fixture.archived.id);
  await page.goto(href(submitted.id));
  await review(page);
  await expect(editor.getByLabel("Charge 2 amount", { exact: true })).toHaveValue("9.25");
  expect(await prisma.diagnosticWorkspaceDraft.count({ where: { userId: fixture.manager.id } })).toBe(originalCount + 1);
});

test("cross-owner and contradictory draft/RO URLs disclose no saved identity and never save", async ({ page }) => {
  await login(page);
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "PUT" && new URL(request.url()).pathname === "/api/diagnostics/workspace-drafts") writes.push(request.url()); });
  const count = await prisma.diagnosticWorkspaceDraft.count();
  const denied = await page.request.get(`/api/diagnostics/workspace-drafts?id=${fixture.privateDraft.id}`);
  expect(denied.status()).toBe(404);
  expect(await denied.text()).not.toContain("PRIVATE SYNTHETIC OWNER");
  await page.goto(href(fixture.privateDraft.id));
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("PRIVATE SYNTHETIC OWNER", { exact: false })).toHaveCount(0);
  await page.goto(`${href(fixture.mismatched.id)}&repairOrderId=${fixture.otherOrder.id}`);
  await expect(page.getByRole("alert")).toBeVisible();
  for (const secret of ["MISMATCH PRIVATE CUSTOMER", "MISMATCH PRIVATE CONCERN", "2HGFB2F50EH123456"]) await expect(page.getByText(secret, { exact: false })).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(await prisma.diagnosticWorkspaceDraft.count()).toBe(count);
});

test("old import bookmark preserves session handoff and all navigation query values", async ({ page }) => {
  await login(page);
  const transfer = { version: 1, savedAt: new Date().toISOString(), rate: 125, lines: [{ id: `custom-${randomUUID()}`, label: "Synthetic retained import work", hours: 0.7, parts: 0, laborBasis: "MANUAL", partItems: [] }] };
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, value), { key: `${repairExplorerStorageKey(fixture.manager.id)}.handoff`, value: JSON.stringify(transfer) });
  const query = new URLSearchParams({ importExplorer: "1", workflow: "review", returnTo: "/my-tasks", returnLabel: "My work", mode: "manual" });
  await page.goto(`/prototype/labor-guide?${query}`);
  await expect(page).toHaveURL(url => url.pathname === "/prototype/repair-explorer" && [...query].every(([key, value]) => url.searchParams.get(key) === value), { timeout: 30_000 });
  await review(page);
  await expect(page.getByRole("spinbutton", { name: "Synthetic retained import work hours", exact: true })).toHaveValue("0.7");
  await expect(page.getByText(/Reference vehicle: 2019 Ford F-150/)).toHaveCount(0);
});

test("edited quote preview requires a successful save and returns to the exact persisted draft", async ({ page }) => {
  await login(page);
  await page.goto(href(fixture.draft.id));
  await review(page);
  const editor = page.getByLabel("Estimate editor", { exact: true });
  let writesBlocked = 0;
  await page.route("**/api/diagnostics/workspace-drafts", async route => {
    if (route.request().method() === "PUT") { writesBlocked++; await route.fulfill({ status: 503, json: { error: "Synthetic preview-save outage" } }); }
    else await route.continue();
  });
  const before = await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } });
  await editor.getByLabel("Charge 1 amount", { exact: true }).fill("29.65");
  await editor.getByLabel("Discount ($)", { exact: true }).fill("18.45");
  const preview = editor.getByRole("button", { name: "Preview / Print Preliminary Quote", exact: true });
  await preview.click();
  await expect(page.getByRole("alert").filter({ hasText: "The quote could not be saved." })).toBeVisible();
  expect(writesBlocked).toBeGreaterThan(0);
  expect(new URL(page.url()).pathname).toBe("/prototype/repair-explorer");
  expect(await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } })).toEqual(before);
  await expect(editor.getByLabel("Charge 1 amount", { exact: true })).toHaveValue("29.65");
  await page.unroute("**/api/diagnostics/workspace-drafts");
  await preview.click();
  await expect(page).toHaveURL(url => url.pathname === "/repair-estimate", { timeout: 30_000 });
  const persisted = await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } });
  expect(persisted.content).toMatchObject({ serviceCharges: [expect.objectContaining({ amountCents: 2965 }), expect.any(Object)], discountCents: 1845 });
  const back = page.getByRole("link", { name: "Return to labor guide", exact: true });
  expect(new URL((await back.getAttribute("href"))!, page.url()).searchParams.get("draftId")).toBe(fixture.draft.id);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole("button", { name: "Print preliminary quote", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Select repair order", exact: true })).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, `preliminary-quote-${width}.png`), fullPage: true });
  }
  await back.click();
  await review(page);
  await expect(editor.getByLabel("Charge 1 amount", { exact: true })).toHaveValue("29.65");
  await expect(editor.getByLabel("Discount ($)", { exact: true })).toHaveValue("18.45");
  expect(await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: fixture.draft.id } })).toEqual(persisted);
});

test("new unsaved quote is saved before preview and Select repair order restores and focuses its attachment", async ({ page }) => {
  await login(page);
  const customId = `custom-${randomUUID()}`;
  const transfer = { version: 1, savedAt: new Date().toISOString(), rate: 125, lines: [{ id: customId, label: "Synthetic new preview inspection", hours: 0.9, parts: 0, laborBasis: "MANUAL", partItems: [] }] };
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, value), { key: `${repairExplorerStorageKey(fixture.manager.id)}.handoff`, value: JSON.stringify(transfer) });
  const count = await prisma.diagnosticWorkspaceDraft.count({ where: { userId: fixture.manager.id } });
  await page.goto("/prototype/repair-explorer?importExplorer=1");
  await review(page);
  await page.getByRole("button", { name: "Vehicle & customer details", exact: true }).click();
  await page.getByLabel("Customer name (optional)", { exact: true }).fill("Synthetic New Preview Customer");
  await page.getByLabel("Vehicle — year, make, model", { exact: true }).fill("2018 Honda Accord");
  await page.getByRole("button", { name: "Use these details", exact: true }).click();
  await page.getByRole("button", { name: "Preview / Print Preliminary Quote", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/repair-estimate", { timeout: 30_000 });
  const select = page.getByRole("link", { name: "Select repair order", exact: true });
  const target = new URL((await select.getAttribute("href"))!, page.url());
  const savedId = target.searchParams.get("draftId");
  expect(savedId).toBeTruthy();
  expect(target.searchParams.get("attachRepairOrder")).toBe("1");
  expect(await prisma.diagnosticWorkspaceDraft.count({ where: { userId: fixture.manager.id } })).toBe(count + 1);
  const saved = await prisma.diagnosticWorkspaceDraft.findUniqueOrThrow({ where: { id: savedId! } });
  expect(saved.content).toMatchObject({ manual: { customer: "Synthetic New Preview Customer", vehicle: "2018 Honda Accord" }, labor: [expect.objectContaining({ id: customId, hours: 0.9 })] });
  await select.click();
  await expect(page.getByRole("textbox", { name: "Find an open repair order", exact: true })).toBeFocused({ timeout: 30_000 });
  await expect(page.getByRole("spinbutton", { name: "Synthetic new preview inspection hours", exact: true })).toHaveValue("0.9");
  await expect(page.locator('[aria-label="Saved quote context"]')).toContainText("Synthetic New Preview Customer");
});

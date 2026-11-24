import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { rentalLocalTime } from "../../lib/rental-checkout";

test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

test.describe("rental intake shortcuts", () => {

  test("Tab decodes the VIN, offers prefilled registration, and sends a camera photo to the deal upload", async ({ page }) => {
    test.skip(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1", "Requires a disposable migrated and seeded database.");
    const database = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/^deal_staging_\d+$/.test(database.searchParams.get("schema") ?? "")) throw new Error("An isolated loopback deal_staging schema is required.");
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
    expect(login.ok()).toBe(true);
    const id = randomUUID(), vin = "1HGCM82633A004352";
    const saved = await page.request.post("/api/crm/v1/deal-drafts", { data: {
      id, revision: 0, pathway: "daily-rental", customerName: "Synthetic camera and VIN test", vehicleReference: "", snapshot: {}
    } });
    expect(saved.ok()).toBe(true);
    await page.route("**/api/crm/v1/vehicle-decode", route => route.fulfill({ json: {
      vin, candidates: [], totalMatches: 0, warnings: [], specifications: {}, retrievedAt: new Date().toISOString(), provider: "NHTSA_VPIC",
      proposals: [{ field: "make", label: "Make", value: "HONDA", source: "NHTSA vPIC" }]
    } }));
    await page.route("**/api/crm/v1/deal-identities?type=vehicles&*", route => route.fulfill({ json: { items: [], totalPages: 1 } }));
    await page.route("**/api/sales-documents", route => route.fulfill({ json: { id: "camera-test-jacket" } }));
    await page.route("**/api/sales-documents/camera-test-jacket/documents", route => route.fulfill({ json: { id: "captured-photo" } }));
    await page.goto(`/crm-next/deals/start?draftId=${id}`);
    await page.getByRole("tab", { name: "Terms & Payments" }).click();
    const unit = page.locator("#rental-unit");
    const vinField = unit.getByLabel("VIN", { exact: true });
    await vinField.fill(vin);
    await vinField.press("Tab");
    await expect(unit.getByLabel("Make", { exact: true })).toHaveValue("HONDA");
    await expect(unit.getByRole("status").filter({ hasText: "No active registry vehicle matched this VIN" })).toBeVisible();
    await page.getByRole("button", { name: "Save rental draft", exact: true }).click();
    await page.getByRole("link", { name: "Register this VIN", exact: true }).click();
    await expect(unit.getByRole("region", { name: "Shared rental vehicle selector" }).getByLabel("VIN", { exact: true })).toHaveValue(vin);

    const evidence = page.locator("#rental-evidence");
    await evidence.getByRole("button", { name: "Take photo · Front", exact: true }).click();
    const capture = evidence.getByRole("button", { name: "Capture photo", exact: true });
    await expect(capture).toBeEnabled({ timeout: 10000 });
    const upload = page.waitForRequest(request => request.url().endsWith("/camera-test-jacket/documents") && request.method() === "POST");
    await capture.click();
    const sent = await upload;
    expect(sent.postDataBuffer()?.toString("latin1")).toMatch(/release-condition-front-\d+\.jpg/);
    await expect(evidence.getByText(/release-condition-front-\d+\.jpg/)).toBeVisible();
    const preview = evidence.getByLabel("Front camera preview", { exact: true });
    await expect(preview).toBeHidden();
    await evidence.getByRole("button", { name: "Take photo · Front", exact: true }).click();
    await expect(capture).toBeEnabled({ timeout: 10000 });
    await page.getByRole("tab", { name: "Overview", exact: true }).click();
    await expect.poll(() => preview.evaluate(element => (element as HTMLVideoElement).srcObject)).toBeNull();
  });
});

test("opens the saved rental action from Deals and shows cancellation after reload", async ({ page }) => {
  test.skip(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1", "Requires a disposable migrated and seeded database.");
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/^deal_staging_\d+$/.test(database.searchParams.get("schema") ?? "")) {
    throw new Error("Run the rental walkthrough with an isolated loopback deal_staging schema.");
  }
  test.setTimeout(120_000);
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside rental workflow review" } }));
  const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
  expect(login.ok()).toBe(true);
  const id = randomUUID(), customerName = `Rental walkthrough ${id.slice(0, 8)}`;
  const saved = await page.request.post("/api/crm/v1/deal-drafts", { data: {
    id, revision: 0, pathway: "daily-rental", customerName, vehicleReference: "", snapshot: {}
  } });
  expect(saved.ok()).toBe(true);
  await page.goto("/crm-next/deals?area=rentals");
  const row = page.getByRole("row").filter({ hasText: customerName });
  await expect(row.getByRole("link", { name: "Prepare Checkout", exact: true })).toBeVisible();
  await row.getByRole("button", { name: `Actions for ${customerName}` }).click();
  await row.getByRole("menuitem", { name: `Deal details for ${customerName}` }).click();
  const drawer = page.getByRole("dialog", { name: `Deal details · ${customerName}` });
  await expect(drawer.getByRole("link", { name: "Cancel Rental", exact: true })).toBeVisible();
  await drawer.getByRole("link", { name: "Cancel Rental", exact: true }).click();
  const checkout = page.getByRole("region", { name: "Rental checkout and return" });
  await expect(checkout.getByRole("form", { name: "Cancel", exact: true })).toBeVisible();
  await checkout.getByLabel("I confirmed the vehicle was never handed over").check();
  await checkout.getByLabel("Reason", { exact: true }).fill("Synthetic customer cancelled before handoff");
  await checkout.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(checkout).toContainText("Saved. Rental Cancelled.");
  await page.goto("/crm-next/deals?area=rentals&rentalStage=CANCELLED");
  await expect(row).toContainText("Rental Cancelled");
  await expect(row.getByRole("link", { name: "Prepare Checkout", exact: true })).toHaveCount(0);
  const reloaded = await page.request.get(`/api/crm/v1/deal-drafts?id=${id}`);
  expect(await reloaded.json()).toMatchObject({ status: "CANCELLED", statusHistory: expect.arrayContaining([expect.objectContaining({ action: "RENTAL_DRAFT_CANCELLED" })]) });
});

test("explains blocked checkout, then saves routine handoff without manual audit entries", async ({ page }) => {
  test.skip(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1", "Requires a disposable migrated and seeded database.");
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/^deal_staging_\d+$/.test(database.searchParams.get("schema") ?? "")) {
    throw new Error("Run the rental walkthrough with an isolated loopback deal_staging schema.");
  }
  const organizationId = process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID!;
  test.setTimeout(120_000);
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside rental workflow review" } }));
  const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
  expect(login.ok()).toBe(true);
  const { user } = await (await page.request.get("/api/auth/me")).json();
  database.searchParams.set("connection_limit", "1");
  const prisma = new PrismaClient({ datasourceUrl: database.toString() });
  try {
    const id = randomUUID(), name = `Checkout test ${id.slice(0, 8)}`;
    const occurredAt = new Date(Date.now() - 5 * 60000), due = new Date(Date.now() + 86400000);
    const location = await prisma.location.findFirstOrThrow({ where: { organizationId } });
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: id, displayName: name } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: id, vin: `1${id.replaceAll("-", "").slice(0, 16).toUpperCase()}`, vinState: "VALID", vinValidationSource: "ISOLATED_FIXTURE" } });
    const unit = await prisma.inventoryUnit.create({ data: {
      organizationId, locationId: location.id, vehicleId: vehicle.id, inventoryNumber: id, ownerUserId: user.id, lifecycleStage: "FRONTLINE_READY",
      stageStartedAt: occurredAt, financialAcquiredAt: occurredAt, targetAt: due, nextAction: "Isolated checkout review"
    } });
    const snapshot = { "desk:identity": { customerId: customer.id, vehicleId: vehicle.id, inventoryUnitId: unit.id } };
    const saved = await page.request.post("/api/crm/v1/deal-drafts", { data: {
      id, revision: 0, pathway: "daily-rental", customerName: name, customerId: customer.id, vehicleReference: id, snapshot
    } });
    expect(saved.ok()).toBe(true);
    const draft = await saved.json();
    await page.goto(`/crm-next/deals/start?draftId=${id}&rentalAction=HANDOFF#rental-checkout`);
    const checkout = page.getByRole("region", { name: "Rental checkout and return" });
    const confirm = checkout.getByRole("button", { name: "Confirm checkout · Rented Out" });
    await expect(checkout.getByLabel("Reason", { exact: true })).toHaveCount(0);
    await expect(checkout.getByLabel("Dated handoff record")).toHaveCount(0);
    await checkout.getByLabel("Actual checkout (Chicago)", { exact: true }).fill(rentalLocalTime(new Date(Date.now() - 2 * 86400000)));
    await checkout.getByLabel("Confirm checkout more than 24 hours ago from a dated record").check();
    await expect(checkout.getByLabel("Dated handoff record")).toBeVisible();
    await checkout.getByLabel("Actual checkout (Chicago)", { exact: true }).fill(rentalLocalTime(occurredAt));
    await expect(checkout.getByLabel("Dated handoff record")).toHaveCount(0);
    await confirm.click();
    await expect(checkout.getByRole("alert")).toContainText("Finalize the linked checkout packet");
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);

    const packet = await prisma.documentLibraryPacket.create({ data: {
      organizationId, ownerType: "DEAL", ownerId: id, ownerLabel: name, packetType: "TEST_FIXTURE", workflow: "daily-rental", title: name
    } });
    const jacket = await prisma.salesDocumentJacket.create({ data: {
      organizationId, packetId: packet.id, dealReference: id, dealNumber: String(draft.dealNumber), pathway: "daily-rental",
      customerId: customer.id, customerName: name, vehicleReference: id, vin: vehicle.vin, state: "CHECKED_OUT", requirements: [], createdByUserId: user.id,
      versions: { create: { version: 1, phase: "CHECKOUT", disposition: "CHECKED_OUT", snapshot: {}, finalizedByUserId: user.id } }
    } });
    const documents = await Promise.all([
      { documentType: "signed-agreement", fileName: "signed-agreement.pdf" },
      { documentType: "insurance-proof", fileName: "older-policy.pdf" },
      { documentType: "insurance-proof", fileName: "renewal.pdf" }
    ].map(document => prisma.documentLibraryDocument.create({ data: {
        organizationId, ownerType: "CUSTOMER", ownerId: customer.id, ownerLabel: name, ...document,
        status: "ACCEPTED", retentionCategory: "TEST_FIXTURE", storageProvider: "TEST_FIXTURE", storageReference: document.fileName,
        classificationSnapshot: { signed: true }, packetLinks: { create: { organizationId, packetId: packet.id } }
    } })));
    await prisma.dealDeskDraft.update({ where: { id }, data: { snapshot: { ...snapshot, jackets: { "daily-rental": jacket.id } } } });
    await checkout.getByRole("button", { name: "Refresh checkout status" }).click();
    await expect(checkout.getByRole("button", { name: "Open checkout paperwork" })).toHaveCount(0);
    await expect(checkout.getByLabel("Actual checkout (Chicago)", { exact: true })).toHaveValue(rentalLocalTime(occurredAt));
    await checkout.getByLabel("Due back (Chicago)", { exact: true }).fill(rentalLocalTime(due));
    await checkout.getByLabel("Odometer").fill("1200");
    await checkout.getByLabel("Fuel", { exact: true }).fill("Full");
    await checkout.getByLabel("Condition", { exact: true }).fill("Reviewed at pickup");
    await checkout.getByLabel("Driver receiving the vehicle").fill(name);
    await checkout.getByLabel("Keys verified").check();
    await checkout.getByLabel("Driver verified").check();
    await checkout.getByLabel("Insurance verified for this customer and vehicle").check();
    await checkout.getByLabel("Vehicle physically handed over").check();
    await checkout.getByLabel("Coverage ends (Chicago)", { exact: true }).fill(rentalLocalTime(new Date(Date.now() + 600000)));
    await confirm.click();
    await expect(checkout.getByRole("alert")).toContainText("Verified insurance must cover the expected return time.");
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    await checkout.getByLabel("Coverage ends (Chicago)", { exact: true }).fill(rentalLocalTime(new Date(due.getTime() + 3600000)));
    await confirm.click();
    await expect(checkout.getByRole("alert")).toContainText("Choose the accepted insurance proof");
    await checkout.getByLabel("Insurance proof verified", { exact: true }).selectOption({ label: "renewal.pdf" });
    await confirm.click();
    await expect(checkout).toContainText("Saved. Rented Out.");
    await page.reload();
    await expect(checkout.getByRole("status").filter({ hasText: "Rented Out" })).toBeVisible();
    const bookings = await prisma.vehicleUseBooking.findMany({ where: { contextId: id } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ status: "CHECKED_OUT", departureSnapshot: { evidence: [`document:${documents[0].id}`, `document:${documents[2].id}`] } });
    expect(await prisma.dealContinuityEvent.count({ where: { contextId: id, action: "HANDOFF" } })).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
});

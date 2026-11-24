import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { rentalLocalTime } from "../../lib/rental-checkout";
import { isValidVin } from "../../server/vehicle-registry/domain";

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

test("confirms rental readiness without recon, then saves routine handoff", async ({ page }) => {
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
      organizationId, locationId: location.id, vehicleId: vehicle.id, inventoryNumber: id, ownerUserId: user.id, lifecycleStage: "PURCHASED_OR_TRADE_IN",
      stageStartedAt: occurredAt, financialAcquiredAt: occurredAt, targetAt: due, nextAction: "Isolated checkout review"
    } });
    await prisma.vehicleRelationship.create({ data: {
      organizationId, vehicleId: vehicle.id, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: occurredAt, sourceCode: "ISOLATED_FIXTURE"
    } });
    await prisma.inventoryIntakeRevision.create({ data: {
      organizationId, vehicleId: vehicle.id, inventoryUnitId: unit.id, version: 1, status: "CONFIRMED", details: { condition: "Good" },
      pendingItems: [], costRecordIds: [], actorUserId: user.id, reason: "Test fixture"
    } });
    const snapshot = {
      "desk:workflowId": "daily-rental",
      "desk:form": { amount: "", customerId: customer.id, note: "", ownerUserId: user.id, vehicle: id },
      "desk:identity": { customerId: customer.id, vehicleId: vehicle.id, inventoryUnitId: unit.id }
    };
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
    await expect(confirm).toHaveCount(0);
    const pendingCheckout = checkout.getByRole("status").filter({ hasText: "Checkout pending" });
    await expect(pendingCheckout).toContainText("Prepare and finalize the checkout packet");
    await expect(pendingCheckout).toContainText("Confirm the vehicle is ready to rent");
    await checkout.getByRole("button", { name: "Prepare checkout packet" }).click();
    const drawer = page.getByRole("complementary", { name: "Daily Rental packet drawer" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    const readinessButton = checkout.getByRole("button", { name: "Confirm ready to rent" });
    await expect(readinessButton).toBeDisabled();
    const continuity = `/api/crm/v1/deal-continuity/${id}`;
    const { vehicleReadiness } = await (await page.request.get(continuity)).json();
    const staleConfirmation = await page.request.post(continuity, { data: {
      action: "CONFIRM_RENTAL_READINESS", ...vehicleReadiness.review, unitVersion: unit.version - 1, confirmed: true, operationKey: randomUUID()
    } });
    expect(staleConfirmation.status()).toBe(409);
    await checkout.getByLabel("The vehicle is on site, safe to rent, and needs no repairs.").check();
    const confirmation = page.waitForRequest(request => request.url().endsWith(`/deal-continuity/${id}`) && request.method() === "POST", { timeout: 10000 });
    await readinessButton.click();
    const readinessPayload = (await confirmation).postDataJSON();
    await expect(checkout.getByRole("status").filter({ hasText: "Rental readiness confirmed for this deal." })).toBeVisible();
    const duplicate = await page.request.post(continuity, { data: readinessPayload });
    expect(await duplicate.json()).toMatchObject({ duplicate: true });
    expect(await prisma.dealContinuityEvent.count({ where: { contextId: id, action: "CONFIRM_RENTAL_READINESS" } })).toBe(1);
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    expect(await prisma.inventoryUnit.findUnique({ where: { id: unit.id } })).toMatchObject({ lifecycleStage: "PURCHASED_OR_TRADE_IN", version: unit.version });

    const packet = await prisma.documentLibraryPacket.create({ data: {
      organizationId, ownerType: "DEAL", ownerId: id, ownerLabel: name, packetType: "TEST_FIXTURE", workflow: "daily-rental", title: name
    } });
    const jacket = await prisma.salesDocumentJacket.create({ data: {
      organizationId, packetId: packet.id, dealReference: id, dealNumber: String(draft.dealNumber), pathway: "daily-rental",
      customerId: customer.id, customerName: name, vehicleReference: id, vin: vehicle.vin, state: "WORKING", requirements: [], createdByUserId: user.id
    } });
    const proof = await PDFDocument.create();
    proof.addPage().drawText("Synthetic rental checkout evidence");
    const proofBytes = Buffer.from(await proof.save());
    const documentIds = new Map<string, string>();
    for (const { documentType, fileName } of [
      { documentType: "signed-agreement", fileName: "signed-agreement.pdf" },
      { documentType: "insurance-proof", fileName: "older-policy.pdf" },
      { documentType: "insurance-proof", fileName: "renewal.pdf" },
      { documentType: "driver-license", fileName: "test-license.pdf" },
      { documentType: "release-condition", fileName: "condition.pdf" }
    ]) {
      const upload = await page.request.post(`/api/sales-documents/${jacket.id}/documents`, {
        multipart: { documentType, file: { name: fileName, mimeType: "application/pdf", buffer: proofBytes } }
      });
      expect(upload.ok(), await upload.text()).toBe(true);
      const uploaded = await upload.json();
      const doc = (uploaded.documents as { id: string; fileName: string }[]).find(document => document.fileName === fileName)!;
      const review = await page.request.patch(`/api/sales-documents/${jacket.id}`, {
        data: { action: "REVIEW", revision: uploaded.revision, documentId: doc.id, signed: documentType === "signed-agreement" }
      });
      expect(review.ok(), await review.text()).toBe(true);
      documentIds.set(fileName, doc.id);
    }
    await prisma.dealDeskDraft.update({ where: { id }, data: { snapshot: { ...snapshot, jackets: { "daily-rental": jacket.id } } } });
    await checkout.getByRole("button", { name: "Refresh checkout status" }).click();
    const reviewPacket = checkout.getByRole("link", { name: "Review & finalize checkout packet" });
    await expect(reviewPacket).toHaveAttribute("href", `/sales-documents?jacketId=${jacket.id}`);
    await expect(reviewPacket).toHaveCSS("background-color", "rgb(49, 84, 174)");
    await expect(confirm).toHaveCount(0);
    const [paperwork] = await Promise.all([page.waitForEvent("popup"), reviewPacket.click()]);
    await paperwork.getByRole("button", { name: "Finalize checkout packet", exact: true }).click();
    await paperwork.getByRole("button", { name: "Finalize packet", exact: true }).click();
    await expect(paperwork.getByRole("button", { name: "Final Packets (1)", exact: true })).toBeVisible();
    await paperwork.close();
    await page.bringToFront();
    await expect(confirm).toBeEnabled({ timeout: 15000 });
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
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
    const evidence = ["signed-agreement.pdf", "renewal.pdf", "condition.pdf"].map(fileName => `document:${documentIds.get(fileName)}`);
    expect(bookings[0]).toMatchObject({ status: "CHECKED_OUT", departureSnapshot: { evidence } });
    expect(await prisma.dealContinuityEvent.count({ where: { contextId: id, action: "HANDOFF" } })).toBe(1);
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(0);
  } finally {
    await prisma.$disconnect();
  }
});

test("Inventory Intake shows why save is blocked next to the buttons and saves after correction", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1", "Requires a disposable migrated and seeded database.");
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/^deal_staging_\d+$/.test(database.searchParams.get("schema") ?? "")) throw new Error("An isolated loopback deal_staging schema is required.");
  const organizationId = process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID!;
  const prisma = new PrismaClient({ datasourceUrl: database.toString() });
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  try {
    const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
    expect(login.ok()).toBe(true);
    const { user } = await (await page.request.get("/api/auth/me")).json();
    const id = randomUUID();
    const location = await prisma.location.create({ data: { organizationId, code: `intake-${id}`, name: `Intake test location ${id.slice(0, 8)}`, city: "Minneapolis", region: "MN", timezone: "America/Chicago" } });
    await prisma.vehicleOperationsFeatureFlag.createMany({ data: ["VEHICLE_OPERATIONS_MASTER", "INVENTORY_INTAKE"].map(code => ({
      organizationId, locationId: location.id, code, mode: "PILOT", rolloutPercent: 0, allowedUserIds: [user.id]
    })) });
    const serial = String(parseInt(id.slice(0, 5), 16) % 1_000_000).padStart(6, "0");
    const vin = Array.from("0123456789X", check => `1HGCM826${check}3A${serial}`).find(isValidVin)!;
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: id, vin, vinState: "VALID", vinValidationSource: "ISOLATED_FIXTURE", year: 2003, make: "Honda", model: "Accord" } });
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: id, displayName: "Synthetic intake test" } });
    const saved = await page.request.post("/api/crm/v1/deal-drafts", { data: {
      id, revision: 0, pathway: "daily-rental", customerId: customer.id, customerName: customer.displayName, vehicleReference: vin,
      snapshot: { "desk:identity": { customerId: customer.id, vehicleId: vehicle.id } }
    } });
    expect(saved.ok()).toBe(true);
    await page.goto(`/crm-next/deals/start?draftId=${id}&rentalAction=HANDOFF#rental-checkout`);
    const link = page.getByRole("link", { name: "Open Inventory Intake for this vehicle" });
    await expect(link).toHaveAttribute("href", `/prototype/inventory-intake?vehicleId=${vehicle.id}`);
    await expect(link).toHaveCSS("background-color", "rgb(49, 84, 174)");
    const [intake] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    await intake.setViewportSize({ width: 1280, height: 640 });
    await intake.getByRole("radio", { name: "Prepare for Sale" }).check();
    await intake.locator('[name="source"]').selectOption("AUCTION");
    await intake.locator('[name="acquiredOn"]').fill("2026-10-01");
    await intake.locator('[name="purchaseAmount"]').fill("12000");
    await intake.locator('[name="priceStatus"]').selectOption("INCURRED");
    await intake.locator('[name="location"]').selectOption(location.id);
    await intake.locator('[name="whereabouts"]').fill("Synthetic receiving lane");
    await intake.getByLabel("I confirm dealership ownership or consignment authority.").check();
    const condition = intake.locator('[name="condition"]');
    await condition.fill("   ");
    const footer = intake.locator("form footer");
    await footer.getByRole("button", { name: "Save Inventory", exact: true }).click();
    await expect(footer.getByRole("alert")).toContainText("Describe the arrival condition");
    await expect(footer.getByRole("alert")).toBeInViewport();
    await expect(condition).toHaveAttribute("aria-invalid", "true");
    expect(await prisma.inventoryUnit.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    await intake.setViewportSize({ width: 390, height: 844 });
    await footer.getByRole("button", { name: "Save & Open Selling Workbench", exact: true }).click();
    await expect(footer.getByRole("alert")).toBeInViewport();
    await condition.fill("GOOD");
    const persisted = intake.waitForResponse(response => response.url().endsWith("/api/inventory-units/compact-intake") && response.request().method() === "POST");
    await footer.getByRole("button", { name: "Save Inventory", exact: true }).click();
    const save = await persisted;
    expect(save.ok(), await save.text()).toBe(true);
    await expect(footer.getByRole("status")).toContainText("Inventory saved and linked", { timeout: 15000 });
    const stored = await intake.request.get(`/api/inventory-units/compact-intake?vehicleId=${vehicle.id}`);
    expect(await stored.json()).toMatchObject({ details: { condition: "GOOD", purchaseCents: 1200000 } });
    expect(await prisma.inventoryUnit.count({ where: { vehicleId: vehicle.id } })).toBe(1);
    await footer.getByRole("button", { name: "Save & Open Selling Workbench", exact: true }).click();
    await expect(intake).toHaveURL(`/vehicles/${vehicle.id}/frontline`);
    expect(await prisma.inventoryUnit.count({ where: { vehicleId: vehicle.id } })).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
});

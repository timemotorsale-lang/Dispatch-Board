import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { rentalLocalTime } from "../../lib/rental-checkout";
import { salesDocumentRequirements } from "../../lib/sales-document-pathways";
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
  const dealsUrl = `/crm-next/deals?area=rentals&search=${encodeURIComponent(customerName)}`;
  await page.goto(dealsUrl);
  const row = page.getByRole("row").filter({ hasText: customerName });
  await expect(row.getByRole("link", { name: "Activate Rental", exact: true })).toBeVisible();
  await row.getByRole("button", { name: `Actions for ${customerName}` }).click();
  await row.getByRole("menuitem", { name: `Deal details for ${customerName}` }).click();
  const drawer = page.getByRole("dialog", { name: `Deal details · ${customerName}` });
  await expect(drawer.getByRole("link", { name: "Activate Rental", exact: true })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Cancel Rental", exact: true })).toBeVisible();
  await drawer.getByRole("link", { name: "Cancel Rental", exact: true }).click();
  const checkout = page.getByRole("region", { name: "Rental checkout and return" });
  await expect(checkout.getByRole("form", { name: "Cancel", exact: true })).toBeVisible();
  await checkout.getByLabel("I confirmed the vehicle was never handed over").check();
  await checkout.getByLabel("Reason", { exact: true }).fill("Synthetic customer cancelled before handoff");
  await checkout.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(checkout).toContainText("Saved. Rental Cancelled.");
  await page.goto(`${dealsUrl}&rentalStage=CANCELLED`);
  await expect(row).toContainText("Rental Cancelled");
  await expect(row.getByRole("link", { name: "Activate Rental", exact: true })).toHaveCount(0);
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
    const confirm = checkout.getByRole("button", { name: "Activate Rental", exact: true });
    await expect(checkout.getByLabel("Reason", { exact: true })).toHaveCount(0);
    await expect(checkout.getByLabel("Dated handoff record")).toHaveCount(0);
    await checkout.getByLabel("Actual checkout (Chicago)", { exact: true }).fill(rentalLocalTime(new Date(Date.now() - 2 * 86400000)));
    await checkout.getByLabel("Confirm checkout more than 24 hours ago from a dated record").check();
    await expect(checkout.getByLabel("Dated handoff record")).toBeVisible();
    await checkout.getByLabel("Actual checkout (Chicago)", { exact: true }).fill(rentalLocalTime(occurredAt));
    await expect(checkout.getByLabel("Dated handoff record")).toHaveCount(0);
    await checkout.getByLabel("Due back (Chicago)", { exact: true }).fill(rentalLocalTime(due));
    await checkout.getByLabel("Odometer").fill("1200");
    await expect(checkout.getByRole("group", { name: "Physical handoff" })).toHaveCount(0);
    await checkout.getByRole("button", { name: "Save checkout draft", exact: true }).click();
    await expect(checkout.getByRole("status").filter({ hasText: "Checkout draft saved" })).toBeVisible();
    await page.reload();
    await expect(checkout.getByLabel("Actual checkout (Chicago)", { exact: true })).toHaveValue(rentalLocalTime(occurredAt));
    await expect(checkout.getByLabel("Due back (Chicago)", { exact: true })).toHaveValue(rentalLocalTime(due));
    await expect(checkout.getByLabel("Odometer")).toHaveValue("1200");
    await expect(checkout.getByRole("group", { name: "Physical handoff" })).toHaveCount(0);
    await expect(checkout).toContainText("Rental Draft");
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
      customerId: customer.id, customerName: name, vehicleReference: id, vin: vehicle.vin, state: "WORKING", requirements: salesDocumentRequirements("daily-rental"), createdByUserId: user.id
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
      documentIds.set(fileName, doc.id);
    }
    const savedDraft = await prisma.dealDeskDraft.findUniqueOrThrow({ where: { id }, select: { snapshot: true } });
    await prisma.dealDeskDraft.update({ where: { id }, data: { snapshot: { ...(savedDraft.snapshot as typeof snapshot), jackets: { "daily-rental": jacket.id } } } });
    await page.reload();
    const reviewPacket = checkout.getByRole("button", { name: "Review & finalize checkout packet" });
    await expect(confirm).toHaveCount(0);
    await reviewPacket.click();
    const checklist = checkout.getByRole("group", { name: "Checkout checklist" });
    await expect(checklist).toBeFocused();
    await reviewPacket.click();
    await expect(checklist).toBeFocused();
    await expect(checklist.getByRole("link", { name: "Open Sales Documents" })).toHaveAttribute("href", `/sales-documents?jacketId=${jacket.id}`);
    await expect(checklist.getByRole("link", { name: "Replace coverage / insurance proof" })).toHaveAttribute("href", `/sales-documents?jacketId=${jacket.id}&requirementId=insurance-proof#deal-document-action`);
    const finalizePacket = checklist.getByRole("button", { name: "Save reviewed paperwork", exact: true });
    await expect(finalizePacket).toBeDisabled();
    await checklist.getByLabel("Coverage / insurance proof file").selectOption({ label: "renewal.pdf" });
    await checklist.getByRole("checkbox", { name: /Signed rental agreement/ }).check();
    await checklist.getByRole("checkbox", { name: "Driver license", exact: true }).check();
    await checklist.getByRole("checkbox", { name: "Coverage / insurance proof", exact: true }).check();
    await checklist.getByRole("checkbox", { name: "Checkout condition record", exact: true }).check();
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
    const handoffStep = checkout.getByRole("group", { name: "Physical handoff" });
    const handoff = handoffStep.getByLabel("Vehicle physically handed over");
    const coverage = checkout.getByLabel("Coverage ends (Chicago)", { exact: true });
    const shortCoverage = rentalLocalTime(new Date(Date.now() + 600000));
    await coverage.fill(shortCoverage);
    await expect(checklist.getByRole("alert")).toContainText("Verified insurance must cover the expected return time.");
    await expect(coverage).toHaveAttribute("aria-invalid", "true");
    await expect(checklist.getByRole("alert")).toContainText("Resolve coverage before activation");
    await expect(checklist.getByRole("link", { name: "Open insurance proof requirement" })).toHaveAttribute("href", `/sales-documents?jacketId=${jacket.id}&requirementId=insurance-proof#deal-document-action`);
    await checklist.getByRole("button", { name: "Review coverage end time" }).click();
    await expect(coverage).toBeFocused();
    await checklist.getByRole("button", { name: "Review due-back time" }).click();
    await expect(checkout.getByLabel("Due back (Chicago)", { exact: true })).toBeFocused();
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    expect(await prisma.salesDocumentPacketVersion.count({ where: { jacketId: jacket.id } })).toBe(0);
    let interruptFinalization = true;
    await page.route(`**/api/sales-documents/${jacket.id}`, route => {
      if (interruptFinalization && route.request().method() === "PATCH" && route.request().postDataJSON()?.action === "FINALIZE") {
        interruptFinalization = false;
        return route.fulfill({ status: 409, json: { error: "Review the updated paperwork and retry." } });
      }
      return route.fallback();
    });
    await finalizePacket.click();
    await expect(checklist.getByRole("alert")).toContainText("Review the updated paperwork and retry.");
    await expect(checklist.getByRole("alert")).toContainText("Verified insurance must cover the expected return time.");
    await expect(checklist.getByRole("checkbox", { name: "Coverage / insurance proof", exact: true })).toBeDisabled();
    await finalizePacket.click();
    await expect(handoffStep).toBeFocused();
    await expect(handoffStep.getByRole("status")).toContainText("Checkout packet finalized");
    await confirm.click();
    await expect(checkout.getByRole("alert")).toContainText("Verified insurance must cover the expected return time.");
    await expect(handoff).not.toBeChecked();
    expect(await prisma.salesDocumentPacketVersion.count({ where: { jacketId: jacket.id, phase: "CHECKOUT" } })).toBe(1);
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    await page.reload();
    await expect(handoff).not.toBeChecked();
    await expect(coverage).toHaveValue(shortCoverage);
    await checkout.getByRole("list", { name: "Items to complete before activation" }).getByRole("button", { name: "Verify the driver" }).click();
    await expect(checkout.getByLabel("Driver verified")).toBeFocused();
    await coverage.fill(rentalLocalTime(new Date(due.getTime() + 3600000)));
    await checkout.getByLabel("Keys verified").check();
    await checkout.getByLabel("Driver verified").check();
    await checkout.getByLabel("Insurance verified for this customer and vehicle").check();
    await confirm.click();
    await expect(checkout.getByRole("alert")).toContainText("Confirm the physical handoff");
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
    await handoff.check();
    await confirm.click();
    await expect(checkout).toContainText("Saved. Rented Out.");
    const documents = page.getByRole("region", { name: "Deal documents" });
    await expect(documents.getByRole("status")).toHaveText("Rental activated. Rented Out.");
    await expect(documents.getByLabel("Rental activated. Rented Out.")).toBeFocused();
    await documents.getByRole("link", { name: "Close checkout & return to Rentals" }).click();
    await expect(page).toHaveURL(/\/crm-next\/deals\?area=rentals$/);
    await page.goto(`/crm-next/deals/start?draftId=${id}&rentalAction=HANDOFF#rental-checkout`);
    await page.reload();
    await expect(checkout.getByRole("status").filter({ hasText: "Rented Out" })).toBeVisible();
    await expect(checkout.getByText(/Activation saved ·/)).toBeVisible();
    const bookings = await prisma.vehicleUseBooking.findMany({ where: { contextId: id } });
    expect(bookings).toHaveLength(1);
    const evidence = ["signed-agreement.pdf", "renewal.pdf", "condition.pdf"].map(fileName => `document:${documentIds.get(fileName)}`);
    expect(bookings[0]).toMatchObject({ status: "CHECKED_OUT", departureSnapshot: { evidence } });
    expect(await prisma.dealContinuityEvent.count({ where: { contextId: id, action: "HANDOFF" } })).toBe(1);
    expect(await prisma.repairOrder.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    await page.goto(`/crm-next/deals?area=rentals&search=${encodeURIComponent(name)}`);
    const activeRow = page.getByRole("row").filter({ hasText: name });
    await expect(activeRow).toContainText("Rented Out");
    await expect(activeRow.getByRole("link", { name: "Record Return", exact: true })).toBeVisible();
    await activeRow.getByRole("button", { name: `Actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: `Deal details for ${name}` }).click();
    const activity = page.getByRole("region", { name: "Rental activity" });
    await activity.getByLabel("Rental progress note").fill("Customer confirmed the return time.");
    await activity.getByRole("button", { name: "Save progress note" }).click();
    await expect(activity.getByText("Customer confirmed the return time.", { exact: true })).toBeVisible();
    await activity.getByText("Record damage or theft", { exact: true }).click();
    await activity.getByLabel("Incident type").selectOption("THEFT");
    await activity.getByLabel("What happened?").fill("Customer reported a missing catalytic converter.");
    await activity.getByRole("button", { name: "Save incident" }).click();
    await expect(activity.getByText("Customer reported a missing catalytic converter.", { exact: true })).toBeVisible();
    await expect(activity.getByRole("link", { name: "Follow-up task" })).toHaveAttribute("href", /^\/tasks\//);
    await activity.getByText("Connect to Claims Desk", { exact: true }).click();
    await activity.getByRole("button", { name: "Start internal claim intake" }).click();
    await expect(activity.getByRole("link", { name: "Open linked claim" })).toHaveAttribute("href", /^\/vehicles\/claims-workspace\?claimId=/);

    const loanerId = randomUUID();
    const loaner = await page.request.post("/api/crm/v1/deal-drafts", { data: {
      id: loanerId, revision: 0, pathway: "vehicle-loaner", customerName: name, customerId: customer.id, vehicleReference: vehicle.vin,
      snapshot: { ...snapshot, "desk:workflowId": "vehicle-loaner" }
    } });
    expect(loaner.ok(), await loaner.text()).toBe(true);
    await page.goto(`/crm-next/deals/start?draftId=${loanerId}&rentalAction=HANDOFF#rental-checkout`);
    const loanerCheckout = page.getByRole("region", { name: "Loaner checkout and return" });
    await loanerCheckout.getByRole("button", { name: "Prepare checkout packet" }).click();
    const loanerDrawer = page.getByRole("complementary", { name: "Vehicle loaner packet drawer" });
    const generatedLoaner = page.waitForRequest(request => request.url().endsWith("/contract-packets") && request.method() === "POST");
    await loanerDrawer.getByRole("button", { name: "Generate loaner packet" }).click();
    expect((await generatedLoaner).postDataJSON()).toMatchObject({ workflowContextId: loanerId, pathway: "vehicle-loaner", customerId: customer.id, vehicle: { vin: vehicle.vin } });
    await expect(loanerDrawer.getByRole("alert")).toContainText(/checked out on another assignment/i);
    await expect(loanerDrawer.getByRole("link", { name: "Open other assignment to review return" })).toHaveAttribute("href", new RegExp(`draftId=${id}.*rentalAction=RETURN`));
    await expect(loanerDrawer.getByRole("link", { name: "Review and cancel reservation" })).toHaveCount(0);
    await loanerDrawer.getByRole("button", { name: "Choose a different vehicle" }).click();
    await expect(loanerDrawer).toHaveCount(0);
    const picker = page.getByRole("region", { name: "Shared temporary vehicle selector" });
    const replacementId = randomUUID();
    const replacementVin = `1${replacementId.replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const replacement = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: replacementId, vin: replacementVin, vinState: "VALID", vinValidationSource: "ISOLATED_FIXTURE" } });
    await picker.getByRole("textbox", { name: "Search shared temporary vehicles" }).fill(replacementVin);
    await picker.getByRole("button", { name: "Find vehicle", exact: true }).click();
    page.once("dialog", dialog => dialog.accept());
    await picker.getByRole("list").getByRole("button", { name: new RegExp(replacementVin) }).click();
    await expect.poll(async () => (await prisma.dealWorkflowContext.findUnique({ where: { draftId: loanerId } }))?.vehicleId).toBe(replacement.id);
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id, status: "CHECKED_OUT" } })).toBe(1);
    await page.goto("/crm-next/deals?area=rentals");

    const loanerUnit = await prisma.inventoryUnit.create({ data: {
      organizationId, locationId: location.id, vehicleId: replacement.id, inventoryNumber: replacementId, ownerUserId: user.id,
      lifecycleStage: "PURCHASED_OR_TRADE_IN", stageStartedAt: occurredAt, financialAcquiredAt: occurredAt, targetAt: due, nextAction: "Synthetic loaner checkout"
    } });
    await prisma.vehicleRelationship.create({ data: { organizationId, vehicleId: replacement.id, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: occurredAt, sourceCode: "ISOLATED_FIXTURE" } });
    await prisma.inventoryIntakeRevision.create({ data: { organizationId, vehicleId: replacement.id, inventoryUnitId: loanerUnit.id, version: 1, status: "CONFIRMED", details: { condition: "Good" }, pendingItems: [], costRecordIds: [], actorUserId: user.id, reason: "Test fixture" } });
    const loanerContinuity = `/api/crm/v1/deal-continuity/${loanerId}`;
    const { vehicleReadiness: loanerReadiness } = await (await page.request.get(loanerContinuity)).json();
    const ready = await page.request.post(loanerContinuity, { data: { action: "CONFIRM_RENTAL_READINESS", ...loanerReadiness.review, confirmed: true, operationKey: randomUUID() } });
    expect(ready.ok(), await ready.text()).toBe(true);
    const loanerPacket = await prisma.documentLibraryPacket.create({ data: { organizationId, ownerType: "DEAL", ownerId: loanerId, ownerLabel: name, packetType: "TEST_FIXTURE", workflow: "vehicle-loaner", title: "Loaner checkout" } });
    const latestLoaner = await prisma.dealDeskDraft.findUniqueOrThrow({ where: { id: loanerId } });
    const loanerJacket = await prisma.salesDocumentJacket.create({ data: { organizationId, packetId: loanerPacket.id, dealReference: loanerId, dealNumber: String(latestLoaner.dealNumber), pathway: "vehicle-loaner", customerId: customer.id, customerName: name, vehicleReference: replacementVin, vin: replacementVin, requirements: salesDocumentRequirements("vehicle-loaner"), createdByUserId: user.id } });
    await prisma.documentLibraryPacketDocument.create({ data: { organizationId, packet: { connect: { id: loanerPacket.id } }, document: { create: {
      organizationId, ownerType: "DEAL", ownerId: loanerId, ownerLabel: name, documentType: "signed-agreement", fileName: "unsigned-loaner.pdf",
      status: "PENDING_REVIEW", source: "GENERATED", retentionCategory: "TEST_FIXTURE", storageProvider: "INTERNAL", storageReference: "test-fixture:unsigned-loaner"
    } } } });
    await prisma.dealDeskDraft.update({ where: { id: loanerId }, data: { snapshot: { ...(latestLoaner.snapshot as typeof snapshot), jackets: { "vehicle-loaner": loanerJacket.id } } } });
    expect(await (await page.request.get(loanerContinuity)).json()).toMatchObject({ agreementHref: `/sales-documents?jacketId=${loanerJacket.id}` });
    await page.goto(`/crm-next/deals/start?draftId=${loanerId}&rentalAction=HANDOFF#rental-checkout`);
    await loanerCheckout.getByRole("button", { name: "Review & finalize checkout packet" }).click({ timeout: 10000 });
    const loanerChecklist = loanerCheckout.getByRole("group", { name: "Checkout checklist" });
    const missing = loanerChecklist.getByRole("status").filter({ hasText: "Missing checkout evidence" });
    await expect(missing).toContainText("Signed loaner agreement · Driver license · Coverage / insurance proof · Checkout condition record");
    await expect(loanerChecklist.getByRole("link", { name: "Open unsigned form for signing" })).toBeVisible();
    await expect(loanerChecklist.getByRole("button", { name: "Save reviewed paperwork" })).toBeDisabled();
    for (const { id: documentType, label } of salesDocumentRequirements("vehicle-loaner").filter(item => item.phase === "CHECKOUT" && item.required)) {
      await loanerChecklist.locator(`input[type=file][name="${documentType}"]`).setInputFiles({ name: `${documentType}.pdf`, mimeType: "application/pdf", buffer: proofBytes }, { timeout: 10000 });
      await expect(loanerChecklist.getByRole("status").filter({ hasText: `${label} uploaded` })).toBeVisible();
      await loanerChecklist.getByRole("checkbox", { name: label === "Signed loaner agreement" ? /Signed loaner agreement/ : label, exact: label !== "Signed loaner agreement" }).check();
    }
    await expect(missing).toHaveCount(0);
    await loanerChecklist.getByRole("button", { name: "Save reviewed paperwork" }).click();
    await expect(loanerCheckout.getByRole("group", { name: "Physical handoff" })).toBeVisible();
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: loanerId } })).toBe(0);
    await loanerCheckout.getByLabel("Due back (Chicago)", { exact: true }).fill(rentalLocalTime(due));
    await loanerCheckout.getByLabel("Actual checkout (Chicago)", { exact: true }).fill(rentalLocalTime(occurredAt));
    await loanerCheckout.getByLabel("Odometer").fill("1200");
    await loanerCheckout.getByLabel("Fuel", { exact: true }).fill("Full");
    await loanerCheckout.getByLabel("Condition", { exact: true }).fill("Good");
    await loanerCheckout.getByLabel("Driver receiving the vehicle").fill(name);
    await loanerCheckout.getByLabel("Coverage ends (Chicago)", { exact: true }).fill(rentalLocalTime(new Date(due.getTime() + 3600000)));
    await loanerCheckout.getByLabel("Keys verified").check();
    await loanerCheckout.getByLabel("Driver verified").check();
    await loanerCheckout.getByLabel("Insurance verified for this customer and vehicle").check();
    await loanerCheckout.getByLabel("Vehicle physically handed over").check();
    await loanerCheckout.getByRole("button", { name: "Activate Loaner", exact: true }).click();
    await expect(page.getByRole("region", { name: "Deal documents" }).getByRole("status")).toHaveText("Loaner activated. Loaner Active.");
    await page.reload();
    await expect(loanerCheckout.getByRole("status").filter({ hasText: "Loaner Active" })).toBeVisible();
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: loanerId, status: "CHECKED_OUT" } })).toBe(1);
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
      id, revision: 0, pathway: "vehicle-loaner", customerId: customer.id, customerName: customer.displayName, vehicleReference: vin,
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
    const inventorySearch = await intake.request.get(`/api/inventory-units?query=${encodeURIComponent(`2003 Honda Accord ${vin}`)}`);
    expect(inventorySearch.ok()).toBe(true);
    expect((await inventorySearch.json()).items).toEqual([expect.objectContaining({ vehicle: expect.objectContaining({ id: vehicle.id }) })]);
    await footer.getByRole("button", { name: "Save & Open Selling Workbench", exact: true }).click();
    await expect(intake).toHaveURL(`/vehicles/${vehicle.id}/frontline`);
    expect(await prisma.inventoryUnit.count({ where: { vehicleId: vehicle.id } })).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
});

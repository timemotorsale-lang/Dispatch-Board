import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { prepareIsolatedRepairWorkday } from "./helpers/synthetic-workday";

test("an advisor checks in a vehicle and resumes its existing order without replacing intake details", async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(25_000);
  page.setDefaultNavigationTimeout(60_000);
  const schema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!schema?.startsWith("dispatch_board_e2e_")) throw new Error("Customer check-in requires an isolated browser test schema.");
  const suffix = randomUUID().slice(0, 8);
  const advisor = await prisma.user.findUniqueOrThrow({ where: { email: "alex.advisor@local.test" } });
  for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS"]) {
    const where = { organizationId: location.organizationId, locationId: location.id, code };
    const flag = await prisma.vehicleOperationsFeatureFlag.findFirst({ where });
    if (!flag) await prisma.vehicleOperationsFeatureFlag.create({ data: { ...where, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
  }
  const customer = await prisma.customer.create({ data: {
    organizationId: location.organizationId, customerNumber: `CHECKIN-${suffix}`, displayName: `Check-in customer ${suffix}`,
  } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: location.organizationId, vehicleNumber: `CHECKIN-${suffix}`, year: 2021, make: "Kia", model: "Sorento",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated browser fixture", vinValidationSource: "SYNTHETIC_E2E",
  } });
  await prisma.vehicleRelationship.create({ data: {
    organizationId: location.organizationId, vehicleId: vehicle.id, customerId: customer.id,
    relationshipType: "CUSTOMER_OWNER", effectiveFrom: new Date(), sourceCode: "SYNTHETIC_E2E",
  } });
  const response = await page.request.post("/api/auth/login", { data: { email: advisor.email, password: "dispatch123!" } });
  expect(response.ok()).toBe(true);
  const concern = "Customer reports a brake squeak on light stops.";
  const newConcern = "Customer also reports the left headlight is out.";
  const intakeHref = (concernSummary: string) => `/vehicles/repair-orders?${new URLSearchParams({
    intakeSource: "WALK_IN", customerId: customer.id, vehicleId: vehicle.id, concernSummary,
  })}`;
  const footer = page.locator("footer.sic-footer");
  await prepareIsolatedRepairWorkday(page, intakeHref(concern));

  await page.goto(intakeHref(concern));
  await expect(page.getByRole("link", { name: "Open Shop Dispatch" })).toHaveCount(0);
  await footer.getByRole("button", { name: "Complete Check-In & Create Repair Order" }).click();
  await expect(page.getByRole("heading", { name: /Check-in saved/ })).toBeVisible({ timeout: 25_000 });
  const order = await prisma.repairOrder.findFirstOrThrow({ where: { vehicleId: vehicle.id }, include: { serviceVisit: true } });
  expect(order.serviceVisit.concernSummary).toBe(concern);
  const checkInActions = page.getByRole("navigation", { name: "Continue repair order" });
  const authorize = checkInActions.getByRole("link", { name: "Authorize diagnosis", exact: true });
  await expect(authorize).toBeVisible({ timeout: 30_000 });
  await expect(checkInActions.getByRole("link", { name: "Open Labor Guide", exact: true })).toHaveCount(0);

  const planningUrl = `/api/repair-orders/${order.id}/planning`;
  const before = new Date().toISOString();
  const blocked = await page.request.post(planningUrl, { data: {
    action: "RECORD_INSPECTION", templateCode: "TEST", templateVersion: 1,
    items: [{ key: "test", label: "Synthetic check", result: "PASS" }],
    summary: "Synthetic check prior to customer authorization", startedAt: before, completedAt: before,
    reason: "Verify customer diagnostic authorization gate", idempotencyKey: randomUUID()
  } });
  expect(blocked.ok()).toBe(false);
  expect((await blocked.json()).error).toContain("Record customer diagnostic authorization");
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: order.id } })).toBe(0);

  const approvalPage = await page.context().newPage();
  try {
    await approvalPage.goto(new URL((await authorize.getAttribute("href"))!, page.url()).href);
    const diagnostic = approvalPage.getByRole("region", { name: "Customer diagnostic authorization" });
    await expect(diagnostic).toContainText(concern);
    await expect(approvalPage.getByRole("region", { name: "Quoted repair authorization" })).toHaveCount(0);
    const printButton = diagnostic.getByRole("button", { name: "Print for signature" });
    await printButton.click();
    await expect(diagnostic.getByRole("alert")).toContainText("Enter a valid flat diagnostic fee");
    await diagnostic.getByLabel("Flat diagnostic fee ($)", { exact: true }).fill("125.07");
    const [printPage] = await Promise.all([page.context().waitForEvent("page"), printButton.click()]);
    await expect(printPage.getByRole("heading", { name: "Customer diagnostic authorization" })).toBeVisible();
    await expect(printPage.getByText("Pending customer signature")).toBeVisible();
    for (const value of [customer.displayName, order.repairOrderNumber, "2021 Kia Sorento", concern, "$125.07", "Customer or authorized representative signature"]) {
      await expect(printPage.getByText(value, { exact: value !== "$125.07" })).toBeVisible();
    }
    await printPage.emulateMedia({ media: "print" });
    await expect(printPage.getByRole("button", { name: "Print document" })).toBeHidden();
    const pdf = await PDFDocument.load(await printPage.pdf({ preferCSSPageSize: true }));
    expect(pdf.getPageCount()).toBe(1);
    await printPage.close();
    expect(await prisma.enterpriseCommandLedger.count({
      where: { subjectId: order.id, commandType: "RECORD_INSPECTION_CONSENT" }
    })).toBe(0);

    await diagnostic.getByLabel("Permission method").selectOption("SIGNED_PAPER");
    const signedAt = await approvalPage.evaluate(() => {
      const now = new Date();
      return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
    });
    await diagnostic.getByLabel("Signed date and time", { exact: true }).fill(signedAt);
    await diagnostic.getByLabel("Signed form reference", { exact: true }).fill("Signed form scan 001");
    await diagnostic.getByRole("checkbox").check();
    await diagnostic.getByRole("button", { name: "Record diagnostic authorization", exact: true }).click();
    await expect(diagnostic.getByRole("status")).toContainText("$125.07");
    await approvalPage.reload();
    await expect(diagnostic.getByRole("status")).toContainText("Signed form scan 001");
    const [savedCopy] = await Promise.all([
      page.context().waitForEvent("page"), diagnostic.getByRole("link", { name: "Print recorded authorization" }).click()
    ]);
    await expect(savedCopy.getByText("Recorded authorization summary")).toBeVisible();
    await expect(savedCopy.getByText("Signed form scan 001")).toBeVisible();
    await expect(savedCopy.getByText("$125.07", { exact: false })).toBeVisible();
    await savedCopy.close();
    await expect(diagnostic.getByRole("link", { name: "Open inspection checklist" })).toBeVisible();
    const saved = await prisma.serviceVisit.findUniqueOrThrow({ where: { id: order.serviceVisit.id } });
    expect(saved.consentStatus).toBe(order.serviceVisit.consentStatus);
    const consent = await prisma.enterpriseCommandLedger.findFirstOrThrow({
      where: { subjectId: order.id, commandType: "RECORD_INSPECTION_CONSENT" }
    });
    expect(consent.resultSnapshot).toMatchObject({
      consentStatus: "DOCUMENTED", concernSummary: concern, diagnosticFeeCents: 12507, customerName: customer.displayName,
      channel: "SIGNED_PAPER", consentReference: "Signed form scan 001"
    });
    expect(await prisma.repairAuthorization.count({ where: { repairOrderId: order.id } })).toBe(0);
  } finally {
    await approvalPage.close();
  }

  await page.goto(`/vehicles/repair-workbench?repairOrderId=${order.id}&resume=1`);
  await expect(page.getByRole("heading", { name: "Repair Workbench" })).toBeVisible({ timeout: 25_000 });
  await expect(page).toHaveURL(`/vehicles/repair-workbench?repairOrderId=${order.id}&resume=1`);
  const stages = page.getByLabel("Repair workflow", { exact: true });
  const shopStateBefore = await prisma.shopReconLifecycle.findUnique({ where: { repairOrderId: order.id }, select: { stage: true, version: true } });
  const switcher = page.getByRole("navigation", { name: "Vehicle workflows" });
  const chooseLifecycle = switcher.locator("summary");
  const shopRecon = switcher.getByRole("link", { name: "Shop & Recon" });
  const nextAction = page.getByRole("region", { name: "Next action" });
  await expect(nextAction.getByRole("link", { name: "Open inspection checklist" })).toBeVisible();
  await expect(switcher).toContainText("Inspect");
  await expect(stages).toBeHidden();
  await expect(shopRecon).toBeHidden();
  await chooseLifecycle.focus();
  await page.keyboard.press("Enter");
  const inventory = switcher.getByRole("link", { name: "Inventory Lifecycle" });
  await expect(inventory).toHaveCount(0);
  const customerNotice = /Customer-owned vehicle.*update its status to dealership inventory/;
  await expect(switcher.getByText(customerNotice)).toBeVisible();
  await expect(shopRecon).toBeVisible();
  await page.goto(`/vehicles/${vehicle.id}/inventory-planning?view=lifecycle&repairOrderId=${order.id}`);
  await expect(page.getByRole("heading", { name: "Inventory Lifecycle unavailable" })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText(customerNotice)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Inventory lifecycle stages" })).toHaveCount(0);
  await page.getByRole("link", { name: "Continue in Shop & Recon" }).click();
  await expect(page.getByRole("heading", { name: "Shop & Recon", exact: true })).toBeVisible({ timeout: 25_000 });
  await expect(switcher.locator('[aria-current="page"]')).toHaveText("Shop & Recon");
  await expect(switcher.getByText(customerNotice)).toBeVisible();
  const shopStages = page.getByRole("navigation", { name: "Sixteen Shop and Recon stages" });
  await expect(shopStages.getByRole("button")).toHaveCount(16);
  const shopPanel = page.locator("#shop-recon-stage-panel");
  await expect(shopPanel).toBeHidden();
  const shopExit = shopStages.getByRole("button", { name: /Vehicle Handover & Shop Exit/ });
  await shopExit.click();
  await expect(shopPanel).toBeVisible();
  await expect(shopExit).toHaveAttribute("aria-expanded", "true");
  await expect(shopPanel.getByRole("button", { name: "Finalize RO" })).toHaveCount(0);
  await shopExit.click();
  await expect(shopPanel).toBeHidden();
  expect(await prisma.shopReconLifecycle.findUnique({ where: { repairOrderId: order.id }, select: { stage: true, version: true } })).toEqual(shopStateBefore);
  const repairStagesHref = `/vehicles/repair-workbench?repairOrderId=${order.id}&workflow=shop`;
  await page.goto(repairStagesHref);
  await expect(page.getByRole("heading", { name: "Repair stages", exact: true })).toBeVisible();
  const inspectionStage = stages.getByRole("link", { name: /^1\. Inspect/ });
  await expect(inspectionStage).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#shop-stage-panel")).toBeHidden();
  await inspectionStage.click();
  await expect(inspectionStage).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Inspection clearance items" })).toBeVisible();
  await inspectionStage.click();
  await expect(page.locator("#shop-stage-panel")).toBeHidden();
  await stages.getByRole("link", { name: /^2\. Diagnose/ }).click();
  await expect(page.getByText("Complete the current repair step before recording work in this stage.")).toBeVisible();
  const earlyDiagnosis = await page.request.post(`/api/repair-orders/${order.id}/planning`, { data: {
    action: "RECORD_DIAGNOSIS", idempotencyKey: randomUUID(), concern,
    cause: "Synthetic pending diagnosis", diagnosedAt: new Date().toISOString(), uncertainty: "HIGH",
    evidence: ["Synthetic fixture"], symptoms: [concern], tests: [{ name: "Observe", result: "Further checks needed" }],
    proposedCorrection: "Verify the concern", recommendation: "Inspect the vehicle first",
    reason: "Verify the diagnosis gate on an isolated order.", technicianUserId: advisor.id,
  } });
  expect(earlyDiagnosis.status()).toBe(400);
  expect((await earlyDiagnosis.json()).error).toContain("Save the customer vehicle inspection");
  expect(await prisma.repairDiagnosisVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
  await stages.getByRole("link", { name: /Closeout \/ handoff/ }).click();
  await expect(page.getByText("Vehicle handoff opens after the release is recorded.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close repair & record handoff" })).toHaveCount(0);

  await page.goto(`/vehicles/repair-workbench?repairOrderId=${order.id}&step=qc&reconPath=OUTSIDE_VENDOR`);
  await expect(page.getByRole("heading", { name: "Repair Workbench", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quality check", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change recon path Outside vendor" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("navigation", { name: "Repair record tools" }).getByRole("link", { name: "Full tools" })).toBeVisible();
  await expect(stages).toBeHidden();
  const documentInspection = nextAction.getByRole("link", { name: "Document inspection", exact: true });
  await expect(documentInspection).toBeVisible();
  await expect(page.getByLabel("Repair order actions").getByRole("link", { name: "Document inspection" })).toHaveAttribute("href", (await documentInspection.getAttribute("href"))!);
  await documentInspection.click();
  await expect(page.getByRole("region", { name: "Inspection clearance items" })).toBeVisible();

  await page.goto(`/prototype/repair-workbench?repairOrderId=${order.id}&returnTo=%2Fvehicles%2Fadvisor`);
  await expect(page).toHaveURL(`/vehicles/repair-workbench?repairOrderId=${order.id}&returnTo=%2Fvehicles%2Fadvisor`);
  await expect(page.getByRole("link", { name: "Back to source" })).toHaveAttribute("href", "/vehicles/advisor");
  const pathOptions = page.locator("header + #recon-path-options");
  const choosePath = async (label: string) => {
    const picker = page.getByRole("button", { name: /^(Choose|Change) recon path/ });
    if (await picker.getAttribute("aria-expanded") === "false") await picker.click();
    await expect(pathOptions).toBeVisible();
    await expect(pathOptions.getByRole("button")).toHaveCount(5);
    await pathOptions.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole("button", { name: `Change recon path ${label}`, exact: true })).toBeVisible();
  };
  await expect(pathOptions).toBeHidden();
  await choosePath("Inspection only");
  await expect(nextAction.getByRole("link", { name: "Document inspection" })).toBeVisible();
  await expect(page.getByLabel("Repair order actions").getByRole("link", { name: "Document inspection" })).toHaveAttribute("href", "#repair-workflow-action");
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
  const clearance = page.getByRole("region", { name: "Inspection clearance items" });
  for (const label of ["General condition", "Inspection proof", "Safety / warning lights", "Repair path decision"]) {
    const check = clearance.getByRole("button", { name: new RegExp(label) });
    if (await check.getAttribute("aria-pressed") !== "true") await check.click();
  }
  await page.getByRole("button", { name: "Save checklist and unlock next stage", exact: true }).click();
  await expect(nextAction.getByRole("link", { name: "Review inspection" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Saved inspection" })).toBeVisible();
  await page.goto(`${repairStagesHref}&reconPath=INSPECTION_ONLY&returnTo=%2Fvehicles%2Fadvisor`);
  const currentStep = stages.getByRole("link", { name: /^2\. Diagnose/ });
  await expect(currentStep).toHaveAttribute("aria-current", "step");
  await page.getByRole("link", { name: "Repair Workbench", exact: false }).click();
  const fullTools = page.getByRole("navigation", { name: "Repair record tools" }).getByRole("link", { name: "Full tools" });
  await fullTools.click();
  await expect(fullTools).toHaveAttribute("aria-current", "page");
  await expect(pathOptions).toBeHidden();
  await choosePath("Bodywork");
  await expect(nextAction.getByRole("link", { name: "Open bodywork scope" })).toBeVisible();
  await expect(fullTools).toHaveAttribute("aria-current", "page");
  await nextAction.getByRole("link", { name: "Open bodywork scope" }).click();
  await expect(page.getByRole("button", { name: "Confirm scope and unlock estimate" })).toBeVisible();
  await page.getByText("Scope details for unusual bodywork cases", { exact: true }).click();
  await expect(page.getByLabel("Direct repair summary (required)")).toBeVisible();
  await choosePath("Outside vendor");
  await expect(nextAction.getByRole("link", { name: "Open vendor diagnosis request" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Who will diagnose it?" })).toHaveValue("OUTSIDE_VENDOR");
  await expect(page.getByRole("textbox", { name: "Transport method", exact: true })).toHaveCount(0);
  await page.goto(`${repairStagesHref}&reconPath=OUTSIDE_VENDOR&returnTo=%2Fvehicles%2Fadvisor`);
  await currentStep.click();
  await expect(page.getByRole("combobox", { name: "Who will diagnose it?" })).toHaveValue("OUTSIDE_VENDOR");
  await page.getByRole("link", { name: "Return to Repair Workbench" }).click();
  await expect(nextAction.getByRole("link", { name: "Open vendor diagnosis request" })).toBeVisible();
  await choosePath("Detail / prep");
  await expect(nextAction.getByRole("link", { name: "Open detail / prep planning" })).toHaveAttribute("href", new RegExp(`/vehicles/shop-recon/${order.id}\\?`));
  await choosePath("Mechanical repair");
  await expect(nextAction.getByRole("link", { name: "Open diagnosis" })).toBeVisible();
  await page.reload();
  await expect(nextAction).toContainText("Mechanical repair");
  expect(await prisma.repairDiagnosisVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
  expect(await prisma.vehicleInspectionVersion.count({ where: { repairOrderId: order.id } })).toBe(1);
  const inspected = await prisma.repairOrder.findUniqueOrThrow({ where: { id: order.id } });
  await page.goto("/vehicles/registry");
  await page.getByRole("textbox", { name: /Search VIN/ }).fill(vehicle.vehicleNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const match = page.getByRole("row").filter({ hasText: vehicle.vehicleNumber });
  await expect(match.getByRole("link", { name: "Resume diagnosis" })).toBeVisible({ timeout: 30_000 });
  await expect(match).toContainText(order.repairOrderNumber);
  await expect(match.getByText("Prepare for Sale")).toHaveCount(0);
  await match.getByRole("link", { name: "Resume diagnosis" }).click();
  await expect(nextAction.getByRole("link", { name: "Open diagnosis" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("repairOrderId")).toBe(order.id);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(intakeHref(newConcern));
  await expect(page.getByText("Matched appointment", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /What is the customer experiencing/ })).toHaveValue(newConcern);
  await expect(footer.getByRole("button", { name: "Continue existing repair order" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create separate RO for this concern" })).toHaveCount(0);
  await footer.getByRole("button", { name: "Continue existing repair order" }).click();
  await expect(page.getByRole("heading", { name: /Existing repair order found/ })).toBeVisible();
  await expect(page.getByText("The new concern and custody details are still in intake.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Return to intake details" }).click();
  await expect(page.getByRole("textbox", { name: /What is the customer experiencing/ })).toHaveValue(newConcern);
  await footer.getByRole("button", { name: "Continue existing repair order" }).click();
  await page.getByRole("navigation", { name: "Continue repair order" }).getByRole("link", { name: "Review existing repair order", exact: true }).click();
  await expect(nextAction.getByRole("link", { name: "Open diagnosis" })).toBeVisible();
  await expect(stages).toBeHidden();
  await page.reload();
  await expect(nextAction.getByRole("link", { name: "Open diagnosis" })).toBeVisible();
  const saved = await prisma.repairOrder.findMany({ where: { vehicleId: vehicle.id }, include: { serviceVisit: true } });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ id: order.id, ownerUserId: order.ownerUserId, version: inspected.version, serviceVisit: { concernSummary: concern } });

  await page.goto(`/vehicles/360/${vehicle.id}?section=identity`);
  await expect(page.getByRole("button", { name: "Details", exact: true })).toHaveAttribute("aria-current", "page", { timeout: 25_000 });
  await expect(page.getByRole("link", { name: "Resume diagnosis", exact: true })).toBeVisible();
  await page.goto(`/vehicles/${vehicle.id}/workbench`);
  await expect(page.getByRole("link", { name: "Resume diagnosis", exact: true })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText("Review unavailable work source", { exact: true })).toHaveCount(0);

  const vendor = await prisma.repairVendor.create({ data: { organizationId: location.organizationId, code: `DIAG-${suffix}`, name: `Diagnostic vendor ${suffix}`, vendorType: "MECHANICAL", createdByUserId: advisor.id } });
  const technician = await prisma.user.findUniqueOrThrow({ where: { email: "casey.mechanic@local.test" } });
  const diagnosisEndpoint = `/api/repair-orders/${order.id}/diagnosis-work`;
  const earlyFindings = await page.request.post(diagnosisEndpoint, { data: {
    action: "findings", expectedVersion: inspected.version, idempotencyKey: randomUUID(), findings: "Observed vibration", recommendation: "Inspect the wheel",
  } });
  expect(earlyFindings.status()).toBe(400);
  expect((await earlyFindings.json()).error).toContain("Save a diagnosis request");
  await page.goto(`/vehicles/repair-workbench?repairOrderId=${order.id}`);
  const diagnosisTool = page.getByRole("region", { name: "Diagnosis work" });
  await expect(diagnosisTool.getByRole("heading", { name: "Request diagnosis" })).toBeVisible();
  await diagnosisTool.getByRole("textbox", { name: "What should be checked?" }).fill("Verify the reported brake noise and provide findings.");
  await diagnosisTool.getByRole("combobox", { name: "Who will diagnose it?" }).selectOption("OUTSIDE_VENDOR");
  await diagnosisTool.getByRole("combobox", { name: "Vendor", exact: true }).selectOption(vendor.id);
  await diagnosisTool.getByRole("button", { name: "Save vendor handoff" }).click();
  await expect(diagnosisTool.getByText(`Arrange vendor diagnosis · ${vendor.name}`, { exact: true })).toBeVisible({ timeout: 20_000 });
  expect(await prisma.repairVendorWork.count({ where: { repairOrderId: order.id } })).toBe(0);
  expect(await prisma.repairDiagnosisVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
  await page.reload();
  await expect(diagnosisTool.getByText("Verify the reported brake noise and provide findings.", { exact: true })).toBeVisible();
  await diagnosisTool.getByRole("button", { name: "Edit request" }).click();
  await expect(diagnosisTool.getByRole("textbox", { name: "What should be checked?" })).toHaveValue("Verify the reported brake noise and provide findings.");
  await diagnosisTool.getByRole("combobox", { name: "Who will diagnose it?" }).selectOption("IN_HOUSE");
  await diagnosisTool.getByRole("combobox", { name: "Technician", exact: true }).selectOption(technician.id);
  await diagnosisTool.getByRole("button", { name: "Save diagnosis request" }).click();
  await expect(diagnosisTool.getByText(`Awaiting findings · ${technician.name}`, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Build estimate in simplified Labor Guide" })).toHaveCount(0);
  await diagnosisTool.getByRole("textbox", { name: "What was found?" }).fill("Front brake pads are worn.");
  await diagnosisTool.getByRole("textbox", { name: "What work is recommended?" }).fill("Price the front pads and rotors.");
  await diagnosisTool.getByRole("button", { name: "Save findings" }).click();
  await expect(page.getByRole("link", { name: "Build estimate in simplified Labor Guide" })).toBeVisible({ timeout: 20_000 });
  const finding = await prisma.repairDiagnosisVersion.findFirstOrThrow({ where: { repairOrderId: order.id } });
  expect(finding).toMatchObject({ symptoms: ["Front brake pads are worn."], tests: [], evidence: [], proposedCorrection: "Price the front pads and rotors." });
  const ready = await prisma.repairOrder.findUniqueOrThrow({ where: { id: order.id } });
  expect(ready).toMatchObject({ operatingState: "ACTIVE", nextAction: "Build estimate from saved findings" });
  expect(await prisma.repairEstimateVersion.count({ where: { repairOrderId: order.id } })).toBe(0);
});

import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { prepareIsolatedRepairWorkday } from "./helpers/synthetic-workday";

test("an existing recon order shows its parts blocker and resumes assignment after stock is reserved", async ({ page }) => {
  test.setTimeout(150_000);
  const schema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!schema?.startsWith("dispatch_board_e2e_")) throw new Error("Use a disposable browser test schema.");
  const tag = `UNIFIED-${randomUUID().slice(0, 8)}`;
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  const site = { organizationId: location.organizationId, locationId: location.id };
  for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS", "RETAIL_INVENTORY"]) {
    const where = { ...site, code };
    if (!await prisma.vehicleOperationsFeatureFlag.findFirst({ where })) {
      await prisma.vehicleOperationsFeatureFlag.create({ data: { ...where, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
    }
  }
  const yesterday = new Date(Date.now() - 86_400_000);
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: site.organizationId, vehicleNumber: tag, year: 2011, make: "Kia", model: "Sorento",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated recon fixture", vinValidationSource: "SYNTHETIC_E2E",
  } });
  const owned = { ...site, vehicleId: vehicle.id, ownerUserId: manager.id, targetAt: new Date(), stageStartedAt: yesterday, nextAction: "Legacy note on the repair order" };
  const inventory = await prisma.inventoryUnit.create({ data: { ...owned, inventoryNumber: tag, financialAcquiredAt: yesterday } });
  const intake = { ...site, vehicleId: vehicle.id, inventoryUnitId: inventory.id, origin: "INVENTORY_RECON", intakeSource: "INVENTORY_RECON" } as const;
  const visit = await prisma.serviceVisit.create({ data: {
    ...intake, arrivedAt: yesterday, concernSummary: "Synthetic recon needs a replacement bracket.", consentStatus: "NOT_REQUIRED",
    transportMode: "INTERNAL_TRANSPORT", createdByUserId: manager.id,
  } });
  const order = await prisma.repairOrder.create({ data: { ...owned, ...intake, serviceVisitId: visit.id, repairOrderNumber: tag, openedAt: yesterday, stage: "REPAIR" } });
  const lifecycle = await prisma.inventoryFrontlineWorkflow.create({ data: {
    ...site, inventoryUnitId: inventory.id, repairOrderId: order.id, ownerUserId: manager.id,
    stage: "TRANSPORT_PLANNING", operatingState: "ACTIVE", nextAction: "Plan transport or verify no transport",
    workflowVersion: "INV-ITF/1.0.0", policyVersion: "INV-ITF-POLICY/1.0.0", targetAt: new Date(Date.now() + 86_400_000), version: 1,
    acquisitionSnapshot: {}, transportSnapshot: {}, receiptSnapshot: {}, inspectionSnapshot: {}, reconSnapshot: {},
    executionSnapshot: {}, qualitySnapshot: {}, titleSnapshot: {}, merchandisingSnapshot: {}, releaseSnapshot: {}, postReleaseSnapshot: {}, exceptionSnapshot: {},
  } });
  await prisma.enterpriseAggregateVersion.create({ data: { ...site, domain: "INVENTORY_TO_FRONTLINE", subjectType: "INVENTORY_FRONTLINE_WORKFLOW", subjectId: lifecycle.id, version: 1 } });
  const related = { organizationId: site.organizationId, repairOrderId: order.id };
  const estimate = await prisma.repairEstimateVersion.create({ data: {
    ...related, version: 1, lineItems: [{ key: "labor-1", type: "LABOR", description: "Replace bracket", quantity: 1, unitPriceCents: 1500, laborGuideMinutes: 15 }],
    laborSubtotalCents: 1500, partsSubtotalCents: 0, feeSubtotalCents: 0, taxCents: 0, discountCents: 0, totalCents: 1500,
    taxBoundary: "Synthetic fixture", expiresAt: new Date(Date.now() + 86_400_000), presentedAt: yesterday, presentationChannel: "INTERNAL", authorUserId: manager.id,
  } });
  const approval = await prisma.repairAuthorization.create({ data: {
    ...related, estimateVersionId: estimate.id, disposition: "ACCEPTED", channel: "INTERNAL", authorizedLineKeys: ["labor-1"],
    authorizedAmountCents: 1500, decisionActorType: "INTERNAL", decisionActorName: manager.name, decidedByUserId: manager.id, reason: "Synthetic recon approval", decidedAt: yesterday,
  } });
  const job = await prisma.repairJob.create({ data: {
    ...related, jobNumber: `${tag}-JOB`, estimateVersionId: estimate.id, authorizationId: approval.id, authorizedLineKey: "labor-1",
    workTypeCode: "GENERAL_REPAIR", description: "Replace bracket", plannedCorrection: "Replace the bracket and verify the fit.",
    laborGuideMinutes: 15, requiredSkills: [], requiredCertifications: [], bayRequirements: [], toolRequirements: [], priority: "NORMAL",
    dependencyJobIds: [], partsRequired: true, status: "WAITING_PARTS", readinessReasonCodes: [], authorizedAmountCents: 1500, createdByUserId: manager.id,
  } });
  const part = await prisma.part.create({ data: { organizationId: site.organizationId, partNumber: tag, description: "Synthetic bracket", standardCostCents: 300 } });
  const demand = await prisma.repairPartDemand.create({ data: { ...related, repairJobId: job.id, partId: part.id, quantityRequired: 1, requiredAt: new Date(), createdByUserId: manager.id } });
  const bin = await prisma.partStockLocation.create({ data: { ...site, code: tag, name: "Synthetic recon stock", type: "BIN" } });
  await prisma.partStockBalance.create({ data: { organizationId: site.organizationId, partId: part.id, stockLocationId: bin.id, onHandQuantity: 1, availableQuantity: 1 } });

  expect((await page.request.post("/api/auth/login", { data: { email: manager.email, password: "dispatch123!" } })).ok()).toBe(true);
  const workbench = `/vehicles/repair-workbench?repairOrderId=${order.id}`;
  await prepareIsolatedRepairWorkday(page, workbench);
  await page.goto(`${workbench}&reconPath=INSPECTION_ONLY`);
  const nextAction = page.getByRole("region", { name: "Next action" });
  const footer = page.getByLabel("Repair order actions", { exact: true });
  const missingPartsAction = nextAction.getByRole("link", { name: "Review missing parts" });
  await expect(missingPartsAction).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose recon path", exact: true })).toHaveCount(0);
  await expect(footer.getByRole("link", { name: "Review missing parts" })).toHaveAttribute("href", (await missingPartsAction.getAttribute("href"))!);
  await expect(page.getByLabel("Repair workflow", { exact: true })).toBeHidden();
  const switcher = page.getByRole("navigation", { name: "Vehicle workflows" });
  const chooseLifecycle = switcher.locator("summary");
  const inventoryWorkflow = switcher.getByRole("link", { name: "Inventory Lifecycle" });
  await expect(inventoryWorkflow).toBeHidden();
  await expect(switcher.getByRole("link", { name: "Shop & Recon" })).toBeHidden();
  await chooseLifecycle.click();
  await expect(inventoryWorkflow).toHaveAttribute("href", new RegExp(`/vehicles/${vehicle.id}/inventory-planning\\?`));
  await inventoryWorkflow.click();
  await expect(page.getByRole("link", { name: "Return to Repair Workbench" })).toBeVisible({ timeout: 25_000 });
  const guidedStages = page.getByRole("navigation", { name: "Inventory lifecycle stages" });
  await expect(guidedStages.getByRole("button")).toHaveCount(16);
  await guidedStages.getByRole("button", { name: /Final QC/ }).click();
  const qcPreview = page.getByRole("region", { name: "Final QC", exact: true });
  await expect(qcPreview.getByRole("heading", { name: "Final QC", exact: true })).toBeVisible();
  const repairQc = qcPreview.getByRole("region", { name: "Repair QC checklist", exact: true });
  const fullQc = qcPreview.locator("summary").filter({ hasText: "Full vehicle QC checklist" });
  await expect(repairQc.getByRole("radio", { name: "Pass", exact: true })).toHaveCount(4);
  await expect(fullQc.locator("..")).toHaveJSProperty("open", false);
  await fullQc.click();
  await qcPreview.locator("summary").filter({ hasText: "Exterior & Body" }).click();
  const finish = qcPreview.getByRole("group", { name: "Paint and finish", exact: true });
  await finish.getByRole("button", { name: "Review", exact: true }).click();
  await finish.getByLabel("Finding and next step").fill("Review paint finish with the advisor.");
  await qcPreview.getByRole("button", { name: "Save full vehicle check" }).click();
  await expect(qcPreview.getByText("Full vehicle check saved in this preview.")).toBeVisible();
  await expect(qcPreview.getByRole("button", { name: /Simulate handoff/ })).toHaveCount(0);
  await guidedStages.getByRole("button", { name: /Detailing/ }).click();
  await guidedStages.getByRole("button", { name: /Final QC/ }).click();
  await expect(finish.getByLabel("Finding and next step")).toHaveValue("Review paint finish with the advisor.");
  await qcPreview.locator("summary:visible").filter({ hasText: "Stage tools" }).click();
  const liveQc = qcPreview.getByRole("link", { name: "Open live QC workspace", exact: true });
  const liveQcHref = new URL((await liveQc.getAttribute("href"))!, page.url());
  expect(liveQcHref.searchParams.get("repairOrderId")).toBe(order.id);
  expect(liveQcHref.searchParams.get("returnTo")).toContain("guidedStage=8");
  await page.getByRole("link", { name: "Open live Inventory Lifecycle" }).click();
  const inventoryStages = page.getByRole("navigation", { name: "Inventory lifecycle stages" });
  const stageTool = page.locator("#inventory-stage-tool");
  await expect(stageTool).toBeHidden();
  const futureQc = inventoryStages.getByRole("button", { name: /Final QC/ });
  await futureQc.click();
  await expect(stageTool.getByRole("heading", { name: "Final QC" })).toBeVisible();
  await expect(stageTool.getByRole("button", { name: "Pass all critical gates" })).toHaveCount(0);
  await futureQc.click();
  await expect(stageTool).toBeHidden();
  await inventoryStages.getByRole("button", { name: /Transport/ }).click();
  await stageTool.getByLabel("Method").selectOption("NO_TRANSPORT");
  await stageTool.getByRole("button", { name: "Approve transport path" }).click();
  await expect(inventoryStages.getByRole("button", { name: /Receipt/ })).toHaveAttribute("aria-current", "step", { timeout: 15_000 });
  expect((await prisma.inventoryFrontlineWorkflow.findUniqueOrThrow({ where: { id: lifecycle.id } })).stage).toBe("RECEIPT_AND_CUSTODY");
  await page.reload();
  await expect(stageTool).toBeHidden();
  await inventoryStages.getByRole("button", { name: /Receipt/ }).click();
  await expect(stageTool.getByRole("heading", { name: "Confirm identity and custody" })).toBeVisible();
  await switcher.getByRole("link", { name: "Shop & Recon" }).click();
  await expect(switcher.locator('[aria-current="page"]')).toHaveText("Shop & Recon", { timeout: 25_000 });
  await expect(page.getByRole("navigation", { name: "Sixteen Shop and Recon stages" }).getByRole("button")).toHaveCount(16);
  await page.getByRole("link", { name: "Return to Repair Workbench" }).click();
  const blocker = page.getByRole("region", { name: "Parts blocking repair" });
  await expect(blocker).toContainText(job.jobNumber);
  await expect(blocker).toContainText("Synthetic bracket");
  await page.locator("summary").filter({ hasText: "Tools ⋮" }).click();
  const menu = page.getByRole("navigation", { name: "Repair order tools" });
  await expect(menu.getByRole("link", { name: "360 Photos" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Record spending" })).toBeVisible();
  await menu.getByRole("link", { name: "Recon Report" }).click();
  await expect(page.getByRole("region", { name: "Vehicle recon progress report" })).toBeVisible();
  const tools = page.getByRole("navigation", { name: "Repair record tools" });
  await tools.getByRole("link", { name: "RO statistics" }).click();
  await expect(tools.getByRole("link", { name: "RO statistics" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Vehicle information", { exact: true })).toBeVisible();
  await nextAction.getByRole("link", { name: "Review missing parts" }).click();
  await blocker.getByRole("link", { name: "Reserve stock for this repair order" }).click();

  const reservation = page.locator("form").filter({ has: page.getByRole("heading", { name: "Reserve stock" }) });
  await expect(reservation.getByLabel("Repair order")).toHaveValue(order.id, { timeout: 25_000 });
  await reservation.getByLabel("Demand").selectOption(demand.id);
  await reservation.getByLabel("Same-location stock").selectOption(bin.id);
  const response = page.waitForResponse(result => result.url().endsWith(`/${order.id}/parts/reservations`) && result.request().method() === "POST");
  await reservation.getByRole("button", { name: "Reserve stock" }).click();
  expect((await response).ok()).toBe(true);
  await expect.poll(async () => (await prisma.repairPartDemand.findUniqueOrThrow({ where: { id: demand.id } })).quantityReserved).toBe(1);
  await page.getByRole("link", { name: "Return to Repair Workbench" }).click();
  await expect(nextAction.getByRole("link", { name: "Open assignment" })).toBeVisible();
  await page.reload();
  await expect(nextAction.getByRole("link", { name: "Open assignment" })).toBeVisible();
  await expect(blocker).toHaveCount(0);
});

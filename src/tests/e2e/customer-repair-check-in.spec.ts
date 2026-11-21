import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";

test("an advisor checks in a vehicle and resumes its existing order without replacing intake details", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(25_000);
  const schema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!schema?.startsWith("dispatch_board_e2e_")) throw new Error("Customer check-in requires an isolated browser test schema.");
  const suffix = randomUUID().slice(0, 8);
  const advisor = await prisma.user.findUniqueOrThrow({ where: { email: "alex.advisor@local.test" } });
  const customer = await prisma.customer.create({ data: {
    organizationId: location.organizationId, customerNumber: `CHECKIN-${suffix}`, displayName: `Check-in customer ${suffix}`,
  } });
  const vehicle = await prisma.vehicle.create({ data: {
    organizationId: location.organizationId, vehicleNumber: `CHECKIN-${suffix}`, year: 2021, make: "Kia", model: "Sorento",
    vinState: "NON_VIN_EXCEPTION", nonVinReason: "Isolated browser fixture", vinValidationSource: "SYNTHETIC_E2E",
  } });
  const response = await page.request.post("/api/auth/login", { data: { email: advisor.email, password: "dispatch123!" } });
  expect(response.ok()).toBe(true);
  const concern = "Customer reports a brake squeak on light stops.";
  const newConcern = "Customer also reports the left headlight is out.";
  const intakeHref = (concernSummary: string) => `/vehicles/repair-orders?${new URLSearchParams({
    intakeSource: "WALK_IN", customerId: customer.id, vehicleId: vehicle.id, concernSummary,
  })}`;
  const footer = page.locator("footer.sic-footer");

  await page.goto(intakeHref(concern));
  await expect(page.getByRole("link", { name: "Open Shop Dispatch" })).toHaveCount(0);
  await footer.getByRole("button", { name: "Complete Check-In & Create Repair Order" }).click();
  await expect(page.getByRole("heading", { name: /Check-in saved/ })).toBeVisible();
  const order = await prisma.repairOrder.findFirstOrThrow({ where: { vehicleId: vehicle.id }, include: { serviceVisit: true } });
  expect(order.serviceVisit.concernSummary).toBe(concern);
  const estimateHref = await page.getByRole("link", { name: "Build estimate in Labor Guide" }).getAttribute("href");
  expect(new URL(estimateHref!, page.url()).searchParams.get("repairOrderId")).toBe(order.id);
  await page.getByRole("link", { name: "Inspect or plan diagnosis first" }).click();
  await expect(page.getByRole("heading", { name: "Repair Workbench" })).toBeVisible();
  await expect(page.getByLabel("Repair workflow").getByRole("link", { name: /^1\. Inspect/ })).toHaveAttribute("aria-current", "step");
  await page.getByRole("link", { name: /Closeout \/ handoff/ }).click();
  await expect(page.getByText("Vehicle handoff opens after the release is recorded.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close repair & record handoff" })).toHaveCount(0);

  const inspectedAt = new Date();
  await prisma.vehicleInspectionVersion.create({ data: {
    organizationId: location.organizationId, repairOrderId: order.id, version: 1, authorUserId: advisor.id,
    templateCode: "SYNTHETIC", templateVersion: 1, templateSnapshot: {}, items: [],
    summary: "Isolated inspection fixture for a returning repair order.", startedAt: inspectedAt, completedAt: inspectedAt,
  } });

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
  await page.getByRole("link", { name: "Continue repair order", exact: true }).click();
  const currentStep = page.getByLabel("Repair workflow").getByRole("link", { name: /^2\. Diagnose/ });
  await expect(currentStep).toHaveAttribute("aria-current", "step");
  await page.reload();
  await expect(currentStep).toHaveAttribute("aria-current", "step");
  const saved = await prisma.repairOrder.findMany({ where: { vehicleId: vehicle.id }, include: { serviceVisit: true } });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ id: order.id, ownerUserId: order.ownerUserId, version: order.version, serviceVisit: { concernSummary: concern } });
});

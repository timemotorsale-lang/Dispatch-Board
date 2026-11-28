import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212",
  "Requires the isolated localhost CRM preview.");
test.setTimeout(180000);
const ready = expect.configure({ timeout: 30000 });

test("staff can add multiple wishes and resolve a stale edit without losing the draft", async ({ page, playwright, baseURL }) => {
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();
  const organizationId = "org-time-motor-sales";
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" }, select: { id: true } });
    await db.customer.createMany({ data: [customerId, otherCustomerId].map(id => ({
      id, organizationId, ownerUserId: owner.id, customerNumber: `WISH-${id.slice(0, 8)}`, displayName: `Wishlist Review ${id.slice(0, 8)}`
    })) });
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    const path = `/crm-next/customers/${customerId}`;
    const endpoint = `/api/crm-next/customers/${customerId}/vehicle-wishes`;
    await page.goto(path);
    await page.getByRole("link", { name: "Wishlist", exact: true }).click({ timeout: 30000 });
    await ready(page.getByText("No vehicle wishes saved yet.")).toBeVisible();

    const noteText = "Customer also wants heated seats.";
    await page.getByRole("button", { name: "Add wishlist", exact: true }).click();
    await page.getByLabel("Vehicle preferences").fill(noteText);
    await page.getByRole("button", { name: "Save wishlist", exact: true }).click();
    await ready(page.getByText(noteText, { exact: true })).toBeVisible();

    const open = page.getByRole("button", { name: "Add vehicle wish", exact: true });
    await open.click();
    await expect(page.getByLabel("Year", { exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Save wish", exact: true })).toBeDisabled();
    await page.getByLabel("Year", { exact: true }).fill("2022");
    await page.getByLabel("Make", { exact: true }).fill("Toyota");
    await page.getByLabel("Model", { exact: true }).fill("Camry");
    await page.getByLabel("Color", { exact: true }).fill("Blue");
    await page.getByLabel("Max price ($)", { exact: true }).fill("25000.50");
    await page.getByLabel("Target monthly payment ($)", { exact: true }).fill("399.09");
    await page.getByRole("button", { name: "Save wish", exact: true }).click();
    await ready(page.getByText("2022 Toyota Camry", { exact: true })).toBeVisible();
    await expect(page.getByText(/Blue.*\$25,000\.50.*\$399\.09\/mo/)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await open.click();
    await page.getByLabel("Model", { exact: true }).fill("CR-V");
    const form = page.getByRole("form", { name: "Add vehicle wish" });
    const mobileWidth = await form.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(mobileWidth.scroll).toBeLessThanOrEqual(mobileWidth.client + 1);
    await page.getByRole("button", { name: "Save wish", exact: true }).click();
    await ready(page.getByText("CR-V", { exact: true })).toBeVisible();

    await page.reload();
    await ready(page.getByText("2022 Toyota Camry", { exact: true })).toBeVisible();
    await expect(page.getByText("CR-V", { exact: true })).toBeVisible();
    await expect(page.getByText(noteText, { exact: true })).toBeVisible();
    const [first, second] = (await (await page.request.get(endpoint)).json()).wishes;
    await page.getByRole("button", { name: "Edit 2022 Toyota Camry" }).click();
    await page.getByLabel("Color", { exact: true }).fill("Navy");
    const update = await page.request.post(endpoint, { data: {
      action: "save", id: first.id, version: first.version,
      fields: { year: "2022", make: "Toyota", model: "Camry", color: "Silver", maxPrice: "24500.50", monthlyPayment: "399.09" }
    } });
    expect(update.ok(), await update.text()).toBe(true);
    await page.getByRole("button", { name: "Save wish", exact: true }).click();
    await ready(page.getByText(/This wish has changed/)).toBeVisible();
    await expect(page.getByLabel("Color", { exact: true })).toHaveValue("Navy");
    await page.getByRole("button", { name: "Review latest wishes" }).click();
    await ready(page.getByText(/Silver.*Max price/)).toBeVisible();
    await page.getByRole("button", { name: "Continue editing latest version" }).click();
    await expect(page.getByLabel("Max price ($)", { exact: true })).toHaveValue("24500.50");
    await page.getByRole("button", { name: "Save wish", exact: true }).click();
    await ready(page.getByText(/Navy.*Max price/)).toBeVisible();

    const replay = await page.request.post(endpoint, { data: { action: "save", id: second.id, version: null, fields: { model: "CR-V" } } });
    expect(replay.ok(), await replay.text()).toBe(true);
    const crossRecord = await page.request.post(`/api/crm-next/customers/${otherCustomerId}/vehicle-wishes`, { data: {
      action: "save", id: second.id, version: second.version, fields: { make: "Wrong customer" }
    } });
    expect(crossRecord.status()).toBe(409);
    const sales = await playwright.request.newContext({ baseURL });
    try {
      expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
      expect([403, 404]).toContain((await sales.get(endpoint)).status());
      expect([403, 404]).toContain((await sales.post(endpoint, { data: { action: "archive", id: second.id, version: second.version } })).status());
    } finally {
      await sales.dispose();
    }

    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Remove CR-V" }).click();
    await ready(page.getByText("Vehicle wish removed.")).toBeVisible();
    await page.reload();
    await ready(page.getByText(/Navy.*Max price/)).toBeVisible();
    await expect(page.getByText("CR-V", { exact: true })).toHaveCount(0);
    expect(await db.customerVehicleWish.findUnique({ where: { id: second.id }, select: { archivedAt: true } })).toMatchObject({ archivedAt: expect.any(Date) });
    expect(await db.enterpriseAuditEvent.count({ where: { subjectId: customerId, eventType: "CUSTOMER_VEHICLE_WISH_ADDED" } })).toBe(2);
  } finally {
    await db.$disconnect();
  }
});

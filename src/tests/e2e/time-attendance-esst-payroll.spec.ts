import { expect as baseExpect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const expect = baseExpect.configure({ timeout: 15_000 });

test("payroll opens an ESST credit and sees a safe duplicate on retry", async ({ page }) => {
  test.skip(process.env.RUN_TIME_CARD_PREVIEW !== "1", "Uses isolated payroll fixtures.");
  const target = new URL(process.env.DATABASE_URL ?? "");
  expect(target.hostname).toBe("127.0.0.1");
  expect(target.searchParams.get("schema")).toMatch(/^time_card_it_/);
  test.setTimeout(90_000);
  const database = new PrismaClient();
  const postings = await database.enterpriseAuditEvent.findMany({
    where: { eventType: "ESST_PERIOD_CREDITED", organizationId: "org-time-motor-sales" },
    orderBy: { occurredAt: "desc" }, take: 10, select: { newValue: true }
  }).finally(() => database.$disconnect());
  const posting = postings.map(event => event.newValue as { cardId: string; start: string; end: string })
    .find(value => value.start === "2025-12-29" && value.end === "2026-01-04");
  expect(posting).toBeDefined();
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  const login = async (role: "staff" | "manager") => {
    const response = await page.request.post("/api/auth/login", { data: { email: `time-preview-${role}@example.test`, password: "TimeCardTest123!" } });
    expect(response.ok()).toBe(true);
  };
  await login("staff");
  expect((await page.request.get("/api/time-attendance/esst-payroll?start=2025-12-29&end=2026-01-04")).status()).toBe(403);
  await page.request.post("/api/auth/logout");
  await login("manager");
  await page.goto("/time-attendance?view=payroll#payroll-handoff");
  const ready = page.waitForResponse(response => response.url().includes("/api/time-attendance/payroll-handoff?") && response.request().method() === "GET");
  await page.getByRole("button", { name: "Refresh readiness" }).click();
  await ready;
  await page.getByLabel("Period start").fill(posting!.start);
  await page.getByLabel("Period end").fill(posting!.end);
  await expect(page.getByLabel("Period start")).toHaveValue(posting!.start);
  await expect(page.getByLabel("Period end")).toHaveValue(posting!.end);
  await page.getByText("Post Minnesota ESST", { exact: true }).click();
  const esst = page.getByRole("region", { name: "Post Minnesota ESST" });
  const loaded = page.waitForResponse(response => response.url().includes("/api/time-attendance/esst-payroll?") && response.request().method() === "GET");
  await esst.getByRole("button", { name: "Load finalized cards" }).click();
  const response = await loaded;
  expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: posting!.cardId })]));
  await esst.getByLabel("Employee").selectOption(posting!.cardId);
  await esst.getByLabel("Payroll reference or reason").fill("Verify that the approved posting is safe to retry.");
  await esst.getByRole("button", { name: "Credit ESST" }).click();
  await expect(esst.getByRole("status")).toHaveText("This pay period was already credited.");
});

import { test, expect } from "@playwright/test";
import { reportingRange, summarizeDeals, dealGroup, type DashboardDeal } from "../../lib/deal-dashboard";
import { calculateTax, summarizeTax } from "../../lib/compliance-tax";

test("compact dashboard filters and day/week/month summaries use the same records", async ({ page }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const rows = [
    { id: "working", pathway: "lease-to-own", stage: "Working", needsAttention: true },
    { id: "sale", pathway: "bhph", stage: "Completed", needsAttention: false },
    { id: "rental", pathway: "daily-rental", stage: "Completed", needsAttention: false },
  ].map(row => ({ ...row, draftId: row.id, draftRevision: 1, jacketId: `packet-${row.id}`, dealNumber: `D-${row.id}`, customerName: `Sample ${row.id}`, vehicleReference: "2024 Toyota RAV4 · Stock 123456 · VIN SAMPLE12345678901", customerId: `customer-${row.id}`, status: row.stage === "Completed" ? "COMPLETED" : "IN_PROGRESS", packetState: null, ownerId: "sample-owner", ownerName: "Sample Manager", nextAction: "Review signed agreement", taskHref: null, dueAt: null, completedDate: row.stage === "Completed" ? "2026-10-31" : null, createdDate: "2026-10-01", updatedAt: "2026-11-01T12:00:00Z", documentsReady: 8, documentsTotal: 10 })) as DashboardDeal[];
  const tax = calculateTax({ kind: "LEASE", reference: "SAMPLE-TAX", date: "2026-10-31", customer: "Sample lease", vehicle: "Sample vehicle", vehicleValue: "10000", contractTax: "687.50", localTaxes: [], localConfirmed: true, qualified: true, garageAddress: "Verified address" });
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside dashboard test" } }));
  await page.route("**/api/crm/v1/deal-drafts*", route => {
    const query = new URL(route.request().url()).searchParams;
    const range = reportingRange(query.get("date") || "2026-10-31", query.get("period") || "month");
    const filtered = rows.filter(row => !query.get("group") || query.get("group") === "ALL" || dealGroup(row.pathway) === query.get("group"));
    const bucket = query.get("bucket");
    const items = filtered.filter(row => bucket === "completed" ? row.stage === "Completed" : bucket === "attention" ? row.needsAttention : true);
    return route.fulfill({ json: { items, total: items.length, pages: 1, page: 1, counts: { IN_PROGRESS: 1, COMPLETED: 2 }, dashboard: { range, summary: summarizeDeals(filtered, range), owners: [{ id: "sample-owner", name: "Sample Manager" }], scope: "Your accessible records", taxes: { available: true, message: "All tax-ledger records for selected dates", summary: summarizeTax([{ id: "tax-1", status: "ACTIVE", snapshot: tax }]) } } } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const signedIn = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await signedIn).ok()).toBe(true);
  const live = await page.request.get("/api/crm/v1/deal-drafts?view=workbench&dashboard=1&period=day&date=2026-10-31&status=CURRENT");
  expect(live.status()).toBe(200);
  await page.goto("/crm-next/deals");
  await expect(page.getByRole("region", { name: "Deal overview" })).toBeVisible();
  await page.getByLabel("Report date", { exact: true }).fill("2026-10-31");
  await expect(page.getByLabel("Report date", { exact: true })).toHaveValue("2026-10-31");
  await page.getByRole("button", { name: /Needs attention/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "D-working" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "D-sale" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Period summary", exact: true }).click();
  for (const [value, label] of [["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"]]) {
    await page.getByRole("combobox", { name: "Reporting period", exact: true }).selectOption(value);
    await expect(page.getByRole("heading", { name: `${label} summary`, exact: true })).toBeVisible();
  }
  const report = page.getByRole("region", { name: "Period summary", exact: true });
  await expect(report).toContainText("$687.50");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export summary CSV", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("deal-summary-month-2026-10-01.csv");
  await page.getByRole("button", { name: "View 2 completed records", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "D-working" })).toHaveCount(0);
  await page.getByRole("tab", { name: /^Current deals/ }).click();
  await page.getByRole("combobox", { name: "Pathway group", exact: true }).selectOption("LEASING");
  await expect(page.getByRole("row").filter({ hasText: "D-working" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "D-sale" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Pathway group", exact: true })).toHaveValue("LEASING");
  await expect(page.getByRole("row").filter({ hasText: "D-working" })).toBeVisible();
  await page.screenshot({ path: "C:/Users/timem/Documents/Codex/2026-10-31/referenced-chatgpt-conversation-this-is-an/work/deal-dashboard-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole("region", { name: "Saved deals library" }).evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

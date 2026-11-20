import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test("staff can recover a punch, report an interrupted meal, and review a prior card", async ({ page }) => {
  test.skip(process.env.RUN_TIME_CARD_PREVIEW !== "1", "Requires isolated time-card test records");
  test.setTimeout(120_000);
  const schema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  expect(schema).toMatch(/^time_card_it_/);
  const login = async (email: string) => {
    const response = await page.request.post("/api/auth/login", { data: { email, password: "TimeCardTest123!" } });
    expect(response.ok()).toBe(true);
  };
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside isolated time-card test" } }));
  await login("time-preview-staff@example.test");
  await page.goto("/time-attendance");
  const card = page.getByRole("region", { name: "Time and Attendance CCC console" });
  await expect(card.getByRole("heading", { name: "Time Card", exact: true })).toBeVisible();
  const tools = card.getByRole("navigation", { name: "Time card tools" });
  for (const [label, section] of [
    ["Request correction", "correction-request"],
    ["Confirm or dispute card", "card-attestation"],
    ["Request time off", "time-off-request"],
    ["View punches", "punch-timeline"],
  ]) {
    await tools.getByRole("link", { name: label, exact: true }).click();
    const panel = page.locator(`#${section}`);
    await expect(panel).toHaveAttribute("open", "");
    await panel.locator("summary").click();
    await expect(panel).not.toHaveAttribute("open", "");
    await tools.getByRole("link", { name: label, exact: true }).click();
    await expect(panel).toHaveAttribute("open", "");
  }
  await tools.getByRole("link", { name: "View pay periods", exact: true }).click();
  await expect(page.getByRole("region", { name: "My pay periods" })).toBeVisible();
  await page.getByText("Assigned meal policy", { exact: true }).click();
  await expect(page.getByText("60 minutes · Unpaid", { exact: true })).toBeVisible();
  await page.goto("/time-attendance");
  const punchRequests: unknown[] = [];
  await page.route("**/api/time-attendance/capture", async route => {
    if (route.request().method() !== "POST" || route.request().postDataJSON().commandType !== "CLOCK_IN") return route.continue();
    punchRequests.push(route.request().postDataJSON());
    if (punchRequests.length > 1) return route.continue();
    const accepted = await route.fetch();
    expect(accepted.status()).toBe(201);
    await route.abort();
  });
  await card.getByRole("button", { name: "Clock in", exact: true }).click();
  await expect(card.getByRole("button", { name: "Retry same punch" })).toBeVisible();
  const retried = page.waitForResponse(response => response.url().endsWith("/api/time-attendance/capture") && response.request().method() === "POST");
  await card.getByRole("button", { name: "Retry same punch" }).click();
  expect(await (await retried).json()).toMatchObject({ duplicate: true });
  await expect(card.getByRole("button", { name: "Clock out", exact: true })).toBeEnabled();
  expect(punchRequests).toHaveLength(2);
  expect(punchRequests[0]).toEqual(punchRequests[1]);
  await card.getByRole("button", { name: "Start meal", exact: true }).click();
  await expect(card.getByRole("button", { name: "Clock out", exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: "End meal", exact: true }).click();
  const endMeal = page.waitForResponse(response => response.url().endsWith("/api/time-attendance/capture") && response.request().method() === "POST");
  await card.getByRole("button", { name: "No, I worked or was interrupted", exact: true }).click();
  const accepted = await endMeal;
  expect(accepted.ok()).toBe(true);
  expect(accepted.request().postDataJSON()).toMatchObject({ commandType: "END_MEAL", completelyRelieved: false });
  await card.getByRole("button", { name: "Clock out", exact: true }).click();
  await expect(card.getByRole("button", { name: "Clock in", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/time-attendance?view=my-time&period=2026-11-02_2026-11-08");
  const history = page.getByRole("region", { name: "My pay periods" });
  await expect(history).toContainText("Version 2 · locked");
  await expect(history.getByRole("row", { name: /Nov 3/ })).toContainText("7h 30m");
  await expect(history.getByRole("link", { name: "Download daily totals" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Clock in", exact: true })).toHaveCount(0);
  await expect(card.getByText("Confirm or dispute card", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(history).toContainText("Version 2 · locked");
  await history.getByRole("link", { name: /Request correction for.*Nov 3/ }).click();
  const correction = page.locator("#correction-request");
  await expect(correction.getByLabel("Date", { exact: true })).toHaveValue("2026-11-03");
  await correction.getByLabel("What needs review?").selectOption("OTHER");
  await correction.getByLabel("Explain what happened").fill("Synthetic prior period correction for manager review.");
  await correction.getByRole("button", { name: /Submit.*correction/ }).click();
  await expect(correction).toContainText("submitted for manager review");
  await page.reload();
  await expect(page.getByText("Correction history", { exact: true }).first()).toBeVisible();
  await page.goto("/time-attendance?view=my-time");
  await correction.locator("summary").click();
  await correction.getByLabel("What needs review?").selectOption("MISSING_CLOCK_IN");
  const now = new Date();
  const testTime = `06:${String(now.getMinutes()).padStart(2, "0")}`;
  await correction.getByLabel("Start time", { exact: true }).fill(testTime);
  const managerCase = `Synthetic missing punch for manager review ${Date.now()}`;
  await correction.getByLabel("Explain what happened").fill(managerCase);
  await correction.getByRole("button", { name: /Submit.*correction/ }).click();
  await expect(correction).toContainText("submitted for manager review");
  await page.request.post("/api/auth/logout");
  await page.setViewportSize({ width: 1280, height: 900 });
  await login("time-preview-manager@example.test");
  await page.goto("/time-attendance?view=my-time&period=2026-11-02_2026-11-08");
  await expect(history.getByRole("row", { name: /Nov 3/ })).toHaveCount(0);
  await page.goto("/time-attendance?view=manager");
  await page.getByRole("navigation", { name: "Jump to time card section" }).getByRole("link", { name: "Operational health" }).click();
  await expect(page.locator("#operational-health")).toHaveAttribute("open", "");
  await expect(page.getByLabel("Review queue filter")).toBeVisible();
  await page.getByLabel("Search review queue").fill("impossible employee name");
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "0 shown" })).toBeVisible();
  await page.getByLabel("Search review queue").clear();
  await page.getByLabel("Review queue filter").selectOption("CORRECTION_REQUEST");
  const review = page.locator('[class*="managerReviewTableRow"]').filter({ hasText: managerCase });
  const nextManagerDecision = () => page.waitForResponse(response => response.url().endsWith("/api/time-attendance/manager-corrections") && response.request().method() === "POST");
  await review.getByRole("textbox", { name: /Reason/ }).fill("Verified the synthetic missing staff punch.");
  const approvalResponse = nextManagerDecision();
  await review.getByRole("button", { name: "Record decision" }).click();
  const approved = await approvalResponse;
  expect(approved.ok()).toBe(true);
  expect(await approved.json()).toMatchObject({ request: { status: "APPROVED" } });
  await expect(review).toContainText("Approved · ready to apply", { timeout: 15_000 });
  await page.reload();
  await expect(review.getByRole("combobox", { name: /Decision for/ })).toHaveValue("APPLY");
  await review.getByRole("textbox", { name: /Reason/ }).fill("Apply the verified synthetic replacement punch.");
  const applyResponse = nextManagerDecision();
  await review.getByRole("button", { name: "Record decision" }).click();
  const applied = await applyResponse;
  const result = await applied.json();
  expect(applied.ok(), result.error).toBe(true);
  expect(result.request.status).toBe("APPLIED");
  const database = new PrismaClient();
  try {
    const appliedCommand = await database.enterpriseCommandLedger.findFirst({
      where: { subjectId: result.request.id, commandType: "APPLY_TIME_CARD_CORRECTION" },
      include: { domainEvents: true, auditEvents: true, timeAttendanceEvents: true }
    });
    expect(appliedCommand).toMatchObject({
      status: "SUCCEEDED",
      domainEvents: [expect.objectContaining({ eventType: "TIME_CARD_CORRECTION_APPLIED" })],
      auditEvents: [expect.objectContaining({ eventType: "TIME_CARD_CORRECTION_APPLIED" })],
      timeAttendanceEvents: [expect.objectContaining({ eventType: "MANAGER_CORRECTION" })],
    });
  } finally {
    await database.$disconnect();
  }
  await expect(review).toHaveCount(0, { timeout: 15_000 });
  await page.reload();
  await expect(review).toHaveCount(0);
});

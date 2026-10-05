import { expect, test, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { resetDailyWorkflowState, disconnectDailyWorkflowDatabase } from "./daily-workflow.setup";
import { createPrismaAuthStore } from "@/server/auth/store";
import { processReportingSchedules, reportingDelivery } from "@/server/reporting/schedule-service";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

test.beforeAll(async () => {
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get("schema");
  if (!schema?.startsWith("dispatch_board_e2e_")) throw new Error("Reporting tests require an isolated e2e schema.");
  await resetDailyWorkflowState();
});
test.afterAll(disconnectDailyWorkflowDatabase);
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("dispatch123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(manager-workspace|tasks)/);
  await page.evaluate(async () => {
    const rhythm = await (await fetch("/api/coo-workbook/rhythm")).json();
    const response = await fetch("/api/coo-workbook/rhythm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED", reason: "Isolated reporting validation session; today's operational plan is not being started.", sourcePath: "/reports" }) });
    if (!response.ok) throw new Error("Reporting fixture could not record the operating rhythm explanation.");
  });
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  const dismiss = page.getByRole("button", { name: "Dismiss reminder", exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
}
async function command(page: Page, body: Record<string, unknown>) {
  return page.evaluate(async input => {
    const result = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    return { status: result.status, data: await result.json() };
  }, body);
}
async function resolveNavigationFixtureReminder(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Operating rhythm reminder", exact: true });
  try { await dialog.waitFor({ state: "visible", timeout: 1500 }); } catch { return; }
  await dialog.getByRole("textbox").fill("Isolated navigation test: reviewing the reporting console, not starting an operational workday.");
  await dialog.getByRole("button", { name: "Save reason", exact: true }).click();
  await expect(dialog).toBeHidden();
}

test("Command Center home navigation launches Reports on desktop and phone", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  await page.goto("/sales-documents");
  await expect(page.getByRole("heading", { name: "Sales Documents", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Command Center Home", exact: true }).click();
  await expect(page).toHaveURL(/\/command-center$/);
  await expect(page.getByRole("heading", { name: "Command Control Center", exact: true })).toBeVisible();
  await resolveNavigationFixtureReminder(page);
  const consoles = page.locator(".ccc-home-console-grid");
  await expect(consoles.locator('a[href="/command-center"]')).toHaveCount(0);
  await page.screenshot({ path: "test-results/reporting-command-center-desktop.png", fullPage: true });
  await consoles.getByRole("link", { name: /^Reports/ }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("button", { name: "Team Reports", exact: true })).toBeVisible();
  await resolveNavigationFixtureReminder(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Command Center Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Command Control Center", exact: true })).toBeVisible();
  await resolveNavigationFixtureReminder(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/reporting-command-center-mobile.png", fullPage: true });
  await consoles.getByRole("link", { name: /^Reports/ }).click();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
});

test("Inventory sidebar Reports stays in the Inventory Console", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto("/vehicles/outside-vendors");
    await resolveNavigationFixtureReminder(page);
    if (width === 390) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const reports = page.locator(".console-sidebar-navigation").getByRole("link", { name: "Reports", exact: true });
    await expect(reports).toHaveAttribute("href", "/vehicles/reports");
    await reports.click();
    await expect(page).toHaveURL(/\/vehicles\/reports$/);
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByText("Inventory Console · R10 governed reporting", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Inventory scorecard", exact: true })).toHaveCount(0);
  }
});

test("Dispatch Board sidebar Reports opens today's reporting console, not the legacy scorecard", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto("/board");
    await resolveNavigationFixtureReminder(page);
    if (width === 390) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const reports = page.locator(".console-sidebar-navigation").getByRole("link", { name: "Reports", exact: true });
    await expect(reports).toHaveAttribute("href", /^\/reports(?:\?date=[^&]+)?$/);
    await reports.click();
    await expect(page).toHaveURL(/\/reports(?:\?[^#]*)?$/);
    expect(new URL(page.url()).pathname).toBe("/reports");
    expect(new URL(page.url()).searchParams.get("scope")).not.toBe("inventory");
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "My Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Team Reports", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Library", exact: true })).toBeVisible();
    await expect(page.getByText("INVENTORY CONSOLE · R10 GOVERNED REPORTING", { exact: true })).toHaveCount(0);
  }
  await page.goto("/reports?scope=inventory");
  await expect(page).toHaveURL(/\/vehicles\/reports$/);
  await expect(page.getByRole("link", { name: "Inventory scorecard", exact: true })).toHaveCount(0);
  await expect(page.getByText("Inventory Console · R10 governed reporting", { exact: true })).toBeVisible();
});

test("weekly submissions are idempotent, independently reviewed, and immutable", async ({ page, browser }) => {
  await login(page, "jordan.sales@local.test");
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await expect(page.getByLabel("Context", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(page.getByText(/through .* · weekly/)).toBeVisible();
  await page.getByLabel("Covered date").fill("2026-09-20");
  await expect(page.getByText(/2026-09-14 through/)).toBeVisible();
  await expect(page.getByLabel("Context", { exact: true })).toBeEnabled();
  await page.getByLabel("Context", { exact: true }).fill("Customer follow-ups recorded for the week.");
  await page.getByLabel("Next priorities", { exact: true }).fill("Confirm outstanding appointments.");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const prepared = await (await page.request.get("/api/reports?view=prepare&date=2026-09-20&cadence=WEEKLY")).json();
  const input = { action: "submit", date: "2026-09-20", cadence: "WEEKLY", context: "Customer follow-ups recorded for the week.", priorities: "Confirm outstanding appointments.", accuracyConfirmed: true, expectedVersion: prepared.draftVersion, idempotencyKey: "reporting_e2e_weekly_1" };
  const results = await Promise.all([command(page, input), command(page, input)]);
  expect(results.map(item => item.status)).toEqual([200, 200]);
  expect(results[0].data.id).toBe(results[1].data.id);
  expect((await command(page, { ...input, context: "Changed text" })).status).toBe(409);
  const id = results[0].data.id;
  const original = await prisma.reportingRevision.findUniqueOrThrow({ where: { id } });
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await login(managerPage, "morgan.manager@local.test");
  const detail = await (await managerPage.request.get(`/api/reports?view=revision&id=${id}`)).json();
  expect(detail.canReview).toBe(true);
  const review = { action: "review", revisionId: id, reviewAction: "APPROVE", comment: "Evidence reviewed.", expectedVersion: detail.seriesVersion };
  const reviews = await Promise.all([command(managerPage, review), command(managerPage, review)]);
  expect(reviews.map(item => item.status).sort()).toEqual([200, 409]);
  expect((await prisma.reportingRevision.findUniqueOrThrow({ where: { id } })).content).toEqual(original.content);
  expect(await prisma.reportingReview.count({ where: { revisionId: id } })).toBe(1);
  const series = await prisma.reportingSeries.findUniqueOrThrow({ where: { id: original.seriesId } });
  expect(series.acceptedRevisionId).toBe(id);
  await managerPage.setViewportSize({ width: 1440, height: 960 });
  await managerPage.getByRole("button", { name: "Team Reports", exact: true }).click();
  await managerPage.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(managerPage.getByText("APPROVED", { exact: true })).toBeVisible();
  await managerPage.screenshot({ path: "test-results/reporting-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Report library" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/reporting-mobile.png", fullPage: true });
  const denied = await page.request.get(`/api/reports?view=prepare&subject=${series.subjectUserId === prepared.subject.id ? series.subjectUserId + "-other" : series.subjectUserId}`);
  expect(denied.status()).toBe(403);
  await managerContext.close();
});

test("periods reconcile frozen carryover links, reopened work, and missing later observations", async ({ page }) => {
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  await login(page, staff.email);
  let parent: string | null = null;
  const ids: string[] = [];
  for (const [index, status] of ["NOT_STARTED", "COMPLETED", "BLOCKED"].entries()) {
    const date = `2026-08-${24 + index}`;
    const board = await prisma.boardDay.create({ data: { date: new Date(`${date}T00:00:00Z`) } });
    await prisma.staffDay.create({ data: { boardDayId: board.id, userId: staff.id, startAcknowledgedAt: new Date() } });
    const task = await prisma.task.create({ data: { boardDayId: board.id, assignedUserId: staff.id, title: "Carryover lineage fixture", sourceType: "STAFF", workflowArea: "SALES", dueAt: new Date(`${date}T18:00:00Z`), status: status as "NOT_STARTED" | "COMPLETED" | "BLOCKED", blockerReason: status === "BLOCKED" ? "Customer requested a follow-up." : null, carryoverSourceTaskId: parent } });
    ids.push(task.id);
    if (!index) await prisma.task.create({ data: { boardDayId: board.id, assignedUserId: staff.id, title: "Still outstanding without a later observation", sourceType: "STAFF", workflowArea: "SALES", dueAt: new Date(`${date}T18:00:00Z`) } });
    const daily = await (await page.request.get(`/api/reports?view=prepare&date=${date}&cadence=DAILY`)).json();
    expect((await command(page, { action: "submit", date, cadence: "DAILY", context: "", priorities: "", accuracyConfirmed: true, expectedVersion: daily.draftVersion, idempotencyKey: `lineage_daily_submission_${index}` })).status).toBe(200);
    parent = task.id;
  }
  for (const cadence of ["WEEKLY", "MONTHLY"]) {
    const prepared = await (await page.request.get(`/api/reports?view=prepare&date=2026-08-26&cadence=${cadence}`)).json();
    expect(prepared.content.completed).toHaveLength(0);
    expect(prepared.content.carryover).toHaveLength(2);
    expect(prepared.content.reopened.map((row: { id: string }) => row.id)).toEqual([`task:${ids[2]}`]);
    expect(prepared.content.sourceCoverage).toContain("0 task identities");
  }
  const weekly = await (await page.request.get("/api/reports?view=prepare&date=2026-08-26&cadence=WEEKLY")).json();
  const saved = await command(page, { action: "submit", date: "2026-08-26", cadence: "WEEKLY", context: "", priorities: "", accuracyConfirmed: true, expectedVersion: weekly.draftVersion, idempotencyKey: "lineage_weekly_submission" });
  expect(saved.status).toBe(200);
  const original = await prisma.reportingRevision.findUniqueOrThrow({ where: { id: saved.data.id } });
  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { carryoverSourceTaskId: null, status: "COMPLETED", title: "Changed after submission" } });
  const after = await (await page.request.get("/api/reports?view=prepare&date=2026-08-26&cadence=WEEKLY")).json();
  expect(after.content.carryover).toEqual(weekly.content.carryover);
  expect((await prisma.reportingRevision.findUniqueOrThrow({ where: { id: saved.data.id } })).content).toEqual(original.content);
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await expect(page.getByLabel("Context", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await page.getByLabel("Covered date").fill("2026-08-26");
  await expect(page.getByRole("heading", { name: "Reopened work" })).toBeVisible();
  await expect(page.getByText("Observed 2026-08-24", { exact: true })).toBeVisible();
  const dismiss = page.getByRole("button", { name: "Dismiss reminder", exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  expect(await page.locator("footer").filter({ has: page.getByRole("button", { name: "Submit report", exact: true }) }).evaluate(element => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: "test-results/reporting-lineage-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/reporting-lineage-mobile.png", fullPage: true });
});

test("controlled outputs return usable identifiers and scheduling stays gated", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  const output = await command(page, { action: "export", definitionId: "operations", cadence: "DAILY", reason: "Internal operational review for reporting validation.", idempotencyKey: `reporting_e2e_export_${Date.now()}` });
  expect(output.status).toBe(200);
  expect(typeof output.data.id).toBe("string");
  const csv = await page.request.get(`/api/reports/exports/${output.data.id}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const schedule = await command(page, { action: "schedule", definitionId: "operations", cadence: "WEEKLY" });
  expect(schedule.status).toBe(200);
  expect(schedule.data.enabled).toBe(false);
  expect((await command(page, { action: "toggle-schedule", id: schedule.data.id, enabled: true, expectedVersion: schedule.data.version })).status).toBe(403);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Daily operations" })).toBeVisible();
});

test("daily submission shares the legacy handoff and retains accepted history through correction", async ({ page, browser }) => {
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const board = await prisma.boardDay.create({ data: { date: new Date("2026-09-22T00:00:00Z") } });
  const day = await prisma.staffDay.create({ data: { boardDayId: board.id, userId: staff.id, startAcknowledgedAt: new Date() } });
  const task = await prisma.task.create({ data: { boardDayId: board.id, assignedUserId: staff.id, title: "Reporting completed customer call", sourceType: "STAFF", workflowArea: "SALES", dueAt: new Date("2026-09-22T18:00:00Z"), status: "COMPLETED" } });
  await login(page, staff.email);
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await expect(page.getByLabel("Context", { exact: true })).toBeEnabled();
  await page.getByLabel("Covered date").fill("2026-09-22");
  await expect(page.getByText(/2026-09-22 through/)).toBeVisible();
  await page.getByLabel("Context", { exact: true }).fill("Completed the customer callback.");
  await page.getByLabel("I confirm this report is accurate.").check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit report", exact: true }).click();
  await expect(page.getByText("Report submitted. Your submission is saved in history.")).toBeVisible();
  await expect(page.getByText(task.title)).toBeVisible();
  expect(await prisma.staffDailyReport.count({ where: { staffDayId: day.id } })).toBe(1);
  const legacy = await prisma.staffDailyReport.findFirstOrThrow({ where: { staffDayId: day.id } });
  const original = await prisma.reportingRevision.findUniqueOrThrow({ where: { legacyDailyId: legacy.id } });
  await expect(prisma.reportingRevision.update({ where: { id: original.id }, data: { submittedAt: new Date() } })).rejects.toThrow("immutable");
  await expect(prisma.staffDailyReport.update({ where: { id: legacy.id }, data: { additionalContext: "Silent mutation" } })).rejects.toThrow("immutable");
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await login(managerPage, "morgan.manager@local.test");
  const detail = await (await managerPage.request.get(`/api/reports?view=revision&id=${original.id}`)).json();
  expect((await command(managerPage, { action: "review", revisionId: original.id, reviewAction: "APPROVE", comment: "Daily evidence checked.", expectedVersion: detail.seriesVersion })).status).toBe(200);
  const prepared = await (await page.request.get("/api/reports?view=prepare&date=2026-09-22&cadence=DAILY")).json();
  const correction = { action: "submit", date: "2026-09-22", cadence: "DAILY", context: "Correction: callback was with the customer's representative.", priorities: "", accuracyConfirmed: true, expectedVersion: prepared.draftVersion, idempotencyKey: "reporting_daily_correction_1" };
  const corrected = await command(page, correction);
  expect(corrected.status).toBe(200);
  expect((await command(page, correction)).data.id).toBe(corrected.data.id);
  const changed = await (await managerPage.request.get(`/api/reports?view=revision&id=${corrected.data.id}`)).json();
  expect((await command(managerPage, { action: "review", revisionId: changed.id, reviewAction: "RETURN", comment: "Please clarify who confirmed the call.", expectedVersion: changed.seriesVersion })).status).toBe(200);
  const series = await prisma.reportingSeries.findUniqueOrThrow({ where: { id: original.seriesId } });
  expect(series.acceptedRevisionId).toBe(original.id);
  expect(await prisma.staffDailyReport.count({ where: { staffDayId: day.id } })).toBe(2);
  await prisma.task.update({ where: { id: task.id }, data: { title: "Edited after submission" } });
  const frozen = await (await page.request.get(`/api/reports?view=revision&id=${original.id}`)).json();
  expect(JSON.stringify(frozen.content)).toContain(task.title);
  expect(JSON.stringify(frozen.content)).not.toContain("Edited after submission");
  const history = await (await page.request.get("/api/reports?view=history&cadence=DAILY&from=2026-09-22&to=2026-09-22")).json();
  expect(history.rows[0].revisionId).toBe(original.id);
  expect(history.rows[0].status).toBe("NEEDS_REVISION");
  await managerContext.close();
});

test("monthly reports retain one calendar identity and reject stale drafts", async ({ page }) => {
  await login(page, "jordan.sales@local.test");
  const input = { action: "save", date: "2026-08-17", cadence: "MONTHLY", context: "August operational summary.", priorities: "September follow-ups.", expectedVersion: 0 };
  expect((await command(page, input)).status).toBe(200);
  expect((await command(page, { ...input, date: "2026-08-31" })).status).toBe(409);
  const submitted = await command(page, { ...input, action: "submit", date: "2026-08-31", expectedVersion: 1, accuracyConfirmed: true, idempotencyKey: "reporting_monthly_e2e_1" });
  expect(submitted.status).toBe(200);
  const history = await (await page.request.get("/api/reports?view=history&cadence=MONTHLY&from=2026-08-01&to=2026-08-31")).json();
  expect(history.rows).toHaveLength(1);
  expect(history.rows[0].periodStart).toBe("2026-08-01");
  expect(history.rows[0].revisionId).toBe(submitted.data.id);
});

test("concurrent schedule workers publish once and exhausted runs remain visible", async () => {
  const actor = await createPrismaAuthStore(prisma).findUserByEmail("morgan.manager@local.test");
  if (!actor) throw new Error("Manager fixture is missing.");
  const prior = process.env.REPORTING_SCHEDULES_ENABLED;
  process.env.REPORTING_SCHEDULES_ENABLED = "true";
  const calendar = await prisma.reportingCalendarPolicy.create({ data: { organizationId: INITIAL_ORGANIZATION.id, version: 99, status: "ACTIVE", createdByUserId: actor.id, config: { ...draftReportCalendar, version: "report-calendar/test-99" } } });
  try {
    const schedule = await prisma.reportingSchedule.create({ data: { userId: actor.id, definitionId: "appointments", cadence: "DAILY", timezone: "America/Chicago", enabled: true, nextRunAt: new Date("2026-09-23T05:00:00Z") } });
    const now = new Date("2026-09-24T05:00:00Z");
    const results = await Promise.all([processReportingSchedules(actor, now), processReportingSchedules(actor, now)]);
    expect(results.reduce((sum, item) => sum + item.succeeded, 0)).toBe(1);
    const jobs = await prisma.reportingJob.findMany({ where: { scheduleId: schedule.id } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe("SUCCEEDED");
    expect(await reportingDelivery(actor, jobs[0].id)).toBeTruthy();
    await expect(reportingDelivery({ ...actor, isActive: false }, jobs[0].id)).rejects.toThrow("unavailable");
    await prisma.reportingSchedule.update({ where: { id: schedule.id }, data: { enabled: false } });
    const failed = await prisma.reportingSchedule.create({ data: { userId: actor.id, definitionId: "operations", cadence: "DAILY", timezone: "America/Chicago", enabled: true, nextRunAt: new Date("2026-09-23T05:00:00Z") } });
    await prisma.reportingJob.create({ data: { scheduleId: failed.id, runKey: `${failed.id}:2026-09-23T05:00:00.000Z`, status: "FAILED", attempts: 4 } });
    expect((await processReportingSchedules(actor, now)).failed).toBe(1);
    expect((await prisma.reportingJob.findFirstOrThrow({ where: { scheduleId: failed.id } })).status).toBe("DEAD_LETTER");
    await prisma.reportingSchedule.update({ where: { id: failed.id }, data: { enabled: false } });
  } finally {
    await prisma.reportingCalendarPolicy.delete({ where: { id: calendar.id } });
    if (prior === undefined) delete process.env.REPORTING_SCHEDULES_ENABLED; else process.env.REPORTING_SCHEDULES_ENABLED = prior;
  }
});

import { expect, test, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { resetDailyWorkflowState, disconnectDailyWorkflowDatabase } from "./daily-workflow.setup";
import { createPrismaAuthStore } from "@/server/auth/store";
import { processReportingSchedules, reportingDelivery, recoverReportingJob } from "@/server/reporting/schedule-service";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { generateReportingExpectations } from "@/server/reporting/calendar-service";

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
  await expect(page).toHaveURL(/\/reports(?:\?[^#]*)?$/);
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

test("report filters survive opening a source record, returning and reloading", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  const date = await page.getByLabel("Covered date", { exact: true }).inputValue();
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const board = await prisma.boardDay.upsert({ where: { date: new Date(`${date}T00:00:00Z`) }, create: { date: new Date(`${date}T00:00:00Z`) }, update: {} });
  const task = await prisma.task.create({ data: { boardDayId: board.id, assignedUserId: staff.id, title: "Report return context fixture", sourceType: "STAFF", workflowArea: "SALES", dueAt: new Date(`${date}T18:00:00Z`) } });
  await page.getByRole("button", { name: "Refresh reports", exact: true }).click();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await page.getByRole("textbox", { name: "Search report records" }).fill(task.title);
  await expect.poll(() => new URL(page.url()).searchParams.get("query")).toBe(task.title);
  await resolveNavigationFixtureReminder(page);
  await page.getByRole("link", { name: `Open ${task.title}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}`));
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Search report records" })).toHaveValue(task.title);
  await expect(page.getByRole("button", { name: "Weekly", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Search report records" })).toHaveValue(task.title);
  await expect(page.getByRole("button", { name: "Weekly", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("team coverage reconciles required submissions and denies staff access", async ({ page }) => {
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  const other = await prisma.user.findFirstOrThrow({ where: { isActive: true, id: { notIn: [staff.id, manager.id] } }, orderBy: { id: "asc" } });
  await prisma.reportingExpectation.deleteMany({ where: { organizationId: INITIAL_ORGANIZATION.id, cadence: "WEEKLY", periodStart: "2026-05-11" } });
  await prisma.reportingExpectation.createMany({ data: [staff.id, other.id].map(subjectUserId => ({ organizationId: INITIAL_ORGANIZATION.id, subjectUserId, reviewerUserId: manager.id, cadence: "WEEKLY", periodStart: "2026-05-11", periodEnd: "2026-05-18", dueAt: new Date("2026-05-18T15:00:00Z"), reviewBy: new Date("2026-05-19T23:00:00Z"), calendarVersion: draftReportCalendar.version })), skipDuplicates: true });
  await login(page, staff.email);
  expect((await page.request.get("/api/reports?view=coverage&date=2026-05-13&cadence=WEEKLY")).status()).toBe(403);
  const prepared = await (await page.request.get("/api/reports?view=prepare&date=2026-05-13&cadence=WEEKLY")).json();
  expect((await command(page, { action: "submit", date: "2026-05-13", cadence: "WEEKLY", context: "Coverage fixture", priorities: "", expectedVersion: prepared.draftVersion, accuracyConfirmed: true, idempotencyKey: "reporting_coverage_weekly_fixture" })).status).toBe(200);
  await page.context().clearCookies();
  await login(page, manager.email);
  const result = await (await page.request.get("/api/reports?view=coverage&date=2026-05-13&cadence=WEEKLY")).json();
  expect(result.summary).toMatchObject({ required: 2, submitted: 1, missing: 1, submissionRate: { numerator: 1, denominator: 2, value: 50 } });
  await page.goto("/reports?tab=Team+Reports&date=2026-05-13&cadence=WEEKLY");
  await resolveNavigationFixtureReminder(page);
  const panel = page.getByRole("region", { name: "Team reporting coverage" });
  await expect(panel.getByText("Submission coverage: 50.0% (1/2 required reports)", { exact: true })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await panel.scrollIntoViewIfNeeded();
    const reminder = page.getByRole("button", { name: "Dismiss reminder", exact: true });
    if (await reminder.isVisible()) await reminder.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/reporting-coverage-${width}.png` });
  }
  await panel.getByRole("button", { name: `Open ${staff.name} reporting history`, exact: true }).click();
  await expect(page.getByLabel("Person", { exact: true })).toHaveValue(staff.id);
  await expect(page.getByLabel("Archive from", { exact: true })).toHaveValue("2026-05-11");
  await expect(page.getByLabel("Archive through", { exact: true })).toHaveValue("2026-05-17");
});

test("calendar preview shows deadline changes without activating obligations", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  await prisma.reportingAssignment.deleteMany({ where: { subjectUserId: staff.id, cadence: "DAILY", validFrom: "2026-10-05" } });
  const assigned = await command(page, { action: "assignment", subjectUserId: staff.id, reviewerUserId: manager.id, cadence: "DAILY", validFrom: "2026-10-05", validTo: "2026-10-09" });
  expect(assigned.status).toBe(200);
  const before = await prisma.reportingExpectation.count();
  const activeBefore = await prisma.reportingCalendarPolicy.count({ where: { status: "ACTIVE" } });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.getByRole("button", { name: "Team Reports", exact: true }).click();
    await resolveNavigationFixtureReminder(page);
    const details = page.locator("details").filter({ hasText: "Reporting calendar" });
    if (await details.getAttribute("open") === null) await details.locator("summary").click();
    const panel = page.getByRole("region", { name: "Reporting calendar policy" });
    await panel.getByLabel("Preview from", { exact: true }).fill("2026-10-05");
    await panel.getByLabel("Preview through", { exact: true }).fill("2026-10-09");
    await panel.getByLabel("Deadline minute", { exact: true }).fill("1200");
    await panel.getByRole("button", { name: "Preview changes", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("5 projected periods");
    await expect(panel.getByRole("status")).toContainText("5 affected");
    await expect(panel.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const reminder = page.getByRole("button", { name: "Dismiss reminder", exact: true });
    if (await reminder.isVisible()) await reminder.click();
    await panel.getByRole("button", { name: "Preview changes", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/reporting-calendar-preview-${width}.png` });
  }
  expect(await prisma.reportingExpectation.count()).toBe(before);
  expect(await prisma.reportingCalendarPolicy.count({ where: { status: "ACTIVE" } })).toBe(activeBefore);
});

test("legacy daily archive retrieves every page without changing frozen submissions", async ({ page }) => {
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const board = await prisma.boardDay.create({ data: { date: new Date("2026-06-01T00:00:00Z") } });
  const day = await prisma.staffDay.create({ data: { boardDayId: board.id, userId: staff.id } });
  await prisma.staffDailyReport.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ staffDayId: day.id, version: index + 1, sourceSnapshot: { fixture: index, completedTasks: [], carryover: [] }, accuracyConfirmed: true, submittedByUserId: staff.id, submittedAt: new Date("2026-06-02T00:00:00Z") })) });
  const before = await prisma.staffDailyReport.findMany({ where: { staffDayId: day.id }, orderBy: { version: "asc" } });
  await login(page, staff.email);
  const query = "view=history&cadence=DAILY&from=2026-06-01&to=2026-06-01";
  const first = await (await page.request.get(`/api/reports?${query}`)).json();
  expect(first.legacy).toHaveLength(50); expect(first.nextCursor).toBeTruthy();
  const second = await (await page.request.get(`/api/reports?${query}&cursor=${first.nextCursor}`)).json();
  expect(second.legacy).toHaveLength(5); expect(second.nextCursor).toBeNull();
  expect(new Set([...first.legacy, ...second.legacy].map((row: { id: string }) => row.id)).size).toBe(55);
  const changed = await page.request.get(`/api/reports?view=history&cadence=DAILY&from=2026-06-01&to=2026-06-02&cursor=${first.nextCursor}`);
  expect(changed.status()).toBe(422);
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await resolveNavigationFixtureReminder(page);
  await page.getByLabel("Archive from", { exact: true }).fill("2026-06-01");
  await page.getByLabel("Archive through", { exact: true }).fill("2026-06-01");
  await expect(page.getByRole("button", { name: `Open ${staff.name} 2026-06-01`, exact: true })).toHaveCount(50);
  await page.getByRole("button", { name: "Load older reports", exact: true }).click();
  await expect(page.getByRole("button", { name: `Open ${staff.name} 2026-06-01`, exact: true })).toHaveCount(55);
  expect(await prisma.staffDailyReport.findMany({ where: { staffDayId: day.id }, orderBy: { version: "asc" } })).toEqual(before);
});

test("interrupted autosave retains input and recovers a lost acknowledgement", async ({ page }) => {
  await login(page, "jordan.sales@local.test");
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await page.getByLabel("Covered date", { exact: true }).fill("2026-07-14");
  await resolveNavigationFixtureReminder(page);
  const context = page.getByLabel("Context", { exact: true });
  let failureMode = "before-write";
  await page.route("**/api/reports", async route => {
    const request = route.request();
    if (request.method() === "POST" && request.postDataJSON()?.action === "save") {
      if (failureMode === "before-write") { await route.abort(); return; }
      if (failureMode === "after-write") { failureMode = "none"; await route.fetch(); await route.abort(); return; }
    }
    await route.continue();
  });
  await context.fill("Interrupted draft must remain intact.");
  await expect(page.getByRole("button", { name: "Retry saving draft", exact: true })).toBeVisible();
  await expect(context).toHaveValue("Interrupted draft must remain intact.");
  failureMode = "none";
  await page.getByRole("button", { name: "Retry saving draft", exact: true }).click();
  await expect(page.locator("footer").getByRole("status")).toHaveText("Saved");
  failureMode = "after-write";
  await context.fill("Server saved this draft but its acknowledgement was lost.");
  await expect(page.locator("footer").getByRole("status")).toHaveText("Saved");
  await page.reload();
  await page.getByRole("button", { name: "My Reports", exact: true }).click();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await page.getByLabel("Covered date", { exact: true }).fill("2026-07-14");
  await expect(context).toHaveValue("Server saved this draft but its acknowledgement was lost.");
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

test("saved view favorites persist and cannot be changed by another person", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  await prisma.reportingSavedView.deleteMany({ where: { userId: manager.id, name: "Favorite operational view" } });
  const date = await page.getByLabel("Covered date", { exact: true }).inputValue();
  const saved = await command(page, { action: "save-view", definitionId: "operations", name: "Favorite operational view", date, cadence: "DAILY", query: "", metric: null });
  expect(saved.status).toBe(200);
  const preference = { action: "favorite-view", id: saved.data.id, favorite: true, expectedVersion: 0 };
  expect((await command(page, preference)).data.version).toBe(1);
  expect((await command(page, preference)).data.duplicate).toBe(true);
  expect((await command(page, { ...preference, favorite: false })).status).toBe(409);
  await page.goto("/reports?tab=Library");
  await expect(page.getByRole("button", { name: "Remove favorite Favorite operational view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove favorite Favorite operational view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await resolveNavigationFixtureReminder(page);
  await page.getByRole("button", { name: "Remove favorite Favorite operational view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Favorite Favorite operational view", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.context().clearCookies();
  await login(page, "jordan.sales@local.test");
  expect((await command(page, { ...preference, expectedVersion: 2 })).status).toBe(404);
});

test("submission rolls back completely when audit or outbox evidence fails", async ({ page }) => {
  await login(page, "jordan.sales@local.test");
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get("schema");
  if (!schema || !/^dispatch_board_e2e_[a-z0-9_]+$/.test(schema)) throw new Error("Failure injection requires an isolated schema.");
  const input = { date: "2026-03-17", cadence: "WEEKLY", context: "Draft must survive an evidence failure.", priorities: "", expectedVersion: 0 };
  expect((await command(page, { ...input, action: "save" })).status).toBe(200);
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const series = await prisma.reportingSeries.findFirstOrThrow({ where: { subjectUserId: staff.id, cadence: "WEEKLY", periodStart: "2026-03-16" } });
  const before = await prisma.enterpriseCommandLedger.count({ where: { domain: "REPORTING", commandType: "PERIOD_SUBMITTED" } });
  for (const [table, condition] of [
    ["EnterpriseAuditEvent", `NEW."domain" = 'REPORTING' AND NEW."eventType" = 'PERIOD_SUBMITTED'`],
    ["EnterpriseOutboxMessage", `EXISTS (SELECT 1 FROM "${schema}"."EnterpriseDomainEvent" WHERE "id" = NEW."domainEventId" AND "domain" = 'REPORTING' AND "eventType" = 'PERIOD_SUBMITTED')`],
  ]) {
    try {
      await prisma.$executeRawUnsafe(`CREATE FUNCTION "${schema}".reporting_test_evidence_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'Isolated reporting evidence failure'; END IF; RETURN NEW; END $$`);
      await prisma.$executeRawUnsafe(`CREATE TRIGGER reporting_test_evidence_failure BEFORE INSERT ON "${schema}"."${table}" FOR EACH ROW EXECUTE FUNCTION "${schema}".reporting_test_evidence_failure()`);
      expect((await command(page, { ...input, action: "submit", expectedVersion: series.version, accuracyConfirmed: true, idempotencyKey: `reporting_failure_${table}` })).status).toBe(503);
      const retained = await prisma.reportingSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(retained.version).toBe(series.version);
      expect(retained.draft).toEqual(series.draft);
      expect(await prisma.reportingRevision.count({ where: { seriesId: series.id } })).toBe(0);
      expect(await prisma.enterpriseCommandLedger.count({ where: { domain: "REPORTING", commandType: "PERIOD_SUBMITTED" } })).toBe(before);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS reporting_test_evidence_failure ON "${schema}"."${table}"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${schema}".reporting_test_evidence_failure()`);
    }
  }
  expect((await command(page, { ...input, action: "submit", expectedVersion: series.version, accuracyConfirmed: true, idempotencyKey: "reporting_evidence_failure_recovered" })).status).toBe(200);
  expect(await prisma.reportingRevision.count({ where: { seriesId: series.id } })).toBe(1);
});

test("bounded operational reporting reconciles counts under a 501-task fixture", async ({ page }) => {
  await login(page, "morgan.manager@local.test");
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const board = await prisma.boardDay.upsert({ where: { date: new Date("2026-04-01T00:00:00Z") }, create: { date: new Date("2026-04-01T00:00:00Z") }, update: {} });
  await prisma.task.createMany({ data: Array.from({ length: 501 }, (_, index) => ({ boardDayId: board.id, assignedUserId: staff.id, title: `Reporting load fixture ${index}`, sourceType: "STAFF" as const, workflowArea: "SALES" as const, dueAt: new Date("2026-04-01T18:00:00Z") })) });
  const start = performance.now();
  const response = await page.request.get("/api/reports?view=live&definition=operations");
  const result = await response.json();
  const elapsed = performance.now() - start;
  expect(response.status()).toBe(200);
  expect(result.rows).toHaveLength(500);
  expect(result.limitation).toContain("Limited to the first 500 records");
  const ids = new Set(result.rows.map((row: { id: string }) => row.id));
  for (const metric of result.metrics) {
    if (metric.unit === "COUNT") expect(metric.value).toBe(metric.rowIds.length);
    expect(metric.rowIds.every((id: string) => ids.has(id))).toBe(true);
  }
  console.log(JSON.stringify({ scenario: "reporting-load", insertedTasks: 501, concurrency: 1, elapsedMs: Math.round(elapsed), displayedRows: result.rows.length }));
  expect(elapsed).toBeLessThan(3000);
});

test("concurrent schedule workers publish once and exhausted runs remain visible", async () => {
  const actor = await createPrismaAuthStore(prisma).findUserByEmail("morgan.manager@local.test");
  if (!actor) throw new Error("Manager fixture is missing.");
  const prior = process.env.REPORTING_SCHEDULES_ENABLED;
  process.env.REPORTING_SCHEDULES_ENABLED = "true";
  const calendar = await prisma.reportingCalendarPolicy.create({ data: { organizationId: INITIAL_ORGANIZATION.id, version: 99, status: "ACTIVE", createdByUserId: actor.id, config: { ...draftReportCalendar, version: "report-calendar/test-99" } } });
  try {
    const schedule = await prisma.reportingSchedule.create({ data: { userId: actor.id, definitionId: "appointments", cadence: "DAILY", timezone: "America/Chicago", enabled: true, nextRunAt: new Date("2026-09-23T05:00:00Z") } });
    const now = new Date("2026-09-23T06:00:00Z");
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
    const stopped = await prisma.reportingJob.findFirstOrThrow({ where: { scheduleId: failed.id } });
    expect(stopped.status).toBe("DEAD_LETTER");
    const recovery = { id: stopped.id, expectedVersion: failed.version, reason: "Corrected the source definition after reviewing the stopped delivery." };
    await expect(recoverReportingJob({ ...actor, roles: ["Salesperson"] }, recovery)).rejects.toThrow("access");
    await expect(recoverReportingJob(actor, { ...recovery, reason: "Retry" })).rejects.toThrow("invalid");
    await expect(recoverReportingJob(actor, { ...recovery, expectedVersion: failed.version + 1 })).rejects.toThrow("changed");
    expect((await prisma.reportingJob.findUniqueOrThrow({ where: { id: stopped.id } })).status).toBe("DEAD_LETTER");
    await prisma.reportingSchedule.update({ where: { id: failed.id }, data: { definitionId: "appointments" } });
    const recoveries = await Promise.allSettled([recoverReportingJob(actor, recovery), recoverReportingJob(actor, recovery)]);
    expect(recoveries.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const recovered = await prisma.reportingJob.findUniqueOrThrow({ where: { id: stopped.id } });
    expect(recovered).toMatchObject({ status: "PENDING", attempts: 0, runKey: stopped.runKey });
    const audit = await prisma.enterpriseCommandLedger.findMany({ where: { subjectId: stopped.id, commandType: "SCHEDULE_RECOVERY_APPROVED" } });
    expect(audit).toHaveLength(1);
    expect(audit[0].resultSnapshot).toMatchObject({ priorStatus: "DEAD_LETTER", priorAttempts: 5, priorError: stopped.lastError });
    expect((await processReportingSchedules(actor, now)).succeeded).toBe(1);
    expect(await prisma.reportingJob.count({ where: { scheduleId: failed.id } })).toBe(1);
    await prisma.reportingSchedule.update({ where: { id: failed.id }, data: { enabled: false } });
  } finally {
    await prisma.reportingCalendarPolicy.delete({ where: { id: calendar.id } });
    if (prior === undefined) delete process.env.REPORTING_SCHEDULES_ENABLED; else process.env.REPORTING_SCHEDULES_ENABLED = prior;
  }
});

test("expectation generation rolls back the complete batch and retries without duplicates", async () => {
  const schema = new URL(process.env.DATABASE_URL!).searchParams.get("schema");
  if (!schema || !/^dispatch_board_e2e_[a-z0-9_]+$/.test(schema)) throw new Error("Failure injection requires an isolated schema.");
  const actor = await createPrismaAuthStore(prisma).findUserByEmail("morgan.manager@local.test");
  if (!actor) throw new Error("Manager fixture is missing.");
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const scope = { organizationId: INITIAL_ORGANIZATION.id, subjectUserId: staff.id, cadence: "DAILY", periodStart: { in: ["2026-02-02", "2026-02-03"] } };
  await prisma.reportingExpectation.deleteMany({ where: scope });
  const assignment = await prisma.reportingAssignment.create({ data: { organizationId: INITIAL_ORGANIZATION.id, subjectUserId: staff.id, reviewerUserId: actor.id, cadence: "DAILY", validFrom: "2026-02-02", validTo: "2026-02-03" } });
  const policy = await prisma.reportingCalendarPolicy.create({ data: { organizationId: INITIAL_ORGANIZATION.id, version: 100, status: "ACTIVE", createdByUserId: actor.id, config: { ...draftReportCalendar, version: "report-calendar/test-100" } } });
  const prior = process.env.REPORTING_EXPECTATIONS_ENABLED;
  process.env.REPORTING_EXPECTATIONS_ENABLED = "true";
  const before = await prisma.enterpriseCommandLedger.count({ where: { domain: "REPORTING", commandType: "EXPECTATION_GENERATED" } });
  try {
    await prisma.$executeRawUnsafe(`CREATE FUNCTION "${schema}".reporting_generation_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."domain" = 'REPORTING' AND NEW."eventType" = 'EXPECTATION_GENERATED' AND NEW."subjectId" LIKE '%:2026-02-03' THEN RAISE EXCEPTION 'Isolated expectation audit failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reporting_generation_failure BEFORE INSERT ON "${schema}"."EnterpriseAuditEvent" FOR EACH ROW EXECUTE FUNCTION "${schema}".reporting_generation_failure()`);
    await expect(generateReportingExpectations(actor, "2026-02-02", "2026-02-03")).rejects.toThrow();
    expect(await prisma.reportingExpectation.count({ where: scope })).toBe(0);
    expect(await prisma.enterpriseCommandLedger.count({ where: { domain: "REPORTING", commandType: "EXPECTATION_GENERATED" } })).toBe(before);
    await prisma.$executeRawUnsafe(`DROP TRIGGER reporting_generation_failure ON "${schema}"."EnterpriseAuditEvent"`);
    expect(await generateReportingExpectations(actor, "2026-02-02", "2026-02-03")).toEqual({ created: 2 });
    expect(await generateReportingExpectations(actor, "2026-02-02", "2026-02-03")).toEqual({ created: 0 });
    expect(await prisma.reportingExpectation.count({ where: scope })).toBe(2);
    expect(await prisma.enterpriseCommandLedger.count({ where: { domain: "REPORTING", commandType: "EXPECTATION_GENERATED" } })).toBe(before + 2);
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS reporting_generation_failure ON "${schema}"."EnterpriseAuditEvent"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${schema}".reporting_generation_failure()`);
    await prisma.reportingAssignment.delete({ where: { id: assignment.id } });
    await prisma.reportingCalendarPolicy.delete({ where: { id: policy.id } });
    if (prior === undefined) delete process.env.REPORTING_EXPECTATIONS_ENABLED; else process.env.REPORTING_EXPECTATIONS_ENABLED = prior;
  }
});

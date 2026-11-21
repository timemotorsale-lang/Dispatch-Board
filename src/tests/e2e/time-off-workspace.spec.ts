import { expect as baseExpect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const expect = baseExpect.configure({ timeout: 15_000 });

test("employee revises time off and manager finishes coverage and approval", async ({ page }) => {
  test.skip(process.env.RUN_TIME_CARD_PREVIEW !== "1", "Requires isolated time-card records.");
  const target = new URL(process.env.DATABASE_URL ?? "");
  expect(target.hostname).toBe("127.0.0.1");
  expect(target.searchParams.get("schema")).toMatch(/^time_card_it_/);
  test.setTimeout(120_000);

  const login = async (person: "staff" | "manager") => {
    const response = await page.request.post("/api/auth/login", {
      data: { email: `time-preview-${person}@example.test`, password: "TimeCardTest123!" }
    });
    expect(response.ok()).toBe(true);
  };
  const switchTo = async (person: "staff" | "manager") => {
    await page.request.post("/api/auth/logout");
    await login(person);
  };
  const leavePath = "/time-attendance?view=my-time&action=leave#time-off-request";
  const note = `Personal appointment ${Date.now()}`;
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside time-off walkthrough" } }));
  await login("staff");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/time-attendance");
  await page.getByRole("navigation", { name: "Time card tools" }).getByRole("link", { name: "Request time off" }).click();
  const workspace = page.getByRole("region", { name: "My Time Off" });
  await expect(workspace.getByRole("heading", { name: "My Time Off" })).toBeVisible();
  const database = new PrismaClient();
  const existing = await database.timeOffRequest.findMany({
    where: { requesterUserId: "time-preview-staff", status: { in: ["SUBMITTED", "MANAGER_APPROVED", "LEAVE_ADMIN_REVIEW", "APPROVED"] } },
    select: { startsAt: true, endsAt: true }
  }).finally(() => database.$disconnect());
  const future = Array.from({ length: 60 }, (_, index) => Date.now() + (index + 3) * 86_400_000).find(candidate =>
    existing.every(request => candidate + 86_400_000 < request.startsAt.getTime() || candidate - 86_400_000 > request.endsAt.getTime())
  );
  if (future === undefined) throw new Error("No unused date remains in the isolated preview.");
  const date = new Date(future).toISOString().slice(0, 10);
  const minute = new Date(future).getUTCMinutes();
  const start = `15:${String(minute).padStart(2, "0")}`;
  const end = `16:${String(minute).padStart(2, "0")}`;
  await workspace.getByLabel("Time-off type").selectOption("UNPAID");
  await workspace.getByLabel("Date, day 1").fill(date);
  await workspace.getByLabel("Start, day 1").fill(start);
  await workspace.getByLabel("End, day 1").fill(end);
  await workspace.getByLabel("Scheduling note (optional)").fill(note);
  const submission = page.waitForResponse(response => response.url().endsWith("/api/time-attendance/time-off") && response.request().method() === "POST");
  await workspace.getByRole("button", { name: "Submit request" }).click();
  const sent = await submission;
  expect(sent.ok(), await sent.text()).toBe(true);
  await expect(workspace.getByRole("status")).toContainText("Time-off request submitted.", { timeout: 15_000 });
  await page.reload();
  await expect(workspace.getByText("Waiting for manager").first()).toBeVisible();

  await switchTo("manager");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/time-attendance?view=manager");
  const row = page.locator('[class*="managerReviewTableRow"]').filter({ hasText: note });
  await row.getByText("Review coverage", { exact: true }).click();
  await expect(row.getByText(/assigned appointments overlap/)).toBeVisible();
  const decision = row.getByRole("combobox", { name: /Decision for/ });
  const recordDecision = async (value: string, reason: string) => {
    await decision.selectOption(value);
    await row.getByRole("textbox", { name: /Reason for/ }).fill(reason);
    const response = page.waitForResponse(response => response.url().endsWith("/api/time-attendance/time-off-decisions") && response.request().method() === "POST");
    await row.getByRole("button", { name: "Record decision" }).click();
    const result = await response;
    const body = await result.json();
    expect(result.ok(), body.error).toBe(true);
    return body;
  };
  expect(await recordDecision("RETURN", "Please confirm the exact hours for coverage.")).toMatchObject({ request: { status: "DRAFT" } });
  await expect(row).toHaveCount(0, { timeout: 15_000 });

  await switchTo("staff");
  await page.goto(leavePath);
  const returned = workspace.getByRole("article").filter({ hasText: "Please confirm the exact hours for coverage." });
  await expect(returned).toContainText("Returned for revision");
  await returned.getByRole("button", { name: "Revise request" }).click();
  await expect(workspace.getByLabel("Start, day 1")).toHaveValue(start);
  const revision = page.waitForResponse(response => response.url().endsWith("/api/time-attendance/time-off") && response.request().method() === "PATCH");
  await workspace.getByRole("button", { name: "Send revision" }).click();
  const revised = await revision;
  expect(revised.ok(), await revised.text()).toBe(true);
  await expect(workspace.getByRole("status")).toContainText("Revised request sent for review.", { timeout: 15_000 });

  await switchTo("manager");
  await page.goto("/time-attendance?view=manager");
  expect(await recordDecision("APPROVE_COVERAGE", "The team can cover the requested appointment.")).toMatchObject({ request: { status: "MANAGER_APPROVED" } });
  await expect(row).toContainText("Coverage approved", { timeout: 15_000 });
  expect(await recordDecision("APPROVE", "Approved the requested unpaid time off.")).toMatchObject({ request: { status: "APPROVED" } });
  await switchTo("staff");
  await page.goto(`/time-attendance?view=schedule&week=${date}`);
  await expect(page.getByRole("region", { name: "My Schedule" }).getByRole("link", { name: "Approved time off" }).first()).toBeVisible();
});

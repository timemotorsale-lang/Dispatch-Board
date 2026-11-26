import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { companyPipelineHref, customerPipelineHref } from "@/lib/crm-pipeline";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212", "Requires isolated local records.");
const ready = expect.configure({ timeout: 30_000 });

test("two opportunities for one customer keep separate progress and reopen through the company pipeline", async ({ page, playwright, baseURL }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(30_000);
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "127.0.0.1" || url.port !== "55435" || url.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  const customerId = randomUUID(), otherCustomerId = randomUUID(), suffix = customerId.slice(0, 8), customerName = `Pipeline Review ${suffix}`;
  const db = new PrismaClient();
  const email = "morgan.manager@local.test", password = "dispatch123!";
  let ownerId: string;
  try {
    ownerId = (await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;
    await db.customer.createMany({ data: [
      { id: customerId, organizationId: "org-time-motor-sales", ownerUserId: ownerId, customerNumber: `PIPE-${suffix}`, displayName: customerName, email: `pipeline-${suffix}@example.test` },
      { id: otherCustomerId, organizationId: "org-time-motor-sales", ownerUserId: ownerId, customerNumber: `OTHER-${suffix}`, displayName: `Other Pipeline ${suffix}` },
    ] });
  } finally { await db.$disconnect(); }
  expect((await page.request.post("/api/auth/login", { data: { email, password } })).ok()).toBe(true);
  const api = "/api/crm-next/pipeline";
  const capture = async (customerId: string, title: string) => {
    const response = await page.request.post(api, { data: { action: "CAPTURE", idempotencyKey: randomUUID(), sourceKey: randomUUID(), sourceCode: "BROWSER_REVIEW", customerId, title, ownerUserId: ownerId, pathway: "retail-sale" } });
    expect(response.ok(), await response.text()).toBe(true);
    return (await response.json()).id as string;
  };
  const first = await capture(customerId, "First synthetic vehicle");
  const second = await capture(customerId, "Separate synthetic vehicle · hidden-contact@example.test · 612–555–0123");
  const foreign = await capture(otherCustomerId, "Different customer inquiry");
  let mismatchedTaskId: string;
  try {
    const foreignTask = await db.unifiedCrmOpportunityTaskLink.findFirstOrThrow({ where: { opportunityId: foreign }, include: { task: true } });
    mismatchedTaskId = foreignTask.taskId;
    await db.unifiedCrmOpportunityTaskLink.create({ data: {
      organizationId: foreignTask.organizationId, opportunityId: first, taskId: mismatchedTaskId, relationship: "FOLLOW_UP",
      titleSnapshot: foreignTask.titleSnapshot, briefSnapshot: foreignTask.briefSnapshot, dueAtSnapshot: foreignTask.dueAtSnapshot, createdByUserId: ownerId,
    } });
    const location = await db.location.create({ data: { organizationId: "org-time-motor-sales", code: `UNGRANTED-${suffix}`, name: "Synthetic ungranted location", timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    const appointment = await db.appointment.create({ data: { appointmentNumber: `PIPE-HIDDEN-${suffix}`, organizationId: location.organizationId, locationId: location.id, ownerUserId: ownerId, sourceType: "MANUAL", title: "Hidden location appointment", schedulingTimezone: location.timezone, participants: { create: { participantType: "CUSTOMER", roleCode: "CUSTOMER", customerId, displayNameSnapshot: customerName } } } });
    await db.unifiedCrmOpportunityAppointmentLink.create({ data: { organizationId: location.organizationId, opportunityId: first, appointmentId: appointment.id, relationship: "SALES", titleSnapshot: appointment.title, createdByUserId: ownerId } });
    const authorizedLocation = await db.userLocationAccess.findFirstOrThrow({ where: { userId: ownerId, location: { organizationId: location.organizationId } } });
    const mismatched = await db.appointment.create({ data: { appointmentNumber: `PIPE-OTHER-${suffix}`, organizationId: location.organizationId, locationId: authorizedLocation.locationId, ownerUserId: ownerId, sourceType: "MANUAL", title: "Previous customer appointment", schedulingTimezone: location.timezone, participants: { create: { participantType: "CUSTOMER", roleCode: "CUSTOMER", customerId: otherCustomerId, displayNameSnapshot: "Other synthetic customer" } } } });
    await db.unifiedCrmOpportunityAppointmentLink.create({ data: { organizationId: location.organizationId, opportunityId: first, appointmentId: mismatched.id, relationship: "SALES", titleSnapshot: mismatched.title, createdByUserId: ownerId } });
  } finally { await db.$disconnect(); }
  const scopedPayload = await page.request.get(`${api}?customer=${customerId}`);
  expect(scopedPayload.ok()).toBe(true);
  const scopedText = await scopedPayload.text();
  expect(scopedText).not.toContain("hidden-contact@example.test");
  expect(scopedText).not.toContain("612–555–0123");
  expect(scopedText).not.toContain("Hidden location appointment");
  expect(scopedText).not.toContain("Previous customer appointment");
  expect(scopedText).not.toContain("Different customer inquiry");
  expect(scopedText).not.toContain(mismatchedTaskId);
  const exact = await (await page.request.get(`${api}?opportunity=${first}`)).json();
  const rejected = await page.request.post(api, { data: { action: "OUTCOME", id: first, expectedVersion: exact.version,
    taskId: mismatchedTaskId, idempotencyKey: randomUUID(), outcome: "Internal review", reason: "Synthetic stale link",
    nextActionLabel: "Do not save this action", nextActionDueAt: new Date(Date.now() + 90 * 60_000).toISOString(),
  } });
  expect(rejected.status()).toBe(409);
  try { expect((await db.task.findUniqueOrThrow({ where: { id: mismatchedTaskId } })).status).toBe("NOT_STARTED"); }
  finally { await db.$disconnect(); }
  await page.goto(customerPipelineHref(customerId, foreign));
  const individual = page.getByRole("region", { name: "Customer pipeline", exact: true });
  await ready(individual.getByText(/requested opportunity is unavailable/i)).toBeVisible();
  const selector = individual.getByLabel("Opportunity", { exact: true });
  await expect(selector.locator(`option[value="${foreign}"]`)).toHaveCount(0);
  await selector.selectOption(first);
  const companyLink = individual.getByRole("link", { name: "Open in company pipeline" });
  await expect(companyLink).toHaveAttribute("href", companyPipelineHref(first));
  await companyLink.click();
  const companyPanel = page.getByRole("complementary", { name: `Opportunity ${customerName}` });
  await ready(companyPanel.getByText("First synthetic vehicle", { exact: true })).toBeVisible();
  const followUp = companyPanel.locator("details").filter({ hasText: "Schedule a follow-up without completing an activity" });
  await followUp.locator("summary").click();
  const nextAction = "Check synthetic vehicle availability";
  await followUp.getByLabel("Next action", { exact: true }).fill(nextAction);
  const future = await page.evaluate(() => {
    const date = new Date(Date.now() + 90 * 60_000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
  await followUp.getByLabel(/Next action time/).fill(future);
  await followUp.getByRole("button", { name: "Save", exact: true }).click();
  await ready(companyPanel.getByRole("heading", { name: nextAction, exact: true })).toBeVisible();
  await companyPanel.getByRole("link", { name: "Customer 360 pipeline" }).click();
  await ready(individual.getByRole("link", { name: nextAction, exact: true })).toBeVisible();
  await page.reload();
  await ready(individual.getByRole("link", { name: nextAction, exact: true })).toBeVisible();
  await expect(selector).toHaveValue(first);
  await selector.selectOption(second);
  await expect(individual.getByRole("link", { name: nextAction, exact: true })).toHaveCount(0);

  const sales = await playwright.request.newContext({ baseURL });
  try {
    expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password } })).ok()).toBe(true);
    expect([403, 404]).toContain((await sales.get(`${api}?customer=${customerId}`)).status());
    expect([403, 404]).toContain((await sales.get(`${api}?opportunity=${first}`)).status());
  } finally { await sales.dispose(); }
  console.log("[pipeline-review]", JSON.stringify({ customerId, first, second }));
});

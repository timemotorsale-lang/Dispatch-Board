import { expect, test, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";

const boardPath = "/board/repair-priorities";
const apiPath = "/api/dispatch/repair-priorities";
const checklistPath = "/vehicles/coo-workbook/checklist";

async function signIn(page: Page, email: string) {
  const response = await page.request.post("/api/auth/login", { data: { email, password: "dispatch123!" } });
  expect(response.ok()).toBe(true);
}

async function addChecklistEntry(page: Page, title: string, scope: "COO" | "MY") {
  await page.goto(`${checklistPath}?workbookScope=${scope}`);
  const checklist = page.getByRole("region", { name: "Daily Checklist tool" });
  await checklist.getByRole("textbox", { name: "Add Daily Checklist item" }).fill(title);
  await checklist.getByRole("button", { name: "Add", exact: true }).click();
  const item = checklist.locator(".advisor-coo-checklist-item").filter({
    has: page.getByRole("textbox", { name: `Checklist item for ${title}`, exact: true })
  });
  await expect(item).toBeVisible();
  return checklist.locator(`[id="${await item.getAttribute("id")}"]`);
}

test("manager and staff publish, refine, claim, and explicitly carry Daily Priorities", async ({ page, browser }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(12_000);
  const databaseSchema = new URL(process.env.DATABASE_URL ?? "").searchParams.get("schema");
  if (!databaseSchema?.startsWith("dispatch_board_e2e_")) throw new Error("Daily Priorities needs an isolated browser test schema.");
  const tag = Date.now();
  const managerTitle = `Synthetic manager checklist ${tag}`;
  const staffTitle = `Synthetic staff priority ${tag}`;
  const staffDraftTitle = `Synthetic staff checklist draft ${tag}`;
  const savedUpdate = `Confirm synthetic parts return ${tag}`;
  const revisedUpdate = `Confirm synthetic parts pickup ${tag}`;
  await signIn(page, "morgan.manager@local.test");
  const staffContext = await browser.newContext();
  try {
    const staff = await staffContext.newPage();
    staff.setDefaultTimeout(12_000);
    await signIn(staff, "pat.parts@local.test");
    const initial = await (await page.request.get(apiPath)).json();
    const today: string = initial.date;
    const nextDay = new Date(`${today}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const tomorrow = nextDay.toISOString().slice(0, 10);

    const managerItem = await addChecklistEntry(page, managerTitle, "COO");
    await managerItem.getByRole("textbox", { name: `Update for ${managerTitle}` }).fill(savedUpdate);
    await managerItem.getByRole("button", { name: "Save update", exact: true }).click();
    await expect(managerItem.getByText(savedUpdate)).toBeVisible();
    await managerItem.getByRole("button", { name: "Publish to Dispatch Board" }).click();
    await managerItem.getByRole("button", { name: "Edit saved update" }).click();
    await managerItem.getByRole("textbox", { name: "Revised checklist update" }).fill(revisedUpdate);
    await managerItem.getByRole("button", { name: "Save checklist update" }).click();
    await expect(managerItem.getByText("Checklist update saved.", { exact: false })).toBeVisible();
    await managerItem.getByRole("checkbox", { name: revisedUpdate }).check();
    await managerItem.getByRole("button", { name: "Publish selected priorities" }).click();
    await expect(managerItem.getByText("Published 1 to Daily Priorities.")).toBeVisible();
    await managerItem.getByRole("button", { name: "Publish selected priorities" }).click();
    await expect(managerItem.getByText("The selected entries are already published.")).toBeVisible();

    const staffItem = await addChecklistEntry(staff, staffDraftTitle, "MY");
    await staffItem.getByRole("button", { name: "Publish to Dispatch Board" }).click();
    await staffItem.getByRole("checkbox", { name: staffDraftTitle }).check();
    await staffItem.getByRole("textbox", { name: `Checklist item for ${staffDraftTitle}` }).fill(staffTitle);
    await staffItem.getByRole("button", { name: "Save item" }).click();
    await expect(staffItem.getByRole("checkbox", { name: staffTitle })).toBeVisible();
    await expect(staffItem.getByRole("checkbox", { name: staffTitle })).not.toBeChecked();
    await staffItem.getByRole("checkbox", { name: staffTitle }).check();
    await staffItem.getByRole("button", { name: "Publish selected priorities" }).click();
    await expect(staffItem.getByText("Published 1 to Daily Priorities.")).toBeVisible();

    await staff.goto(boardPath);
    const staffCard = staff.getByRole("article").filter({ has: staff.getByRole("heading", { name: revisedUpdate }) });
    await expect(staffCard).toBeVisible();
    await expect(staffCard.getByRole("link", { name: "Open originating checklist item" })).toHaveCount(0);
    await staffCard.getByRole("button", { name: "Claim priority" }).click();
    await expect(staffCard.getByRole("button", { name: "Claim priority" })).toHaveCount(0);
    await staff.reload();
    await expect(staffCard.getByText(/Pat/)).toBeVisible();

    const staffPriority = await prisma.repairPriority.findFirstOrThrow({ where: { summary: staffTitle } });
    const claim = { action: "claim", id: staffPriority.id, version: staffPriority.version };
    const competingClaims = await Promise.all([
      page.request.post(apiPath, { data: claim }),
      staff.request.post(apiPath, { data: claim })
    ]);
    expect(competingClaims.map((response) => response.status()).sort()).toEqual([200, 409]);
    const claimed = await prisma.repairPriority.findUniqueOrThrow({ where: { id: staffPriority.id } });
    expect(claimed.ownerUserId).toBeTruthy();
    expect(claimed.version).toBe(staffPriority.version + 1);
    expect(await prisma.activityEvent.count({ where: {
      eventType: "daily_priority.claimed", metadata: { path: ["priorityId"], equals: staffPriority.id }
    } })).toBe(1);

    await page.goto(`${boardPath}?date=${tomorrow}`);
    await expect(page.getByRole("heading", { name: "Daily Priorities", exact: true })).toBeVisible();
    await expect(page.getByText("Loading Daily Priorities…")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: revisedUpdate })).toHaveCount(0);
    await page.goto(boardPath);
    await expect(page.getByRole("link", { name: "Daily Priorities", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today’s Daily Priorities", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: staffTitle })).toBeVisible();
    const managerCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: revisedUpdate }) });
    await expect(managerCard.getByRole("link", { name: "Open originating checklist item" })).toBeVisible();
    await managerCard.getByText("Carry forward", { exact: true }).click();
    await managerCard.getByRole("button", { name: "Move priority" }).click();
    await page.getByRole("link", { name: `Open ${tomorrow}` }).click();
    await expect(page).toHaveURL(new RegExp(`/board/repair-priorities\\?date=${tomorrow}$`));
    await expect(managerCard).toBeVisible();
    await page.reload();
    await expect(managerCard).toBeVisible();
    await expect(page.getByRole("heading", { name: staffTitle })).toHaveCount(0);

    const rows = await prisma.repairPriority.findMany({ where: { summary: revisedUpdate } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ planDate: tomorrow, taskId: null, version: 3 });
    const checklistLogs = await prisma.activityEvent.findMany({
      where: { eventType: { in: ["daily_priority.source_refined", "daily_priority.published"] },
        metadata: { path: ["checklistItemId"], equals: rows[0].checklistItemId } },
      orderBy: { createdAt: "asc" }
    });
    expect(checklistLogs.map(({ eventType }) => eventType)).toEqual(["daily_priority.source_refined", "daily_priority.published"]);
    const logs = await prisma.activityEvent.findMany({
      where: { metadata: { path: ["priorityId"], equals: rows[0].id } },
      orderBy: { createdAt: "asc" }
    });
    expect(logs.map(({ eventType }) => eventType)).toEqual(["daily_priority.claimed", "daily_priority.carried"]);
  } finally {
    await staffContext.close();
  }
});

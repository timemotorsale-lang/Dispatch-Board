import { expect, test, type Page } from "@playwright/test";

import {
  disconnectDailyWorkflowDatabase,
  resetDailyWorkflowState
} from "./daily-workflow.setup";

const managerEmail = "morgan.manager@local.test";
const staffEmail = "jordan.sales@local.test";
const password = "dispatch123!";
const staffComment = "E2E update: customer callback is logged.";
const blockerReason = "E2E blocker: waiting on customer confirmation.";
const approvalTaskTitle = "E2E approve sold vehicle prep";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  blockerReason: string | null;
  requiresManagerApproval: boolean;
  assignedUser: {
    name: string;
    email?: string;
  };
};

type BoardPayload = {
  board: {
    taskCount: number;
    tasks: BoardTask[];
  };
};

test.beforeEach(async () => {
  await resetDailyWorkflowState();
});

test.afterAll(async () => {
  await disconnectDailyWorkflowDatabase();
});

async function login(page: Page, email: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await loginResponse;

    if (response.ok()) {
      await expect(page).toHaveURL(/\/board/);
      return;
    }

    if (response.status() !== 404 || attempt === 1) {
      throw new Error(`Login failed with status ${response.status()}.`);
    }
  }
}

async function logout(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
  });
  await page.context().clearCookies();
}

async function readTodayBoard(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/board/today");
    if (!response.ok) {
      throw new Error(`Board API failed with ${response.status}`);
    }

    return (await response.json()) as BoardPayload;
  });
}

async function waitForBoardTask(page: Page, predicate: (task: BoardTask) => boolean) {
  return expect
    .poll(async () => {
      const payload = await readTodayBoard(page);
      return payload.board.tasks.find(predicate) ?? null;
    })
    .not.toBeNull();
}

test("manager and staff can complete the daily dispatch workflow", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Board" })).toBeVisible();

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  const firstGeneration = await readTodayBoard(page);
  const firstGeneratedTaskCount = firstGeneration.board.taskCount;
  expect(firstGeneratedTaskCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText(/duplicates skipped/i)).toBeVisible();
  const secondGeneration = await readTodayBoard(page);
  expect(secondGeneration.board.taskCount).toBe(firstGeneratedTaskCount);

  await page.getByRole("button", { name: "Create Task" }).click();
  await page.getByLabel("Title").fill(approvalTaskTitle);
  await page.getByLabel("Assigned to").selectOption({ label: "Baraka Sales" });
  await page.getByLabel("Due time").fill("17:30");
  await page.getByLabel("Workflow area").selectOption("SALES");
  await page.getByLabel("Requires manager approval before completion").check();
  await page.getByRole("button", { name: /^Create task$/ }).click();
  await expect(page.getByText("Task created.")).toBeVisible();

  await logout(page);
  await login(page, staffEmail);
  await page.goto("/my-tasks");
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();

  const generatedSalesTask = (await readTodayBoard(page)).board.tasks.find(
    (task) => task.assignedUser.email === staffEmail && !task.requiresManagerApproval
  );
  expect(generatedSalesTask).toBeTruthy();

  await page.goto(`/tasks/${generatedSalesTask!.id}#task-updates`);
  await page.getByLabel("Add update").fill(staffComment);
  await page.getByRole("button", { name: "Add update" }).click();
  await expect(page.getByText(staffComment)).toBeVisible();

  await page.getByLabel("Next status").selectOption("BLOCKED");
  await page.getByLabel("Blocker reason").fill(blockerReason);
  await page.getByRole("button", { name: "Block task" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === generatedSalesTask!.id)?.blockerReason;
  }).toBe(blockerReason);

  const approvalTask = (await readTodayBoard(page)).board.tasks.find(
    (task) => task.title === approvalTaskTitle
  );
  expect(approvalTask).toBeTruthy();

  await page.goto(`/tasks/${approvalTask!.id}`);
  await page.getByRole("button", { name: "Ready for Review" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === approvalTask!.id)?.status;
  }).toBe("READY_FOR_REVIEW");

  await logout(page);
  await login(page, managerEmail);
  await page.goto("/board");
  await waitForBoardTask(page, (task) => task.status === "BLOCKED" && task.blockerReason === blockerReason);
  const blockedTaskRow = page.getByRole("row").filter({ hasText: generatedSalesTask!.title });
  await expect(blockedTaskRow.getByText("Blocked", { exact: true })).toBeVisible();

  await page.goto("/manager-review");
  await expect(page.getByRole("heading", { name: "Manager Review" })).toBeVisible();
  await page.getByRole("button", { name: "Approve completion" }).click();
  await expect.poll(async () => {
    const payload = await readTodayBoard(page);
    return payload.board.tasks.find((task) => task.id === approvalTask!.id)?.status;
  }).toBe("COMPLETED");

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Today's Activity Feed" })).toBeVisible();
  await expect(page.getByText(/Board generated manually/).first()).toBeVisible();
  await expect(page.getByText(/added an update to Review sales follow-up tasks/)).toBeVisible();
  await expect(page.getByText(blockerReason)).toBeVisible();
  await expect(page.getByText(new RegExp(`marked ${approvalTaskTitle} ready for review`))).toBeVisible();
  await expect(page.getByText(new RegExp(`approved completion for ${approvalTaskTitle}`))).toBeVisible();
});

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
const appointmentTaskTitle = "E2E customer meeting required";
const appointmentTitle = "E2E task-originated customer meeting";
const appointmentReason = "E2E reason: customer must meet sales before the task can continue.";

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

type AppointmentReadPayload = {
  appointments: Array<{
    id: string;
    appointmentNumber: string;
    title: string;
    sourceReference: string | null;
    startsAt: string | null;
    endsAt: string | null;
    bookingStatus: string;
    taskLinks: Array<{
      taskId: string;
      linkCode: string;
      linkType: string;
      taskTitle: string | null;
    }>;
  }>;
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

async function readAppointments(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/appointments?date=2026-07-06");
    if (!response.ok) {
      throw new Error(`Appointments API failed with ${response.status}`);
    }

    return (await response.json()) as AppointmentReadPayload;
  });
}

async function assertTasksConsoleFitsViewport(page: Page) {
  const pageHeight = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }));

  expect(pageHeight.scrollHeight).toBeLessThanOrEqual(pageHeight.innerHeight + 8);
}

async function waitForTaskAppointment(
  page: Page,
  taskId: string,
  predicate: (appointment: AppointmentReadPayload["appointments"][number]) => boolean
) {
  return expect
    .poll(async () => {
      const payload = await readAppointments(page);
      return payload.appointments.find(
        (appointment) => appointment.sourceReference === taskId && predicate(appointment)
      ) ?? null;
    })
    .not.toBeNull();
}

test("manager can scan the compact Tasks Operations Console", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();

  await page.getByRole("button", { name: "Generate Board" }).click();
  await expect(page.getByText("Board generated.")).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("Task Operations Console")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Task" })).toBeVisible();
  await expect(page.getByText("Total Tasks")).toBeVisible();
  await expect(page.locator(".tasks-console-metrics").getByText("Ready for Review", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update Status" }).first()).toBeVisible();
  await expect(page.locator(".tasks-console-table tbody tr")).toHaveCount(8);
  await assertTasksConsoleFitsViewport(page);

  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByLabel("Quick create task")).toBeVisible();
  await expect(page.getByPlaceholder("Example: Check vehicles needing inspection")).toBeVisible();
  await assertTasksConsoleFitsViewport(page);
  await page.getByLabel("Close create task panel").click();
  await expect(page.getByLabel("Quick create task")).toBeHidden();

  await page.getByLabel("Search tasks").fill("blocked");
  await expect(page.getByText("Search: blocked")).toBeVisible();

  await page.getByRole("button", { name: "Saved Views" }).click();
  await page.getByRole("button", { name: "Save shared view" }).click();
  await expect(page.getByText("Saved View 1 saved as a shared team view.")).toBeVisible();
  await page.getByRole("button", { name: "Saved Views" }).click();
  await expect(page.getByText("Shared Saved Views")).toBeVisible();
  await page.getByRole("button", { name: "Saved View 1", exact: true }).click();
  await expect(page.getByText("Search: blocked")).toBeVisible();
  await page.getByRole("button", { name: "Saved Views" }).click();
  await page.getByLabel("Delete Saved View 1").click();
  await expect(page.getByText("Shared saved view deleted.")).toBeVisible();
  await page.getByLabel("Search tasks").fill("");

  await page.locator(".tasks-console-sidebar").getByRole("button", { name: "Blocked", exact: true }).click();
  await expect(page.getByText("Queue: Blocked")).toBeVisible();
  await page.locator(".tasks-console-sidebar").getByRole("button", { name: /^Team Tasks\s*\d*/ }).click();

  const rows = page.locator(".tasks-console-table tbody tr");
  const secondTaskTitle = await rows.nth(1).locator(".tasks-console-title-cell strong").innerText();
  await rows.nth(1).click();
  await expect
    .poll(async () => (await page.locator(".tasks-console-rail-title h2").innerText()).toLowerCase())
    .toContain(secondTaskTitle.toLowerCase());

  await page.getByRole("button", { name: /Comments/ }).click();
  await expect(page.getByText("New Comment")).toBeVisible();
  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.locator(".tasks-console-rail-panel")).toBeVisible();
});

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
  await page.getByLabel("Post a comment").fill(staffComment);
  await page.getByRole("button", { name: "Comment" }).click();
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
  await expect(page.getByText(new RegExp(`added an update to ${generatedSalesTask!.title}`))).toBeVisible();
  await expect(page.getByText(blockerReason)).toBeVisible();
  await expect(page.getByText(new RegExp(`marked ${approvalTaskTitle} ready for review`))).toBeVisible();
  await expect(page.getByText(new RegExp(`approved completion for ${approvalTaskTitle}`))).toBeVisible();
});

test("manager can create a linked appointment draft from a task and see it on the Appointment Board", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page, managerEmail);
  await expect(page.getByText("Daily dispatch board")).toBeVisible();

  await page.getByRole("button", { name: "Create Task" }).click();
  await page.getByLabel("Title").fill(appointmentTaskTitle);
  await page.getByLabel("Assigned to").selectOption({ label: "Baraka Sales" });
  await page.getByLabel("Due time").fill("16:45");
  await page.getByLabel("Workflow area").selectOption("SALES");
  await page.getByRole("button", { name: /^Create task$/ }).click();
  await expect(page.getByText("Task created.")).toBeVisible();

  const task = (await readTodayBoard(page)).board.tasks.find(
    (boardTask) => boardTask.title === appointmentTaskTitle
  );
  expect(task).toBeTruthy();

  await page.goto(`/tasks/${task!.id}`);
  await expect(page.getByRole("heading", { name: appointmentTaskTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Appointment" })).toBeVisible();
  await page.getByLabel("Appointment Title").fill(appointmentTitle);
  await page.getByLabel("Documented Reason").fill(appointmentReason);
  await page.getByRole("button", { name: "Create linked draft" }).click();
  await expect(page.getByText(/Draft appointment APT-TASK-/)).toBeVisible();

  await waitForTaskAppointment(
    page,
    task!.id,
    (appointment) =>
      appointment.title === appointmentTitle &&
      appointment.startsAt === null &&
      appointment.taskLinks.some(
        (link) =>
          link.taskId === task!.id &&
          link.linkCode === "SOURCE_TASK" &&
          link.taskTitle === appointmentTaskTitle
      )
  );

  await page.goto("/activity");
  await expect(page.getByText(new RegExp(`created draft appointment .* from ${appointmentTaskTitle}`))).toBeVisible();

  await page.goto("/appointments");
  await expect(page.getByRole("heading", { name: "Appointment Board" })).toBeVisible();
  await expect(page.getByText("Unscheduled / Drafts")).toBeVisible();
  await expect(
    page.locator(".appointment-unscheduled-item").filter({ hasText: appointmentTitle })
  ).toBeVisible();
  await expect(page.getByText("Linked Tasks (1)")).toBeVisible();
  await expect(page.getByText(appointmentTaskTitle, { exact: true })).toBeVisible();
});
